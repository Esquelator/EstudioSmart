import React, { useState, useRef, useMemo } from "react";
import {
  Volume2,
  Pause,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Network,
  BookOpen,
  BookOpenCheck,
  Sparkles,
  BookMarked,
  Layers,
  Columns2,
  Zap,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Clock,
  Flame,
  Search,
  Highlighter,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Trophy,
  Film,
  GraduationCap,
  BookmarkCheck,
  HelpCircle,
  Tag,
  Lock,
} from "lucide-react";
import { StudyMaterial, StudySection, TermDefinition } from "../types";
import { sounds } from "../utils/audio";

interface StudyOverviewProps {
  material: StudyMaterial;
  onGoToExercises?: () => void;
  onGoToMindMap?: () => void;
  onGoToVideo?: () => void;
  onOpenOralExam?: () => void;
}

type StudyMode = "sequential" | "sections" | "glossary" | "split" | "ultrashort" | "slides";
type FontSize = "normal" | "large" | "xlarge";

// Component to render markdown bold (**text**) and search/concept highlights
const FormattedText: React.FC<{
  text: string;
  fontSize: FontSize;
  highlighterActive: boolean;
  searchQuery?: string;
}> = ({ text, fontSize, highlighterActive, searchQuery }) => {
  const sizeClasses = {
    normal: "text-base leading-relaxed",
    large: "text-lg leading-relaxed",
    xlarge: "text-xl leading-loose",
  }[fontSize];

  // First parse markdown **bold**
  const parts = useMemo(() => {
    const regex = /\*\*(.*?)\*\*/g;
    const tokens: Array<{ text: string; isBold: boolean }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ text: text.slice(lastIndex, match.index), isBold: false });
      }
      tokens.push({ text: match[1], isBold: true });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push({ text: text.slice(lastIndex), isBold: false });
    }

    return tokens.length > 0 ? tokens : [{ text, isBold: false }];
  }, [text]);

  return (
    <span className={`${sizeClasses} text-slate-800 font-normal inline`}>
      {parts.map((part, i) => {
        let content: React.ReactNode = part.text;

        // If search query exists, highlight match
        if (searchQuery && searchQuery.trim().length > 1) {
          const q = searchQuery.toLowerCase();
          const lower = part.text.toLowerCase();
          if (lower.includes(q)) {
            const splitted = part.text.split(new RegExp(`(${searchQuery})`, "gi"));
            content = splitted.map((sub, sIdx) =>
              sub.toLowerCase() === q ? (
                <mark
                  key={sIdx}
                  className="bg-yellow-300 text-slate-900 font-extrabold px-1 rounded"
                >
                  {sub}
                </mark>
              ) : (
                sub
              )
            );
          }
        }

        if (part.isBold) {
          return (
            <strong
              key={i}
              className={`font-black text-slate-900 ${
                highlighterActive
                  ? "bg-amber-100/90 text-amber-950 px-1 py-0.5 rounded border border-amber-300/70 shadow-2xs inline-block my-0.5"
                  : "text-indigo-950 underline decoration-indigo-300 decoration-2 underline-offset-2"
              }`}
            >
              {content}
            </strong>
          );
        }

        return <span key={i}>{content}</span>;
      })}
    </span>
  );
};

