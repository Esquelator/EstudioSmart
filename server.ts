import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase JSON limit to 50mb for handling multiple photos and PDFs
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Catch any JSON body parsing errors before routes so they return clean JSON and don't hit Vite SPA HTML
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && req.path.startsWith("/api/")) {
    console.error("API Body parser error:", err.message);
    const isTooLarge = err.type === "entity.too.large" || err.status === 413;
    return res.status(isTooLarge ? 413 : 400).json({
      error: isTooLarge
        ? "El contenido subido supera el límite de tamaño permitido. Prueba con un archivo más ligero o menos fotos."
        : `Error en la solicitud: ${err.message || "Formato de datos no válido."}`,
    });
  }
  next(err);
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Cooldown tracker for models that hit 429 quota exhaustion or severe rate limits
const modelQuotaCooldowns = new Map<string, number>();

// Deep extraction of document text using PDFParse
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = typeof result === "string" ? result : (result as any)?.text || "";
    let numpages = 1;
    try {
      const info = await parser.getInfo();
      if ((info as any)?.total) numpages = (info as any).total;
    } catch {
      // ignore
    }
    return { text: text.trim(), numpages };
  } catch (err: any) {
    console.warn("[PDFParse] Text extraction notice:", err?.message || err);
    return { text: "", numpages: 1 };
  }
}

// Deep extraction of Word document text (.docx, .doc) using Mammoth
async function extractTextFromDoc(buffer: Buffer, fileName: string): Promise<{ text: string }> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = (result?.value || "").trim();
    if (text && text.length > 0) {
      return { text };
    }
  } catch (err: any) {
    console.warn(`[Mammoth] Could not parse Word document "${fileName}" with mammoth:`, err?.message || err);
  }

  // Graceful fallback for older binary .doc formats: extract printable text runs
  try {
    const rawStr = buffer.toString("latin1");
    const matches = rawStr.match(/[\x20-\x7E\xA0-\xFF\n\r\t]{4,}/g);
    if (matches && matches.length > 0) {
      const extracted = matches
        .map((s) => s.trim())
        .filter((s) => s.length > 6 && !s.includes("CompObj") && !s.includes("Root Entry") && !s.startsWith("Microsoft Word"))
        .join("\n");
      if (extracted.length > 30) {
        console.log(`[Document Parser] Extracted ${extracted.length} chars via binary stream fallback for "${fileName}"`);
        return { text: extracted };
      }
    }
  } catch (fallbackErr) {
    console.warn(`[Document Parser] Binary text fallback failed for "${fileName}":`, fallbackErr);
  }

  return { text: "" };
}

