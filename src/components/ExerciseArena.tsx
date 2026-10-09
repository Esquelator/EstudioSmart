import React, { useState, useMemo, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Layers,
  HelpCircle,
  Zap,
  GitCompare,
  RotateCw,
  Check,
  X,
  Volume2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Trophy,
  Flame,
  ShieldCheck,
  Plus,
  SlidersHorizontal,
  Loader2,
  Award,
} from "lucide-react";
import { StudyMaterial, QuizQuestion, TrueFalseQuestion, QuestionDifficulty } from "../types";
import { sounds } from "../utils/audio";

interface ExerciseArenaProps {
  material: StudyMaterial;
  onRewardXp: (
    xp: number,
    isCardMastered?: boolean,
    isQuizAnswered?: boolean,
    isQuizCorrect?: boolean,
    isChatQuestion?: boolean,
    isMatchCompleted?: boolean
  ) => void;
  onUpdateMaterial?: (updated: StudyMaterial) => void;
}

type ExerciseMode = "flashcards" | "quiz" | "trueFalse" | "match";
type DifficultyFilter = "todos" | QuestionDifficulty;

export const ExerciseArena: React.FC<ExerciseArenaProps> = ({
  material,
  onRewardXp,
  onUpdateMaterial,
}) => {
  const [currentMode, setCurrentMode] = useState<ExerciseMode>("flashcards");

  // FLASHCARDS STATE
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showAnalogyHint, setShowAnalogyHint] = useState(false);
  const [cardsMastered, setCardsMastered] = useState<Set<string>>(new Set());

  // QUIZ DIFFICULTY & FILTER STATE
  const [quizDifficultyFilter, setQuizDifficultyFilter] = useState<DifficultyFilter>("todos");
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);

  // TRUE/FALSE DIFFICULTY & FILTER STATE
  const [tfDifficultyFilter, setTfDifficultyFilter] = useState<DifficultyFilter>("todos");
  const [tfIdx, setTfIdx] = useState(0);
  const [tfAnswered, setTfAnswered] = useState<boolean | null>(null);
  const [tfScore, setTfScore] = useState(0);

  // GENERATOR MODAL STATE
  const [showGenModal, setShowGenModal] = useState(false);
  const [genDifficulty, setGenDifficulty] = useState<QuestionDifficulty | "mixto">("dificil");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genFeedback, setGenFeedback] = useState<string | null>(null);

  // MATCH PAIRS STATE (with derangement shuffle so definitions are NEVER on the same row as their term)
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [matchError, setMatchError] = useState(false);
  const [shuffledDefinitions, setShuffledDefinitions] = useState<{ id: string; definition: string }[]>([]);

  // Derangement shuffle function: ensures no definition is in the same row as its corresponding term
  const shuffleDefinitionsDerangement = (pairs: { id: string; definition: string }[]) => {
    if (!pairs || pairs.length === 0) return [];
    if (pairs.length === 1) return [{ id: pairs[0].id, definition: pairs[0].definition }];

    const original = pairs.map((p) => ({ id: p.id, definition: p.definition }));
    let shuffled = [...original];
    let attempts = 0;

    do {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempts++;
    } while (attempts < 30 && shuffled.some((item, idx) => item.id === pairs[idx]?.id));

    // If any item is still on the same row, perform a circular offset by 1
    if (shuffled.some((item, idx) => item.id === pairs[idx]?.id)) {
      shuffled = [...original.slice(1), original[0]];
    }

    return shuffled;
  };

  // Sync and shuffle definitions when material changes
  useEffect(() => {
    if (material.matchPairs && material.matchPairs.length > 0) {
      setShuffledDefinitions(shuffleDefinitionsDerangement(material.matchPairs));
      setMatchedPairs(new Set());
      setSelectedTerm(null);
    } else {
      setShuffledDefinitions([]);
    }
  }, [material.matchPairs]);

  // Randomize quiz questions options so the correct answer is never always in the same position (A, B, C, D)
  const randomizedQuizQuestions = useMemo(() => {
    return (material.quizQuestions || []).map((q) => {
      if (!q.options || q.options.length < 2) return q;
      const rawOptions = [...q.options];
      const correctIdx =
        typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < rawOptions.length
          ? q.correctIndex
          : 0;
      const correctText = rawOptions[correctIdx];

      const shuffled = [...rawOptions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const newCorrectIdx = shuffled.indexOf(correctText);

      return {
        ...q,
        options: shuffled,
        correctIndex: newCorrectIdx !== -1 ? newCorrectIdx : 0,
      };
    });
  }, [material.quizQuestions]);

  // Filtered Quiz Questions
  const filteredQuizQuestions = useMemo(() => {
    if (quizDifficultyFilter === "todos") return randomizedQuizQuestions;
    return randomizedQuizQuestions.filter(
      (q) => (q.difficulty || "medio").toLowerCase() === quizDifficultyFilter
    );
  }, [randomizedQuizQuestions, quizDifficultyFilter]);

  // Quiz Counts by Level
  const quizCounts = useMemo(() => {
    const list = randomizedQuizQuestions;
    return {
      todos: list.length,
      facil: list.filter((q) => (q.difficulty || "medio").toLowerCase() === "facil").length,
      medio: list.filter((q) => (q.difficulty || "medio").toLowerCase() === "medio").length,
      dificil: list.filter((q) => (q.difficulty || "medio").toLowerCase() === "dificil").length,
    };
  }, [randomizedQuizQuestions]);

  // Filtered True/False Questions
  const filteredTfQuestions = useMemo(() => {
    const list = material.trueFalseQuestions || [];
    if (tfDifficultyFilter === "todos") return list;
    return list.filter((tf) => (tf.difficulty || "medio").toLowerCase() === tfDifficultyFilter);
  }, [material.trueFalseQuestions, tfDifficultyFilter]);

  // True/False Counts by Level
  const tfCounts = useMemo(() => {
    const list = material.trueFalseQuestions || [];
    return {
      todos: list.length,
      facil: list.filter((tf) => (tf.difficulty || "medio").toLowerCase() === "facil").length,
      medio: list.filter((tf) => (tf.difficulty || "medio").toLowerCase() === "medio").length,
      dificil: list.filter((tf) => (tf.difficulty || "medio").toLowerCase() === "dificil").length,
    };
  }, [material.trueFalseQuestions]);

  const speakText = (text: string) => {
    sounds.playPop();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 65,
      origin: { y: 0.7 },
      colors: ["#6366f1", "#10b981", "#f59e0b", "#ef4444"],
    });
  };

  // Helper for difficulty badge details
  const getDifficultyMeta = (difficulty?: QuestionDifficulty) => {
    const diff = (difficulty || "medio").toLowerCase();
    switch (diff) {
      case "facil":
        return {
          label: "Fácil",
          tagline: "Concepto Clave",
          xp: 8,
          badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-300",
          pillActive: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
          icon: ShieldCheck,
          emoji: "🟢",
        };
      case "dificil":
        return {
          label: "Difícil (Nivel Examen)",
          tagline: "Razonamiento y Trampas",
          xp: 25,
          badgeBg: "bg-rose-50 text-rose-900 border-rose-300",
          pillActive: "bg-rose-600 text-white border-rose-600 shadow-sm",
          icon: Flame,
          emoji: "🔴",
        };
      case "medio":
      default:
        return {
          label: "Medio",
          tagline: "Mecanismo y Relación",
          xp: 15,
          badgeBg: "bg-amber-50 text-amber-900 border-amber-300",
          pillActive: "bg-amber-500 text-white border-amber-500 shadow-sm",
          icon: Zap,
          emoji: "🟡",
        };
    }
  };

  // Switch Quiz Filter
  const handleSelectQuizFilter = (filter: DifficultyFilter) => {
    sounds.playPop();
    setQuizDifficultyFilter(filter);
    setQuizIdx(0);
    setSelectedQuizOption(null);
  };

  // Switch TF Filter
  const handleSelectTfFilter = (filter: DifficultyFilter) => {
    sounds.playPop();
    setTfDifficultyFilter(filter);
    setTfIdx(0);
    setTfAnswered(null);
  };

  // Generate more questions on demand
  const handleGenerateQuestions = async () => {
    try {
      setIsGenerating(true);
      sounds.playPop();

      const res = await fetch("/api/study/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: material.topic,
          overview: material.overview,
          difficulty: genDifficulty,
          count: 5,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudieron generar más preguntas.");
      }

      const data = await res.json();
      const newQuiz: QuizQuestion[] = data.quizQuestions || [];
      const newTf: TrueFalseQuestion[] = data.trueFalseQuestions || [];

      if (newQuiz.length > 0 || newTf.length > 0) {
        const updatedMaterial: StudyMaterial = {
          ...material,
          quizQuestions: [...(material.quizQuestions || []), ...newQuiz],
          trueFalseQuestions: [...(material.trueFalseQuestions || []), ...newTf],
        };

        if (onUpdateMaterial) {
          onUpdateMaterial(updatedMaterial);
        }

        triggerConfetti();
        sounds.playSuccess();
        const difficultyText =
          genDifficulty === "mixto"
            ? "de todos los niveles"
            : `de nivel ${getDifficultyMeta(genDifficulty as QuestionDifficulty).label}`;
        setGenFeedback(`🎉 ¡Se han añadido ${newQuiz.length} preguntas ${difficultyText}!`);
        setTimeout(() => setGenFeedback(null), 4500);

        if (genDifficulty !== "mixto") {
          setQuizDifficultyFilter(genDifficulty as DifficultyFilter);
          setQuizIdx(0);
          setSelectedQuizOption(null);
        }
        setShowGenModal(false);
      }
    } catch (err: any) {
      console.error("Error generating questions:", err);
      sounds.playError();
      setGenFeedback("Hubo un error al generar las preguntas. Inténtalo de nuevo.");
      setTimeout(() => setGenFeedback(null), 4000);
    } finally {
      setIsGenerating(false);
    }
  };

  // FLASHCARD HANDLERS
  const flipCard = () => {
    sounds.playFlip();
    setIsCardFlipped((prev) => !prev);
  };

  const markCard = (mastered: boolean) => {
    const card = material.flashcards[currentCardIdx];
    if (mastered) {
      sounds.playSuccess();
      setCardsMastered((prev) => new Set(prev).add(card.id));
      onRewardXp(20, true);
      triggerConfetti();
    } else {
      sounds.playPop();
      onRewardXp(5, false);
    }

    setIsCardFlipped(false);
    setShowAnalogyHint(false);
    if (currentCardIdx < material.flashcards.length - 1) {
      setCurrentCardIdx((prev) => prev + 1);
    } else {
      setCurrentCardIdx(0);
    }
  };

  // QUIZ HANDLERS
  const currentQuiz = filteredQuizQuestions[quizIdx] || filteredQuizQuestions[0];
  const currentQuizMeta = currentQuiz ? getDifficultyMeta(currentQuiz.difficulty) : getDifficultyMeta("medio");

  const handleSelectQuizOption = (optionIdx: number) => {
    if (selectedQuizOption !== null || !currentQuiz) return;
    setSelectedQuizOption(optionIdx);

    const isCorrect = optionIdx === currentQuiz.correctIndex;
    const earnedXp = currentQuizMeta.xp;

    if (isCorrect) {
      sounds.playSuccess();
      triggerConfetti();
      setQuizScore((prev) => prev + 1);
      onRewardXp(earnedXp, false, true, true);
    } else {
      sounds.playError();
      onRewardXp(5, false, true, false);
    }
  };

  const nextQuizQuestion = () => {
    sounds.playPop();
    setSelectedQuizOption(null);
    if (quizIdx < filteredQuizQuestions.length - 1) {
      setQuizIdx((prev) => prev + 1);
    } else {
      setQuizIdx(0);
    }
  };

  // TRUE/FALSE HANDLERS
  const currentTf = filteredTfQuestions[tfIdx] || filteredTfQuestions[0];
  const currentTfMeta = currentTf ? getDifficultyMeta(currentTf.difficulty) : getDifficultyMeta("medio");

  const handleTfChoice = (userChoice: boolean) => {
    if (tfAnswered !== null || !currentTf) return;
    setTfAnswered(userChoice);

    const isCorrect = userChoice === currentTf.isTrue;
    const earnedXp = currentTfMeta.xp;

    if (isCorrect) {
      sounds.playSuccess();
      triggerConfetti();
      setTfScore((prev) => prev + 1);
      onRewardXp(earnedXp);
    } else {
      sounds.playError();
      onRewardXp(5);
    }
  };

  const nextTf = () => {
    sounds.playPop();
    setTfAnswered(null);
    if (tfIdx < filteredTfQuestions.length - 1) {
      setTfIdx((prev) => prev + 1);
    } else {
      setTfIdx(0);
    }
  };

  // MATCH PAIR HANDLERS
  const handleSelectTerm = (termId: string) => {
    sounds.playPop();
    setSelectedTerm(termId);
    setMatchError(false);
  };

  const handleSelectDefinition = (defId: string) => {
    if (!selectedTerm) return;

    if (selectedTerm === defId) {
      sounds.playSuccess();
      const nextMatched = new Set(matchedPairs).add(defId);
      setMatchedPairs(nextMatched);
      setSelectedTerm(null);
      setMatchError(false);
      const isFinished = nextMatched.size === material.matchPairs.length;
      onRewardXp(isFinished ? 25 : 5, false, false, false, false, isFinished);
      if (isFinished) {
        triggerConfetti();
      }
    } else {
      sounds.playError();
      setMatchError(true);
      setTimeout(() => {
        setMatchError(false);
        setSelectedTerm(null);
      }, 800);
    }
  };

  const currentFlashcard = material.flashcards[currentCardIdx] || material.flashcards[0];

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-8 sm:space-y-10 py-4">
      {/* Toast Feedback for Generated Questions */}
      {genFeedback && (
        <div className="p-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm sm:text-base flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{genFeedback}</span>
          </div>
          <button
            onClick={() => setGenFeedback(null)}
            className="p-1 hover:bg-indigo-700 rounded-lg text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 p-2 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        <button
          onClick={() => {
            sounds.playPop();
            setCurrentMode("flashcards");
          }}
          className={`px-5 py-3 rounded-xl text-sm sm:text-base font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
            currentMode === "flashcards"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102"
              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
          }`}
        >
          <Layers className="w-5 h-5" />
          <span>Tarjetas</span>
        </button>

        <button
          onClick={() => {
            sounds.playPop();
            setCurrentMode("quiz");
          }}
          className={`px-5 py-3 rounded-xl text-sm sm:text-base font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
            currentMode === "quiz"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102"
              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span>Quiz ({material.quizQuestions?.length || 0})</span>
        </button>

        <button
          onClick={() => {
            sounds.playPop();
            setCurrentMode("trueFalse");
          }}
          className={`px-5 py-3 rounded-xl text-sm sm:text-base font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
            currentMode === "trueFalse"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102"
              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>Verdadero / Falso ({material.trueFalseQuestions?.length || 0})</span>
        </button>

        <button
          onClick={() => {
            sounds.playPop();
            setCurrentMode("match");
          }}
          className={`px-5 py-3 rounded-xl text-sm sm:text-base font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
            currentMode === "match"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102"
              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
          }`}
        >
          <GitCompare className="w-5 h-5" />
          <span>Emparejar</span>
        </button>
      </div>

      {/* 1. FLASHCARDS */}
      {currentMode === "flashcards" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-sm font-bold text-slate-500 px-2">
            <span>
              Tarjeta {currentCardIdx + 1} de {material.flashcards.length}
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 font-extrabold">
              {cardsMastered.size} dominadas
            </span>
          </div>

          <div
            onClick={flipCard}
            className="w-full min-h-[360px] sm:min-h-[400px] bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-200 hover:border-indigo-400 shadow-md cursor-pointer transition-all flex flex-col justify-between text-center select-none active:scale-[0.99] space-y-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                {isCardFlipped ? "Respuesta" : "Pregunta"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(isCardFlipped ? currentFlashcard.back : currentFlashcard.front);
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                  title="Escuchar"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <RotateCw className="w-4 h-4" />
                  <span>Voltear</span>
                </span>
              </div>
            </div>

            <div className="py-6 my-auto">
              {!isCardFlipped ? (
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug font-display">
                  {currentFlashcard.front}
                </h3>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 leading-relaxed">
                    {currentFlashcard.back}
                  </h3>
                  {currentFlashcard.analogyHint && (
                    <p className="text-sm sm:text-base text-amber-900 font-semibold bg-amber-50 p-3 rounded-xl border border-amber-200">
                      💡 {currentFlashcard.analogyHint}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isCardFlipped && currentFlashcard.analogyHint && (
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setShowAnalogyHint(!showAnalogyHint)}
                  className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  {showAnalogyHint ? "Ocultar pista" : "💡 Ver pista de ayuda"}
                </button>
                {showAnalogyHint && (
                  <p className="text-sm text-indigo-900 font-medium mt-2 bg-indigo-50 p-3 rounded-xl">
                    {currentFlashcard.analogyHint}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5 sm:gap-6 pt-2">
            <button
              onClick={() => markCard(false)}
              className="py-4.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 border border-slate-200 shadow-2xs"
            >
              <X className="w-5 h-5 text-rose-500" />
              <span>Repasar</span>
            </button>

            <button
              onClick={() => markCard(true)}
              className="py-4.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-600/20"
            >
              <Check className="w-5 h-5" />
              <span>¡Me la sé!</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. QUIZ MULTINIVEL */}
      {currentMode === "quiz" && (
        <div className="space-y-6">
          {/* Difficulty Selection Bar & Generate Button */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0 pl-1">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Nivel:</span>
              </span>

              {/* Difficulty Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectQuizFilter("todos")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    quizDifficultyFilter === "todos"
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>Todos</span>
                  <span className="ml-1.5 opacity-80 font-normal">({quizCounts.todos})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectQuizFilter("facil")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    quizDifficultyFilter === "facil"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200"
                  }`}
                >
                  <span>🟢 Fácil</span>
                  <span className="opacity-80 font-normal">({quizCounts.facil})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectQuizFilter("medio")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    quizDifficultyFilter === "medio"
                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                      : "bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 border-amber-200"
                  }`}
                >
                  <span>🟡 Medio</span>
                  <span className="opacity-80 font-normal">({quizCounts.medio})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectQuizFilter("dificil")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    quizDifficultyFilter === "dificil"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-rose-50/70 hover:bg-rose-100/70 text-rose-900 border-rose-200"
                  }`}
                >
                  <span>🔴 Difícil (Examen)</span>
                  <span className="opacity-80 font-normal">({quizCounts.dificil})</span>
                </button>
              </div>
            </div>

            {/* Quick Button to Generate More Questions with AI */}
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setShowGenModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>+ Más preguntas</span>
            </button>
          </div>

          {/* Quiz Question Card or Empty Filter Fallback */}
          {filteredQuizQuestions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-5 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-xl font-extrabold text-slate-900">
                  No hay preguntas en este nivel todavía
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Puedes generar 5 preguntas nuevas de este nivel con inteligencia artificial en un solo clic.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGenDifficulty(quizDifficultyFilter === "todos" ? "medio" : quizDifficultyFilter);
                    setShowGenModal(true);
                  }}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generar preguntas para este nivel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuizFilter("todos")}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Ver todas ({quizCounts.todos})
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/90 shadow-sm space-y-7">
              {/* Question Header: Progress & Difficulty Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-slate-500">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-600">
                    Pregunta {quizIdx + 1} de {filteredQuizQuestions.length}
                  </span>

                  {/* Level Badge with XP Value */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${currentQuizMeta.badgeBg}`}
                  >
                    <span>{currentQuizMeta.emoji}</span>
                    <span>{currentQuizMeta.label}</span>
                    <span className="font-extrabold text-slate-500 ml-1">+{currentQuizMeta.xp} XP</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-full border border-indigo-200 font-extrabold">
                    Aciertos: {quizScore}
                  </span>
                </div>
              </div>

              {/* Question text */}
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display leading-relaxed">
                {currentQuiz.question}
              </h3>

              {/* Options */}
              <div className="space-y-4">
                {currentQuiz.options.map((opt, i) => {
                  const isSelected = selectedQuizOption === i;
                  const isCorrect = i === currentQuiz.correctIndex;
                  const showResult = selectedQuizOption !== null;

                  let btnStyle = "bg-slate-50 hover:bg-indigo-50 border-slate-200 text-slate-800";
                  if (showResult) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-600 border-emerald-600 text-white shadow-sm";
                    } else if (isSelected) {
                      btnStyle = "bg-rose-600 border-rose-600 text-white shadow-sm";
                    } else {
                      btnStyle = "bg-slate-50 opacity-40 border-slate-200 text-slate-400";
                    }
                  }

                  return (
                    <button
                      key={i}
                      disabled={showResult}
                      onClick={() => handleSelectQuizOption(i)}
                      className={`w-full p-5 sm:p-5.5 rounded-2xl border text-left font-bold text-base sm:text-lg transition-all flex items-center justify-between gap-4 cursor-pointer ${btnStyle}`}
                    >
                      <span className="leading-snug">{opt}</span>
                      {showResult && isCorrect && <Check className="w-6 h-6 shrink-0 text-white" />}
                      {showResult && isSelected && !isCorrect && <X className="w-6 h-6 shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Banner */}
              {selectedQuizOption !== null && (
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2 leading-relaxed animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-white px-2.5 py-0.5 rounded-md border border-indigo-200">
                      Explicación Pedagógica
                    </span>
                    <span className="text-xs font-bold text-indigo-600">
                      Nivel {currentQuizMeta.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-indigo-950">{currentQuiz.explanation}</p>
                  {currentQuiz.analogyExplanation && (
                    <p className="text-xs sm:text-sm text-indigo-800 font-semibold bg-white/70 p-3 rounded-xl border border-indigo-100">
                      💡 {currentQuiz.analogyExplanation}
                    </p>
                  )}
                </div>
              )}

              {/* Next Question / Finish Button */}
              {selectedQuizOption !== null && (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs sm:text-sm font-bold text-slate-500">
                    {quizIdx + 1 < filteredQuizQuestions.length ? (
                      <span>Quedan {filteredQuizQuestions.length - (quizIdx + 1)} preguntas en este nivel</span>
                    ) : (
                      <span className="text-emerald-700 font-black">¡Has llegado al final de este bloque!</span>
                    )}
                  </div>

                  <button
                    onClick={nextQuizQuestion}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-600/25"
                  >
                    <span>
                      {quizIdx + 1 < filteredQuizQuestions.length ? "Siguiente Pregunta" : "Reiniciar o Cambiar Nivel"}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. VERDADERO O FALSO MULTINIVEL */}
      {currentMode === "trueFalse" && (
        <div className="space-y-6">
          {/* Difficulty Filter Bar for TF */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0 pl-1">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Nivel:</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectTfFilter("todos")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    tfDifficultyFilter === "todos"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>Todos ({tfCounts.todos})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTfFilter("facil")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    tfDifficultyFilter === "facil"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  <span>🟢 Fácil ({tfCounts.facil})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTfFilter("medio")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    tfDifficultyFilter === "medio"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                  }`}
                >
                  <span>🟡 Medio ({tfCounts.medio})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTfFilter("dificil")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                    tfDifficultyFilter === "dificil"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  }`}
                >
                  <span>🔴 Difícil ({tfCounts.dificil})</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setShowGenModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>+ Más retos</span>
            </button>
          </div>

          {filteredTfQuestions.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-xs">
              <h4 className="text-xl font-extrabold text-slate-900">No hay retos en este nivel</h4>
              <button
                type="button"
                onClick={() => handleSelectTfFilter("todos")}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm"
              >
                Ver todos ({tfCounts.todos})
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/90 shadow-sm space-y-8 text-center">
              <div className="flex items-center justify-between text-sm font-bold text-slate-500">
                <div className="flex items-center gap-2.5">
                  <span>Reto {tfIdx + 1} de {filteredTfQuestions.length}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${currentTfMeta.badgeBg}`}
                  >
                    <span>{currentTfMeta.emoji}</span>
                    <span>{currentTfMeta.label}</span>
                    <span className="font-extrabold opacity-75">+{currentTfMeta.xp} XP</span>
                  </span>
                </div>
                <span className="text-amber-800 bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200 font-extrabold">
                  Aciertos: {tfScore}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug py-6 font-display">
                "{currentTf.statement}"
              </h3>

              <div className="grid grid-cols-2 gap-5 sm:gap-6">
                <button
                  disabled={tfAnswered !== null}
                  onClick={() => handleTfChoice(true)}
                  className={`p-6 sm:p-8 rounded-2xl border-2 font-extrabold text-lg sm:text-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    tfAnswered === null
                      ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900 active:scale-95"
                      : currentTf.isTrue
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-slate-50 opacity-40 text-slate-400"
                  }`}
                >
                  <span className="text-3xl">👍</span>
                  <span>VERDADERO</span>
                </button>

                <button
                  disabled={tfAnswered !== null}
                  onClick={() => handleTfChoice(false)}
                  className={`p-6 sm:p-8 rounded-2xl border-2 font-extrabold text-lg sm:text-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    tfAnswered === null
                      ? "bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-900 active:scale-95"
                      : !currentTf.isTrue
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-slate-50 opacity-40 text-slate-400"
                  }`}
                >
                  <span className="text-3xl">👎</span>
                  <span>FALSO</span>
                </button>
              </div>

              {tfAnswered !== null && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 animate-fade-in">
                  {currentTf.explanation}
                </div>
              )}

              {tfAnswered !== null && (
                <button
                  onClick={nextTf}
                  className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>Siguiente Reto</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. MATCH PAIRS */}
      {currentMode === "match" && (
        <div className="bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
          <div className="text-center space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              Conecta cada concepto con su significado
            </h3>
            <p className="text-sm text-slate-500">
              Haz clic en uno de la izquierda y luego en su pareja correspondiente
            </p>
          </div>

          {matchError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold text-center">
              No coinciden, intenta con otro.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            <div className="space-y-3">
              {material.matchPairs.map((pair) => {
                const isMatched = matchedPairs.has(pair.id);
                const isSelected = selectedTerm === pair.id;

                return (
                  <button
                    key={pair.id}
                    disabled={isMatched}
                    onClick={() => handleSelectTerm(pair.id)}
                    className={`w-full p-4.5 sm:p-5 rounded-2xl border text-left font-bold text-base transition-all cursor-pointer ${
                      isMatched
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 opacity-50 line-through"
                        : isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-101"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                    }`}
                  >
                    <span>{pair.term}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Shuffled Definitions (guaranteed not on the same row as term) */}
            <div className="space-y-3">
              {(shuffledDefinitions.length > 0 ? shuffledDefinitions : material.matchPairs).map((item) => {
                const isMatched = matchedPairs.has(item.id);

                return (
                  <button
                    key={item.id}
                    disabled={isMatched || !selectedTerm}
                    onClick={() => handleSelectDefinition(item.id)}
                    className={`w-full p-4.5 sm:p-5 rounded-2xl border text-left font-semibold text-sm sm:text-base transition-all cursor-pointer ${
                      isMatched
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 opacity-50 line-through"
                        : selectedTerm
                        ? "bg-indigo-50 hover:bg-indigo-100 border-indigo-300 text-indigo-950"
                        : "bg-slate-50 border-slate-200 text-slate-700 opacity-60"
                    }`}
                  >
                    <span>{item.definition}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {matchedPairs.size === material.matchPairs.length && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 animate-fade-in">
              <Trophy className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-xl font-extrabold text-emerald-950">¡Completaste todas las parejas!</h4>
              <p className="text-xs sm:text-sm text-emerald-800">
                Has conectado con precisión todos los conceptos y definiciones.
              </p>
              <button
                onClick={() => {
                  sounds.playPop();
                  setMatchedPairs(new Set());
                  setSelectedTerm(null);
                  setMatchError(false);
                  setShuffledDefinitions(shuffleDefinitionsDerangement(material.matchPairs));
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Volver a jugar (nuevo orden)
              </button>
            </div>
          )}
        </div>
      )}

      {/* GENERATE MORE QUESTIONS MODAL */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    Generar Nuevas Preguntas con IA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Elige el nivel de exigencia para tu entrenamiento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                disabled={isGenerating}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Level Selector Options */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                Selecciona la dificultad deseada:
              </label>

              {/* Fácil */}
              <div
                onClick={() => setGenDifficulty("facil")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  genDifficulty === "facil"
                    ? "bg-emerald-50/80 border-emerald-500 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-emerald-950">Nivel Fácil</h4>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                        +15 XP por acierto
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Definiciones elementales, conceptos clave y recuerdo directo sin trampas.
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    genDifficulty === "facil"
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-slate-300"
                  }`}
                >
                  {genDifficulty === "facil" && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Medio */}
              <div
                onClick={() => setGenDifficulty("medio")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  genDifficulty === "medio"
                    ? "bg-amber-50/80 border-amber-500 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-amber-950">Nivel Medio</h4>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-full">
                        +25 XP por acierto
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Procesos intermedios, relaciones causa-efecto y aplicación práctica del temario.
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    genDifficulty === "medio"
                      ? "border-amber-500 bg-amber-500"
                      : "border-slate-300"
                  }`}
                >
                  {genDifficulty === "medio" && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Difícil (Examen) */}
              <div
                onClick={() => setGenDifficulty("dificil")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  genDifficulty === "dificil"
                    ? "bg-rose-50/80 border-rose-500 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-rose-950">Nivel Difícil (Examen)</h4>
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-100/60 px-2 py-0.5 rounded-full">
                        +40 XP por acierto
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Preguntas trampa, deducciones complejas, casos límite y máxima exigencia académica.
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    genDifficulty === "dificil"
                      ? "border-rose-600 bg-rose-600"
                      : "border-slate-300"
                  }`}
                >
                  {genDifficulty === "dificil" && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>

              {/* Mixto */}
              <div
                onClick={() => setGenDifficulty("mixto")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  genDifficulty === "mixto"
                    ? "bg-indigo-50/80 border-indigo-500 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-indigo-950">Modo Mixto Progresivo</h4>
                      <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                        Batería equilibrada
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Una combinación variada con preguntas fáciles, intermedias y difíciles.
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    genDifficulty === "mixto"
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300"
                  }`}
                >
                  {genDifficulty === "mixto" && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                disabled={isGenerating}
                className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/25 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creando preguntas...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generar +5 Preguntas Ahora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