export const StudyOverview: React.FC<StudyOverviewProps> = ({
  material,
  onGoToExercises,
  onGoToMindMap,
  onGoToVideo,
  onOpenOralExam,
}) => {
  const [activeMode, setActiveMode] = useState<StudyMode>("sequential");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [highlighterActive, setHighlighterActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);

  // Interactive Checklist of Mastered Concepts
  const [masteredItems, setMasteredItems] = useState<Record<string, boolean>>({});

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [activeSectionAudio, setActiveSectionAudio] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Slide deck state for "slides" mode
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse text into short, organized paragraphs
  const formalParagraphs = useMemo(() => {
    const raw = material.formalDefinition || material.overview || "";
    return raw
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [material.formalDefinition, material.overview]);

  const passionParagraphs = useMemo(() => {
    const raw =
      material.passionExplanation ||
      (material.analogies && material.analogies.length > 0
        ? material.analogies.map((a) => `${a.concept}: ${a.analogy}`).join("\n\n")
        : `Explicación adaptada a tus intereses: ${material.selectedPassions.join(", ")}.`);
    return raw
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [material.passionExplanation, material.analogies, material.selectedPassions]);

  const isNoAnalogyMode = useMemo(() => {
    return (
      !material.selectedPassions ||
      material.selectedPassions.length === 0 ||
      material.selectedPassions.some((p) =>
        /sin analog|normal|ningun|directo|clasico/i.test(p)
      )
    );
  }, [material.selectedPassions]);

  const quickPoints = useMemo(() => {
    if (material.quickTakeaways && material.quickTakeaways.length > 0) {
      return material.quickTakeaways;
    }
    return material.keyPoints || [];
  }, [material.quickTakeaways, material.keyPoints]);

  const sections: StudySection[] = useMemo(() => {
    if (material.sections && material.sections.length > 0) {
      return material.sections;
    }
    return [
      {
        id: "sec_1",
        title: "1. Fundamentos del Tema Completo",
        content: material.overview,
        keyConcepts: material.keyPoints || [],
      },
    ];
  }, [material.sections, material.overview, material.keyPoints]);

  // Glossary and definitions extracted point-by-point from the uploaded documents
  const glossaryList = useMemo(() => {
    if (material.glossary && material.glossary.length > 0) {
      return material.glossary;
    }
    const list: TermDefinition[] = [];
    if (material.matchPairs && material.matchPairs.length > 0) {
      for (const pair of material.matchPairs) {
        list.push({
          term: pair.term,
          formalDefinition: pair.definition,
          simpleExplanation: `Idea central: ${pair.definition}`,
          category: "Definición Clave",
          example: `Punto recurrente en ${material.topic}.`,
        });
      }
    }
    if (material.keyPoints && material.keyPoints.length > 0) {
      for (const kp of material.keyPoints) {
        const parts = kp.split(":");
        if (parts.length > 1) {
          list.push({
            term: parts[0].replace(/[*#]/g, "").trim(),
            formalDefinition: parts.slice(1).join(":").trim(),
            simpleExplanation: parts.slice(1).join(":").trim(),
            category: "Concepto Esencial",
          });
        }
      }
    }
    return list;
  }, [material.glossary, material.matchPairs, material.keyPoints, material.topic]);

  const [glossaryCategory, setGlossaryCategory] = useState<string>("Todas");
  const [glossaryQuery, setGlossaryQuery] = useState<string>("");

  const glossaryCategories = useMemo(() => {
    const cats = new Set<string>();
    glossaryList.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return ["Todas", ...Array.from(cats)];
  }, [glossaryList]);

  const filteredGlossary = useMemo(() => {
    return glossaryList.filter((item) => {
      const matchesCat =
        glossaryCategory === "Todas" || item.category === glossaryCategory;
      const q = glossaryQuery.toLowerCase().trim();
      const matchesQ =
        !q ||
        item.term.toLowerCase().includes(q) ||
        item.formalDefinition.toLowerCase().includes(q) ||
        item.simpleExplanation.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [glossaryList, glossaryCategory, glossaryQuery]);

  // Total items for mastery progress calculation
  const totalChecklistItems =
    formalParagraphs.length + passionParagraphs.length + sections.length + quickPoints.length + glossaryList.length;
  const masteredCount = Object.values(masteredItems).filter(Boolean).length;
  const masteryPercentage = Math.round((masteredCount / Math.max(1, totalChecklistItems)) * 100);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSectionCollapse = (secId: string) => {
    sounds.playPop();
    setCollapsedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  const expandAllSections = () => {
    sounds.playPop();
    setCollapsedSections({});
  };

  const collapseAllSections = () => {
    sounds.playPop();
    const map: Record<string, boolean> = {};
    sections.forEach((s, idx) => {
      map[s.id || idx.toString()] = true;
    });
    setCollapsedSections(map);
  };

  const toggleMastered = (id: string) => {
    sounds.playPop();
    setMasteredItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Slides array for Slides Mode
  const slides = useMemo(() => {
    const list: Array<{
      tag: string;
      title: string;
      subtitle?: string;
      content: string[];
      icon: "book" | "heart" | "lightbulb" | "section";
      takeaway?: string;
    }> = [];

    // Slide 1: Definición Formal
    list.push({
      tag: "Paso 1 • Rigor Académico",
      title: "¿Cómo es la Definición Real?",
      subtitle: "Explicación exacta y formal del concepto",
      content: formalParagraphs,
      icon: "book",
    });

    // Slide 2: Explicación
    list.push({
      tag: isNoAnalogyMode
        ? "Paso 2 • Explicación Detallada"
        : `Paso 2 • ${material.selectedPassions.join(" & ")}`,
      title: isNoAnalogyMode
        ? "Explicación Paso a Paso del Contenido"
        : "Explicado con tus Pasiones",
      subtitle: isNoAnalogyMode
        ? "Desglose pedagógico directo sin metáforas ni analogías"
        : "Analogías directas para comprenderlo al instante",
      content: passionParagraphs,
      icon: isNoAnalogyMode ? "book" : "heart",
      takeaway: material.analogies?.[0]?.takeaway,
    });

    // Slide 3+: Secciones Temáticas
    sections.forEach((sec, idx) => {
      list.push({
        tag: `Temario • Sección ${idx + 1}`,
        title: sec.title,
        content: sec.content.split(/\n\s*\n|\n/).filter((p) => p.trim().length > 0),
        icon: "section",
      });
    });

    // Final Slide: Puntos Clave
    list.push({
      tag: "Resumen Ejecutivo",
      title: "Lo Esencial en Puntos Clave",
      subtitle: "Repaso exprés antes del examen",
      content: quickPoints,
      icon: "lightbulb",
    });

    return list;
  }, [formalParagraphs, passionParagraphs, sections, quickPoints, material.selectedPassions, material.analogies]);

  // Audio Playback with speed control
  const handlePlayAudio = async (textToSpeak: string, sectionId: string) => {
    sounds.playPop();

    // Clean markdown bold tags before sending to TTS
    const cleanText = textToSpeak.replace(/\*\*/g, "");

    if (isPlayingAudio && activeSectionAudio === sectionId) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      setActiveSectionAudio(null);
      return;
    }

    try {
      setIsLoadingAudio(true);
      setActiveSectionAudio(sectionId);

      const res = await fetch("/api/study/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, voice: "Kore" }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("json") ? await res.json().catch(() => ({})) : {};
      if (data?.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.playbackRate = audioSpeed;
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlayingAudio(false);
          setActiveSectionAudio(null);
        };
        audio.play();
        setIsPlayingAudio(true);
      } else {
        playWebSpeech(cleanText, sectionId);
      }
    } catch (err) {
      console.warn("Using browser speech synthesis fallback:", err);
      playWebSpeech(cleanText, sectionId);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const playWebSpeech = (text: string, sectionId: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = audioSpeed;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const esVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("es") &&
              (v.name.includes("Google") ||
                v.name.includes("Natural") ||
                v.name.includes("Online") ||
                v.name.includes("Monica") ||
                v.name.includes("Jorge") ||
                v.name.includes("Paulina") ||
                v.name.includes("Helena") ||
                v.name.includes("Laura") ||
                v.name.includes("Alvaro"))
          ) || voices.find((v) => v.lang.startsWith("es"));

        if (esVoice) utterance.voice = esVoice;
      }

      utterance.onend = () => {
        setIsPlayingAudio(false);
        setActiveSectionAudio(null);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setActiveSectionAudio(null);
      };
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
      setActiveSectionAudio(sectionId);
    }
  };

  const handleCopySummary = () => {
    sounds.playPop();
    const fullText = `*${material.topic}*\n\n1. DEFINICIÓN REAL:\n${formalParagraphs.join("\n\n")}\n\n2. EXPLICACIÓN CON GUSTOS (${material.selectedPassions.join(", ")}):\n${passionParagraphs.join("\n\n")}\n\n3. PUNTOS CLAVE:\n${quickPoints.map((p) => `• ${p}`).join("\n")}`;
    navigator.clipboard.writeText(fullText.replace(/\*\*/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6 py-2">
      {/* Top Header Card with Metadata, Tools & Search (Compact) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        {/* Passions & Meta Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>~2 min lectura</span>
            </span>

            {isNoAnalogyMode ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <BookOpen className="w-3 h-3 text-emerald-600" />
                <span>Modo Normal</span>
              </span>
            ) : (
              material.selectedPassions.map((p, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                >
                  <span>{p.toLowerCase().includes("fút") ? "⚽" : p.toLowerCase().includes("avión") ? "✈️" : "💡"}</span>
                  <span>{p}</span>
                </span>
              ))
            )}
          </div>

          {/* Progress Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-extrabold shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
            <span>{masteredCount}/{totalChecklistItems} aprendidos ({masteryPercentage}%)</span>
          </div>
        </div>

        {/* Title & Description (Compact) */}
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
            {material.topic}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xl mx-auto">
            Texto estructurado con <strong className="text-indigo-900 font-bold">conceptos clave en negrita</strong> y herramientas de estudio.
          </p>

          {/* 100% Coverage Reassurance Badge */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-black">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cobertura:
              </span>
              <span>{sections.length} apartados analizados</span>
            </div>

            {material.studyDepth === "profundo" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                <span>🔬</span>
                <span>Muy profundizado</span>
              </span>
            )}
            {material.studyDepth === "resumido" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                <span>⚡</span>
                <span>Por encima / Sintético</span>
              </span>
            )}

            {material.customInstructions && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold max-w-xs truncate"
                title={material.customInstructions}
              >
                <span>🎯</span>
                <span className="truncate">Indicación: {material.customInstructions}</span>
              </span>
            )}
          </div>
        </div>

        {/* Interactive Toolbox: Search, Text Size, Highlighter, Audio Speed (Compact) */}
        <div className="bg-slate-50/90 rounded-xl p-2.5 sm:p-3 border border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Search inside summary */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar concepto o palabra clave..."
              className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Text Size Control */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-600 px-1.5 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Letra:</span>
            </span>
            {(["normal", "large", "xlarge"] as FontSize[]).map((sz) => (
              <button
                key={sz}
                onClick={() => {
                  sounds.playPop();
                  setFontSize(sz);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold transition-all cursor-pointer ${
                  fontSize === sz
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {sz === "normal" ? "A" : sz === "large" ? "A+" : "A++"}
              </button>
            ))}
          </div>

          {/* Highlighter Toggle */}
          <button
            onClick={() => {
              sounds.playPop();
              setHighlighterActive(!highlighterActive);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              highlighterActive
                ? "bg-amber-100 text-amber-950 border-amber-300 shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
            title="Activar o desactivar resaltador de negritas"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-600" />
            <span>Negritas {highlighterActive ? "activas ✨" : "normales"}</span>
          </button>

          {/* Audio Speed Picker */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-600 px-1.5">Voz:</span>
            {[1.0, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  sounds.playPop();
                  setAudioSpeed(speed);
                  if (audioRef.current) audioRef.current.playbackRate = speed;
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-extrabold transition-all cursor-pointer ${
                  audioSpeed === speed
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Padlock Oral Exam Discount Button */}
          {onOpenOralExam && (
            <button
              onClick={onOpenOralExam}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-black cursor-pointer transition-colors shadow-2xs"
              title="Desafío del Candado: Ahorra un 15% con el examen oral"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Reto 15% Dto 🔒</span>
            </button>
          )}
        </div>

        {/* Global Summary Action Toolbar (Audio narration & Copy summary) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          <button
            onClick={() =>
              handlePlayAudio(
                formalParagraphs.join(". ") + ". " + passionParagraphs.join(". "),
                "overview_full"
              )
            }
            disabled={isLoadingAudio}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs ${
              isPlayingAudio && activeSectionAudio === "overview_full"
                ? "bg-amber-500 text-white ring-2 ring-amber-200"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-98"
            }`}
          >
            {isLoadingAudio && activeSectionAudio === "overview_full" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generando voz humana...</span>
              </>
            ) : isPlayingAudio && activeSectionAudio === "overview_full" ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Escuchar resumen completo</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-98"
            title="Copiar texto ordenado del resumen sin etiquetas"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "¡Copiado!" : "Copiar resumen"}</span>
          </button>
        </div>

        {/* Multi-Mode Tabs Bar (Compact) */}
        <div className="pt-2.5 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => {
                sounds.playPop();
                setActiveMode("sequential");
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === "sequential"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Paso a Paso</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setActiveMode("sections");
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === "sections"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>2. Temario & Puntos</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setActiveMode("glossary");
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === "glossary"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Glosario ({glossaryList.length})</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setActiveMode("split");
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === "split"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>4. Comparador</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setActiveMode("ultrashort");
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === "ultrashort"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>5. Ultracorto</span>
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setActiveMode("slides");
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === "slides"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>6. Diapositivas</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: SEQUENTIAL (Paso 1 Real + Paso 2 Gustos)                          */}
      {/* ========================================================================= */}
      {activeMode === "sequential" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Section 1: Formal / Academic Definition (Compact) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                  1
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                      Paso 1 • Enfoque Académico
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Definición Real
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                    Definición Formal y Exacta
                  </h2>
                </div>
              </div>

              <button
                onClick={() => handlePlayAudio(formalParagraphs.join(". "), "seq_formal")}
                disabled={isLoadingAudio}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer self-start sm:self-auto ${
                  isPlayingAudio && activeSectionAudio === "seq_formal"
                    ? "bg-amber-500 text-white ring-2 ring-amber-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Escuchar parte 1</span>
              </button>
            </div>

            {/* Individual compact paragraph cards with bolding and checkbox */}
            <div className="space-y-3">
              {formalParagraphs.map((para, idx) => {
                const itemId = `formal_${idx}`;
                const isDone = !!masteredItems[itemId];

                return (
                  <div
                    key={idx}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-2 ${
                      isDone
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                        : "bg-slate-50/80 border-slate-200/90 hover:border-indigo-200 hover:bg-indigo-50/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Párrafo {idx + 1} de la definición</span>
                      </span>

                      <button
                        onClick={() => toggleMastered(itemId)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          isDone
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                        title="Marcar si ya te lo sabes"
                      >
                        {isDone ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>¡Aprendido!</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Marcar aprendido</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-0.5 leading-relaxed">
                      <FormattedText
                        text={para}
                        fontSize={fontSize}
                        highlighterActive={highlighterActive}
                        searchQuery={searchQuery}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Explanation with What the User Likes or Direct Detailed Explanation (Compact) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                      {isNoAnalogyMode ? "Paso 2 • Explicación Detallada" : "Paso 2 • Traducción a tus Gustos"}
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {isNoAnalogyMode ? "Contenido Normal" : material.selectedPassions.join(" & ")}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                    {isNoAnalogyMode ? "Explicación Paso a Paso del Contenido" : "Explicado con tus Pasiones"}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => handlePlayAudio(passionParagraphs.join(". "), "seq_passion")}
                disabled={isLoadingAudio}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer self-start sm:self-auto ${
                  isPlayingAudio && activeSectionAudio === "seq_passion"
                    ? "bg-amber-500 text-white ring-2 ring-amber-200"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isNoAnalogyMode ? "Escuchar explicación" : "Escuchar parte 2"}</span>
              </button>
            </div>

            {/* Individual compact cards for each passion paragraph */}
            <div className="space-y-3">
              {passionParagraphs.map((para, idx) => {
                const itemId = `passion_${idx}`;
                const isDone = !!masteredItems[itemId];
                const isSoccer = !isNoAnalogyMode && (para.includes("⚽") || para.toLowerCase().includes("fút") || para.toLowerCase().includes("balón"));
                const isPlane = !isNoAnalogyMode && (para.includes("✈️") || para.toLowerCase().includes("avión") || para.toLowerCase().includes("vuelo"));

                const cardLabel = isNoAnalogyMode
                  ? `Explicación Detallada #${idx + 1}`
                  : isSoccer
                  ? "Analogía de Fútbol"
                  : isPlane
                  ? "Analogía de Aviación"
                  : "Analogía Práctica";
                const cardEmoji = isNoAnalogyMode ? "📖" : isSoccer ? "⚽" : isPlane ? "✈️" : "💡";

                return (
                  <div
                    key={idx}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-2 ${
                      isDone
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                        : "bg-indigo-50/40 border-indigo-100/90 hover:border-indigo-200 hover:bg-indigo-50/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                      <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="text-sm">{cardEmoji}</span>
                        <span>{cardLabel}</span>
                      </span>

                      <button
                        onClick={() => toggleMastered(itemId)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          isDone
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                        title="Marcar si ya te lo sabes"
                      >
                        {isDone ? (
                          <>
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>¡Aprendido!</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-3.5 h-3.5" />
                            <span>Marcar aprendido</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-0.5 leading-relaxed">
                      <FormattedText
                        text={para}
                        fontSize={fontSize}
                        highlighterActive={highlighterActive}
                        searchQuery={searchQuery}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Golden Rule Callout Card (Compact) */}
            {material.analogies && material.analogies[0]?.takeaway && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-bold text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
                <Flame className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-amber-800 font-black text-[10px] uppercase tracking-wider">
                    Regla de Oro para el Examen
                  </div>
                  <div className="text-slate-900 font-extrabold text-xs sm:text-sm">
                    {material.analogies[0].takeaway}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* PASO 3: DESARROLLO EXHAUSTIVO PUNTO POR PUNTO (COBERTURA TOTAL 100%)      */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-emerald-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Paso 3 • Cobertura 100% de tus Apuntes
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {sections.length} apartados completos
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                    Desarrollo Exhaustivo Punto por Punto
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={expandAllSections}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Expandir todos
                </button>
                <button
                  type="button"
                  onClick={collapseAllSections}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Colapsar todos
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Cada subtema condensado con precisión: fórmulas, etapas y palabras clave en <strong className="text-emerald-900 font-bold">negrita</strong>.
            </p>

            {/* Quick-Jump Index for Sections (Compact) */}
            {sections.length > 1 && (
              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <BookOpenCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Índice ({sections.length} apartados):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sections.map((sec, idx) => {
                    const isDone = !!masteredItems[`sec_${sec.id || idx}`];
                    return (
                      <button
                        type="button"
                        key={sec.id || idx}
                        onClick={() => {
                          const el = document.getElementById(`section-card-${sec.id || idx}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                            el.classList.add("ring-4", "ring-emerald-300");
                            setTimeout(() => el.classList.remove("ring-4", "ring-emerald-300"), 1500);
                          }
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isDone
                            ? "bg-emerald-100/90 text-emerald-900 border-emerald-300"
                            : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                        }`}
                      >
                        <span className="font-extrabold">{idx + 1}.</span>
                        <span className="truncate max-w-[180px]">{sec.title.replace(/^\d+\.\s*/, "")}</span>
                        {isDone && <Check className="w-3 h-3 text-emerald-700" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Render Each Section (Compact) */}
            <div className="space-y-3.5">
              {sections.map((section, idx) => {
                const secKey = `sec_${section.id || idx}`;
                const isDone = !!masteredItems[secKey];
                const isCollapsed = !!collapsedSections[section.id || idx];

                const secParagraphs = section.content
                  .split(/\n\s*\n|\n/)
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0);

                return (
                  <div
                    key={section.id || idx}
                    id={`section-card-${section.id || idx}`}
                    className={`rounded-2xl border transition-all p-3.5 sm:p-4 space-y-3 ${
                      isDone
                        ? "bg-emerald-50/40 border-emerald-300"
                        : "bg-slate-50/70 border-slate-200/90 hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/70 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 font-display">
                          {section.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(section.content, `audio_sec_${section.id || idx}`)}
                          disabled={isLoadingAudio}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isPlayingAudio && activeSectionAudio === `audio_sec_${section.id || idx}`
                              ? "bg-amber-500 text-white ring-2 ring-amber-200"
                              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Escuchar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleMastered(secKey)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            isDone
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                          title="Marcar este apartado como dominado"
                        >
                          {isDone ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>¡Aprendido!</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>Marcar</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleSectionCollapse(section.id || idx.toString())}
                          className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 cursor-pointer"
                          title={isCollapsed ? "Expandir" : "Colapsar"}
                        >
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />}
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <>
                        <div className="space-y-2.5">
                          {secParagraphs.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className="p-3 sm:p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs"
                            >
                              <FormattedText
                                text={p}
                                fontSize={fontSize}
                                highlighterActive={highlighterActive}
                                searchQuery={searchQuery}
                              />
                            </div>
                          ))}
                        </div>

                        {section.keyConcepts && section.keyConcepts.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mr-0.5">
                              Claves:
                            </span>
                            {section.keyConcepts.map((kc, kIdx) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200/90 shadow-2xs"
                              >
                                {kc}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Point by Point Deep Breakdown */}
                        {section.detailedBreakdown && section.detailedBreakdown.length > 0 && (
                          <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 space-y-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900 uppercase tracking-wider">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Análisis Punto por Punto del Documento:</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                              {section.detailedBreakdown.map((pt, ptIdx) => (
                                <div
                                  key={ptIdx}
                                  className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100/90 shadow-2xs space-y-1.5"
                                >
                                  <h5 className="font-extrabold text-xs sm:text-sm text-indigo-950 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                                      {ptIdx + 1}
                                    </span>
                                    <span>{pt.pointTitle}</span>
                                  </h5>
                                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-7">
                                    <FormattedText
                                      text={pt.explanation}
                                      fontSize={fontSize}
                                      highlighterActive={highlighterActive}
                                      searchQuery={searchQuery}
                                    />
                                  </div>
                                  {pt.keyRule && (
                                    <div className="ml-7 mt-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-2">
                                      <span className="text-amber-700 font-black shrink-0">🎯 Regla de examen:</span>
                                      <span>{pt.keyRule}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 4: PUNTOS CLAVE Y CONCLUSIONES DEL TEMA (LO MÁS PREGUNTADO)         */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                  4
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                      Paso 4 • Puntos Clave de Examen
                    </span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Lo más preguntado
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                    Puntos Clave y Conclusiones del Temario
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePlayAudio(quickPoints.join(". "), "seq_quick_points")}
                disabled={isLoadingAudio}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer self-start sm:self-auto ${
                  isPlayingAudio && activeSectionAudio === "seq_quick_points"
                    ? "bg-amber-500 text-white ring-2 ring-amber-200"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Escuchar claves</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {quickPoints.map((point, idx) => {
                const qKey = `quick_takeaway_${idx}`;
                const isDone = !!masteredItems[qKey];

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 flex flex-col justify-between ${
                      isDone
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-amber-50/30 border-amber-200/80 hover:bg-amber-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleMastered(qKey)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          isDone
                            ? "bg-emerald-600 text-white"
                            : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {isDone ? "✓ Dominado" : "○ Marcar"}
                      </button>
                    </div>

                    <div className="pt-1 leading-relaxed">
                      <FormattedText
                        text={point}
                        fontSize={fontSize}
                        highlighterActive={highlighterActive}
                        searchQuery={searchQuery}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PASO 5: GLOSARIO Y DEFINICIONES IMPORTANTES DEL DOCUMENTO                 */}
          {/* ========================================================================= */}
          {glossaryList.length > 0 && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/90 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                    5
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                        Paso 5 • Definiciones Importantes
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {glossaryList.length} conceptos analizados
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 font-display">
                      Glosario y Explicación de Términos Clave
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    setActiveMode("glossary");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ver diccionario completo ({glossaryList.length})</span>
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                Definiciones analizadas punto por punto del material subido, con definición técnica formal y explicación sencilla en lenguaje claro:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {glossaryList.slice(0, 8).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        {item.category && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.category}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handlePlayAudio(
                              `${item.term}: ${item.formalDefinition}. Explicación: ${item.simpleExplanation}`,
                              `seq_glossary_${idx}`
                            )
                          }
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Escuchar definición"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 font-display">
                        {item.term}
                      </h4>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        <strong className="text-slate-900 font-bold">Definición:</strong>{" "}
                        <FormattedText
                          text={item.formalDefinition}
                          fontSize={fontSize}
                          highlighterActive={highlighterActive}
                          searchQuery={searchQuery}
                        />
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed bg-white p-2 rounded-lg border border-slate-100">
                        <strong className="text-indigo-900 font-bold">Explicación clara:</strong>{" "}
                        {item.simpleExplanation}
                      </p>
                    </div>

                    {item.example && (
                      <div className="pt-1 text-[11px] text-slate-500 italic border-t border-slate-200/60">
                        💡 Ejemplo: {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {glossaryList.length > 8 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playPop();
                      setActiveMode("glossary");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer"
                  >
                    <span>Ver las {glossaryList.length} definiciones en el diccionario</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SPLIT COMPARATOR (Lado a Lado: Real vs Gustos / Desarrollo)       */}
      {/* ========================================================================= */}
      {activeMode === "split" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display flex items-center justify-center gap-2">
              <Columns2 className="w-6 h-6 text-indigo-600" />
              <span>
                {isNoAnalogyMode
                  ? "Comparativa de Estudio: Definición Formal vs Desarrollo Explicativo"
                  : "Comparativa Paralela: Real vs Tus Gustos"}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {isNoAnalogyMode
                ? "Contrasta la definición académica técnica con la explicación detallada y directa del temario"
                : "Contrasta cada término científico oficial con su traducción a tus aficiones"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Real */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    1. Definición Formal (Real)
                  </span>
                </div>
                <button
                  onClick={() => handlePlayAudio(formalParagraphs.join(". "), "split_formal")}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Escuchar"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {formalParagraphs.map((para, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-2"
                  >
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                      Bloque #{i + 1}
                    </span>
                    <FormattedText
                      text={para}
                      fontSize={fontSize}
                      highlighterActive={highlighterActive}
                      searchQuery={searchQuery}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Passions or Detailed Explanation */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    {isNoAnalogyMode ? "2. Desarrollo Explicativo Directo" : "2. Traducción a tus Gustos"}
                  </span>
                </div>
                <button
                  onClick={() => handlePlayAudio(passionParagraphs.join(". "), "split_passion")}
                  className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                  title="Escuchar"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {passionParagraphs.map((para, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 shadow-2xs space-y-2"
                  >
                    <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider block">
                      {isNoAnalogyMode ? `Desarrollo #${i + 1}` : `Equivalencia #${i + 1}`}
                    </span>
                    <FormattedText
                      text={para}
                      fontSize={fontSize}
                      highlighterActive={highlighterActive}
                      searchQuery={searchQuery}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: ULTRASHORT (Puntos Clave / Tarjetas Exprés de 30 Segundos)         */}
      {/* ========================================================================= */}
      {activeMode === "ultrashort" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="text-center space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Repaso de 30 Segundos
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Resumen Ultracorto: Lo Que Sí o Sí Preguntan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Cada concepto esencial condensado en una sola frase directa con negritas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickPoints.map((point, idx) => {
              const itemId = `quick_${idx}`;
              const isDone = !!masteredItems[itemId];

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                    isDone
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                      : "bg-slate-50/90 border-slate-200/90 hover:border-indigo-200 hover:bg-indigo-50/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {idx + 1}
                    </div>

                    <button
                      onClick={() => toggleMastered(itemId)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isDone ? "✓ Aprendido" : "○ Marcar"}
                    </button>
                  </div>

                  <div>
                    <FormattedText
                      text={point}
                      fontSize={fontSize}
                      highlighterActive={highlighterActive}
                      searchQuery={searchQuery}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Golden Overview Sentence */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-black text-slate-900 text-sm uppercase tracking-wider block">
                En Resumen Global:
              </span>
              <FormattedText
                text={material.overview}
                fontSize={fontSize}
                highlighterActive={highlighterActive}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: SLIDES / FLASH DECKS (Diapositivas Interactivas)                   */}
      {/* ========================================================================= */}
      {activeMode === "slides" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                Ficha {currentSlideIndex + 1} de {slides.length}
              </span>
              <span className="text-xs text-slate-600 font-bold hidden sm:inline">
                {slides[currentSlideIndex].tag}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sounds.playPop();
                  setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentSlideIndex === 0}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
                title="Anterior ficha"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  sounds.playPop();
                  setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
                }}
                disabled={currentSlideIndex === slides.length - 1}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
                title="Siguiente ficha"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Slide Progress Line */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
            />
          </div>

          {/* Slide Content */}
          <div className="min-h-[260px] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 block sm:hidden">
                  {slides[currentSlideIndex].tag}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                  {slides[currentSlideIndex].title}
                </h3>
                {slides[currentSlideIndex].subtitle && (
                  <p className="text-xs sm:text-sm text-slate-500">
                    {slides[currentSlideIndex].subtitle}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {slides[currentSlideIndex].content.map((p, i) => (
                  <div
                    key={i}
                    className="p-4.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs"
                  >
                    <FormattedText
                      text={p}
                      fontSize={fontSize}
                      highlighterActive={highlighterActive}
                      searchQuery={searchQuery}
                    />
                  </div>
                ))}
              </div>

              {slides[currentSlideIndex].takeaway && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-950 font-extrabold text-sm flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{slides[currentSlideIndex].takeaway}</span>
                </div>
              )}
            </div>

            {/* Slide Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() =>
                  handlePlayAudio(
                    slides[currentSlideIndex].content.join(". "),
                    `slide_${currentSlideIndex}`
                  )
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Escuchar ficha</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sounds.playPop();
                    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={currentSlideIndex === 0}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  onClick={() => {
                    sounds.playPop();
                    setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
                  }}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 text-white cursor-pointer shadow-indigo-600/20"
                >
                  Siguiente ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 5: COMPLETE SECTIONS (Desglose Temático Completo)                    */}
      {/* ========================================================================= */}
      {activeMode === "sections" && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display flex items-center justify-center gap-2">
              <BookOpenCheck className="w-6 h-6 text-indigo-600" />
              <span>Desglose Completo del Temario</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Todas las secciones organizadas con párrafos independientes y etiquetas
            </p>
          </div>

          <div className="space-y-4">
            {sections.map((section, idx) => (
              <div
                key={section.id || idx}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                    {section.title}
                  </h3>

                  <button
                    onClick={() => handlePlayAudio(section.content, section.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Escuchar sección</span>
                  </button>
                </div>

                {/* Section Content Paragraphs */}
                <div className="space-y-2.5">
                  {section.content
                    .split(/\n\s*\n|\n/)
                    .filter((p) => p.trim().length > 0)
                    .map((p, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80"
                      >
                        <FormattedText
                          text={p}
                          fontSize={fontSize}
                          highlighterActive={highlighterActive}
                          searchQuery={searchQuery}
                        />
                      </div>
                    ))}
                </div>

                {/* Key Concepts Pills */}
                {section.keyConcepts && section.keyConcepts.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mr-1">
                      Conceptos:
                    </span>
                    {section.keyConcepts.map((concept, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}

                {/* Point by Point Deep Breakdown */}
                {section.detailedBreakdown && section.detailedBreakdown.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200/90 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-900 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Desglose Punto por Punto del Apartado:</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {section.detailedBreakdown.map((pt, ptIdx) => (
                        <div
                          key={ptIdx}
                          className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 shadow-2xs space-y-2"
                        >
                          <h5 className="font-extrabold text-sm text-indigo-950 flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                              {ptIdx + 1}
                            </span>
                            <span>{pt.pointTitle}</span>
                          </h5>
                          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-8">
                            <FormattedText
                              text={pt.explanation}
                              fontSize={fontSize}
                              highlighterActive={highlighterActive}
                              searchQuery={searchQuery}
                            />
                          </div>
                          {pt.keyRule && (
                            <div className="ml-8 mt-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold flex items-center gap-2">
                              <span className="text-amber-700 font-black shrink-0">🎯 Regla de examen:</span>
                              <span>{pt.keyRule}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: GLOSSARY & DEFINITIONS (Glosario de Definiciones Importantes)     */}
      {/* ========================================================================= */}
      {activeMode === "glossary" && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center space-y-1.5 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display flex items-center justify-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
              <span>Glosario & Diccionario de Definiciones Clave</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Todas las definiciones importantes analizadas punto por punto del material subido, con definición formal rigurosa y explicación directa en lenguaje claro.
            </p>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={glossaryQuery}
                  onChange={(e) => setGlossaryQuery(e.target.value)}
                  placeholder="Buscar término o definición..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
                {glossaryQuery && (
                  <button
                    onClick={() => setGlossaryQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold self-start sm:self-auto shrink-0">
                <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>{filteredGlossary.length} de {glossaryList.length} definiciones</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>Categoría:</span>
              </span>
              {glossaryCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    sounds.playPop();
                    setGlossaryCategory(cat);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    glossaryCategory === cat
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Definitions Grid */}
          {filteredGlossary.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGlossary.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Term & Category & Actions */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <div>
                        {item.category && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
                            {item.category}
                          </span>
                        )}
                        <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                          {item.term}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            handlePlayAudio(
                              `${item.term}: ${item.formalDefinition}. Explicación sencilla: ${item.simpleExplanation}`,
                              `glossary_${idx}`
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                          title="Escuchar definición por voz"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Definition 1: Formal / Rigurosa */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                        Definición Formal Rigurosa:
                      </span>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                        <FormattedText
                          text={item.formalDefinition}
                          fontSize={fontSize}
                          highlighterActive={highlighterActive}
                          searchQuery={searchQuery}
                        />
                      </p>
                    </div>

                    {/* Definition 2: En Palabras Sencillas ("En Cristiano") */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>En Palabras Sencillas ("En Cristiano"):</span>
                      </span>
                      <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                        {item.simpleExplanation}
                      </p>
                    </div>

                    {/* Example if present */}
                    {item.example && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-950 text-xs font-medium flex items-start gap-2">
                        <span className="text-emerald-700 font-black shrink-0">💡 Ejemplo:</span>
                        <span>{item.example}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <p className="text-sm font-bold text-slate-700">
                No se encontraron definiciones que coincidan con "{glossaryQuery}".
              </p>
              <button
                onClick={() => {
                  setGlossaryQuery("");
                  setGlossaryCategory("Todas");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary completion footer indicator */}
      <div className="pt-4 pb-2 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>Fin del resumen del tema • Usa las pestañas superiores para navegar a otras secciones cuando lo desees</span>
        </div>
      </div>
    </div>
  );
};