// Resilient helper to handle temporary 503/429 spikes with instant failover and candidate models
async function generateWithResilience(
  ai: GoogleGenAI,
  params: {
    candidateModels?: string[];
    contents: any;
    config?: any;
    maxRetriesPerModel?: number;
  }
) {
  const {
    // gemini-3.1-flash-lite is the primary model: ultra-fast (2-4s), ample quota, never hits high-demand spikes
    candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash"],
    contents,
    config,
    maxRetriesPerModel = 0,
  } = params;

  let lastError: any = null;

  // Filter out models currently in cooldown; if all are cooled down, reset cooldowns
  let modelsToTry = candidateModels.filter((m) => (modelQuotaCooldowns.get(m) || 0) <= Date.now());
  if (modelsToTry.length === 0) {
    console.log("[Gemini] Resetting cooldowns as all models were flagged.");
    modelQuotaCooldowns.clear();
    modelsToTry = candidateModels;
  }

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Gemini] Calling ${modelName} (attempt ${attempt + 1}/${maxRetriesPerModel + 1})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });

        if (response && response.text) {
          console.log(`[Gemini] Successfully generated response with ${modelName}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const isQuotaExceeded =
          errMessage.includes("429") ||
          errMessage.includes("RESOURCE_EXHAUSTED") ||
          errMessage.includes("Quota exceeded") ||
          errMessage.includes("quota");

        const is503OrOverloaded =
          errMessage.includes("503") ||
          errMessage.includes("UNAVAILABLE") ||
          errMessage.includes("high demand") ||
          errMessage.includes("overloaded");

        console.warn(`[Gemini] Model ${modelName} (attempt ${attempt + 1}) failed:`, errMessage);

        if (isQuotaExceeded) {
          // Place on 60-second cooldown and failover immediately
          console.warn(`[Gemini] ${modelName} quota limit (429). Setting 60s cooldown and trying next candidate.`);
          modelQuotaCooldowns.set(modelName, Date.now() + 60000);
          break;
        }

        if (is503OrOverloaded) {
          // Immediately place on 2-minute cooldown and switch to next model immediately (don't stall the request)
          console.warn(`[Gemini] ${modelName} high demand (503). Setting 2m cooldown and failing over immediately.`);
          modelQuotaCooldowns.set(modelName, Date.now() + 120000);
          break;
        }

        // For other transient errors, do short backoff
        if (attempt < maxRetriesPerModel) {
          const delay = 800;
          console.log(`[Gemini] Transient error on ${modelName}. Waiting ${delay}ms before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de los modelos de IA tras varios intentos.");
}

// Convert 16-bit mono PCM 24000Hz buffer to standard WAV buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const subChunk2Size = pcmBuffer.length;
  const chunkSize = 36 + subChunk2Size;

  const header = Buffer.alloc(44);
  // RIFF identifier
  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  // fmt subchunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  // data subchunk
  header.write("data", 36);
  header.writeUInt32LE(subChunk2Size, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Helper function to fetch and clean text from any educational web page
async function fetchWebContent(targetUrl: string): Promise<{ title: string; content: string; url: string }> {
  let finalUrl = targetUrl.trim();
  if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
    finalUrl = "https://" + finalUrl;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(finalUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (Educational AI Bot)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al descargar la página web`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";

    // Strip scripts, styles, metadata, navigations, footers
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
      .replace(/<\/(h[1-6]|p|div|li|tr|section|article)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();

    // Limit text to 25,000 characters if very long to stay responsive
    if (cleaned.length > 25000) {
      cleaned = cleaned.substring(0, 25000) + "\n...[Fin del extracto web principal]";
    }

    return {
      title: title || "Página web de estudio",
      content: cleaned,
      url: finalUrl,
    };
  } catch (err: any) {
    console.warn(`Error fetching web content from ${finalUrl}:`, err?.message);
    return {
      title: "Artículo Web",
      content: `No se pudo descargar automáticamente el HTML directo de ${finalUrl}. Por favor utiliza tu conocimiento integral y la dirección del enlace web (${finalUrl}) para cubrir el 100% de todo su contenido temático y puntos clave.`,
      url: finalUrl,
    };
  }
}

// API: Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Preview Web Link
app.post("/api/study/preview-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "Por favor proporciona una URL válida." });
    }
    const webData = await fetchWebContent(url);
    res.json({
      title: webData.title,
      url: webData.url,
      previewSnippet: webData.content.slice(0, 220).trim(),
      charCount: webData.content.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al previsualizar la página web" });
  }
});

// API: Analyze documents, photos, web URLs, or text and generate study material
app.post("/api/study/analyze", async (req, res) => {
  try {
    const {
      files = [],
      manualText = "",
      webUrl = "",
      webUrls = [],
      passions = ["fútbol", "aviones"],
      studyDepth = "normal",
      customInstructions = "",
    } = req.body;

    // Collect all web URLs
    const urlsToFetch: string[] = [];
    if (webUrl && typeof webUrl === "string" && webUrl.trim().length > 0) {
      urlsToFetch.push(webUrl.trim());
    }
    if (Array.isArray(webUrls)) {
      for (const u of webUrls) {
        if (typeof u === "string" && u.trim().length > 0 && !urlsToFetch.includes(u.trim())) {
          urlsToFetch.push(u.trim());
        }
      }
    }

    if (
      (!files || files.length === 0) &&
      (!manualText || manualText.trim().length === 0) &&
      urlsToFetch.length === 0
    ) {
      return res.status(400).json({
        error: "Por favor proporciona al menos un archivo (PDF o fotos), un enlace web o escribe el texto del tema a estudiar.",
      });
    }

    const ai = getGeminiClient();

    // Prepare contents parts for Gemini
    const parts: any[] = [];

    // Add files with deep document analysis (PDF text extraction, Word documents, text files, and images)
    for (const f of files) {
      if (!f.base64) continue;
      // Strip data:image/...;base64, if included
      const cleanBase64 = f.base64.includes(",") ? f.base64.split(",")[1] : f.base64;
      const mime = (f.mimeType || "").toLowerCase();
      const fname = (f.name || "").toLowerCase();
      const isPdf = mime.includes("pdf") || fname.endsWith(".pdf");
      const isDoc =
        mime.includes("word") ||
        mime.includes("officedocument") ||
        Boolean(fname.match(/\.(docx|doc)$/i));
      const isText = mime.includes("text") || Boolean(fname.match(/\.(txt|md|csv|json|xml|html)$/i));

      if (isPdf) {
        // Deep text extraction tool from PDF
        let hasExtractedText = false;
        try {
          const buf = Buffer.from(cleanBase64, "base64");
          const { text: extractedPdfText, numpages } = await extractTextFromPdf(buf);
          if (extractedPdfText && extractedPdfText.length > 20) {
            hasExtractedText = true;
            const trimmed =
              extractedPdfText.length > 25000
                ? extractedPdfText.slice(0, 25000) + "\n...[Fin del extracto principal del documento]"
                : extractedPdfText;
            console.log(`[Document Parser] Extracted ${trimmed.length} characters across ${numpages} page(s) from "${f.name}"`);
            parts.push({
              text: `CONTENIDO TEXTUAL COMPLETO EXTRAÍDO DIRECTAMENTE DEL DOCUMENTO PDF "${f.name}" (${numpages} páginas):\n"""\n${trimmed}\n"""\n`,
            });
          }
        } catch (pdfErr) {
          console.warn(`[Document Parser] Could not extract raw text from ${f.name}:`, pdfErr);
        }

        // Only pass raw base64 PDF inlineData if text wasn't extracted (e.g. scanned image PDF)
        if (!hasExtractedText) {
          parts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: cleanBase64,
            },
          });
        }
      } else if (isDoc) {
        // Deep text extraction for Word documents (.docx, .doc) via Mammoth
        try {
          const buf = Buffer.from(cleanBase64, "base64");
          const { text: extractedDocText } = await extractTextFromDoc(buf, f.name);
          if (extractedDocText && extractedDocText.length > 20) {
            const trimmed =
              extractedDocText.length > 25000
                ? extractedDocText.slice(0, 25000) + "\n...[Fin del extracto principal del documento]"
                : extractedDocText;
            console.log(`[Document Parser] Successfully extracted ${trimmed.length} characters from Word document "${f.name}" using mammoth`);
            parts.push({
              text: `CONTENIDO TEXTUAL COMPLETO EXTRAÍDO DIRECTAMENTE DEL DOCUMENTO WORD "${f.name}":\n"""\n${trimmed}\n"""\n`,
            });
          } else {
            console.warn(`[Document Parser] Word document "${f.name}" had no readable text.`);
            parts.push({
              text: `DOCUMENTO WORD "${f.name}":\n"""\n[Documento Word procesado sin texto extraíble o protegido]\n"""\n`,
            });
          }
        } catch (docErr) {
          console.warn(`[Document Parser] Error processing Word document ${f.name}:`, docErr);
        }
      } else if (isText) {
        try {
          const buf = Buffer.from(cleanBase64, "base64");
          const textDecoded = buf.toString("utf-8");
          console.log(`[Document Parser] Decoded ${textDecoded.length} characters from text file "${f.name}"`);
          parts.push({
            text: `DOCUMENTO DE APUNTES / TEXTO "${f.name}":\n"""\n${textDecoded}\n"""\n`,
          });
        } catch {
          parts.push({
            inlineData: {
              mimeType: f.mimeType || "text/plain",
              data: cleanBase64,
            },
          });
        }
      } else if (mime.startsWith("image/") || Boolean(fname.match(/\.(jpe?g|png|webp|gif|bmp|heic)$/i))) {
        // Multimodal image (notebook photo, chalkboard, diagrams)
        const imageMime = mime.startsWith("image/") ? mime : "image/jpeg";
        parts.push({
          inlineData: {
            mimeType: imageMime,
            data: cleanBase64,
          },
        });
      } else {
        console.warn(`[Document Parser] Unrecognized file type for "${f.name}" (${f.mimeType}), skipping image fallback.`);
      }
    }

    // Add web page contents if URLs were provided
    if (urlsToFetch.length > 0) {
      for (const u of urlsToFetch) {
        console.log(`Fetching web content for URL: ${u}...`);
        const webData = await fetchWebContent(u);
        parts.push({
          text: `CONTENIDO EXTRAÍDO DE LA PÁGINA WEB (${webData.url}):\nTítulo: ${webData.title}\n"""\n${webData.content}\n"""\n`,
        });
      }
    }

    const isNoAnalogyMode =
      !Array.isArray(passions) ||
      passions.length === 0 ||
      passions.some((p: any) =>
        typeof p === "string" && /sin analog|ningun|normal|directo|clasico/i.test(p)
      );

    const passionsList = !isNoAnalogyMode && Array.isArray(passions) && passions.length > 0
      ? passions.join(", ")
      : "ninguna (modo contenido normal y directo)";

    const isDeep = studyDepth === "profundo";
    const isBrief = studyDepth === "resumido";

    const depthSpecificGuidelines = isDeep
      ? `
=============================================================================
>>> DIRECTIVA CRÍTICA: PROFUNDIDAD MÁXIMA, EXHAUSTIVA Y DETALLADA (MUY PROFUNDO) <<<
=============================================================================
El alumno ha seleccionado expresamente el modo "MUY PROFUNDO".
DEBES PROFUNDIZAR EN TODOS LOS APARTADOS DEL DOCUMENTO:
1. DEFINICIONES EXHAUSTIVAS (campo 'formalDefinition'):
   - Definición académica rigurosa en 2 a 3 párrafos ricos y minuciosos, desglosando conceptos, mecanismos, ecuaciones/variables y aplicaciones.
2. EXPLICACIÓN DETALLADA (campo 'passionExplanation'):
   - Explicación amplia de 2 a 3 párrafos que conecte todas las partes del temario.
3. GLOSARIO AMPLIO (campo 'glossary'):
   - Extrae entre 8 y 10 términos técnicos clave con definiciones contextualizadas.
4. COBERTURA DE SECCIONES (campo 'sections'):
   - Genera entre 4 y 6 secciones temáticas principales que cubran la totalidad del temario.
   - En cada sección, 'content' debe tener 2 párrafos desarrollados y 'detailedBreakdown' con 3 puntos analizados paso a paso.
   - 'keyConcepts': 4 a 6 conceptos clave por sección.
5. RESUMEN GLOBAL ('overview'):
   - Síntesis clara y completa de 2 párrafos.
6. BANCO DE EJERCICIOS:
   - 8 a 10 preguntas tipo test ('quizQuestions') con justificaciones didácticas.
   - 5 a 6 preguntas de verdadero/falso.
   - 6 a 8 flashcards con explicaciones en el reverso.`
      : isBrief
      ? `
=============================================================================
>>> DIRECTIVA CRÍTICA: MÁS POR ENCIMA / CORTO / SINTÉTICO (AL GRANO) <<<
=============================================================================
El alumno ha seleccionado expresamente el modo "MÁS POR ENCIMA / CORTO".
DEBES HACERLO MUY SINTÉTICO, CORTO Y DIRECTO AL GRANO:
1. DEFINICIONES CORTAS Y DIRECTAS (campo 'formalDefinition'):
   - Definición concisa de 1 párrafo breve y directo a la esencia.
2. EXPLICACIÓN RESUMIDA (campo 'passionExplanation'):
   - 1 párrafo corto y claro que transmita la idea clave en 20 segundos.
3. GLOSARIO COMPACTO (campo 'glossary'):
   - 4 a 5 términos esenciales con definiciones de una sola frase directa.
4. SECCIONES PANORÁMICAS (campo 'sections'):
   - 2 a 3 secciones breves de alto nivel con 2 puntos sintetizados en 'detailedBreakdown'.
   - 'keyConcepts': 3 conceptos clave por sección.
5. RESUMEN GLOBAL ('overview'):
   - 1 párrafo ultra sintetizado.
6. EJERCICIOS ESENCIALES:
   - 4 a 5 preguntas tipo test directas y 4 flashcards clave.`
      : `
=============================================================================
>>> DIRECTIVA: PROFUNDIDAD NORMAL Y EQUILIBRADA <<<
=============================================================================
1. DEFINICIÓN FORMAL (campo 'formalDefinition'): 2 párrafos claros y estructurados.
2. EXPLICACIÓN (campo 'passionExplanation'): 2 párrafos pedagógicos.
3. GLOSARIO (campo 'glossary'): 6 a 8 términos con definiciones precisas.
4. SECCIONES (campo 'sections'): 3 a 5 secciones con 1-2 párrafos por sección y 2 a 3 puntos en 'detailedBreakdown'.
5. EJERCICIOS: 6 a 8 preguntas tipo test, 4 a 5 verdadero/falso, 5 flashcards.`;

    const customDirective =
      customInstructions && customInstructions.trim()
        ? `
=============================================================================
>>> INSTRUCCIONES ESPECÍFICAS Y OBLIGATORIAS DEL ALUMNO (CUMPLIMIENTO ESTRICTO) <<<
=============================================================================
"""${customInstructions.trim()}"""
REGLAS OBLIGATORIAS DE CUMPLIMIENTO:
- Si el alumno te indica que NO expliques un punto, tema o apartado (o que te saltes algo), DEBES ELIMINARLO POR COMPLETO de las definiciones, resúmenes, secciones, glosario y ejercicios.
- Si el alumno te pide centrarte, priorizar o enfatizar un aspecto (ej: fórmulas, cálculos, mecanismos, casos prácticos), dedícale la máxima atención y espacio en todos los apartados.
- Sigue exactamente cualquier otra indicación de estilo, tono o enfoque que haya escrito el alumno.
`
        : "";

    const promptText = `
Eres un profesor de élite, pedagogo experto y analizador documental de máxima precisión.
El estudiante te ha facilitado material de estudio (documentos PDF, archivos de apuntes, imágenes de notas o páginas web).

${depthSpecificGuidelines}

${customDirective}

MISIÓN PRIMORDIAL: ANÁLISIS DOCUMENTAL EXHAUSTIVO Y RIGUROSO.
${
  isNoAnalogyMode
    ? `MODO DE APRENDIZAJE: CONTENIDO NORMAL Y DIRECTO (SIN ANALOGÍAS NI METÁFORAS AJENAS).
Explica el temario con rigor académico, didáctica clara y estructura impecable.`
    : `MODO DE APRENDIZAJE: ADAPTADO A LAS PASIONES DEL ALUMNO: [${passionsList}].
Utiliza comparaciones ingeniosas con [${passionsList}] para ilustrar los conceptos difíciles.`
}

REQUISITOS FUNDAMENTALES DE REDACCIÓN:
- USO OBLIGATORIO DE NEGRITAS (**concepto**): Destaca en **negrita** todas las palabras clave importantes, fórmulas, nombres técnicos, etapas y principios.
- ESTRUCTURA DE PÁRRAFOS: Separa siempre los párrafos con saltos de línea dobles (\\n\\n) para garantizar máxima legibilidad.
- RESPETO TOTAL A LA PROFUNDIDAD SELECCIONADA:
  * Si es "MUY PROFUNDO": definiciones largas, exhaustivas, desglosando todos los apartados y fórmulas con todo detalle.
  * Si es "MÁS POR ENCIMA": conciso, definiciones cortas y directas al grano.
  * Si es "NORMAL": equilibrado.

Información de entrada del estudiante:
${manualText ? `Texto/Apuntes escritos: """${manualText}"""\n` : ""}

Todo en español natural, motivador, claro, exhaustivo y bien estructurado.
`;

    parts.push({ text: promptText });

    // Schema for structured JSON response
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        formalDefinition: { type: Type.STRING },
        passionExplanation: { type: Type.STRING },
        quickTakeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        overview: { type: Type.STRING },
        selectedPassions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        glossary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.STRING },
              formalDefinition: { type: Type.STRING },
              simpleExplanation: { type: Type.STRING },
              category: { type: Type.STRING },
              example: { type: Type.STRING },
            },
            required: ["term", "formalDefinition", "simpleExplanation"],
          },
        },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              keyConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              detailedBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pointTitle: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    keyRule: { type: Type.STRING },
                  },
                  required: ["pointTitle", "explanation"],
                },
              },
            },
            required: ["id", "title", "content", "keyConcepts"],
          },
        },
        mindMap: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            emoji: { type: Type.STRING },
            color: { type: Type.STRING },
            description: { type: Type.STRING },
            children: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  color: { type: Type.STRING },
                  description: { type: Type.STRING },
                  children: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        description: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        category: { type: Type.STRING },
                        keyPoints: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        analogy: { type: Type.STRING },
                        example: { type: Type.STRING },
                        examTip: { type: Type.STRING },
                      },
                      required: ["id", "label", "description"],
                    },
                  },
                },
                required: ["id", "label", "description", "children"],
              },
            },
          },
          required: ["id", "label", "children"],
        },
        keyPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        analogies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              passion: { type: Type.STRING },
              concept: { type: Type.STRING },
              analogy: { type: Type.STRING },
              takeaway: { type: Type.STRING },
            },
            required: ["passion", "concept", "analogy", "takeaway"],
          },
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              analogyHint: { type: Type.STRING },
            },
            required: ["id", "front", "back"],
          },
        },
        quizQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              analogyExplanation: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["id", "question", "options", "correctIndex", "explanation", "analogyExplanation", "difficulty"],
          },
        },
        trueFalseQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              statement: { type: Type.STRING },
              isTrue: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["id", "statement", "isTrue", "explanation"],
          },
        },
        matchPairs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
            },
            required: ["id", "term", "definition"],
          },
        },
        fillBlanks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              sentenceWithBlank: { type: Type.STRING },
              answer: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              hint: { type: Type.STRING },
            },
            required: ["id", "sentenceWithBlank", "answer", "options", "hint"],
          },
        },
      },
      required: [
        "topic",
        "formalDefinition",
        "passionExplanation",
        "quickTakeaways",
        "overview",
        "glossary",
        "sections",
        "mindMap",
        "selectedPassions",
        "keyPoints",
        "analogies",
        "flashcards",
        "quizQuestions",
        "trueFalseQuestions",
        "matchPairs",
        "fillBlanks",
      ],
    };

    // Resilient generation with automatic retry backoff and candidate model failover
    const response = await generateWithResilience(ai, {
      candidateModels: ["gemini-3.1-flash-lite", "gemini-3.8-flash"],
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
        temperature: 0.2,
        systemInstruction:
          "Eres un tutor educativo de excelencia, experto en síntesis completa de temarios, pedagogía estructurada, mapas conceptuales y analogías.",
      },
      maxRetriesPerModel: 0,
    });

    const text = (response.text || "{}").trim();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
      } else {
        throw new Error("No se pudo interpretar la respuesta generada como JSON.");
      }
    }

    // Auto-repair missing fields if any
    data.id = "study_" + Date.now();
    data.createdAt = new Date().toISOString();
    if (!data.selectedPassions || data.selectedPassions.length === 0) {
      data.selectedPassions = isNoAnalogyMode ? ["Contenido normal"] : passions;
    } else if (isNoAnalogyMode) {
      data.selectedPassions = ["Contenido normal"];
    }

    if (!data.formalDefinition) {
      data.formalDefinition = data.overview || "Definición formal y exacta del concepto.";
    }

    if (!data.passionExplanation) {
      if (isNoAnalogyMode) {
        data.passionExplanation = data.formalDefinition || "Explicación directa y detallada del temario.";
      } else if (Array.isArray(data.analogies) && data.analogies.length > 0) {
        data.passionExplanation = data.analogies
          .map((a: any) => `${a.concept}: ${a.analogy} (Regla de oro: ${a.takeaway})`)
          .join("\n\n");
      } else {
        data.passionExplanation = `Explicación personalizada conectada con tus gustos: ${passionsList}.`;
      }
    }

    if (!Array.isArray(data.quickTakeaways) || data.quickTakeaways.length === 0) {
      if (Array.isArray(data.keyPoints) && data.keyPoints.length > 0) {
        data.quickTakeaways = data.keyPoints.slice(0, 4);
      } else {
        data.quickTakeaways = [
          "Concepto clave sintetizado.",
          "Mecanismo y funcionamiento principal.",
          "Resultado e impacto del proceso.",
        ];
      }
    }

    // Ensure sections exists
    if (!Array.isArray(data.sections) || data.sections.length === 0) {
      data.sections = [
        {
          id: "sec_1",
          title: "1. Fundamentos y Conceptos Generales",
          content: data.overview || "Resumen del tema",
          keyConcepts: (data.keyPoints || []).slice(0, 3),
        },
        {
          id: "sec_2",
          title: "2. Puntos Clave y Mecanismos",
          content: (data.keyPoints || []).join(". "),
          keyConcepts: (data.keyPoints || []).slice(3),
        },
      ];
    }

    // Ensure detailedBreakdown exists in each section
    data.sections = data.sections.map((sec: any, sIdx: number) => {
      if (!Array.isArray(sec.detailedBreakdown) || sec.detailedBreakdown.length === 0) {
        const kcs = Array.isArray(sec.keyConcepts) && sec.keyConcepts.length > 0
          ? sec.keyConcepts
          : ["Concepto fundamental", "Mecanismo clave", "Impacto y resultado"];
        sec.detailedBreakdown = kcs.map((kc: string, bIdx: number) => ({
          pointTitle: `${sIdx + 1}.${bIdx + 1}. Análisis de ${kc}`,
          explanation: `Estudio detallado de **${kc}**: elemento indispensable en ${sec.title}. Explica la interacción y dinámica de esta fase sin omitir detalles evaluables.`,
          keyRule: `Punto crítico para el examen: comprobar las condiciones y causas directas de ${kc}.`,
        }));
      }
      return sec;
    });

    // Ensure glossary exists and is rich
    if (!Array.isArray(data.glossary) || data.glossary.length === 0) {
      const generatedGlossary: any[] = [];
      if (Array.isArray(data.matchPairs) && data.matchPairs.length > 0) {
        for (const pair of data.matchPairs) {
          generatedGlossary.push({
            term: pair.term,
            formalDefinition: pair.definition,
            simpleExplanation: `Idea clave explicada: ${pair.definition}`,
            category: "Definición Clave",
            example: `Punto recurrente en ${data.topic}`,
          });
        }
      }
      if (Array.isArray(data.keyPoints)) {
        for (const kp of data.keyPoints.slice(0, 5)) {
          const parts = kp.split(":");
          if (parts.length > 1) {
            generatedGlossary.push({
              term: parts[0].replace(/[*#]/g, "").trim(),
              formalDefinition: parts.slice(1).join(":").trim(),
              simpleExplanation: parts.slice(1).join(":").trim(),
              category: "Concepto Esencial",
            });
          }
        }
      }
      data.glossary = generatedGlossary;
    }

    // Ensure mindMap exists
    if (!data.mindMap || !Array.isArray(data.mindMap.children) || data.mindMap.children.length === 0) {
      const palette = ["#0284c7", "#059669", "#d97706", "#7c3aed", "#e11d48"];
      data.mindMap = {
        id: "mm_root",
        label: data.topic || "Tema Central",
        emoji: "🧠",
        color: "#4f46e5",
        description: data.overview ? data.overview.slice(0, 120) + "..." : "Esquema del tema",
        children: (data.sections || []).map((sec: any, idx: number) => ({
          id: `branch_${idx}`,
          label: sec.title.replace(/^\d+\.\s*/, ""),
          emoji: ["📌", "⚡", "🔬", "🎯", "💡"][idx % 5],
          color: palette[idx % palette.length],
          description: sec.content ? sec.content.slice(0, 80) + "..." : "",
          children: (sec.keyConcepts || []).map((kc: string, subIdx: number) => ({
            id: `leaf_${idx}_${subIdx}`,
            label: kc,
            description: `Concepto clave de ${sec.title}`,
          })),
        })),
      };
    }

    // Ensure quiz questions have valid difficulty levels and unique IDs
    if (Array.isArray(data.quizQuestions)) {
      data.quizQuestions = data.quizQuestions.map((q: any, qIdx: number) => {
        let diff = (q.difficulty || "").toLowerCase().trim();
        if (diff !== "facil" && diff !== "medio" && diff !== "dificil") {
          // Stagger difficulty if missing or invalid
          if (qIdx % 3 === 0) diff = "facil";
          else if (qIdx % 3 === 1) diff = "medio";
          else diff = "dificil";
        }

        const rawOptions: string[] =
          Array.isArray(q.options) && q.options.length >= 2
            ? [...q.options]
            : ["Opción A", "Opción B", "Opción C", "Opción D"];

        const origIdx =
          typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < rawOptions.length
            ? q.correctIndex
            : 0;

        const correctText = rawOptions[origIdx];

        // Shuffle options so correct answer is NOT always in the same position
        const shuffled = [...rawOptions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const newCorrectIdx = shuffled.indexOf(correctText);

        return {
          id: q.id || `quiz_${Date.now()}_${qIdx}`,
          question: q.question || "Pregunta de repaso",
          options: shuffled,
          correctIndex: newCorrectIdx !== -1 ? newCorrectIdx : 0,
          explanation: q.explanation || "Explicación de la respuesta correcta.",
          analogyExplanation: q.analogyExplanation || "",
          difficulty: diff,
        };
      });
    }

    if (Array.isArray(data.trueFalseQuestions)) {
      data.trueFalseQuestions = data.trueFalseQuestions.map((tf: any, tfIdx: number) => {
        let diff = (tf.difficulty || "").toLowerCase().trim();
        if (diff !== "facil" && diff !== "medio" && diff !== "dificil") {
          if (tfIdx % 3 === 0) diff = "facil";
          else if (tfIdx % 3 === 1) diff = "medio";
          else diff = "dificil";
        }
        return {
          id: tf.id || `tf_${Date.now()}_${tfIdx}`,
          statement: tf.statement || "Afirmación del tema",
          isTrue: typeof tf.isTrue === "boolean" ? tf.isTrue : tfIdx % 2 === 0,
          explanation: tf.explanation || "Explicación del enunciado.",
          difficulty: diff,
        };
      });
    }

    data.studyDepth = studyDepth;
    data.customInstructions = customInstructions;

    res.setHeader("Content-Type", "application/json");
    res.json(data);
  } catch (err: any) {
    console.error("Error in /api/study/analyze:", err);
    const rawMsg = err?.message || String(err);
    let friendlyMessage = "Error al procesar el material de estudio.";
    let statusCode = 500;

    if (
      rawMsg.includes("429") ||
      rawMsg.includes("RESOURCE_EXHAUSTED") ||
      rawMsg.includes("Quota exceeded") ||
      rawMsg.includes("quota")
    ) {
      statusCode = 429;
      friendlyMessage =
        "El servicio de inteligencia artificial ha alcanzado temporalmente el límite de solicitudes por minuto. Por favor, espera unos segundos y pulsa en 'Reintentar'.";
    } else if (
      rawMsg.includes("503") ||
      rawMsg.includes("UNAVAILABLE") ||
      rawMsg.includes("high demand") ||
      rawMsg.includes("overloaded")
    ) {
      statusCode = 503;
      friendlyMessage =
        "Los modelos de IA están experimentando una alta demanda momentánea. Por favor, pulsa en volver a intentar en unos segundos.";
    } else {
      // Try to extract readable message if it's a JSON ApiError
      try {
        const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error?.message) {
            friendlyMessage = parsed.error.message;
          }
        } else {
          friendlyMessage = err?.message || friendlyMessage;
        }
      } catch {
        friendlyMessage = err?.message || friendlyMessage;
      }
    }

    res.setHeader("Content-Type", "application/json");
    res.status(statusCode).json({ error: friendlyMessage });
  }
});

// API: Generate additional questions with custom difficulty on-demand
app.post("/api/study/generate-questions", async (req, res) => {
  try {
    const {
      topic = "General",
      overview = "",
      difficulty = "medio", // "facil" | "medio" | "dificil" | "mixto"
      count = 5,
    } = req.body;

    const ai = getGeminiClient();

    let difficultyInstruction = "";
    if (difficulty === "facil") {
      difficultyInstruction = "Genera preguntas de nivel FÁCIL: enfocadas en el recuerdo directo de conceptos, términos clave, definiciones elementales y fórmulas básicas.";
    } else if (difficulty === "dificil") {
      difficultyInstruction = "Genera preguntas de nivel DIFÍCIL / EXAMEN: razonamiento profundo, trampas habituales de examen, casos prácticos combinados, análisis crítico de causas-consecuencias y deducciones rigurosas.";
    } else if (difficulty === "medio") {
      difficultyInstruction = "Genera preguntas de nivel MEDIO: comprensión de procesos, mecanismos intermedios, relaciones causa-efecto y aplicación de conceptos.";
    } else {
      difficultyInstruction = "Genera un conjunto MIXTO equilibrado de preguntas que incluya preguntas fáciles, medianas y difíciles de examen.";
    }

    const promptText = `
Eres un examinador educativo experto en diseñar baterías de preguntas tipo test de máxima calidad pedagógica.
Tema: "${topic}"
Resumen de referencia: """${overview.slice(0, 2000)}"""

NIVEL SOLICITADO: ${difficulty.toUpperCase()}
${difficultyInstruction}

REQUISITOS:
1. Genera exactamente ${count} preguntas tipo test (4 opciones cada una) y 2 preguntas de Verdadero/Falso.
2. Cada pregunta DEBE tener:
   - 'question': Enunciado claro, bien redactado con términos clave en negrita si procede.
   - 'options': Array de 4 opciones plausibles (solo 1 correcta).
   - 'correctIndex': Índice entero (0 a 3) de la opción correcta.
   - 'explanation': Justificación concisa y clara de por qué esa opción es la correcta.
   - 'analogyExplanation': Pista o analogía pedagógica directa.
   - 'difficulty': '${difficulty === "mixto" ? "facil | medio | dificil" : difficulty}'.
3. En las preguntas de Verdadero o Falso ('trueFalseQuestions'), incluye 'statement', 'isTrue', 'explanation' y 'difficulty'.
`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        quizQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              analogyExplanation: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["question", "options", "correctIndex", "explanation", "difficulty"],
          },
        },
        trueFalseQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              statement: { type: Type.STRING },
              isTrue: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING },
              difficulty: { type: Type.STRING },
            },
            required: ["statement", "isTrue", "explanation", "difficulty"],
          },
        },
      },
      required: ["quizQuestions"],
    };

    const response = await generateWithResilience(ai, {
      candidateModels: ["gemini-3.1-flash-lite"],
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
        temperature: 0.3,
        systemInstruction: "Diseña preguntas de examen rigurosas, pedagógicas y ajustadas con precisión milimétrica al nivel de dificultad solicitado.",
      },
      maxRetriesPerModel: 0,
    });

    const parsed = JSON.parse(response.text || "{}");
    const timestamp = Date.now();

    const quizQuestions = (parsed.quizQuestions || []).map((q: any, idx: number) => {
      const rawOptions: string[] =
        Array.isArray(q.options) && q.options.length >= 2
          ? [...q.options]
          : ["Opción A", "Opción B", "Opción C", "Opción D"];

      const origIdx =
        typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < rawOptions.length
          ? q.correctIndex
          : 0;

      const correctText = rawOptions[origIdx];

      // Shuffle options so correct answer is NOT always in the same position
      const shuffled = [...rawOptions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const newCorrectIdx = shuffled.indexOf(correctText);

      return {
        id: `gen_q_${timestamp}_${idx}`,
        question: q.question,
        options: shuffled,
        correctIndex: newCorrectIdx !== -1 ? newCorrectIdx : 0,
        explanation: q.explanation || "Respuesta correcta explicada.",
        analogyExplanation: q.analogyExplanation || "",
        difficulty: ["facil", "medio", "dificil"].includes(q.difficulty?.toLowerCase())
          ? q.difficulty.toLowerCase()
          : (difficulty === "mixto" ? (idx % 3 === 0 ? "facil" : idx % 3 === 1 ? "medio" : "dificil") : difficulty),
      };
    });

    const trueFalseQuestions = (parsed.trueFalseQuestions || []).map((tf: any, idx: number) => ({
      id: `gen_tf_${timestamp}_${idx}`,
      statement: tf.statement,
      isTrue: typeof tf.isTrue === "boolean" ? tf.isTrue : idx % 2 === 0,
      explanation: tf.explanation || "",
      difficulty: ["facil", "medio", "dificil"].includes(tf.difficulty?.toLowerCase())
        ? tf.difficulty.toLowerCase()
        : (difficulty === "mixto" ? (idx % 2 === 0 ? "medio" : "dificil") : difficulty),
    }));

    res.setHeader("Content-Type", "application/json");
    res.json({ quizQuestions, trueFalseQuestions });
  } catch (err: any) {
    console.error("Error in /api/study/generate-questions:", err);
    res.status(500).json({ error: err?.message || "Error al generar preguntas adicionales." });
  }
});

// API: AI Chatbot Tutor with memory & analogies
app.post("/api/study/chat", async (req, res) => {
  try {
    const {
      messages = [],
      topic = "General",
      overview = "",
      passions = ["fútbol", "aviones"],
      studyDepth = "normal",
      customInstructions = "",
    } = req.body;
    const ai = getGeminiClient();

    const isNoAnalogyMode =
      !Array.isArray(passions) ||
      passions.length === 0 ||
      passions.some((p: any) =>
        typeof p === "string" && /sin analog|ningun|normal|directo|clasico/i.test(p)
      );

    const passionsList = !isNoAnalogyMode && Array.isArray(passions) && passions.length > 0
      ? passions.join(", ")
      : "ninguna (modo contenido normal)";

    const systemInstruction = `
Eres un tutor personal inteligente, paciente y pedagógico.
Estás ayudando al estudiante con el tema: "${topic}".
Resumen del tema actual: """${overview.slice(0, 1500)}"""
${
  isNoAnalogyMode
    ? `MODO DE ESTUDIO DEL ALUMNO: CONTENIDO NORMAL Y DIRECTO (SIN ANALOGÍAS NI METÁFORAS AJENAS).
- Explica de forma académica directa, clara y rigurosa sin metáforas forzadas de fútbol, aviones ni videojuegos.`
    : `PASIONES DEL ESTUDIANTE: [${passionsList}].
- Puedes usar metáforas puntuales y naturales con [${passionsList}] para ilustrar conceptos difíciles cuando sea útil.`
}

${
  studyDepth === "profundo"
    ? `PROFUNDIDAD SOLICITADA POR EL ALUMNO: MUY PROFUNDIZADO Y EXHAUSTIVO.
- El estudiante quiere respuestas MUY DETALLADAS, PROFUNDAS Y EXHAUSTIVAS.
- Explica minuciosamente el cómo y el porqué, mecanismos paso a paso, fórmulas, variables y detalles técnicos.
- Las definiciones deben ser largas, desarrolladas y sin atajos.`
    : studyDepth === "resumido"
    ? `PROFUNDIDAD SOLICITADA POR EL ALUMNO: MÁS POR ENCIMA / CORTO / SINTÉTICO.
- El estudiante quiere respuestas MUY CORTAS, RÁPIDAS Y DIRECTAS.
- Ve directo al grano en 1 o 2 párrafos breves sin rodeos ni desarrollos extensos.`
    : `PROFUNDIDAD SOLICITADA: EQUILIBRADA Y PEDAGÓGICA (2 o 3 párrafos claros).`
}

${
  customInstructions && customInstructions.trim()
    ? `DIRECTIVAS ESPECÍFICAS Y OBLIGATORIAS DEL ALUMNO (CÚMPLELAS ESTRICTAMENTE):
"""${customInstructions.trim()}"""
- Si el alumno te pidió no explicar un punto o saltarse algo, NO lo expliques.
- Si te pidió centrarte en algo específico (fórmulas, ejemplos prácticos, etc.), enfócate en ello al 100%.`
    : ""
}

PAUTAS DE REDACCIÓN Y FORMATO:
${
  studyDepth === "profundo"
    ? `- Respuestas extensas y rigurosas, desglosando cada aspecto con claridad.
- Destaca en **negrita** los términos cruciales y fórmulas.
- Si explicas un proceso, usa listas numeradas detalladas.`
    : studyDepth === "resumido"
    ? `- Respuestas cortas, sintéticas y al grano (1 o 2 párrafos).
- Destaca en **negrita** solo lo esencial.`
    : `- Respuestas ordenadas y pedagógicas en 2 o 3 párrafos breves.
- Destaca en **negrita** únicamente los conceptos o fórmulas clave.`
}
- Evita saturar el texto de cajas o emojis innecesarios; la lectura debe ser limpia y comprensible.
- Tono: motivador, cercano y en español impecable.
`;

    // Format chat history
    const contents: any[] = [];
    for (const msg of messages) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: "¿Puedes explicarme este tema de forma ultra sencilla usando mis pasiones?" }],
      });
    }

    const response = await generateWithResilience(ai, {
      candidateModels: ["gemini-3.1-flash-lite"],
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
      maxRetriesPerModel: 0,
    });

    res.setHeader("Content-Type", "application/json");
    res.json({ reply: response.text || "¡Excelente pregunta! Déjame explicártelo." });
  } catch (err: any) {
    console.error("Error in /api/study/chat:", err);
    const rawMsg = err?.message || String(err);
    let friendly = "Error al comunicarse con el tutor.";
    if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota")) {
      friendly = "El tutor IA ha alcanzado el límite temporal de solicitudes por minuto. Por favor, espera 30 segundos y vuelve a escribir.";
    }
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: friendly, reply: friendly });
  }
});

// API: Generate Animated Explainer Video Storyboard based on uploaded study topic
app.post("/api/study/generate-video", async (req, res) => {
  try {
    const {
      topic = "Tema de estudio",
      overview = "",
      formalDefinition = "",
      passionExplanation = "",
      sections = [],
      mindMap = null,
      analogies = [],
      keyPoints = [],
      passions = [],
      stylePreference = "whiteboard",
    } = req.body;

    const ai = getGeminiClient();

    const sectionsSummary = Array.isArray(sections)
      ? sections.map((s: any) => `- ${s.title}: ${s.content?.slice(0, 200)} (Claves: ${(s.keyConcepts || []).join(", ")})`).join("\n")
      : "";

    const analogiesSummary = Array.isArray(analogies)
      ? analogies.map((a: any) => `- ${a.concept} = ${a.analogy} (Regla: ${a.takeaway})`).join("\n")
      : "";

    const isNoAnalogy =
      !Array.isArray(passions) ||
      passions.length === 0 ||
      passions.some((p: any) =>
        typeof p === "string" && /sin analog|ningun|normal|directo|clasico/i.test(p)
      );

    const styleInstructions = {
      whiteboard: "Estilo Pizarra Ilustrada (Whiteboard Explainer): animaciones paso a paso de fórmulas, esquemas dibujados y textos que aparecen como si se explicaran en una pizarra dinámica.",
      masterclass: "Estilo Masterclass Dinámica: ritmo ágil, conceptos en tarjetas cinéticas, flechas de flujo y alto impacto visual.",
      exam_prep: "Estilo Enfoque Examen de Alto Rendimiento: foco en preguntas trampa, definiciones rigurosas, fórmulas clave y trucos mnemotécnicos.",
      analogy_mode: isNoAnalogy
        ? "Estilo Didáctico Puro: sin analogías deportivas, explicación paso a paso clara, directa y visual con esquemas del tema real."
        : `Estilo Analogías Visuales: traduce cada paso complejo usando analogías visuales de [${passions.join(", ")}].`,
    }[stylePreference as string] || "Estilo Pizarra Ilustrada y Motion Graphics";

    const promptText = `
Eres un director de animación y pedagogo audiovisual de élite (estilo Kurzgesagt / 3Blue1Brown / Whiteboard Animation).
Tu misión es crear el GUION Y STORYBOARD COMPLETO de un VÍDEO EXPLICATIVO ANIMADO de alta calidad sobre el tema subido por el estudiante:

TEMA SUBIDO: "${topic}"
DEFINICIÓN FORMAL: """${formalDefinition || overview}"""
${!isNoAnalogy ? `EXPLICACIÓN CON ANALOGÍAS: """${passionExplanation}"""\nANALOGÍAS DISPONIBLES:\n${analogiesSummary}` : ""}
RESUMEN GLOBAL: """${overview}"""
PUNTOS CLAVE: ${(keyPoints || []).join("; ")}
SECCIONES DEL DOCUMENTO:
${sectionsSummary}

ESTILO VISUAL SOLICITADO: ${styleInstructions}

REQUISITOS DEL VÍDEO:
1. Divide el vídeo en 5 a 6 ESCENAS ANIMADAS perfectamente estructuradas pedagógicamente:
   - Escena 1 (tipo 'intro'): El gancho inicial, el problema real o la gran pregunta del tema, y la meta de aprendizaje.
   - Escena 2 (tipo 'formula' o 'whiteboard'): Definición formal, reactivos, componentes clave o fórmula fundamental.
   - Escena 3 (tipo 'diagram'): Proceso paso a paso o diagrama de flujo con nodos conectados por flechas (ciclo o etapas secuenciales).
   - Escena 4 (tipo 'analogy' o 'whiteboard'): ${isNoAnalogy ? "Profundización en un caso práctico real o mecanismo crucial" : "La analogía visual clave que hace 'click' mental en el estudiante"}.
   - Escena 5 (tipo 'whiteboard' o 'diagram'): Punto crítico de examen, trampa habitual y truco mnemotécnico para recordar.
   - Escena 6 (tipo 'summary'): Síntesis final con los 3 puntos que jamás se deben olvidar y cierre motivador.

2. PARA CADA ESCENA:
   - durationSeconds: entre 12 y 20 segundos.
   - narration: Guion de voz en off (en español claro, pausado, natural y apasionante). Debe coincidir en ritmo con la duración de la escena (aprox 25 a 45 palabras por escena).
   - elements: lista de 3 a 5 elementos visuales que entran secuencialmente (timingPercent: 0%, 25%, 50%, 75%...) con animaciones ("fade_in", "slide_up", "pop", "draw_border", "glow", "bounce", "typewriter").
   - visualDiagram: para escenas con diagramas o fórmulas, un esquema estructurado con nodos (label, sublabel, emoji o icono de Lucide como 'Zap', 'Flame', 'Activity', 'Layers', 'CheckCircle', 'AlertCircle', 'Target', 'Atom') y flechas que conectan los nodos.
   - keyTakeaway: frase memorable de 1 línea para fijar el conocimiento.
   - themeColor: color hexadecimal vibrante (#4f46e5, #059669, #d97706, #0284c7, #e11d48, #7c3aed, etc.).
   - badgeEmoji: un emoji representativo de la escena (ej: 🚀, 🔬, ⚡, ⚽, 🧠, 🎯, 💡).

Todo el guion debe estar en español impecable, motivador y 100% fiel al temario subido.
`;

    const videoResponseSchema = {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        topic: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        totalDurationSeconds: { type: Type.INTEGER },
        style: { type: Type.STRING },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              sceneNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              durationSeconds: { type: Type.INTEGER },
              narration: { type: Type.STRING },
              sceneType: { type: Type.STRING },
              themeColor: { type: Type.STRING },
              badgeEmoji: { type: Type.STRING },
              elements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                    highlight: { type: Type.STRING },
                    icon: { type: Type.STRING },
                    timingPercent: { type: Type.INTEGER },
                    animation: { type: Type.STRING },
                  },
                  required: ["id", "type", "content", "timingPercent", "animation"],
                },
              },
              visualDiagram: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  nodes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        sublabel: { type: Type.STRING },
                        icon: { type: Type.STRING },
                        color: { type: Type.STRING },
                      },
                      required: ["id", "label"],
                    },
                  },
                  arrows: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        from: { type: Type.STRING },
                        to: { type: Type.STRING },
                        label: { type: Type.STRING },
                      },
                      required: ["from", "to"],
                    },
                  },
                },
                required: ["type", "nodes"],
              },
              keyTakeaway: { type: Type.STRING },
            },
            required: [
              "id",
              "sceneNumber",
              "title",
              "subtitle",
              "durationSeconds",
              "narration",
              "sceneType",
              "themeColor",
              "badgeEmoji",
              "elements",
              "keyTakeaway",
            ],
          },
        },
      },
      required: ["id", "topic", "title", "description", "totalDurationSeconds", "scenes"],
    };

    const response = await generateWithResilience(ai, {
      candidateModels: ["gemini-3.1-flash-lite"],
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: videoResponseSchema as any,
        systemInstruction:
          "Eres un cineasta educativo y diseñador de motion graphics pedagógicos, especialista en crear vídeos explicativos animados altamente adictivos y fáciles de asimilar.",
      },
      maxRetriesPerModel: 0,
    });

    const parsedData = JSON.parse(response.text || "{}");
    parsedData.id = "vid_" + Date.now();
    parsedData.createdAt = new Date().toISOString();
    parsedData.topic = topic;

    // Recalculate total duration if scenes exist
    if (Array.isArray(parsedData.scenes) && parsedData.scenes.length > 0) {
      parsedData.totalDurationSeconds = parsedData.scenes.reduce(
        (sum: number, sc: any) => sum + (Number(sc.durationSeconds) || 14),
        0
      );
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error("Error in /api/study/generate-video:", err);

    // Resilient fallback generator based on the topic and materials so the user never gets an error screen!
    const {
      topic = "Tema de estudio",
      overview = "",
      formalDefinition = "",
      keyPoints = [],
      analogies = [],
      stylePreference = "whiteboard",
    } = req.body || {};

    const kp1 = keyPoints[0] || "Principio elemental de funcionamiento y captación de energía.";
    const kp2 = keyPoints[1] || "Mecanismo de acción dinámico e interconexión de componentes.";
    const kp3 = keyPoints[2] || "Optimización, regulación y puntos críticos evaluables.";
    const analogyText = analogies[0]?.text || "Imagina este sistema como una red de engranajes donde cada pieza transfiere su fuerza con precisión milimétrica.";

    const fallbackVideo = {
      id: "vid_fallback_" + Date.now(),
      topic,
      title: `Masterclass Animada: ${topic}`,
      description: `Guía visual cinemática paso a paso con animaciones dinámicas, circuitos y órbitas para dominar ${topic}.`,
      totalDurationSeconds: 90,
      style: stylePreference,
      createdAt: new Date().toISOString(),
      scenes: [
        {
          id: "sc_1",
          sceneNumber: 1,
          title: "1. El Núcleo del Problema & Telemetría",
          subtitle: "La gran pregunta y coordenadas del aprendizaje",
          durationSeconds: 15,
          narration: `Bienvenidos a esta masterclass animada sobre ${topic}. Hoy desentrañaremos sus secretos mediante visualización cinemática y análisis estructural interactivo.`,
          sceneType: "intro",
          themeColor: "#4f46e5",
          badgeEmoji: "🎯",
          elements: [
            { id: "e1", type: "heading", content: topic, highlight: "Concepto Clave", timingPercent: 10, animation: "pop" },
            { id: "e2", type: "text", content: overview?.slice(0, 160) || "Comprender los principios esenciales de este tema es clave para tus evaluaciones.", timingPercent: 30, animation: "fade_in" },
            { id: "e3", type: "badge", content: "Objetivo: Dominio audiovisual completo en 5 fases", icon: "Sparkles", timingPercent: 65, animation: "slide_up" },
          ],
          visualDiagram: {
            type: "stats",
            nodes: [
              { id: "st1", label: "Dificultad", sublabel: "Nivel Medio-Alto", icon: "Activity", color: "#6366f1" },
              { id: "st2", label: "Relevancia Examen", sublabel: "95% Frecuencia", icon: "Target", color: "#ec4899" },
              { id: "st3", label: "Tiempo Óptimo", sublabel: "Dominio en 2 min", icon: "Zap", color: "#10b981" },
            ],
          },
          keyTakeaway: "Entender el mapa global antes de memorizar los detalles técnicos.",
        },
        {
          id: "sc_2",
          sceneNumber: 2,
          title: "2. Principio y Derivación Conceptual",
          subtitle: "La fórmula fundamental y sus componentes",
          durationSeconds: 15,
          narration: `A nivel fundamental, ${topic} obedece a una relación directa. Fíjate en cómo cada variable condiciona el resultado final sin perder consistencia.`,
          sceneType: "formula",
          themeColor: "#0284c7",
          badgeEmoji: "📐",
          elements: [
            { id: "e4", type: "formula_box", content: formalDefinition?.slice(0, 95) || "Entrada / Reactivo ➔ [Transformación Dinámica] ➔ Rendimiento Máximo", highlight: "Ley Fundamental", timingPercent: 15, animation: "draw_border" },
            { id: "e5", type: "bullet", content: kp1, timingPercent: 55, animation: "slide_up" },
          ],
          visualDiagram: {
            type: "equation",
            nodes: [
              { id: "eq1", label: "Variable A", sublabel: "Parámetro Inicial", icon: "Layers", color: "#0284c7" },
              { id: "eq2", label: "Factor Operativo", sublabel: "Tasa de Cambio", icon: "Zap", color: "#f59e0b" },
              { id: "eq3", label: "Resultado Estable", sublabel: "Producto Final", icon: "CheckCircle", color: "#10b981" },
            ],
            arrows: [
              { from: "eq1", to: "eq2", label: "Influye" },
              { from: "eq2", to: "eq3", label: "Determina" },
            ],
          },
          keyTakeaway: "Cada término de la formulación tiene una correspondencia física o lógica medible.",
        },
        {
          id: "sc_3",
          sceneNumber: 3,
          title: "3. El Circuito de Flujo en Acción",
          subtitle: "Paso a paso a través de la canalización de energía",
          durationSeconds: 16,
          narration: `Observa ahora el pulso de la información: la energía o el dato recorre una secuencia rigurosa que asegura la estabilidad del sistema entero.`,
          sceneType: "diagram",
          themeColor: "#059669",
          badgeEmoji: "⚡",
          elements: [
            { id: "e6", type: "flow_step", content: "Etapa 1: Activación y captación del impulso", timingPercent: 15, animation: "slide_up" },
            { id: "e7", type: "flow_step", content: "Etapa 2: Procesamiento secuencial y transferencia", timingPercent: 45, animation: "slide_up" },
            { id: "e8", type: "flow_step", content: "Etapa 3: Estabilización y entrega del producto terminado", timingPercent: 75, animation: "glow" },
          ],
          visualDiagram: {
            type: "flow",
            nodes: [
              { id: "flow1", label: "Captación", sublabel: "Entrada de estímulo", icon: "Flame", color: "#3b82f6" },
              { id: "flow2", label: "Traducción", sublabel: "Conversión de estado", icon: "Zap", color: "#8b5cf6" },
              { id: "flow3", label: "Entrega", sublabel: "Efecto final", icon: "CheckCircle", color: "#10b981" },
            ],
            arrows: [
              { from: "flow1", to: "flow2", label: "Transmite" },
              { from: "flow2", to: "flow3", label: "Consolida" },
            ],
          },
          keyTakeaway: "El orden secuencial es invariable: alterar una fase interrumpe toda la cascada.",
        },
        {
          id: "sc_4",
          sceneNumber: 4,
          title: "4. Duelo Comparativo: Clave vs Error Típico",
          subtitle: "Lo que aprueba frente al fallo clásico en exámenes",
          durationSeconds: 15,
          narration: `¡Atención crucial! El error más repetido en los exámenes es confundir la causa con la consecuencia. Compara ambos enfoques directamente en pantalla.`,
          sceneType: "whiteboard",
          themeColor: "#e11d48",
          badgeEmoji: "⚔️",
          elements: [
            { id: "e9", type: "callout", content: "Trampa clásica: Asumir que el proceso es estático o reversible sin costo energético.", highlight: "Fallo Habitual", timingPercent: 20, animation: "bounce" },
            { id: "e10", type: "bullet", content: kp2, timingPercent: 60, animation: "fade_in" },
          ],
          visualDiagram: {
            type: "comparison",
            nodes: [
              { id: "cmp1", label: "Concepto Correcto", sublabel: "Respuesta de Matrícula", icon: "CheckCircle", color: "#10b981" },
              { id: "cmp2", label: "Error de Examen", sublabel: "Confusión Frecuente", icon: "AlertCircle", color: "#ef4444" },
            ],
            arrows: [
              { from: "cmp1", to: "cmp2", label: "Frente a" },
            ],
          },
          keyTakeaway: "Verificar siempre las condiciones de contorno y la dirección del fenómeno.",
        },
        {
          id: "sc_5",
          sceneNumber: 5,
          title: "5. Sistema Orbital & Analogía Clave",
          subtitle: "Visualización en órbita conceptual",
          durationSeconds: 15,
          narration: `Para fijar este conocimiento en tu memoria a largo plazo, visualiza la interacción como un sistema orbital armónico. ${analogyText.slice(0, 140)}`,
          sceneType: "analogy",
          themeColor: "#8b5cf6",
          badgeEmoji: "🪐",
          elements: [
            { id: "e11", type: "bullet", content: `Analogía: ${analogyText.slice(0, 120)}...`, timingPercent: 20, animation: "fade_in" },
            { id: "e12", type: "bullet", content: kp3, timingPercent: 60, animation: "pop" },
          ],
          visualDiagram: {
            type: "cycle",
            nodes: [
              { id: "orb1", label: "Núcleo Central", sublabel: topic.slice(0, 22), icon: "Atom", color: "#8b5cf6" },
              { id: "orb2", label: "Regulación", sublabel: "Orbita Primaria", icon: "Layers", color: "#38bdf8" },
              { id: "orb3", label: "Impacto Global", sublabel: "Orbita Externa", icon: "Sparkles", color: "#f43f5e" },
            ],
          },
          keyTakeaway: "Los conceptos no viven aislados; orbitan alrededor de un principio rector.",
        },
        {
          id: "sc_6",
          sceneNumber: 6,
          title: "6. Resumen de Alto Impacto & Maestría",
          subtitle: "Los 3 pilares indispensables para triunfar",
          durationSeconds: 14,
          narration: `¡Enhorabuena! Has completado el recorrido audiovisual de ${topic}. Con estos tres pilares grabados, tienes la máxima ventaja para cualquier prueba.`,
          sceneType: "summary",
          themeColor: "#f59e0b",
          badgeEmoji: "🏆",
          elements: [
            { id: "e13", type: "bullet", content: "1. Principio rector y magnitudes cuantitativas asimilados.", icon: "CheckCircle", timingPercent: 15, animation: "pop" },
            { id: "e14", type: "bullet", content: "2. Circuito secuencial y flujo de etapas consolidado.", icon: "CheckCircle", timingPercent: 45, animation: "pop" },
            { id: "e15", type: "bullet", content: "3. Diferenciación nítida frente a trampas de evaluación.", icon: "CheckCircle", timingPercent: 75, animation: "glow" },
          ],
          visualDiagram: {
            type: "stats",
            nodes: [
              { id: "sm1", label: "Retención", sublabel: "+85% Audiovisual", icon: "Zap", color: "#10b981" },
              { id: "sm2", label: "Dominio", sublabel: "Completo", icon: "CheckCircle", color: "#f59e0b" },
              { id: "sm3", label: "Siguiente Paso", sublabel: "Test Activo", icon: "Target", color: "#6366f1" },
            ],
          },
          keyTakeaway: "¡Dominio audiovisual alcanzado! Ahora refuerza tu aprendizaje con el test interactivo.",
        },
      ],
    };

    res.json(fallbackVideo);
  }
});

// In-memory cache for generated TTS audio to save API quota and provide instant playback
const ttsAudioCache = new Map<string, string>();
let geminiTtsCooldownUntil = 0;

// API: Text-to-Speech (TTS) using high-fidelity human voices via Gemini TTS
app.post("/api/study/tts", async (req, res) => {
  try {
    const {
      text = "Hola, bienvenido a tu sesión de estudio.",
      voice = "Kore", // Kore (warm/pedagogical), Puck (dynamic/young), Fenrir (documentary/deep), Zephyr (calm/clear)
    } = req.body;

    // Clean text to keep speech natural, removing raw markdown symbols
    const cleanText = text.replace(/[*#_`~]/g, "").slice(0, 800);

    const validVoices = ["Kore", "Puck", "Fenrir", "Zephyr", "Charon"];
    const selectedVoice = validVoices.includes(voice) ? voice : "Kore";
    const cacheKey = `${selectedVoice}_${cleanText}`;

    // 1. Instant return if cached in memory
    if (ttsAudioCache.has(cacheKey)) {
      return res.json({
        audioUrl: ttsAudioCache.get(cacheKey),
        voice: selectedVoice,
        cached: true,
      });
    }

    // 2. If Gemini TTS is temporarily in quota cooldown, tell frontend to use browser synth without failing
    if (Date.now() < geminiTtsCooldownUntil) {
      return res.json({
        audioUrl: null,
        fallbackToBrowser: true,
        reason: "QUOTA_EXCEEDED",
        message: "Límite de cuota IA alcanzado temporalmente. Usando voz del dispositivo.",
      });
    }

    const ai = getGeminiClient();
    let base64Audio: string | undefined;

    // Try candidate TTS models (flash-lite-tts first, then flash-tts)
    const ttsCandidateModels = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"];

    for (const modelName of ttsCandidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style: "Locución humana natural, cálida, pedagógica, fluida y expresiva en español",
                  },
                } as any,
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });

        base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          break;
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn(`TTS attempt with ${modelName} failed:`, errMsg);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
          // Set a 60 second cooldown so we don't bombard the API when quota is exhausted
          geminiTtsCooldownUntil = Date.now() + 60000;
          break;
        }
      }
    }

    if (!base64Audio) {
      // Gracefully signal fallback to browser voice instead of throwing 500
      return res.json({
        audioUrl: null,
        fallbackToBrowser: true,
        reason: "TTS_UNAVAILABLE",
        message: "Voz IA no disponible temporalmente. Se activa locución del navegador.",
      });
    }

    // Convert raw 24000Hz 16-bit mono PCM to playable WAV
    const pcmBuffer = Buffer.from(base64Audio, "base64");
    const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
    const wavBase64 = wavBuffer.toString("base64");
    const fullAudioUrl = `data:audio/wav;base64,${wavBase64}`;

    // Cache the successful audio in memory
    ttsAudioCache.set(cacheKey, fullAudioUrl);

    res.json({
      audioUrl: fullAudioUrl,
      voice: selectedVoice,
    });
  } catch (err: any) {
    console.error("Error in /api/study/tts:", err);
    res.json({
      audioUrl: null,
      fallbackToBrowser: true,
      error: err?.message || "Error al generar voz.",
    });
  }
});

