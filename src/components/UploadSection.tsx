import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  Mic,
  MicOff,
  Plus,
  Loader2,
  Check,
  CheckCircle2,
  BookOpen,
  Globe,
  Link2,
  Database,
  Cloud,
  LogIn,
  BookCheck,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { StudyFile, StudyMaterial } from "../types";
import { sounds } from "../utils/audio";

interface UploadSectionProps {
  onAnalyze: (data: {
    files: StudyFile[];
    manualText: string;
    webUrl?: string;
    webUrls?: string[];
    passions: string[];
    studyDepth?: "resumido" | "normal" | "profundo";
    customInstructions?: string;
  }) => void;
  isLoading: boolean;
  onLoadSample: (sampleKey: string) => void;
  savedMaterials?: StudyMaterial[];
  onSelectSavedMaterial?: (material: StudyMaterial) => void;
  onDeleteSavedMaterial?: (materialId: string) => Promise<boolean | void> | boolean | void;
  currentUser?: any;
  onOpenAuth?: () => void;
  onOpenOralExam?: () => void;
}

const DEFAULT_PASSIONS = [
  { id: "futbol", label: "Fútbol", emoji: "⚽" },
  { id: "aviones", label: "Aviones", emoji: "✈️" },
  { id: "videojuegos", label: "Videojuegos", emoji: "🎮" },
  { id: "f1", label: "Fórmula 1", emoji: "🏎️" },
];

const SAMPLE_WEB_URLS = [
  { label: "🌿 Fotosíntesis (Wikipedia)", url: "https://es.wikipedia.org/wiki/Fotos%C3%ADntesis" },
  { label: "🍎 Leyes de Newton (Wikipedia)", url: "https://es.wikipedia.org/wiki/Leyes_de_Newton" },
  { label: "🪐 Sistema Solar (Wikipedia)", url: "https://es.wikipedia.org/wiki/Sistema_solar" },
  { label: "🏰 Revolución Francesa (Wikipedia)", url: "https://es.wikipedia.org/wiki/Revoluci%C3%B3n_francesa" },
];

