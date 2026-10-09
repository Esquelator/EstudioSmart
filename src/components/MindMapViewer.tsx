import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Share2,
  Eye,
  Layers,
  Network,
  Check,
  CheckCircle2,
  Volume2,
  VolumeX,
  Lightbulb,
  FlaskConical,
  Flame,
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  Trophy,
  RotateCcw,
  BookOpen,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { MindMapNode } from "../types";
import { sounds } from "../utils/audio";

interface MindMapViewerProps {
  mindMap?: MindMapNode;
  topicTitle: string;
  onRewardXp?: (xp: number) => void;
}

// Formatted text helper to render markdown **bold** and highlight search matches
const FormattedNodeText: React.FC<{
  text: string;
  searchQuery?: string;
  className?: string;
}> = ({ text, searchQuery, className = "" }) => {
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
    <span className={className}>
      {parts.map((part, i) => {
        let content: React.ReactNode = part.text;

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
            <strong key={i} className="font-extrabold text-slate-900">
              {content}
            </strong>
          );
        }

        return <span key={i}>{content}</span>;
      })}
    </span>
  );
};

// Automatic smart enricher to ensure ANY node has complete, visual content
function enrichNode(node: MindMapNode, branchLabel: string): MindMapNode {
  const label = node.label || "Concepto";
  const desc = node.description || "Elemento fundamental de este apartado.";
  const lower = (label + " " + desc + " " + branchLabel).toLowerCase();

  // Pick emoji if missing
  let emoji = node.emoji;
  if (!emoji) {
    if (lower.includes("luz") || lower.includes("sol")) emoji = "☀️";
    else if (lower.includes("agua") || lower.includes("h2o")) emoji = "💧";
    else if (lower.includes("oxígeno") || lower.includes("o2")) emoji = "🫁";
    else if (lower.includes("co2") || lower.includes("carbono")) emoji = "💨";
    else if (lower.includes("enzima") || lower.includes("rubisco") || lower.includes("prote")) emoji = "🧬";
    else if (lower.includes("glucosa") || lower.includes("azúcar") || lower.includes("almidón")) emoji = "🍬";
    else if (lower.includes("clorofila") || lower.includes("cloroplasto")) emoji = "🌿";
    else if (lower.includes("atp") || lower.includes("energía") || lower.includes("batería")) emoji = "⚡";
    else if (lower.includes("fase") || lower.includes("etapa") || lower.includes("ciclo")) emoji = "🔄";
    else if (lower.includes("fórmula") || lower.includes("ecuación") || lower.includes("reacción")) emoji = "🧪";
    else emoji = "📌";
  }

  // Pick category tag if missing
  let category = node.category;
  if (!category) {
    if (lower.includes("reactivo") || lower.includes("entrada") || lower.includes("luz") || lower.includes("agua")) {
      category = "Reactivo Clave";
    } else if (lower.includes("fase") || lower.includes("luminosa") || lower.includes("calvin") || lower.includes("proceso")) {
      category = "Fase del Proceso";
    } else if (lower.includes("producto") || lower.includes("salida") || lower.includes("glucosa") || lower.includes("oxígeno")) {
      category = "Producto Vital";
    } else if (lower.includes("enzima") || lower.includes("catalizador")) {
      category = "Catalizador Biológico";
    } else {
      category = "Concepto Esencial";
    }
  }

  // Key points if missing
  let keyPoints = node.keyPoints;
  if (!keyPoints || keyPoints.length === 0) {
    keyPoints = [
      `Papel crucial en **${branchLabel}**: conecta directamente con el funcionamiento global del tema.`,
      `Definición esencial: **${desc}**`,
      `Relevancia en examen: dominar este término permite responder con exactitud preguntas teóricas y prácticas.`,
    ];
  }

  // Analogy if missing
  let analogy = node.analogy;
  if (!analogy) {
    if (lower.includes("luz") || lower.includes("solar")) {
      analogy = "⚽ Como el saque potente que pone en movimiento todo el partido desde el minuto uno.";
    } else if (lower.includes("agua")) {
      analogy = "✈️ Como el combustible líquido que llena los tanques de las alas para permitir el despegue.";
    } else if (lower.includes("clorofila")) {
      analogy = "⚽ Como el portero de reflejos felinos que intercepta cada disparo de energía para su equipo.";
    } else if (lower.includes("rubisco") || lower.includes("enzima")) {
      analogy = "⚽ Como el delantero centro estrella que remata cada centro al área para convertirlo en gol.";
    } else if (lower.includes("glucosa")) {
      analogy = "✈️ Como el queroseno concentrado de aviación que otorga autonomía y potencia de vuelo.";
    } else {
      analogy = "💡 Imagínalo como una pieza de engranaje indispensable: sin ella, la cadena completa se detiene.";
    }
  }

  // Example if missing
  let example = node.example;
  if (!example) {
    example = `Se manifiesta de forma directa en los casos prácticos y ejercicios sobre ${label.toLowerCase()}.`;
  }

  // Exam tip if missing
  let examTip = node.examTip;
  if (!examTip) {
    examTip = `Pregunta típica: ¿Cuál es la función principal de **${label}**? Responde destacando su mecanismo y su resultado.`;
  }

  // Quick question if missing
  let quickQuestion = node.quickQuestion;
  if (!quickQuestion) {
    quickQuestion = {
      question: `¿Cuál es el papel fundamental de **${label}** en el proceso?`,
      answer: desc,
    };
  }

  return {
    ...node,
    emoji,
    category,
    keyPoints,
    analogy,
    example,
    examTip,
    quickQuestion,
  };
}