// API: Audio Transcription using gemini-3.5-transcribe
app.post("/api/study/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Falta el audio en base64." });
    }

    const ai = getGeminiClient();
    const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;

    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          audioPart,
          { text: "Transcribe fielmente todo lo hablado en este audio en español. Devuelve únicamente el texto transcrito." },
        ],
      },
    });

    res.json({ transcription: response.text?.trim() || "" });
  } catch (err: any) {
    console.error("Error in /api/study/transcribe:", err);
    res.status(500).json({ error: err?.message || "Error al transcribir el audio." });
  }
});

// In-memory subscription & discount challenge state (per session/user)
let mockSubscriptionState = {
  isActive: true,
  planId: "plan_estudiante",
  planName: "Plan Estudiante Pro",
  basePriceEur: 1.99,
  discountPercentage: 15,
  finalPriceEur: 1.99,
  renewsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
  daysUntilRenewal: 1, // Default to 1 day before renewal so user can test the challenge immediately!
  canTakeOralExam: true,
  examAttemptUsed: false,
  attemptsCount: 0,
  maxAttempts: 2,
  discountEarned: false,
  discountCode: "",
};

// API: Get Subscription & Oral Exam Lock Status
app.get("/api/subscription/status", (_req, res) => {
  const canTake =
    mockSubscriptionState.daysUntilRenewal <= 1 &&
    mockSubscriptionState.attemptsCount < mockSubscriptionState.maxAttempts &&
    !mockSubscriptionState.discountEarned;

  res.json({
    ...mockSubscriptionState,
    canTakeOralExam: canTake,
    finalPriceEur: mockSubscriptionState.discountEarned
      ? +(mockSubscriptionState.basePriceEur * 0.85).toFixed(2)
      : mockSubscriptionState.basePriceEur,
  });
});