function compressImageIfNeeded(file: File): Promise<{ base64: string; size: number }> {
  return new Promise((resolve) => {
    // If small image (under 1.5MB), read as-is
    if (file.size < 1.5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, size: file.size });
      reader.onerror = () => resolve({ base64: "", size: 0 });
      reader.readAsDataURL(file);
      return;
    }

    // Resize high-res camera photos to max 1800px width/height and compress to jpeg
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1800;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        const approxSize = Math.round((compressedBase64.length * 3) / 4);
        resolve({ base64: compressedBase64, size: approxSize });
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result as string, size: file.size });
        reader.readAsDataURL(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, size: file.size });
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onAnalyze,
  isLoading,
  onLoadSample,
  savedMaterials = [],
  onSelectSavedMaterial,
  onDeleteSavedMaterial,
  currentUser,
  onOpenAuth,
  onOpenOralExam,
}) => {
  const [inputTab, setInputTab] = useState<"files" | "url" | "text">("files");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [webUrl, setWebUrl] = useState("");
  const [webUrlPreview, setWebUrlPreview] = useState<{
    title: string;
    url: string;
    previewSnippet: string;
    charCount: number;
  } | null>(null);
  const [isLoadingUrlPreview, setIsLoadingUrlPreview] = useState(false);
  const [urlPreviewError, setUrlPreviewError] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [explanationMode, setExplanationMode] = useState<"normal" | "passions">("passions");
  const [selectedPassions, setSelectedPassions] = useState<string[]>(["Fútbol", "Aviones"]);
  const [customPassion, setCustomPassion] = useState("");
  const [studyDepth, setStudyDepth] = useState<"resumido" | "normal" | "profundo">("normal");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(15);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isNormalMode = explanationMode === "normal" || selectedPassions.length === 0;

  // Smooth loading progression ticker
  React.useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingStep(0);
      setLoadingProgress(15);

      let currentStep = 0;
      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          const next = Math.min(prev + 4, 94);
          if (next > 35 && currentStep === 0) {
            currentStep = 1;
            setLoadingStep(1);
          } else if (next > 60 && currentStep === 1) {
            currentStep = 2;
            setLoadingStep(2);
          } else if (next > 82 && currentStep === 2) {
            currentStep = 3;
            setLoadingStep(3);
          }
          return next;
        });
      }, 700);
    } else {
      setLoadingProgress(15);
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
  };

  const processFiles = (fileList: File[]) => {
    sounds.playPop();
    fileList.forEach(async (file) => {
      const fname = file.name.toLowerCase();
      const isPdf = file.type.includes("pdf") || fname.endsWith(".pdf");
      const isDoc =
        file.type.includes("word") ||
        file.type.includes("officedocument") ||
        fname.endsWith(".docx") ||
        fname.endsWith(".doc");
      const isText = file.type.startsWith("text/") || Boolean(fname.match(/\.(txt|md|csv|json)$/i));
      const isImage = file.type.startsWith("image/");

      if (isImage) {
        const { base64, size } = await compressImageIfNeeded(file);
        if (!base64) return;
        setFiles((prev) => [
          ...prev,
          {
            id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
            name: file.name,
            size,
            type: "image",
            base64,
            mimeType: "image/jpeg",
          },
        ]);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setFiles((prev) => [
            ...prev,
            {
              id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
              name: file.name,
              size: file.size,
              type: isPdf ? "pdf" : isDoc ? "doc" : isText ? "text" : "image",
              base64,
              mimeType:
                file.type ||
                (isPdf
                  ? "application/pdf"
                  : isDoc
                  ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  : isText
                  ? "text/plain"
                  : "image/jpeg"),
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (id: string) => {
    sounds.playPop();
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Select Normal mode (no analogies)
  const selectNormalMode = () => {
    sounds.playPop();
    setExplanationMode("normal");
    setSelectedPassions([]);
  };

  // Passion toggles
  const togglePassion = (label: string) => {
    sounds.playPop();
    setExplanationMode("passions");
    setSelectedPassions((prev) => {
      if (prev.includes(label)) {
        const remaining = prev.filter((p) => p !== label);
        if (remaining.length === 0) {
          setExplanationMode("normal");
        }
        return remaining;
      } else {
        return [...prev, label];
      }
    });
  };

  const addCustomPassion = () => {
    const trimmed = customPassion.trim();
    if (!trimmed) return;
    sounds.playPop();
    setExplanationMode("passions");
    if (!selectedPassions.includes(trimmed)) {
      setSelectedPassions((prev) => [...prev, trimmed]);
    }
    setCustomPassion("");
  };

  // Voice recording with gemini-3.5-transcribe
  const toggleVoiceRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          stream.getTracks().forEach((track) => track.stop());

          setIsTranscribing(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result as string;
              const res = await fetch("/api/study/transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audioBase64: base64Audio, mimeType: "audio/webm" }),
              });
              const contentType = res.headers.get("content-type") || "";
              const data = contentType.includes("json") ? await res.json().catch(() => ({})) : {};
              if (data?.transcription) {
                setManualText((prev) => (prev ? `${prev} ${data.transcription}` : data.transcription));
                sounds.playSuccess();
              }
            } catch (err) {
              console.error("Transcription error:", err);
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setInputTab("text");
        sounds.playPop();
      } catch (err) {
        console.error("Mic access error:", err);
        alert("No se pudo acceder al micrófono.");
      }
    }
  };

  const handleCheckUrl = async (urlToCheck?: string) => {
    const target = (urlToCheck || webUrl).trim();
    if (!target) return;
    try {
      setIsLoadingUrlPreview(true);
      setUrlPreviewError(null);
      const res = await fetch("/api/study/preview-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("json")) {
        throw new Error("No se pudo obtener vista previa directa.");
      }
      const data = await res.json();
      setWebUrlPreview(data);
      sounds.playPop();
    } catch (err: any) {
      console.warn("URL preview note:", err?.message);
      setUrlPreviewError("Enlace registrado. La IA lo analizará en profundidad al iniciar el estudio.");
    } finally {
      setIsLoadingUrlPreview(false);
    }
  };

  const handleSelectSampleUrl = (url: string) => {
    sounds.playPop();
    setWebUrl(url);
    handleCheckUrl(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasFiles = files.length > 0;
    const hasText = manualText.trim().length > 0;
    const hasUrl = webUrl.trim().length > 0;

    if (!hasFiles && !hasText && !hasUrl) {
      alert("Por favor sube un PDF, fotos, un enlace web o escribe algún texto.");
      return;
    }
    sounds.playPop();

    const finalPassions = isNormalMode ? ["Contenido normal"] : selectedPassions;

    onAnalyze({
      files,
      manualText,
      webUrl: webUrl.trim(),
      passions: finalPassions,
      studyDepth,
      customInstructions: customInstructions.trim(),
    });
  };

  const canSubmit = files.length > 0 || manualText.trim().length > 0 || webUrl.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Title & Centered Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
          Aprende fácil y a tu manera
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-lg mx-auto">
          Sube tus temas y te los explicamos con <strong>vídeos animados paso a paso</strong>, esquemas visuales, analogías y ejercicios interactivos.
        </p>
      </div>

      {/* 15% Discount Oral Exam Padlock Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-amber-500/10 rounded-3xl p-5 border-2 border-amber-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
            <Lock className="w-5 h-5 text-slate-950" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base text-slate-900">
                Desafío del Candado: Ahorra un 15% en tu cuota
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                1,99 € ➔ 1,69 €
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Un día antes de que renueve tu suscripción, se desbloquea el <strong>Examen Oral Anti-Copia</strong>. La IA te pedirá explicar un punto de tus apuntes con tu propia voz. Si no usas ChatGPT ni IA, ¡desbloquearás el descuento en Stripe! (Solo 1 intento).
            </p>
          </div>
        </div>

        {onOpenOralExam && (
          <button
            type="button"
            onClick={onOpenOralExam}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shrink-0 flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Ver Prueba 🔒</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12">
        {/* Step 1: Input Material Selection */}
        <div className="bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/90 shadow-sm space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              1. Elige tu material de estudio
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Acepta PDFs, fotos de apuntes, enlaces web (artículos/Wikipedia) o notas escritas
            </p>
          </div>

          {/* Auth Banner if not logged in */}
          {!currentUser && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Database className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    ¿Quieres guardar tus cuentas y temas en la base de datos?
                  </h4>
                  <p className="text-xs text-slate-600">
                    Crea tu cuenta o inicia sesión para sincronizar automáticamente tus temas y progreso en Firestore.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión / Registrarse</span>
              </button>
            </div>
          )}

          {/* Segmented Mode Selector */}
          <div className="flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setInputTab("files");
                sounds.playPop();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                inputTab === "files"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span className="truncate">PDF / Fotos</span>
              {files.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {files.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setInputTab("url");
                sounds.playPop();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                inputTab === "url"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span className="truncate">Enlace Web</span>
              {webUrl.trim() && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setInputTab("text");
                sounds.playPop();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                inputTab === "text"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Mic className="w-4 h-4 text-amber-600" />
              <span className="truncate">Texto / Voz</span>
              {manualText.trim() && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>
          </div>

          {/* TAB 1: Files (PDF & Images) */}
          {inputTab === "files" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-indigo-50/30 hover:bg-indigo-50/70 transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="application/pdf,image/*,.txt,.md,.csv,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-base font-bold text-slate-800">
                  Pulsa aquí para elegir archivos
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PDFs, documentos Word (.docx, .doc), fotos o apuntes de texto (.txt, .md)
                </p>
              </div>

              {/* Uploaded files preview list */}
              {files.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Archivos listos ({files.length}):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {file.type === "pdf" ? (
                            <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                          ) : file.type === "doc" ? (
                            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                          ) : file.type === "text" ? (
                            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                          )}
                          <span className="truncate font-semibold text-slate-800">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Web URL Input */}
          {inputTab === "url" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Introduce el enlace de la página web a estudiar:</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={webUrl}
                      onChange={(e) => {
                        setWebUrl(e.target.value);
                        if (webUrlPreview) setWebUrlPreview(null);
                        if (urlPreviewError) setUrlPreviewError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCheckUrl();
                        }
                      }}
                      placeholder="https://es.wikipedia.org/wiki/... o cualquier blog, noticia o temario"
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white shadow-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCheckUrl()}
                    disabled={!webUrl.trim() || isLoadingUrlPreview}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                  >
                    {isLoadingUrlPreview ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Leyendo...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Comprobar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sample Web Links */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ejemplos rápidos para probar con 1 clic:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_WEB_URLS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSampleUrl(sample.url)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Web URL Preview Card */}
              {webUrlPreview && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-300 text-left space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-sm text-emerald-950 truncate">
                        {webUrlPreview.title || "Página web detectada"}
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 shrink-0">
                      ✓ Listo para analizar
                    </span>
                  </div>
                  <p className="text-xs text-emerald-850 line-clamp-2 italic leading-relaxed">
                    "{webUrlPreview.previewSnippet}..."
                  </p>
                  <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-between pt-0.5">
                    <span className="truncate max-w-[280px]">{webUrlPreview.url}</span>
                    <span className="font-bold">~{webUrlPreview.charCount} caracteres</span>
                  </div>

                  {/* Direct One-Click Button to Analyze this Web Page */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Crear resumen y ejercicios con este enlace</span>
                  </button>
                </div>
              )}

              {urlPreviewError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  ℹ️ {urlPreviewError}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Direct Text / Voice Dictation */}
          {inputTab === "text" && (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">
                  Escribe o dicta tus apuntes:
                </label>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={isTranscribing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Detener</span>
                    </>
                  ) : isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Transcribiendo...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-slate-600" />
                      <span>Dictar con voz</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Pega aquí el tema, definición o fórmulas que necesitas aprender..."
                rows={4}
                className="w-full rounded-2xl border border-slate-200 p-4 text-base text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>
          )}

          {/* 100% Coverage Guarantee Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong className="font-extrabold text-emerald-950">Cobertura 100% garantizada:</strong> Tanto si subes un PDF, fotos de apuntes o pegas un enlace web, no se omitirá ningún apartado ni fórmula. Todo sintetizado al grano con lo más importante.
            </span>
          </div>

          {/* Active Sources Summary */}
          {(files.length > 0 || webUrl.trim().length > 0 || manualText.trim().length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs font-semibold text-slate-600">
              <span className="text-slate-400">Contenido preparado:</span>
              {files.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Upload className="w-3 h-3" />
                  <span>{files.length} archivo(s)</span>
                </span>
              )}
              {webUrl.trim().length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 max-w-[200px] truncate">
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="truncate">{webUrl}</span>
                </span>
              )}
              {manualText.trim().length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                  <FileText className="w-3 h-3" />
                  <span>Notas escritas</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Choose Explanation Style */}
        <div className="bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/90 shadow-sm space-y-7">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              2. ¿Con qué quieres que te lo explique?
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Puedes elegir que no te lo explique con nada y te dé solo el contenido normal, o personalizarlo con lo que más te guste.
            </p>
          </div>

          {/* Primary Two-Card Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Option 1: Normal Content (No Analogies) */}
            <button
              type="button"
              onClick={selectNormalMode}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isNormalMode
                  ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📖</span>
                  <span className="font-extrabold text-slate-900 text-base">
                    No explicar con nada
                  </span>
                </div>
                {isNormalMode && (
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong className="text-emerald-950 font-bold block mb-0.5">Solo contenido normal y directo:</strong>
                Sin metáforas ni analogías de fútbol ni aficiones. Explicación académica, clara, rigurosa y directa al grano.
              </p>
            </button>

            {/* Option 2: Customized with Passions */}
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setExplanationMode("passions");
                if (selectedPassions.length === 0) {
                  setSelectedPassions(["Fútbol", "Aviones"]);
                }
              }}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                !isNormalMode
                  ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚽✈️</span>
                  <span className="font-extrabold text-slate-900 text-base">
                    Con mis aficiones y gustos
                  </span>
                </div>
                {!isNormalMode && (
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong className="text-indigo-950 font-bold block mb-0.5">Adaptado a lo que te apasiona:</strong>
                Traducimos los conceptos difíciles a fútbol, aviación, videojuegos o lo que tú elijas.
              </p>
            </button>
          </div>

          {/* Conditional Sub-panel: When Normal Mode is active */}
          {isNormalMode ? (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-900 text-xs sm:text-sm text-center max-w-xl mx-auto flex items-center justify-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Modo clásico activado:</strong> Recibirás el temario 100% sintetizado, claro y directo sin ninguna metáfora ajena.
              </span>
            </div>
          ) : (
            /* Sub-panel: When Passions Mode is active */
            <div className="space-y-4 pt-2">
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Selecciona una o más aficiones:
                </span>
              </div>

              {/* Passion Chips */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-3.5">
                {DEFAULT_PASSIONS.map((p) => {
                  const isSelected = selectedPassions.includes(p.label);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePassion(p.label)}
                      className={`px-5 py-3 rounded-2xl text-sm sm:text-base font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-lg">{p.emoji}</span>
                      <span>{p.label}</span>
                      {isSelected && <Check className="w-4 h-4 ml-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Add custom passion option */}
              <div className="max-w-md mx-auto flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customPassion}
                  onChange={(e) => setCustomPassion(e.target.value)}
                  placeholder="¿Otra afición? (ej: Baloncesto, Cocina...)"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomPassion();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomPassion}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Paso 3: ¿Cómo quieres que te explique el tema? (Profundidad e Instrucciones) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
              3
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                ¿Cómo quieres que te explique el tema?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Ajusta la profundidad y dale indicaciones exactas (si no dices nada, lo explicará normal)
              </p>
            </div>
          </div>

          {/* Depth Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Nivel de profundidad:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setStudyDepth("resumido");
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  studyDepth === "resumido"
                    ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Más por encima</span>
                  </span>
                  {studyDepth === "resumido" && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Definiciones cortas, explicaciones resumidas y conceptos esenciales sin rodeos.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setStudyDepth("normal");
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  studyDepth === "normal"
                    ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>⚖️</span>
                    <span>Equilibrado (Normal)</span>
                  </span>
                  {studyDepth === "normal" && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Explicación académica clara, paso a paso y con nivel óptimo para estudiar.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setStudyDepth("profundo");
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  studyDepth === "profundo"
                    ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>🔬</span>
                    <span>Muy profundizado</span>
                  </span>
                  {studyDepth === "profundo" && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Profundiza en todos los apartados, definiciones largas y exhaustivas, con mecanismos y fórmulas al detalle.
                </p>
              </button>
            </div>
          </div>

          {/* Custom instructions / omisions */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Indicaciones u omisiones específicas (opcional):
              </label>
              {customInstructions && (
                <button
                  type="button"
                  onClick={() => setCustomInstructions("")}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>

            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              placeholder='Ej: "No me expliques la parte de historia", "Salta el apartado de fórmulas", "Enfócalo con casos prácticos para examen", "Céntrate sobre todo en el punto 2"... (Si no dices nada, se explicará de forma estándar).'
              className="w-full rounded-2xl border border-slate-200 p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/60 leading-relaxed resize-none transition-all"
            />

            {/* Quick Helper Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400">Atajos rápidos:</span>
              {[
                "🚫 Omitir introducción histórica",
                "📐 Centrarse en fórmulas y cálculos",
                "🎯 Enfocado a preguntas de examen",
                "💡 Más ejemplos prácticos reales",
                "🔬 Explicar paso a paso cada mecanismo",
              ].map((shortcut) => (
                <button
                  key={shortcut}
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setCustomInstructions((prev) =>
                      prev ? `${prev}. ${shortcut}` : shortcut
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 cursor-pointer transition-colors"
                >
                  + {shortcut}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Big Action Submit Button & Live Progress Feedback */}
        <div className="text-center pt-2 space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-200 shadow-md space-y-5 text-left animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                      Creando tu material de estudio...
                    </h3>
                    <p className="text-xs text-slate-500">
                      Analizando todo el temario en profundidad
                    </p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-indigo-600 font-mono">
                  {loadingProgress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              {/* Progress Steps Indicators */}
              <div className="space-y-2 pt-1">
                {[
                  "1. Analizando documentos y apuntes completos",
                  isNormalMode
                    ? "2. Redactando definición formal y explicación directa paso a paso"
                    : "2. Redactando definición real y versión con tus gustos ⚽✈️",
                  "3. Sintetizando el temario completo y mapa mental 🧠",
                  "4. Creando ejercicios interactivos y tarjetas de repaso",
                  "5. Preparando animaciones y pizarra de vídeo explicativo 🎬",
                ].map((stepText, idx) => {
                  const isDone = loadingStep > idx;
                  const isCurrent = loadingStep === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 text-xs sm:text-sm font-medium transition-colors ${
                        isDone
                          ? "text-emerald-600 font-bold"
                          : isCurrent
                          ? "text-indigo-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                          isDone
                            ? "bg-emerald-100 text-emerald-700"
                            : isCurrent
                            ? "bg-indigo-100 text-indigo-700 animate-pulse"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit || isLoading}
              className="w-full py-4.5 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-lg sm:text-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-3 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-6 h-6" />
              <span>
                {webUrl.trim() && files.length === 0 && !manualText.trim()
                  ? isNormalMode
                    ? "Crear resumen normal de la web y ejercicios"
                    : "Crear resumen de la página web y ejercicios"
                  : isNormalMode
                  ? "Crear mi resumen normal y ejercicios"
                  : "Crear mi resumen y ejercicios"}
              </span>
            </button>
          )}

          {/* Quick Demo Button */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => onLoadSample("fotosintesis")}
              disabled={isLoading}
              className="text-sm font-semibold text-slate-500 hover:text-indigo-600 underline cursor-pointer"
            >
              O prueba el ejemplo rápido de "La Fotosíntesis" (Fútbol y Aviones)
            </button>
          </div>
        </div>
      </form>

      {/* Cloud Database Saved Materials Section */}
      <div className="mt-10 pt-8 border-t border-slate-200/80">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Temas Guardados en la Base de Datos
              </h3>
              <p className="text-xs text-slate-600">
                {currentUser
                  ? `Sincronizados en la nube con tu cuenta (${currentUser.email})`
                  : "Inicia sesión para guardar automáticamente tus temas en tu cuenta"}
              </p>
            </div>
          </div>

          {!currentUser && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Conectar mi cuenta</span>
            </button>
          )}
        </div>

        {savedMaterials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedMaterials.map((mat) => (
              <div
                key={mat.id}
                onClick={() => {
                  sounds.playPop();
                  onSelectSavedMaterial?.(mat);
                }}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase mb-1">
                    <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                      <Cloud className="w-3 h-3 text-emerald-600" />
                      <span>{currentUser ? "Guardado en BD" : "Guardado"}</span>
                    </span>

                    {/* Delete action button */}
                    {onDeleteSavedMaterial && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sounds.playPop();
                          setConfirmDeleteId(mat.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar tema de la base de datos"
                        aria-label={`Eliminar tema ${mat.topic}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {mat.topic}
                  </h4>
                  <p className="text-xs text-slate-700 line-clamp-2 mt-1">
                    {mat.overview}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 font-semibold">
                  <span>{mat.flashcards?.length || 0} tarjetas</span>
                  <span className="text-indigo-600 font-extrabold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Abrir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Inline Confirmation Overlay */}
                {confirmDeleteId === mat.id && (
                  <div
                    className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-2xl p-4 flex flex-col items-center justify-center text-center z-10 animate-fade-in border-2 border-rose-300 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5 shadow-2xs">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 mb-0.5">
                      ¿Eliminar tema?
                    </h5>
                    <p className="text-[11px] text-slate-600 mb-3 max-w-[210px] leading-tight">
                      Se borrará de forma permanente de tu base de datos y lista de temas.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setDeletingId(mat.id);
                          await onDeleteSavedMaterial?.(mat.id);
                          setDeletingId(null);
                          setConfirmDeleteId(null);
                        }}
                        disabled={deletingId === mat.id}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {deletingId === mat.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Eliminar</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sounds.playPop();
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 text-center">
            <p className="text-xs font-medium text-slate-700">
              {currentUser
                ? "Aún no tienes temas guardados en tu cuenta. Crea tu primer tema arriba y se guardará automáticamente en Firestore."
                : "Inicia sesión con tu correo o Google para guardar todos tus resúmenes y vídeos en la base de datos."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