export const MindMapViewer: React.FC<MindMapViewerProps> = ({
  mindMap,
  topicTitle,
  onRewardXp,
}) => {
  // Navigation & View mode state
  const [viewMode, setViewMode] = useState<"diagram" | "cards">("diagram");
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion state: branch collapse & concept collapse
  // By default, branches are open (false in collapsedBranches), and concepts are collapsed until clicked (or expanded via button)
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({});
  const [expandedConcepts, setExpandedConcepts] = useState<Record<string, boolean>>({});

  // Active modal/focus inspection
  const [focusedNode, setFocusedNode] = useState<{
    node: MindMapNode;
    branchLabel: string;
    branchColor: string;
  } | null>(null);

  // Audio speech synthesis state
  const [speakingNodeId, setSpeakingNodeId] = useState<string | null>(null);

  // Quiz reveal state per concept
  const [revealedQuiz, setRevealedQuiz] = useState<Record<string, boolean>>({});

  // Mastered concept checklist
  const [masteredNodes, setMasteredNodes] = useState<Record<string, boolean>>({});

  // Copy notification state
  const [copied, setCopied] = useState(false);

  // Fallback root node if mindMap is not provided
  const rootNode: MindMapNode = useMemo(() => {
    if (mindMap && mindMap.children && mindMap.children.length > 0) {
      return mindMap;
    }
    return {
      id: "root_default",
      label: topicTitle || "Tema Principal",
      emoji: "🧠",
      color: "#4f46e5",
      description: "Mapa mental con estructura completa de ramas y conceptos clave",
      children: [
        {
          id: "b1",
          label: "Fundamentos y Definiciones",
          emoji: "📌",
          color: "#0284c7",
          description: "Bases y conceptos de partida indispensables",
          children: [
            {
              id: "b1_1",
              label: "Definición Teórica",
              description: "Qué es exactamente este fenómeno y su formulación académica.",
            },
            {
              id: "b1_2",
              label: "Mecanismo Central",
              description: "Cómo opera paso a paso y qué variables intervienen.",
            },
          ],
        },
        {
          id: "b2",
          label: "Componentes y Fases",
          emoji: "⚡",
          color: "#059669",
          description: "Elementos que intervienen y etapas cronológicas clave",
          children: [
            {
              id: "b2_1",
              label: "Fase Inicial de Entrada",
              description: "Factores y condiciones previas indispensables.",
            },
            {
              id: "b2_2",
              label: "Fase de Transformación",
              description: "Proceso dinámico donde ocurre la reacción principal.",
            },
          ],
        },
        {
          id: "b3",
          label: "Resultados y Aplicaciones",
          emoji: "🎯",
          color: "#7c3aed",
          description: "Productos obtenidos, consecuencias prácticas y analogías",
          children: [
            {
              id: "b3_1",
              label: "Productos Generados",
              description: "Resultados cuantificables tras completarse el ciclo.",
            },
            {
              id: "b3_2",
              label: "Regla Mnemotécnica",
              description: "Truco mental para no olvidar ningún detalle en exámenes.",
            },
          ],
        },
      ],
    };
  }, [mindMap, topicTitle]);

  // Flattened enriched concepts list for statistics and inspection navigation
  const allEnrichedConcepts = useMemo(() => {
    const list: Array<{
      node: MindMapNode;
      branchLabel: string;
      branchColor: string;
    }> = [];

    const defaultColors = ["#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48", "#0891b2"];

    (rootNode.children || []).forEach((branch, bIdx) => {
      const bColor = branch.color || defaultColors[bIdx % defaultColors.length];
      (branch.children || []).forEach((leaf) => {
        list.push({
          node: enrichNode(leaf, branch.label),
          branchLabel: branch.label,
          branchColor: bColor,
        });
      });
    });

    return list;
  }, [rootNode]);

  // Total and mastered stats
  const totalConceptsCount = allEnrichedConcepts.length;
  const masteredCount = Object.values(masteredNodes).filter(Boolean).length;
  const progressPercent = totalConceptsCount > 0 ? Math.round((masteredCount / totalConceptsCount) * 100) : 0;

  // Toggle Branch Collapse/Expand
  const toggleBranch = (branchId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playPop();
    setCollapsedBranches((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  // Toggle Concept Dropdown (Expand/Collapse in place)
  const toggleConcept = (conceptId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sounds.playPop();
    setExpandedConcepts((prev) => ({
      ...prev,
      [conceptId]: !prev[conceptId],
    }));
  };

  // Expand all branches and all concepts
  const handleExpandAll = () => {
    sounds.playPop();
    setCollapsedBranches({});
    const allExpanded: Record<string, boolean> = {};
    allEnrichedConcepts.forEach((item) => {
      allExpanded[item.node.id] = true;
    });
    setExpandedConcepts(allExpanded);
  };

  // Collapse all concepts and branches
  const handleCollapseAll = () => {
    sounds.playPop();
    const allCollapsedBranches: Record<string, boolean> = {};
    (rootNode.children || []).forEach((b) => {
      allCollapsedBranches[b.id] = true;
    });
    setCollapsedBranches(allCollapsedBranches);
    setExpandedConcepts({});
  };

  // Expand branches only (keep concepts compact)
  const handleBranchesOnly = () => {
    sounds.playPop();
    setCollapsedBranches({});
    setExpandedConcepts({});
  };

  // Toggle Mastered Concept
  const handleToggleMastered = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isNowMastered = !masteredNodes[nodeId];
    if (isNowMastered) {
      sounds.playSuccess();
      if (onRewardXp) {
        onRewardXp(10);
      }
    } else {
      sounds.playPop();
    }
    setMasteredNodes((prev) => ({
      ...prev,
      [nodeId]: isNowMastered,
    }));
  };

  // Text-To-Speech audio reader using browser Web Speech API
  const handleSpeakConcept = (node: MindMapNode, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("La síntesis de voz no está soportada en este navegador.");
      return;
    }

    if (speakingNodeId === node.id) {
      window.speechSynthesis.cancel();
      setSpeakingNodeId(null);
      return;
    }

    window.speechSynthesis.cancel();
    sounds.playPop();

    const speechText = `${node.label}. ${node.category || ""}. ${node.description || ""}. Puntos clave: ${
      node.keyPoints ? node.keyPoints.join(". ") : ""
    }. Analogía: ${node.analogy || ""}`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;

    utterance.onend = () => {
      setSpeakingNodeId(null);
    };
    utterance.onerror = () => {
      setSpeakingNodeId(null);
    };

    setSpeakingNodeId(node.id);
    window.speechSynthesis.speak(utterance);
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filtered branches and concepts by search query
  const filteredBranches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rootNode.children || [];

    return (rootNode.children || [])
      .map((branch) => {
        const branchMatches =
          branch.label.toLowerCase().includes(q) ||
          (branch.description && branch.description.toLowerCase().includes(q));

        const matchingChildren = (branch.children || []).filter((child) => {
          const enriched = enrichNode(child, branch.label);
          return (
            enriched.label.toLowerCase().includes(q) ||
            (enriched.description && enriched.description.toLowerCase().includes(q)) ||
            (enriched.category && enriched.category.toLowerCase().includes(q)) ||
            (enriched.analogy && enriched.analogy.toLowerCase().includes(q)) ||
            (enriched.examTip && enriched.examTip.toLowerCase().includes(q)) ||
            (enriched.keyPoints && enriched.keyPoints.some((kp) => kp.toLowerCase().includes(q)))
          );
        });

        if (branchMatches || matchingChildren.length > 0) {
          return {
            ...branch,
            children: matchingChildren.length > 0 ? matchingChildren : branch.children,
          };
        }
        return null;
      })
      .filter(Boolean) as MindMapNode[];
  }, [rootNode, searchQuery]);

  // When search query is entered, automatically open branches that have results
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setCollapsedBranches({});
    }
  }, [searchQuery]);

  // Copy full structured outline to clipboard
  const handleCopySummary = () => {
    sounds.playPop();
    let text = `🧠 MAPA MENTAL: ${rootNode.label}\n${rootNode.description || ""}\n\n`;

    (rootNode.children || []).forEach((b) => {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📌 ${b.label.toUpperCase()}\n`;
      if (b.description) text += `   ${b.description}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

      (b.children || []).forEach((c) => {
        const enriched = enrichNode(c, b.label);
        text += `\n• ${enriched.emoji || "🔹"} ${enriched.label} [${enriched.category || "Concepto"}]\n`;
        text += `  Descripción: ${enriched.description}\n`;
        if (enriched.keyPoints && enriched.keyPoints.length > 0) {
          text += `  Puntos clave:\n`;
          enriched.keyPoints.forEach((kp) => {
            text += `    - ${kp.replace(/\*\*/g, "")}\n`;
          });
        }
        if (enriched.analogy) {
          text += `  Analogía: ${enriched.analogy}\n`;
        }
        if (enriched.examTip) {
          text += `  Truco Examen: ${enriched.examTip}\n`;
        }
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Focused concept navigation (Next / Previous)
  const currentFocusIndex = useMemo(() => {
    if (!focusedNode) return -1;
    return allEnrichedConcepts.findIndex((c) => c.node.id === focusedNode.node.id);
  }, [focusedNode, allEnrichedConcepts]);

  const handleNextFocus = () => {
    sounds.playPop();
    if (currentFocusIndex < allEnrichedConcepts.length - 1) {
      setFocusedNode(allEnrichedConcepts[currentFocusIndex + 1]);
    }
  };

  const handlePrevFocus = () => {
    sounds.playPop();
    if (currentFocusIndex > 0) {
      setFocusedNode(allEnrichedConcepts[currentFocusIndex - 1]);
    }
  };

  return (
    <div className="max-w-5xl lg:max-w-6xl mx-auto space-y-10 sm:space-y-12 py-4">
      {/* 1. Header Controls Card */}
      <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 flex items-center justify-center text-3xl shadow-xs shrink-0">
              {rootNode.emoji || "🧠"}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight">
                  {rootNode.label}
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Desplegables Interactivos
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed max-w-xl">
                {rootNode.description ||
                  "Explora cada rama y despliega los conceptos para ver explicaciones completas, puntos clave, analogías y trucos de examen."}
              </p>
            </div>
          </div>

          {/* View mode toggle switch */}
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/90">
              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setViewMode("diagram");
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  viewMode === "diagram"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Diagrama de Red</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setViewMode("cards");
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Esquema Jerárquico</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar esquema completo"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-extrabold text-xs">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Interactive Search & Expand / Collapse Toolset */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Instant Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar en el mapa mental..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 placeholder-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Expand / Collapse Controls */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Abrir todas las ramas y desplegables de conceptos"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expandir todo</span>
            </button>

            <button
              type="button"
              onClick={handleBranchesOnly}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Abrir ramas pero cerrar conceptos"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Solo ramas</span>
            </button>

            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Cerrar todos los desplegables"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Contraer todo</span>
            </button>
          </div>
        </div>

        {/* 3. Mastery Progress Bar */}
        <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Dominio del Mapa:</span>
            </div>
            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              {masteredCount} / {totalConceptsCount} conceptos ({progressPercent}%)
            </span>
          </div>

          <div className="w-full sm:w-56 bg-slate-200 h-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEW: DIAGRAM OR HIERARCHICAL CARDS */}
      {viewMode === "diagram" ? (
        /* VISTA DIAGRAMA DE RED INTERACTIVO */
        <div className="space-y-8 sm:space-y-10">
          {/* Central Root Glowing Node */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => {
                sounds.playPop();
                handleExpandAll();
              }}
              className="relative z-10 px-9 py-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-500/20 border-4 border-indigo-100 text-center cursor-pointer hover:scale-102 transition-transform max-w-lg w-full"
            >
              <div className="text-4xl mb-2">{rootNode.emoji || "🧠"}</div>
              <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight leading-tight">
                {rootNode.label}
              </h3>
              {rootNode.description && (
                <p className="text-xs sm:text-sm text-indigo-100/90 mt-2 font-medium leading-relaxed">
                  {rootNode.description}
                </p>
              )}
              <div className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-extrabold bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-full transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Haz clic para expandir todas las ramas</span>
              </div>
            </div>

            {/* Connecting Vertical Stem */}
            <div className="w-1.5 h-12 bg-indigo-300 rounded-full my-2.5" />
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            {filteredBranches.map((branch, branchIdx) => {
              const isBranchCollapsed = collapsedBranches[branch.id];
              const branchColor =
                branch.color || ["#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48"][branchIdx % 5];
              const branchChildren = branch.children || [];
              const masteredInBranch = branchChildren.filter((c) => masteredNodes[c.id]).length;

              return (
                <div
                  key={branch.id}
                  className="rounded-3xl border-2 transition-all duration-200 overflow-hidden bg-white shadow-sm flex flex-col"
                  style={{ borderColor: `${branchColor}35` }}
                >
                  {/* Branch Accordion Header (Clicking anywhere on this header toggles the branch!) */}
                  <div
                    onClick={(e) => toggleBranch(branch.id, e)}
                    className="p-5 sm:p-6 cursor-pointer transition-colors relative select-none flex items-center justify-between gap-4 group"
                    style={{ backgroundColor: `${branchColor}10` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-xs border"
                        style={{
                          backgroundColor: `${branchColor}20`,
                          borderColor: `${branchColor}40`,
                        }}
                      >
                        {branch.emoji || "📌"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className="font-black text-base sm:text-lg leading-snug font-display"
                            style={{ color: branchColor }}
                          >
                            {branch.label}
                          </h4>
                        </div>
                        {branch.description && (
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {branch.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Sub-concepts counter pill */}
                      <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                        {branchChildren.length} conceptos
                        {masteredInBranch > 0 && ` • ${masteredInBranch} ✓`}
                      </span>

                      {/* Dropdown Chevron Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleBranch(branch.id, e)}
                        className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 flex items-center justify-center transition-transform cursor-pointer shadow-2xs group-hover:scale-105"
                        title={isBranchCollapsed ? "Desplegar rama" : "Plegar rama"}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isBranchCollapsed ? "-rotate-90 text-slate-400" : "rotate-0 text-slate-800"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Branch Body: List of Concept Dropdowns */}
                  {!isBranchCollapsed ? (
                    <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 bg-slate-50/50 flex-1">
                      {branchChildren.length === 0 ? (
                        <div className="p-5 text-center text-xs text-slate-400 font-medium">
                          No hay conceptos en esta rama.
                        </div>
                      ) : (
                        branchChildren.map((child) => {
                          const enriched = enrichNode(child, branch.label);
                          const isExpanded = expandedConcepts[enriched.id];
                          const isMastered = masteredNodes[enriched.id];
                          const isQuizOpen = revealedQuiz[enriched.id];
                          const isSpeaking = speakingNodeId === enriched.id;

                          return (
                            <div
                              key={enriched.id}
                              className={`rounded-2xl border transition-all overflow-hidden ${
                                isExpanded
                                  ? "bg-white border-indigo-300 shadow-md ring-1 ring-indigo-200"
                                  : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs"
                              }`}
                            >
                              {/* Concept Header (Clicking toggles dropdown in place!) */}
                              <div
                                onClick={(e) => toggleConcept(enriched.id, e)}
                                className="p-4 sm:p-5 cursor-pointer flex items-center justify-between gap-4 select-none transition-colors"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <span className="text-2xl shrink-0">
                                    {enriched.emoji || "🔹"}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`font-black text-sm sm:text-base leading-snug truncate ${
                                          isMastered ? "text-emerald-800 line-through opacity-85" : "text-slate-900"
                                        }`}
                                      >
                                        {enriched.label}
                                      </span>
                                      {enriched.category && (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0">
                                          {enriched.category}
                                        </span>
                                      )}
                                      {isMastered && (
                                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 flex items-center gap-1">
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          <span>Dominado</span>
                                        </span>
                                      )}
                                    </div>

                                    {!isExpanded && enriched.description && (
                                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                        {enriched.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Quick Mastered Toggle */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleMastered(enriched.id, e)}
                                    className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                                      isMastered
                                        ? "bg-emerald-500 text-white border-emerald-600"
                                        : "bg-slate-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border-slate-200"
                                    }`}
                                    title={isMastered ? "Marcar como pendiente" : "Marcar como dominado (+10 XP)"}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>

                                  {/* Dropdown Chevron Toggle Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleConcept(enriched.id, e)}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                      isExpanded
                                        ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    <span className="text-xs hidden sm:inline">
                                      {isExpanded ? "Plegar" : "Desplegar"}
                                    </span>
                                    <ChevronDown
                                      className={`w-4 h-4 transition-transform duration-200 ${
                                        isExpanded ? "rotate-180" : "rotate-0 text-slate-500"
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Concept Expanded Visual Content Box (The Complete Visual Desplegable!) */}
                              {isExpanded && (
                                <div className="p-5 sm:p-6 pt-2 space-y-5 border-t border-slate-100 bg-white">
                                  {/* 1. Full Description with **bold** highlighting */}
                                  <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100/90 text-slate-800 text-sm leading-relaxed space-y-1">
                                    <div className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5 mb-1">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Explicación Completa</span>
                                    </div>
                                    <FormattedNodeText
                                      text={enriched.description || ""}
                                      searchQuery={searchQuery}
                                      className="text-slate-800"
                                    />
                                  </div>

                                  {/* 2. Key Points (Puntos Clave) */}
                                  {enriched.keyPoints && enriched.keyPoints.length > 0 && (
                                    <div className="space-y-1.5">
                                      <div className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Puntos Clave Imprescindibles:</span>
                                      </div>
                                      <ul className="space-y-1.5 pl-1">
                                        {enriched.keyPoints.map((kp, kpIdx) => (
                                          <li
                                            key={kpIdx}
                                            className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70"
                                          >
                                            <span className="text-emerald-500 font-bold mt-0.5">•</span>
                                            <FormattedNodeText
                                              text={kp}
                                              searchQuery={searchQuery}
                                              className="leading-relaxed"
                                            />
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* 3. Visual Analogy & Metaphor Card */}
                                  {enriched.analogy && (
                                    <div className="bg-amber-50/90 rounded-2xl p-3.5 border border-amber-200/90 text-amber-950 text-xs leading-relaxed space-y-1">
                                      <div className="font-black flex items-center gap-1.5 text-amber-900">
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                                        <span>
                                          {/⚽|✈️|🎮|analog|metáfora|partido|avión|como un/i.test(enriched.analogy)
                                            ? "Analogía Visual para Recordarlo:"
                                            : "Aclaración Práctica / Idea Clave:"}
                                        </span>
                                      </div>
                                      <FormattedNodeText
                                        text={enriched.analogy}
                                        searchQuery={searchQuery}
                                        className="text-amber-950 font-medium"
                                      />
                                    </div>
                                  )}

                                  {/* 4. Practical Example or Application */}
                                  {enriched.example && (
                                    <div className="bg-sky-50/90 rounded-2xl p-3.5 border border-sky-200/90 text-sky-950 text-xs leading-relaxed space-y-1">
                                      <div className="font-black flex items-center gap-1.5 text-sky-900">
                                        <FlaskConical className="w-3.5 h-3.5 text-sky-600" />
                                        <span>Ejemplo Práctico en la Realidad:</span>
                                      </div>
                                      <FormattedNodeText
                                        text={enriched.example}
                                        searchQuery={searchQuery}
                                        className="text-sky-950 font-medium"
                                      />
                                    </div>
                                  )}

                                  {/* 5. Exam Tip / Mnemonic Trick */}
                                  {enriched.examTip && (
                                    <div className="bg-rose-50/90 rounded-2xl p-3.5 border border-rose-200/90 text-rose-950 text-xs leading-relaxed space-y-1">
                                      <div className="font-black flex items-center gap-1.5 text-rose-900">
                                        <Flame className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Dato Clave de Examen:</span>
                                      </div>
                                      <FormattedNodeText
                                        text={enriched.examTip}
                                        searchQuery={searchQuery}
                                        className="text-rose-950 font-medium"
                                      />
                                    </div>
                                  )}

                                  {/* 6. Mini Interactive Self-Test ("¿Lo dominas?") */}
                                  {enriched.quickQuestion && (
                                    <div className="bg-slate-100/90 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                                          <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                                          <span>Mini Autoevaluación Rápida:</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            sounds.playPop();
                                            setRevealedQuiz((prev) => ({
                                              ...prev,
                                              [enriched.id]: !prev[enriched.id],
                                            }));
                                          }}
                                          className="text-[11px] font-extrabold text-indigo-700 hover:text-indigo-900 cursor-pointer underline underline-offset-2"
                                        >
                                          {isQuizOpen ? "Ocultar respuesta" : "Comprobar respuesta"}
                                        </button>
                                      </div>
                                      <p className="text-xs text-slate-700 font-semibold">
                                        {enriched.quickQuestion.question}
                                      </p>
                                      {isQuizOpen && (
                                        <div className="bg-white p-2.5 rounded-xl border border-indigo-200 text-xs text-indigo-950 font-medium animate-fadeIn">
                                          <span className="font-bold text-emerald-600 mr-1.5">✓ Respuesta:</span>
                                          {enriched.quickQuestion.answer}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* 7. Action Bar for the Node */}
                                  <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      {/* Audio Speech Button */}
                                      <button
                                        type="button"
                                        onClick={(e) => handleSpeakConcept(enriched, e)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                          isSpeaking
                                            ? "bg-indigo-600 text-white border-indigo-700 animate-pulse"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                        }`}
                                        title="Escuchar explicación por audio"
                                      >
                                        {isSpeaking ? (
                                          <>
                                            <VolumeX className="w-3.5 h-3.5" />
                                            <span>Detener audio</span>
                                          </>
                                        ) : (
                                          <>
                                            <Volume2 className="w-3.5 h-3.5" />
                                            <span>Escuchar</span>
                                          </>
                                        )}
                                      </button>

                                      {/* Focus Modal Button */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          sounds.playPop();
                                          setFocusedNode({
                                            node: enriched,
                                            branchLabel: branch.label,
                                            branchColor,
                                          });
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Modo Enfoque</span>
                                      </button>
                                    </div>

                                    {/* Mark as Mastered Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleMastered(enriched.id, e)}
                                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                                        isMastered
                                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                          : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>
                                        {isMastered ? "¡Comprendido! ✓" : "Marcar como dominado (+10 XP)"}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    /* Collapsed hint bar */
                    <div
                      onClick={(e) => toggleBranch(branch.id, e)}
                      className="p-3.5 text-center text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer transition-colors border-t border-slate-100 flex items-center justify-center gap-1.5"
                    >
                      <span>{branchChildren.length} conceptos plegados • Haz clic para desplegar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISTA ESQUEMA JERÁRQUICO COMPLETO (ACCORDION TREE MODE) */
        <div className="space-y-6 sm:space-y-8">
          {/* Root Overview Banner */}
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{rootNode.emoji || "🧠"}</span>
              <h3 className="text-2xl font-black font-display">{rootNode.label}</h3>
            </div>
            {rootNode.description && (
              <p className="text-sm text-indigo-100 leading-relaxed font-medium">
                {rootNode.description}
              </p>
            )}
          </div>

          {/* Hierarchical Accordions */}
          {filteredBranches.map((branch, idx) => {
            const branchColor =
              branch.color || ["#0284c7", "#059669", "#7c3aed", "#d97706", "#e11d48"][idx % 5];
            const isBranchCollapsed = collapsedBranches[branch.id];
            const branchChildren = branch.children || [];
            const masteredInBranch = branchChildren.filter((c) => masteredNodes[c.id]).length;

            return (
              <div
                key={branch.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden"
              >
                {/* Branch Header Clickable */}
                <div
                  onClick={(e) => toggleBranch(branch.id, e)}
                  className="p-5 sm:p-6 cursor-pointer flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors select-none"
                  style={{ borderLeft: `6px solid ${branchColor}` }}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{branch.emoji || "📌"}</span>
                    <div>
                      <h4
                        className="font-black text-lg font-display"
                        style={{ color: branchColor }}
                      >
                        {branch.label}
                      </h4>
                      {branch.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{branch.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                      {branchChildren.length} conceptos {masteredInBranch > 0 && `• ${masteredInBranch} dominados`}
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isBranchCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Sub-concepts Accordion in Schema Mode */}
                {!isBranchCollapsed && (
                  <div className="p-6 pt-0 space-y-4 border-t border-slate-100 bg-slate-50/50">
                    {branchChildren.map((leaf) => {
                      const enriched = enrichNode(leaf, branch.label);
                      const isExpanded = expandedConcepts[enriched.id];
                      const isMastered = masteredNodes[enriched.id];
                      const isQuizOpen = revealedQuiz[enriched.id];

                      return (
                        <div
                          key={enriched.id}
                          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                        >
                          <div
                            onClick={(e) => toggleConcept(enriched.id, e)}
                            className="p-4 cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{enriched.emoji || "🔹"}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-black text-sm text-slate-900 ${
                                      isMastered ? "line-through text-emerald-800" : ""
                                    }`}
                                  >
                                    {enriched.label}
                                  </span>
                                  {enriched.category && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                      {enriched.category}
                                    </span>
                                  )}
                                </div>
                                {!isExpanded && enriched.description && (
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    {enriched.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleToggleMastered(enriched.id, e)}
                                className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                                  isMastered
                                    ? "bg-emerald-500 text-white border-emerald-600"
                                    : "bg-slate-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border-slate-200"
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  isExpanded ? "rotate-180 text-indigo-600" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {/* Expanded content in Cards mode */}
                          {isExpanded && (
                            <div className="p-4 pt-0 space-y-3 border-t border-slate-100 bg-white text-xs text-slate-700">
                              <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 text-slate-800 leading-relaxed">
                                <FormattedNodeText
                                  text={enriched.description || ""}
                                  searchQuery={searchQuery}
                                />
                              </div>

                              {enriched.keyPoints && (
                                <ul className="space-y-1.5 pl-1">
                                  {enriched.keyPoints.map((kp, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60"
                                    >
                                      <span className="text-emerald-600 font-bold">•</span>
                                      <FormattedNodeText text={kp} searchQuery={searchQuery} />
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {enriched.analogy && (
                                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950">
                                  <span className="font-bold mr-1">
                                    {/⚽|✈️|🎮|analog|metáfora|partido|avión|como un/i.test(enriched.analogy)
                                      ? "💡 Analogía:"
                                      : "💡 Idea Clave:"}
                                  </span>
                                  <FormattedNodeText
                                    text={enriched.analogy}
                                    searchQuery={searchQuery}
                                  />
                                </div>
                              )}

                              {enriched.examTip && (
                                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-950">
                                  <span className="font-bold mr-1">⚡ Examen:</span>
                                  <FormattedNodeText
                                    text={enriched.examTip}
                                    searchQuery={searchQuery}
                                  />
                                </div>
                              )}

                              <div className="pt-2 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => handleSpeakConcept(enriched, e)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Escuchar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleMastered(enriched.id, e)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                                    isMastered
                                      ? "bg-emerald-600 text-white"
                                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isMastered ? "Dominado ✓" : "Marcar como dominado"}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL DE ENFOQUE / INSPECTOR DETALLADO */}
      {focusedNode && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-xs border"
                  style={{
                    backgroundColor: `${focusedNode.branchColor}20`,
                    borderColor: `${focusedNode.branchColor}40`,
                  }}
                >
                  {focusedNode.node.emoji || "💡"}
                </div>
                <div>
                  <span
                    className="text-xs font-black uppercase tracking-wider block"
                    style={{ color: focusedNode.branchColor }}
                  >
                    {focusedNode.branchLabel} • {focusedNode.node.category || "Concepto Clave"}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    {focusedNode.node.label}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setFocusedNode(null);
                }}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Complete Visual Explanation */}
            <div className="space-y-4">
              {/* Detailed Description */}
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 text-slate-800 text-sm leading-relaxed">
                <h5 className="font-extrabold text-indigo-950 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Explicación Detallada:</span>
                </h5>
                <FormattedNodeText text={focusedNode.node.description || ""} />
              </div>

              {/* Key points */}
              {focusedNode.node.keyPoints && focusedNode.node.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Puntos Clave del Concepto:
                  </h5>
                  <div className="space-y-1.5">
                    {focusedNode.node.keyPoints.map((kp, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-800 flex items-start gap-2.5"
                      >
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <FormattedNodeText text={kp} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analogy & Exam Trick in Dual Column */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {focusedNode.node.analogy && (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-950 text-xs space-y-1">
                    <span className="font-extrabold flex items-center gap-1 text-amber-900">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span>
                        {/⚽|✈️|🎮|analog|metáfora|partido|avión|como un/i.test(focusedNode.node.analogy)
                          ? "Analogía Visual:"
                          : "Aclaración Práctica / Clave:"}
                      </span>
                    </span>
                    <p className="leading-relaxed">{focusedNode.node.analogy}</p>
                  </div>
                )}

                {focusedNode.node.examTip && (
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-rose-950 text-xs space-y-1">
                    <span className="font-extrabold flex items-center gap-1 text-rose-900">
                      <Flame className="w-4 h-4 text-rose-600" />
                      <span>Truco para Examen:</span>
                    </span>
                    <p className="leading-relaxed">{focusedNode.node.examTip}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Navigation */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevFocus}
                  disabled={currentFocusIndex <= 0}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextFocus}
                  disabled={currentFocusIndex >= allEnrichedConcepts.length - 1}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors disabled:cursor-not-allowed"
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSpeakConcept(focusedNode.node, e)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleToggleMastered(focusedNode.node.id, e)}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                    masteredNodes[focusedNode.node.id]
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {masteredNodes[focusedNode.node.id] ? "¡Dominado! ✓" : "Marcar como dominado"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