// API: Toggle / Simulate Days until renewal (Testing tool for the owner)
app.post("/api/subscription/simulate-cycle", (req, res) => {
  const { daysUntilRenewal, resetAttempt } = req.body;
  if (typeof daysUntilRenewal === "number") {
    mockSubscriptionState.daysUntilRenewal = Math.max(0, daysUntilRenewal);
  }
  if (resetAttempt) {
    mockSubscriptionState.examAttemptUsed = false;
    mockSubscriptionState.attemptsCount = 0;
    mockSubscriptionState.discountEarned = false;
    mockSubscriptionState.discountCode = "";
  }
  const canTake =
    mockSubscriptionState.daysUntilRenewal <= 1 &&
    mockSubscriptionState.attemptsCount < mockSubscriptionState.maxAttempts &&
    !mockSubscriptionState.discountEarned;

  mockSubscriptionState.canTakeOralExam = canTake;

  res.json({
    ...mockSubscriptionState,
    finalPriceEur: mockSubscriptionState.discountEarned
      ? +(mockSubscriptionState.basePriceEur * 0.85).toFixed(2)
      : mockSubscriptionState.basePriceEur,
  });
});

// API: Stripe Checkout Session Creation
app.post("/api/subscription/create-checkout-session", async (req, res) => {
  try {
    const { discountCode } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isDiscountValid =
      discountCode &&
      (discountCode === mockSubscriptionState.discountCode || discountCode.startsWith("ESTUDIO15"));

    const unitAmountCents = isDiscountValid ? 169 : 199; // 1,69 € con 15% dto o 1,99 € base

    if (stripeKey && stripeKey.startsWith("sk_")) {
      const stripe = new Stripe(stripeKey);
      const appUrl = process.env.APP_URL || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "EstudioSmart - Plan Estudiante Pro",
                description: isDiscountValid
                  ? "Suscripción mensual con 15% de Descuento por Examen Oral Aprobado (1,69 €/mes)"
                  : "Suscripción mensual ilimitada a EstudioSmart (1,99 €/mes)",
              },
              unit_amount: unitAmountCents,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/?payment=success`,
        cancel_url: `${appUrl}/?payment=cancel`,
      });

      return res.json({ url: session.url, simulation: false });
    } else {
      // Graceful test simulation when Stripe API key is not configured in environment
      mockSubscriptionState.isActive = true;
      if (isDiscountValid) {
        mockSubscriptionState.discountEarned = true;
        mockSubscriptionState.finalPriceEur = 1.69;
      }
      return res.json({
        simulation: true,
        success: true,
        message: isDiscountValid
          ? "¡Suscripción renovada con 15% de descuento aplicado! Precio final: 1,69 €/mes"
          : "Suscripción activada con éxito al Plan Estudiante Pro (1,99 €/mes).",
        finalPriceEur: isDiscountValid ? 1.69 : 1.99,
      });
    }
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    res.status(500).json({ error: err?.message || "Error al iniciar pasarela de Stripe." });
  }
});

// API: Evaluate Oral Exam with Anti-AI and Anti-Verbatim Verification (Single Attempt)
app.post("/api/study/evaluate-oral-exam", async (req, res) => {
  try {
    const {
      topic = "General",
      pointTitle = "Punto 1",
      pointExpectedContent = "",
      audioBase64 = "",
      transcription = "",
    } = req.body;

    const ai = getGeminiClient();
    let spokenText = (transcription || "").trim();

    // 1. Transcribe audio if text not provided
    if (!spokenText && audioBase64) {
      try {
        const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9\-]+;base64,/, "");
        const mimeMatch = audioBase64.match(/^data:(audio\/[a-z0-9\-]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "audio/webm";

        try {
          const transcribeRes = await ai.models.generateContent({
            model: "gemini-3.5-transcribe",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: "Transcribe fielmente en español todo lo dicho por la persona en este audio. Devuelve únicamente la transcripción exacta.",
                },
              ],
            },
          });
          spokenText = transcribeRes.text?.trim() || "";
        } catch (mErr: any) {
          console.warn("[Transcribe] gemini-3.5-transcribe fallback:", mErr?.message);
        }

        // Secondary fallback to gemini-3.1-flash-lite if 3.5 was empty
        if (!spokenText) {
          try {
            const fallbackRes = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: "Transcribe en español las palabras habladas en este audio. Si está completamente en silencio o no se entiende, responde solo: SILENCIO.",
                  },
                ],
              },
            });
            const text = fallbackRes.text?.trim() || "";
            if (text && !text.toUpperCase().includes("SILENCIO")) {
              spokenText = text;
            }
          } catch (fErr: any) {
            console.warn("[Transcribe] secondary fallback error:", fErr?.message);
          }
        }
      } catch (transcribeErr: any) {
        console.warn("Transcription note:", transcribeErr?.message);
      }
    }

    // If audio was completely silent or too short, return friendly retryable response WITHOUT consuming attempt
    if (!spokenText || spokenText.length < 8) {
      return res.json({
        retryable: true,
        passed: false,
        score: 0,
        aiDetected: false,
        readVerbatim: false,
        verdictTitle: "Audio no detectado o demasiado breve",
        detailedFeedback:
          "El micrófono no capturó suficiente voz o la grabación fue demasiado breve. Asegúrate de hablar con claridad y durante al menos 10 segundos explicando el tema. Tu intento NO se ha consumido para que puedas volver a grabarlo.",
        structureFidelityScore: 0,
        spontaneityScore: 0,
        attemptConsumed: false,
        discountCode: "",
        transcription: spokenText || "",
      });
    }

    // 2. Strict Examiner AI Prompt with Anti-AI detection
    const evalPrompt = `
Actúas como un tribunal examinador estricto y un sistema avanzado antifraude para una prueba oral universitaria.
El objetivo del examen es comprobar si el alumno se ha aprendido y comprendido el siguiente punto de sus apuntes para concederle un 15% de descuento en su suscripción.

DATOS DEL EXAMEN:
- Tema: "${topic}"
- Punto asignado para explicar: "${pointTitle}"
- Contenido exacto de los apuntes originales del alumno:
"""${pointExpectedContent.slice(0, 3000)}"""

TRANSCRIPCIÓN DE LO QUE EL ALUMNO HA DICHO POR VOZ:
"""${spokenText}"""

CRITERIOS ESTRICTOS DE EVALUACIÓN:
1. FIDELIDAD Y ESTRUCTURA DEL DOCUMENTO (35%):
   - ¿Ha seguido la estructura de los apuntes? ¿Menciona los conceptos clave o etapas del punto asignado?
2. CON SUS PROPIAS PALABRAS HUMANAS (35%):
   - Debe sonar a una persona real explicando algo de memoria con naturalidad y comprensión genuina.
3. DETECCIÓN CRÍTICA DE IA (30% - CAUSA DE ANULACIÓN INMEDIATA):
   - ¿Contiene fórmulas o conectores típicos de ChatGPT / Gemini? Ejemplos: "En resumen, es fundamental destacar que...", "A continuación exploraremos...", "En este sentido cabe señalar...", listas estructuradas con formato leído, tono enciclopédico rígido e impersonal.
   - Si notas el más mínimo indicio de texto generado por IA leído en voz alta, debes marcar "aiDetected": true y "passed": false.
4. LECTURA VERBATIM / COPIAR Y PEGAR:
   - Si el estudiante se ha limitado a leer palabra por palabra el texto de la pantalla en lugar de explicarlo con sus palabras, marca "readVerbatim": true y "passed": false.

REGLAS DE APROBADO:
- Para aprobar ("passed": true):
  * "aiDetected" DEBE SER FALSE.
  * "readVerbatim" DEBE SER FALSE.
  * "score" debe ser >= 70 sobre 100.
  * El alumno debe demostrar haber entendido los conceptos clave del punto con sus propias palabras.
`;

    const evalSchema = {
      type: Type.OBJECT,
      properties: {
        passed: { type: Type.BOOLEAN },
        score: { type: Type.INTEGER },
        aiDetected: { type: Type.BOOLEAN },
        readVerbatim: { type: Type.BOOLEAN },
        verdictTitle: { type: Type.STRING },
        detailedFeedback: { type: Type.STRING },
        structureFidelityScore: { type: Type.INTEGER },
        spontaneityScore: { type: Type.INTEGER },
      },
      required: [
        "passed",
        "score",
        "aiDetected",
        "readVerbatim",
        "verdictTitle",
        "detailedFeedback",
        "structureFidelityScore",
        "spontaneityScore",
      ],
    };

    const evalResponse = await generateWithResilience(ai, {
      candidateModels: ["gemini-3.1-flash-lite"],
      contents: [{ parts: [{ text: evalPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: evalSchema as any,
        temperature: 0.2,
      },
      maxRetriesPerModel: 0,
    });

    const result = JSON.parse(evalResponse.text || "{}");

    let discountCode = "";
    let canRetrySecondChance = false;

    if (result.aiDetected) {
      // AI Detected: immediate permanent disqualification for this cycle (no second chance)
      mockSubscriptionState.attemptsCount = mockSubscriptionState.maxAttempts;
      mockSubscriptionState.examAttemptUsed = true;
      mockSubscriptionState.discountEarned = false;
      canRetrySecondChance = false;
    } else if (result.passed && !result.readVerbatim) {
      // Passed successfully!
      discountCode = "ESTUDIO15-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      mockSubscriptionState.discountEarned = true;
      mockSubscriptionState.discountCode = discountCode;
      mockSubscriptionState.finalPriceEur = +(mockSubscriptionState.basePriceEur * 0.85).toFixed(2);
      mockSubscriptionState.examAttemptUsed = true;
      canRetrySecondChance = false;
    } else {
      // Definition was wrong, incomplete, or read verbatim
      mockSubscriptionState.attemptsCount = (mockSubscriptionState.attemptsCount || 0) + 1;
      mockSubscriptionState.discountEarned = false;

      if (mockSubscriptionState.attemptsCount < mockSubscriptionState.maxAttempts) {
        // Grant second chance on a DIFFERENT topic
        canRetrySecondChance = true;
        mockSubscriptionState.examAttemptUsed = false;
        result.verdictTitle = result.verdictTitle || "Explicación Incorrecta - Tienes una 2ª Oportunidad";
      } else {
        // All attempts exhausted
        canRetrySecondChance = false;
        mockSubscriptionState.examAttemptUsed = true;
        result.verdictTitle = result.verdictTitle || "Prueba No Superada (Oportunidades agotadas)";
      }
    }

    res.json({
      passed: Boolean(result.passed),
      score: result.score || 0,
      aiDetected: Boolean(result.aiDetected),
      readVerbatim: Boolean(result.readVerbatim),
      verdictTitle: result.verdictTitle || (result.passed ? "¡Examen Aprobado!" : "Prueba No Superada"),
      detailedFeedback: result.detailedFeedback || "",
      structureFidelityScore: result.structureFidelityScore || 0,
      spontaneityScore: result.spontaneityScore || 0,
      discountCode,
      transcription: spokenText,
      canRetrySecondChance,
      currentAttempt: mockSubscriptionState.attemptsCount,
      maxAttempts: mockSubscriptionState.maxAttempts,
      attemptConsumed: !canRetrySecondChance,
    });
  } catch (err: any) {
    console.error("Error evaluating oral exam:", err);
    res.status(500).json({ error: err?.message || "Error al evaluar la prueba oral." });
  }
});

// Start server with Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EstudioSmart server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
