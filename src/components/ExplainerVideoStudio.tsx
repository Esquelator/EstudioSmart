import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Download,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
  Target,
  Flame,
  MessageSquareText,
  RefreshCw,
  Film,
  Layers,
  FileText,
  FastForward,
  HelpCircle,
  Check,
  ChevronRight,
  ChevronDown,
  Eye,
  Sliders,
  Activity,
  Orbit,
  Cpu,
  Split,
  Gauge,
  Compass,
  Atom,
  Radio,
  Wand2,
  BarChart3,
  TrendingUp,
  Cog,
  BatteryCharging,
} from "lucide-react";
import { StudyMaterial, AnimatedVideo, AnimatedVideoScene, VideoVisualType } from "../types";
import { sounds } from "../utils/audio";

interface ExplainerVideoStudioProps {
  material: StudyMaterial;
  onUpdateMaterialVideo: (video: AnimatedVideo) => void;
  onAskTutorAboutScene: (sceneTitle: string, narration: string) => void;
  onRewardXp: (xp: number) => void;
}

type AudioMode = "gemini_tts" | "browser_tts" | "muted";

export type AnimationTheme =
  | "auto"
  | "circuit"
  | "orbital"
  | "comparison"
  | "math_board"
  | "hud_telemetry"
  | "mechanics"
  | "reactor";

export type HumanVoiceId = "Kore" | "Puck" | "Fenrir" | "Zephyr";

export interface HumanVoiceOption {
  id: HumanVoiceId;
  name: string;
  tag: string;
  desc: string;
  icon: string;
  gender: string;
}

export const HUMAN_VOICE_OPTIONS: HumanVoiceOption[] = [
  {
    id: "Kore",
    name: "Kore",
    tag: "Cálida & Didáctica",
    desc: "Voz humana femenina, natural, cercana y perfecta para estudiar",
    icon: "👩‍🏫",
    gender: "Femenina",
  },
  {
    id: "Puck",
    name: "Puck",
    tag: "Dinámico & Juvenil",
    desc: "Voz humana masculina, ágil, entusiasta y con ritmo moderno",
    icon: "👨‍💻",
    gender: "Masculina",
  },
  {
    id: "Fenrir",
    name: "Fenrir",
    tag: "Narrador Documental",
    desc: "Voz masculina profunda, sosegada y estilo documental divulgativo",
    icon: "🎙️",
    gender: "Masculina",
  },
  {
    id: "Zephyr",
    name: "Zephyr",
    tag: "Serena & Suave",
    desc: "Voz tranquila, clara y reflexiva para conceptos complejos",
    icon: "✨",
    gender: "Neutra",
  },
];

export const ExplainerVideoStudio: React.FC<ExplainerVideoStudioProps> = ({
  material,
  onUpdateMaterialVideo,
  onAskTutorAboutScene,
  onRewardXp,
}) => {
  const [video, setVideo] = useState<AnimatedVideo | null>(material.animatedVideo || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<"whiteboard" | "masterclass" | "exam_prep" | "analogy_mode">(
    "whiteboard"
  );
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0); // 0 to 100 within current scene
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioMode, setAudioMode] = useState<AudioMode>("gemini_tts"); // Default to ultra-realistic Gemini Human Voice!
  const [selectedVoice, setSelectedVoice] = useState<HumanVoiceId>("Kore");
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [cachedAudioUrls, setCachedAudioUrls] = useState<Record<string, string>>({});
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"player" | "storyboard">("player");
  const [animationTheme, setAnimationTheme] = useState<AnimationTheme>("auto");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [cinematicZoomEnabled, setCinematicZoomEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasCompletedVideo, setHasCompletedVideo] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sceneStartTimeRef = useRef<number>(Date.now());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const audioDurationRef = useRef<number | null>(null);
  const pauseTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getActiveTheme = useCallback(
    (
      scene?: AnimatedVideoScene
    ): "circuit" | "orbital" | "comparison" | "math_board" | "hud_telemetry" | "mechanics" | "reactor" => {
      if (animationTheme !== "auto") return animationTheme;
      if (!scene) return "circuit";

      const diagType = scene.visualDiagram?.type;
      const titleLower = (scene.title || "").toLowerCase();
      const narrationLower = (scene.narration || "").toLowerCase();

      if (
        diagType === "comparison" ||
        titleLower.includes("vs") ||
        titleLower.includes("duelo") ||
        titleLower.includes("comparat") ||
        scene.badgeEmoji === "⚔️"
      ) {
        return "comparison";
      }
      if (
        diagType === "mechanics" ||
        titleLower.includes("mecanism") ||
        titleLower.includes("engranaj") ||
        titleLower.includes("palanca") ||
        titleLower.includes("secuencia") ||
        scene.badgeEmoji === "⚙️"
      ) {
        return "mechanics";
      }
      if (
        diagType === "reactor" ||
        titleLower.includes("reactor") ||
        titleLower.includes("energ") ||
        titleLower.includes("potencia") ||
        titleLower.includes("flujo") ||
        narrationLower.includes("energ") ||
        scene.badgeEmoji === "⚡"
      ) {
        return "reactor";
      }
      if (
        diagType === "cycle" ||
        diagType === "orbit" ||
        scene.sceneType === "analogy" ||
        scene.badgeEmoji === "🪐"
      ) {
        return "orbital";
      }
      if (
        diagType === "equation" ||
        scene.sceneType === "formula" ||
        scene.badgeEmoji === "📐"
      ) {
        return "math_board";
      }
      if (
        diagType === "stats" ||
        scene.sceneType === "intro" ||
        scene.sceneType === "summary" ||
        scene.badgeEmoji === "🏆"
      ) {
        return "hud_telemetry";
      }
      return "circuit";
    },
    [animationTheme]
  );

  // Auto-generate video on mount if not yet created for this material
  useEffect(() => {
    if (!material.animatedVideo && !video && !isGenerating) {
      handleGenerateVideo(selectedStyle);
    } else if (material.animatedVideo && !video) {
      setVideo(material.animatedVideo);
    }
  }, [material]);

  // Request full animated video from server
  const handleGenerateVideo = async (style: "whiteboard" | "masterclass" | "exam_prep" | "analogy_mode") => {
    try {
      setIsGenerating(true);
      setIsPlaying(false);
      stopCurrentAudio();
      sounds.playPop();

      const res = await fetch("/api/study/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: material.topic,
          overview: material.overview,
          formalDefinition: material.formalDefinition,
          passionExplanation: material.passionExplanation,
          sections: material.sections,
          mindMap: material.mindMap,
          analogies: material.analogies,
          keyPoints: material.keyPoints,
          passions: material.selectedPassions,
          stylePreference: style,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("json")) {
        throw new Error("No se pudo generar el guion audiovisual.");
      }

      const newVideo: AnimatedVideo = await res.json();
      setVideo(newVideo);
      onUpdateMaterialVideo(newVideo);
      setCurrentSceneIdx(0);
      setSceneProgress(0);
      sounds.playSuccess();
      showToast("🎬 ¡Vídeo explicativo generado con éxito!");
    } catch (err: any) {
      console.error("Error generating video:", err);
      showToast("Aviso: usando plantilla audiovisual optimizada.");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentScene: AnimatedVideoScene | undefined = video?.scenes[currentSceneIdx];

  // Stop any active speech/audio
  const stopCurrentAudio = useCallback(() => {
    if (pauseTransitionTimeoutRef.current) {
      clearTimeout(pauseTransitionTimeoutRef.current);
      pauseTransitionTimeoutRef.current = null;
    }
    isSpeakingRef.current = false;
    setIsVoiceSpeaking(false);
    audioDurationRef.current = null;

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Safe scene transition that never cuts audio prematurely
  const triggerNextScene = useCallback(() => {
    if (pauseTransitionTimeoutRef.current) {
      clearTimeout(pauseTransitionTimeoutRef.current);
      pauseTransitionTimeoutRef.current = null;
    }

    if (!video) return;

    if (currentSceneIdx < video.scenes.length - 1) {
      const nextIdx = currentSceneIdx + 1;
      setCurrentSceneIdx(nextIdx);
      setSceneProgress(0);
      sceneStartTimeRef.current = Date.now();
      audioDurationRef.current = null;
      playSceneAudio(video.scenes[nextIdx]);
    } else {
      // Reached end of video!
      setIsPlaying(false);
      stopCurrentAudio();
      if (!hasCompletedVideo) {
        setHasCompletedVideo(true);
        onRewardXp(40);
        sounds.playSuccess();
        showToast("🎉 ¡Vídeo completado! +40 XP de dominio audiovisual");
      }
    }
  }, [video, currentSceneIdx, stopCurrentAudio, hasCompletedVideo, onRewardXp]);

  // Play high-quality browser voice with natural pitch and neural voices
  const playBrowserVoice = useCallback(
    (text: string, onSpeechFinished?: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const clean = text.replace(/[*#_`]/g, "");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "es-ES";
      utterance.rate = 1.0 * playbackSpeed;
      utterance.pitch = 1.05; // Slightly warmer, more human tone

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

      isSpeakingRef.current = true;
      setIsVoiceSpeaking(true);

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setIsVoiceSpeaking(true);
      };

      const handleSpeechDone = () => {
        isSpeakingRef.current = false;
        setIsVoiceSpeaking(false);
        onSpeechFinished?.();
      };

      utterance.onend = handleSpeechDone;
      utterance.onerror = handleSpeechDone;

      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [playbackSpeed]
  );

  // Voice narration player (TTS or Browser)
  const playSceneAudio = useCallback(
    async (scene: AnimatedVideoScene, overrideVoice?: HumanVoiceId) => {
      stopCurrentAudio();
      if (audioMode === "muted") return;

      const voiceToUse = overrideVoice || selectedVoice;

      const handleSpeechFinished = () => {
        isSpeakingRef.current = false;
        setIsVoiceSpeaking(false);
        // Add a natural breath pause (750ms) so the viewer absorbs the final words
        if (pauseTransitionTimeoutRef.current) {
          clearTimeout(pauseTransitionTimeoutRef.current);
        }
        pauseTransitionTimeoutRef.current = setTimeout(() => {
          triggerNextScene();
        }, 750);
      };

      if (audioMode === "gemini_tts") {
        try {
          setIsAudioLoading(true);
          const cacheKey = `${scene.id}_${voiceToUse}`;
          let audioUrl = cachedAudioUrls[cacheKey];

          if (!audioUrl) {
            const res = await fetch("/api/study/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: scene.narration, voice: voiceToUse }),
            });
            if (res.ok && res.headers.get("content-type")?.includes("json")) {
              const data = await res.json().catch(() => ({}));
              if (data.audioUrl) {
                audioUrl = data.audioUrl;
                setCachedAudioUrls((prev) => ({ ...prev, [cacheKey]: audioUrl }));
              } else if (data.fallbackToBrowser) {
                // Graceful fallback without breaking video playback
                playBrowserVoice(scene.narration, handleSpeechFinished);
                return;
              }
            }
          }

          if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.playbackRate = playbackSpeed;
            audioElementRef.current = audio;

            audio.addEventListener("loadedmetadata", () => {
              if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                audioDurationRef.current = audio.duration;
              }
            });

            audio.addEventListener("play", () => {
              isSpeakingRef.current = true;
              setIsVoiceSpeaking(true);
              sceneStartTimeRef.current = Date.now();
            });

            audio.addEventListener("ended", () => {
              handleSpeechFinished();
            });

            audio.addEventListener("error", () => {
              playBrowserVoice(scene.narration, handleSpeechFinished);
            });

            await audio.play().catch(() => {
              playBrowserVoice(scene.narration, handleSpeechFinished);
            });
          } else {
            playBrowserVoice(scene.narration, handleSpeechFinished);
          }
        } catch (err) {
          console.warn("Gemini TTS fallback to browser voice:", err);
          playBrowserVoice(scene.narration, handleSpeechFinished);
        } finally {
          setIsAudioLoading(false);
        }
      } else if (audioMode === "browser_tts") {
        playBrowserVoice(scene.narration, handleSpeechFinished);
      }
    },
    [audioMode, cachedAudioUrls, playbackSpeed, selectedVoice, stopCurrentAudio, playBrowserVoice, triggerNextScene]
  );

  // Scene transition
  const goToScene = useCallback(
    (index: number) => {
      if (!video || !video.scenes[index]) return;
      sounds.playPop();
      stopCurrentAudio();
      setCurrentSceneIdx(index);
      setSceneProgress(0);
      sceneStartTimeRef.current = Date.now();
      audioDurationRef.current = null;
      if (isPlaying) {
        playSceneAudio(video.scenes[index]);
      }
    },
    [video, isPlaying, playSceneAudio, stopCurrentAudio]
  );

  // Play/Pause toggle
  const togglePlay = () => {
    sounds.playPop();
    if (!video) return;

    if (!isPlaying) {
      setIsPlaying(true);
      sceneStartTimeRef.current = Date.now() - (sceneProgress / 100) * (currentScene?.durationSeconds || 14) * 1000;
      if (currentScene) {
        playSceneAudio(currentScene);
      }
    } else {
      setIsPlaying(false);
      stopCurrentAudio();
    }
  };

  // Main animation ticker loop - synchronized to audio playback without abrupt cuts
  useEffect(() => {
    if (!isPlaying || !currentScene || !video) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const updateLoop = () => {
      // If audio is currently fetching from network, hold the animation ticker
      if (isAudioLoading) {
        sceneStartTimeRef.current = Date.now();
        animationFrameRef.current = requestAnimationFrame(updateLoop);
        return;
      }

      // If an audio element is active with known duration, bind progress directly to speech
      if (
        audioElementRef.current &&
        !audioElementRef.current.paused &&
        audioElementRef.current.duration &&
        audioElementRef.current.duration > 0
      ) {
        const curTime = audioElementRef.current.currentTime;
        const totalDur = audioElementRef.current.duration;
        const progress = Math.min(99, (curTime / totalDur) * 100);
        setSceneProgress(progress);
      } else {
        const estimatedSecs = Math.max(
          currentScene.durationSeconds || 14,
          audioDurationRef.current || 0
        );
        const durationMs = estimatedSecs * 1000 * (1 / playbackSpeed);
        const elapsed = Date.now() - sceneStartTimeRef.current;
        const progress = Math.min(100, (elapsed / durationMs) * 100);

        // DO NOT CUT OFF VOICE: If still speaking, clamp at 98.5% until voice finishes
        if (isSpeakingRef.current) {
          setSceneProgress(Math.min(98.5, progress));
        } else {
          setSceneProgress(progress);
          if (progress >= 100) {
            triggerNextScene();
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSceneIdx, currentScene, playbackSpeed, video, isAudioLoading, triggerNextScene]);

  // Fullscreen support
  const toggleFullscreen = () => {
    sounds.playPop();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcut: Space for play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, currentScene, video]);

  // Global video progress calculation
  const totalVideoDuration = video?.totalDurationSeconds || 1;
  const elapsedVideoSeconds = video
    ? video.scenes.slice(0, currentSceneIdx).reduce((acc, s) => acc + s.durationSeconds, 0) +
      ((sceneProgress / 100) * (currentScene?.durationSeconds || 0))
    : 0;
  const globalProgressPercent = Math.min(100, Math.round((elapsedVideoSeconds / totalVideoDuration) * 100));

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Export video storyboard as text file
  const handleExportScript = () => {
    sounds.playPop();
    if (!video) return;
    let content = `======================================================\n`;
    content += `🎬 VÍDEO EXPLICATIVO ANIMADO: ${video.topic}\n`;
    content += `Título: ${video.title}\n`;
    content += `Duración estimada: ${formatTime(video.totalDurationSeconds)} (${video.scenes.length} escenas)\n`;
    content += `Estilo: ${video.style || "Pizarra Ilustrada"}\n`;
    content += `======================================================\n\n`;

    video.scenes.forEach((sc, idx) => {
      content += `[ESCENA ${sc.sceneNumber}: ${sc.title.toUpperCase()}]\n`;
      content += `Subtítulo: ${sc.subtitle || ""}\n`;
      content += `Duración: ${sc.durationSeconds}s | Tipo: ${sc.sceneType} | Color: ${sc.themeColor}\n`;
      content += `Guion de locución:\n"${sc.narration}"\n\n`;
      content += `Elementos en pantalla:\n`;
      sc.elements.forEach((el) => {
        content += `  - [${el.type}] (${el.timingPercent}%): ${el.content} ${el.highlight ? `[Destacado: ${el.highlight}]` : ""}\n`;
      });
      if (sc.visualDiagram) {
        content += `Diagrama visual (${sc.visualDiagram.type}):\n`;
        sc.visualDiagram.nodes.forEach((n) => {
          content += `  * Nodo: ${n.label} (${n.sublabel || ""})\n`;
        });
      }
      content += `Regla de oro: ${sc.keyTakeaway}\n`;
      content += `------------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Guion_Video_${video.topic.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("📄 ¡Guion y storyboard exportado con éxito!");
  };

  // Simulate video capture / WebM download
  const handleDownloadVideo = () => {
    sounds.playPop();
    setIsRecording(true);
    showToast("🎥 Preparando exportación del vídeo interactivo...");

    setTimeout(() => {
      setIsRecording(false);
      sounds.playSuccess();
      handleExportScript();
      showToast("💾 ¡Storyboard y datos cinemáticos descargados!");
    }, 1500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in" ref={containerRef}>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-bold border border-slate-700 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with Style Selector and Generation Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Film className="w-5 h-5" />
            </span>
            <span className="text-xs font-black tracking-wider uppercase text-indigo-600">
              Estudio Audiovisual Basado en tu Tema
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Vídeo Explicativo con Animaciones
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Animaciones paso a paso de fórmulas, diagramas de flujo y locución sincronizada diseñada a partir del
            documento subido ({material.topic}).
          </p>
        </div>

        {/* Style Selection & Regenerate Button */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
            <span className="px-2 text-slate-500">Estilo:</span>
            <select
              value={selectedStyle}
              onChange={(e) => {
                const val = e.target.value as any;
                setSelectedStyle(val);
                handleGenerateVideo(val);
              }}
              disabled={isGenerating}
              className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-extrabold text-slate-800 shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="whiteboard">🎨 Pizarra Ilustrada</option>
              <option value="masterclass">⚡ Masterclass Dinámica</option>
              <option value="exam_prep">🎯 Enfoque Examen</option>
              <option value="analogy_mode">
                {material.selectedPassions.some((p) => /normal|sin analog/i.test(p))
                  ? "🔬 Didáctico Directo"
                  : "⚽ Analogías Visuales"}
              </option>
            </select>
          </div>

          <button
            onClick={() => handleGenerateVideo(selectedStyle)}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Creando Animaciones..." : "Regenerar Vídeo"}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Display: Video Player Screen */}
      {isGenerating ? (
        <div className="aspect-video w-full rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial from-indigo-900/30 via-slate-900/80 to-slate-950 pointer-events-none" />
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Film className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div className="relative space-y-2 max-w-md">
            <h3 className="text-xl font-black text-white">Animando tu Tema con Gemini...</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Construyendo escenas dinámicas, diagramas cinéticos y sincronizando la voz en off para:{" "}
              <strong className="text-indigo-400">{material.topic}</strong>
            </p>
          </div>
        </div>
      ) : video && currentScene ? (
        <div className="space-y-4">
          {/* Top Bar for Player: Scene switcher tabs & views */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* View Switcher & Animation Engine Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Tab Switcher: Player vs Storyboard */}
              <div className="inline-flex p-1 bg-slate-200/80 rounded-2xl border border-slate-300 text-xs font-extrabold">
                <button
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("player");
                  }}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "player" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Reproductor Animado</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("storyboard");
                  }}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === "storyboard" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Storyboard & Guion ({video.scenes.length} Escenas)</span>
                </button>
              </div>

              {/* Animation Engine Switcher (distinct animation archetypes) */}
              <div className="inline-flex items-center gap-1 p-1 bg-slate-900/90 rounded-2xl border border-slate-700/80 text-xs text-slate-300 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Motor Visual:</span>
                </span>
                {[
                  { id: "auto", label: "Auto", icon: Wand2 },
                  { id: "circuit", label: "Cuántico", icon: Cpu },
                  { id: "mechanics", label: "Engranajes", icon: Cog },
                  { id: "reactor", label: "Reactor", icon: BatteryCharging },
                  { id: "orbital", label: "Órbita 360°", icon: Orbit },
                  { id: "comparison", label: "Duelo VS", icon: Split },
                  { id: "math_board", label: "Pizarra", icon: Compass },
                  { id: "hud_telemetry", label: "HUD", icon: Gauge },
                ].map((th) => {
                  const Icon = th.icon;
                  const isSelected = animationTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => {
                        sounds.playPop();
                        setAnimationTheme(th.id as any);
                        showToast(`✨ Motor de animación: ${th.label}`);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                      title={`Cambiar motor de animación a ${th.label}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{th.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick action: Ask Tutor about current scene */}
            <button
              onClick={() => {
                sounds.playPop();
                setIsPlaying(false);
                stopCurrentAudio();
                onAskTutorAboutScene(currentScene.title, currentScene.narration);
              }}
              className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Pausar el vídeo y consultar dudas sobre esta escena con el Tutor de Inteligencia Artificial"
            >
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Preguntar duda de esta escena</span>
            </button>
          </div>

          {activeTab === "player" ? (
            /* =================== VIDEO PLAYER CONTAINER =================== */
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl transition-all select-none">
              {/* Scene Viewport (Aspect 16:9) */}
              <div
                className="relative w-full aspect-video min-h-[380px] sm:min-h-[480px] lg:min-h-[540px] flex flex-col justify-between p-6 sm:p-10 overflow-hidden transition-transform duration-700 ease-out"
                style={{
                  background:
                    selectedStyle === "whiteboard"
                      ? "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)"
                      : "radial-gradient(circle at 50% 30%, #0f172a 0%, #020617 100%)",
                  transform: cinematicZoomEnabled
                    ? `scale(${1 + Math.sin((sceneProgress / 100) * Math.PI) * 0.015})`
                    : "none",
                }}
              >
                {/* Subtle blueprint / grid canvas effect */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "32px 32px",
                  }}
                />

                {/* Floating Ambient Kinetic Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(14)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full bg-indigo-300/30 blur-[0.5px] transition-all duration-1000 animate-pulse"
                      style={{
                        width: `${(i % 3) * 2 + 2}px`,
                        height: `${(i % 3) * 2 + 2}px`,
                        top: `${(i * 19) % 95}%`,
                        left: `${(i * 23 + sceneProgress * 0.3) % 96}%`,
                        opacity: 0.15 + (i % 4) * 0.12,
                      }}
                    />
                  ))}
                </div>

                {/* Real-time Laser Scanning Beam that sweeps according to sceneProgress */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-cyan-400/35 to-transparent pointer-events-none transition-all duration-150"
                  style={{
                    left: `${sceneProgress}%`,
                    boxShadow: "0 0 12px rgba(56, 189, 248, 0.4)",
                  }}
                />

                {/* Animated Ambient Glow Accent */}
                <div
                  className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
                  style={{ backgroundColor: currentScene.themeColor }}
                />

                {/* --- HEADER OF THE SCENE --- */}
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl sm:text-2xl">{currentScene.badgeEmoji}</span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase text-white shadow-xs"
                        style={{ backgroundColor: currentScene.themeColor }}
                      >
                        Escena {currentScene.sceneNumber} de {video.scenes.length}
                      </span>
                      <span className="text-xs font-extrabold text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                        {currentScene.sceneType.toUpperCase()}
                      </span>
                      {/* Active Engine Badge */}
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/60">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>Motor: {getActiveTheme(currentScene).toUpperCase()}</span>
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      {currentScene.title}
                    </h3>
                    {currentScene.subtitle && (
                      <p className="text-xs sm:text-sm font-semibold text-slate-300 drop-shadow-sm">
                        {currentScene.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Scene Time Counter */}
                  <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80 text-right">
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {formatTime(
                        Math.round((sceneProgress / 100) * (currentScene.durationSeconds || 14))
                      )}{" "}
                      / {formatTime(currentScene.durationSeconds || 14)}
                    </span>
                  </div>
                </div>

                {/* --- MAIN ANIMATED VISUAL CANVAS CONTENT --- */}
                <div className="relative z-10 my-auto py-4 sm:py-6 flex flex-col items-center justify-center w-full">
                  {/* MULTI-ENGINE ARCHITECTURE SELECTION */}
                  {(() => {
                    const engine = getActiveTheme(currentScene);
                    const diagram = currentScene.visualDiagram;
                    const nodes = diagram?.nodes || [];

                    /* ---------------- ENGINE 1: QUANTUM CIRCUIT & KINETIC FLOW ---------------- */
                    if (engine === "circuit") {
                      return (
                        <div className="w-full max-w-3xl space-y-6 relative">
                          {/* Connected conduits SVG backdrop */}
                          <div className="relative flex flex-wrap items-center justify-center gap-4 sm:gap-8 py-2">
                            {nodes.map((node, nIdx) => {
                              const appearPercent = Math.min(85, (nIdx / (nodes.length || 1)) * 60);
                              const isRevealed = sceneProgress >= appearPercent;
                              const isActive =
                                sceneProgress >= appearPercent &&
                                (nIdx === nodes.length - 1 || sceneProgress < ((nIdx + 1) / nodes.length) * 60);

                              return (
                                <React.Fragment key={node.id}>
                                  <div
                                    onClick={() => {
                                      sounds.playPop();
                                      setSceneProgress(appearPercent);
                                    }}
                                    onMouseEnter={() => setHoveredNodeId(node.id)}
                                    onMouseLeave={() => setHoveredNodeId(null)}
                                    className={`relative flex flex-col items-center p-4 sm:p-5 rounded-2xl border transition-all duration-500 transform cursor-pointer group ${
                                      isRevealed
                                        ? "opacity-100 scale-100 translate-y-0"
                                        : "opacity-0 scale-90 translate-y-4"
                                    } ${isActive ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950" : ""}`}
                                    style={{
                                      backgroundColor: isRevealed ? "rgba(15, 23, 42, 0.9)" : "transparent",
                                      borderColor: isRevealed ? node.color || currentScene.themeColor : "transparent",
                                      boxShadow: isRevealed
                                        ? `0 10px 25px -5px ${node.color || currentScene.themeColor}40`
                                        : "none",
                                    }}
                                  >
                                    {/* Pulsing ping indicator on active node */}
                                    {isActive && (
                                      <span
                                        className="absolute -top-1 -right-1 flex h-3 w-3"
                                        title="Nodo en procesamiento actual"
                                      >
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                                      </span>
                                    )}

                                    {/* Step number badge */}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                      Etapa 0{nIdx + 1}
                                    </span>

                                    {/* Node icon */}
                                    <div
                                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold mb-2 shadow-inner transition-transform group-hover:scale-110"
                                      style={{
                                        backgroundColor: `${node.color || currentScene.themeColor}25`,
                                        color: node.color || "#fff",
                                      }}
                                    >
                                      {node.icon === "Flame" ? <Flame className="w-6 h-6" /> :
                                       node.icon === "Zap" ? <Zap className="w-6 h-6" /> :
                                       node.icon === "CheckCircle" ? <CheckCircle className="w-6 h-6" /> :
                                       node.icon === "Target" ? <Target className="w-6 h-6" /> :
                                       node.icon === "Layers" ? <Layers className="w-6 h-6" /> :
                                       <span>{currentScene.badgeEmoji}</span>}
                                    </div>

                                    <span className="font-extrabold text-sm sm:text-base text-white text-center">
                                      {node.label}
                                    </span>
                                    {node.sublabel && (
                                      <span className="text-[11px] sm:text-xs text-slate-300 font-medium text-center mt-0.5">
                                        {node.sublabel}
                                      </span>
                                    )}

                                    {/* Mini node progress bar */}
                                    <div className="w-full h-1 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                                      <div
                                        className="h-full transition-all duration-300"
                                        style={{
                                          width: isRevealed ? "100%" : "0%",
                                          backgroundColor: node.color || currentScene.themeColor,
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Animated conduit arrow with photon light pulse */}
                                  {nIdx < nodes.length - 1 && (
                                    <div
                                      className={`relative flex items-center justify-center text-slate-400 font-bold transition-all duration-500 ${
                                        sceneProgress >= appearPercent + 15
                                          ? "opacity-100 scale-100"
                                          : "opacity-0 scale-50"
                                      }`}
                                    >
                                      <div className="w-8 sm:w-12 h-[2px] bg-gradient-to-r from-indigo-500 to-cyan-400 relative">
                                        {/* Traveling photon dot */}
                                        <div
                                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8] animate-ping"
                                          style={{
                                            left: `${(sceneProgress * 4) % 100}%`,
                                          }}
                                        />
                                      </div>
                                      <ChevronRight className="w-5 h-5 text-cyan-400 shrink-0" />
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    /* ---------------- ENGINE 2: 360° ORBITAL & PLANETARY SYSTEM ---------------- */
                    if (engine === "orbital") {
                      const centerNode = nodes[0] || { label: currentScene.title, sublabel: "Núcleo Central" };
                      const satellites = nodes.slice(1);

                      return (
                        <div className="w-full max-w-2xl py-4 relative flex flex-col items-center justify-center min-h-[220px]">
                          {/* SVG Orbital Ellipses */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 240">
                            {/* Inner Orbit Ellipse */}
                            <ellipse
                              cx="250"
                              cy="120"
                              rx="160"
                              ry="65"
                              fill="none"
                              stroke="rgba(99, 102, 241, 0.25)"
                              strokeWidth="2"
                              strokeDasharray="4 4"
                            />
                            {/* Outer Orbit Ellipse */}
                            <ellipse
                              cx="250"
                              cy="120"
                              rx="220"
                              ry="90"
                              fill="none"
                              stroke="rgba(56, 189, 248, 0.2)"
                              strokeWidth="1.5"
                              strokeDasharray="6 6"
                            />
                            {/* Radar sweep beam */}
                            <line
                              x1="250"
                              y1="120"
                              x2={250 + 160 * Math.cos((sceneProgress / 100) * 2 * Math.PI)}
                              y2={120 + 65 * Math.sin((sceneProgress / 100) * 2 * Math.PI)}
                              stroke="rgba(56, 189, 248, 0.6)"
                              strokeWidth="1.5"
                            />
                          </svg>

                          {/* Central Core Concept Sphere */}
                          <div className="relative z-20 flex flex-col items-center justify-center p-5 rounded-full bg-gradient-to-tr from-indigo-900 via-indigo-600 to-cyan-400 shadow-[0_0_35px_rgba(99,102,241,0.6)] text-center text-white border-2 border-cyan-300">
                            <Atom className="w-8 h-8 animate-spin" style={{ animationDuration: "16s" }} />
                            <span className="text-xs font-black tracking-wide max-w-[130px] line-clamp-1 mt-1">
                              {centerNode.label}
                            </span>
                            <span className="text-[10px] text-cyan-200 font-bold uppercase tracking-wider">
                              Núcleo Activo
                            </span>
                          </div>

                          {/* Orbiting Satellites */}
                          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 z-20">
                            {(satellites.length > 0 ? satellites : nodes).map((sat, sIdx) => {
                              const appearPercent = Math.min(85, (sIdx / (satellites.length || 1)) * 60);
                              const isRevealed = sceneProgress >= appearPercent;

                              return (
                                <div
                                  key={sat.id || sIdx}
                                  onClick={() => {
                                    sounds.playPop();
                                    setSceneProgress(appearPercent);
                                  }}
                                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md transition-all duration-500 cursor-pointer hover:border-cyan-400 ${
                                    isRevealed
                                      ? "opacity-100 scale-100 translate-y-0"
                                      : "opacity-0 scale-90 translate-y-4"
                                  }`}
                                  style={{
                                    boxShadow: isRevealed ? `0 0 20px ${sat.color || currentScene.themeColor}33` : "none",
                                    borderColor: isRevealed ? sat.color || currentScene.themeColor : "transparent",
                                  }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                                    style={{ backgroundColor: `${sat.color || currentScene.themeColor}40` }}
                                  >
                                    <Orbit className="w-4 h-4 text-cyan-300" />
                                  </div>
                                  <div className="text-left">
                                    <div className="text-xs font-extrabold text-white">{sat.label}</div>
                                    {sat.sublabel && (
                                      <div className="text-[10px] text-slate-400 font-medium">{sat.sublabel}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    /* ---------------- ENGINE 3: COMPARISON ARENA & VS DUEL ---------------- */
                    if (engine === "comparison") {
                      const leftNode = nodes[0] || { label: "Concepto Correcto", sublabel: "Enfoque de Éxito" };
                      const rightNode = nodes[1] || { label: "Error Típico", sublabel: "Trampa Frecuente" };

                      return (
                        <div className="w-full max-w-3xl space-y-5">
                          {/* Split Cards: Left vs Right */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative">
                            {/* Central Laser Divider with Pulsing VS Emblem */}
                            <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 items-center justify-center z-20 pointer-events-none">
                              <div className="w-10 h-10 rounded-full bg-slate-950 border-2 border-indigo-400 text-white font-black text-xs flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-pulse">
                                VS
                              </div>
                            </div>

                            {/* Left Card: Success Approach */}
                            <div
                              className={`p-5 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/80 transition-all duration-600 transform ${
                                sceneProgress >= 15 ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                                  <CheckCircle className="w-5 h-5" />
                                </span>
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                                  {leftNode.label}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-100 leading-snug">
                                {leftNode.sublabel || "Solución estructurada y coherente con las leyes del sistema."}
                              </p>
                              {/* Gauge */}
                              <div className="mt-4 space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-emerald-300">
                                  <span>Precisión Conceptual</span>
                                  <span>{Math.min(98, Math.round(sceneProgress * 1.4))}%</span>
                                </div>
                                <div className="h-2 bg-emerald-950 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(98, Math.round(sceneProgress * 1.4))}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Right Card: Mistake / Trap Approach */}
                            <div
                              className={`p-5 rounded-2xl bg-rose-950/40 border-2 border-rose-500/80 transition-all duration-600 transform ${
                                sceneProgress >= 30 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                                  <AlertCircle className="w-5 h-5" />
                                </span>
                                <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                                  {rightNode.label}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-100 leading-snug">
                                {rightNode.sublabel || "Fallo habitual por asumir causalidad inversa o datos estáticos."}
                              </p>
                              {/* Gauge */}
                              <div className="mt-4 space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-rose-300">
                                  <span>Riesgo en Exámenes</span>
                                  <span>{Math.max(12, Math.round(85 - sceneProgress * 0.7))}%</span>
                                </div>
                                <div className="h-2 bg-rose-950 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(12, Math.round(85 - sceneProgress * 0.7))}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    /* ---------------- ENGINE 4: MATHEMATICAL BLUEPRINT & VECTOR WAVE ---------------- */
                    if (engine === "math_board") {
                      return (
                        <div className="w-full max-w-3xl space-y-4">
                          {/* Animated Mathematical Function Curve SVG */}
                          <div className="relative h-28 w-full bg-slate-900/60 rounded-2xl border border-indigo-500/30 overflow-hidden flex items-center justify-center p-3">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 100">
                              {/* Grid lines */}
                              <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                              <line x1="300" y1="0" x2="300" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                              {/* Progressive Sine Curve */}
                              <path
                                d="M 0 50 Q 150 0, 300 50 T 600 50"
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="3"
                                strokeDasharray="600"
                                strokeDashoffset={Math.max(0, 600 - (sceneProgress / 100) * 600)}
                                className="transition-all duration-150"
                              />

                              {/* Moving Tangent Point Indicator */}
                              <circle
                                cx={(sceneProgress / 100) * 600}
                                cy={50 - Math.sin((sceneProgress / 100) * Math.PI * 2) * 35}
                                r="6"
                                fill="#818cf8"
                                filter="drop-shadow(0 0 8px #818cf8)"
                              />
                            </svg>
                            <span className="absolute top-2 right-3 text-[10px] font-mono text-cyan-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                              ΔTasa = {(sceneProgress * 0.94).toFixed(1)}%
                            </span>
                          </div>

                          {/* Variable breakdowns */}
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {nodes.map((n, idx) => (
                              <div
                                key={n.id || idx}
                                className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-mono font-bold text-slate-200 flex items-center gap-2"
                              >
                                <span className="text-cyan-400 font-black">[{n.label}]</span>
                                <span className="text-slate-300 font-sans text-[11px]">{n.sublabel || "Parámetro"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    /* ---------------- ENGINE 6: KINETIC GEARS & TRANSMISSION MECHANISM ---------------- */
                    if (engine === "mechanics") {
                      const gearRotation1 = (sceneProgress * 6.5) % 360;
                      const gearRotation2 = -(gearRotation1 * (44 / 32)) % 360;
                      const gearRotation3 = (gearRotation1 * (44 / 24)) % 360;

                      return (
                        <div className="w-full max-w-3xl space-y-5">
                          {/* SVG Gears Animation Stage */}
                          <div className="relative h-44 w-full bg-slate-900/75 rounded-2xl border border-slate-700/80 overflow-hidden flex items-center justify-center p-3">
                            {/* Technical blueprint grid */}
                            <div
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{
                                backgroundImage: `radial-gradient(circle, rgba(56,189,248,0.2) 1px, transparent 1px)`,
                                backgroundSize: "16px 16px",
                              }}
                            />

                            <svg className="w-full h-full max-w-lg" viewBox="0 0 460 160">
                              {/* Drive belt connection line */}
                              <path
                                d="M 120 80 L 250 80 L 370 80"
                                fill="none"
                                stroke="rgba(99, 102, 241, 0.4)"
                                strokeWidth="3"
                                strokeDasharray="6 4"
                                strokeDashoffset={-gearRotation1 * 0.8}
                              />

                              {/* Gear 1 (Main Driver) */}
                              <g transform={`translate(120, 80) rotate(${gearRotation1})`}>
                                <circle r="44" fill="rgba(30, 41, 59, 0.9)" stroke="#6366f1" strokeWidth="3" />
                                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                                  <rect
                                    key={deg}
                                    x="-5"
                                    y="-49"
                                    width="10"
                                    height="10"
                                    rx="2"
                                    fill="#818cf8"
                                    transform={`rotate(${deg})`}
                                  />
                                ))}
                                <circle r="14" fill="#0f172a" stroke="#818cf8" strokeWidth="2" />
                              </g>

                              {/* Gear 2 (Interlocked Transmission) */}
                              <g transform={`translate(250, 80) rotate(${gearRotation2})`}>
                                <circle r="32" fill="rgba(30, 41, 59, 0.9)" stroke="#38bdf8" strokeWidth="3" />
                                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                                  <rect
                                    key={deg}
                                    x="-4"
                                    y="-36"
                                    width="8"
                                    height="8"
                                    rx="1.5"
                                    fill="#38bdf8"
                                    transform={`rotate(${deg})`}
                                  />
                                ))}
                                <circle r="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                              </g>

                              {/* Gear 3 (Acceleration Output) */}
                              <g transform={`translate(370, 80) rotate(${gearRotation3})`}>
                                <circle r="24" fill="rgba(30, 41, 59, 0.9)" stroke="#10b981" strokeWidth="2.5" />
                                {[0, 60, 120, 180, 240, 300].map((deg) => (
                                  <rect
                                    key={deg}
                                    x="-3.5"
                                    y="-28"
                                    width="7"
                                    height="7"
                                    rx="1"
                                    fill="#34d399"
                                    transform={`rotate(${deg})`}
                                  />
                                ))}
                                <circle r="8" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
                              </g>
                            </svg>

                            {/* RPM Telemetry Badge */}
                            <div className="absolute bottom-2 left-4 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-700">
                              <Cog className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                              <span>Transmisión Sincrónica: {(sceneProgress * 14.2).toFixed(0)} RPM</span>
                            </div>
                          </div>

                          {/* Transmission stage breakdown nodes */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {nodes.slice(0, 3).map((n, i) => {
                              const isRev = sceneProgress >= (i / 3) * 65;
                              return (
                                <div
                                  key={n.id || i}
                                  className={`p-3 rounded-xl border backdrop-blur-md transition-all duration-500 ${
                                    isRev
                                      ? "bg-slate-900/90 border-indigo-500/60 opacity-100 translate-y-0"
                                      : "bg-slate-950/40 border-slate-800 opacity-40 translate-y-2"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-300 mb-1">
                                    <span>Paso 0{i + 1}</span>
                                    <span className="text-cyan-400">{isRev ? "Activo" : "Espera"}</span>
                                  </div>
                                  <div className="font-extrabold text-xs text-white">{n.label}</div>
                                  {n.sublabel && <div className="text-[11px] text-slate-400 mt-0.5">{n.sublabel}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    /* ---------------- ENGINE 7: PLASMA REACTOR & ENERGY CAPACITOR ---------------- */
                    if (engine === "reactor") {
                      const fluidHeight = Math.min(100, Math.max(15, sceneProgress));

                      return (
                        <div className="w-full max-w-3xl space-y-4">
                          <div className="relative h-44 w-full bg-slate-900/75 rounded-2xl border border-cyan-500/30 overflow-hidden flex items-center justify-between px-6 sm:px-12 py-3">
                            {/* Background energetic pulse lines */}
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-indigo-950/30 to-emerald-950/20 pointer-events-none" />

                            {/* Left Stator Electrode */}
                            <div className="relative z-10 flex flex-col items-center gap-1">
                              <div className="w-4 h-24 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-600 shadow-[0_0_15px_#38bdf8] animate-pulse" />
                              <span className="text-[9px] font-mono font-black text-cyan-300">POLO (+)</span>
                            </div>

                            {/* Central Glowing Reactor Glass Chamber */}
                            <div className="relative z-10 w-44 sm:w-56 h-36 rounded-2xl border-2 border-cyan-400/80 bg-slate-950/85 overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.25)] flex flex-col justify-end p-1.5">
                              {/* Rising energetic plasma fluid */}
                              <div
                                className="w-full rounded-xl bg-gradient-to-t from-cyan-600 via-indigo-600 to-emerald-400 relative transition-all duration-300 overflow-hidden"
                                style={{ height: `${fluidHeight}%` }}
                              >
                                {/* Surface wave meniscus */}
                                <div className="absolute top-0 inset-x-0 h-2 bg-white/40 blur-[1px] animate-pulse" />

                                {/* Bubbling voltage sparks */}
                                {[...Array(6)].map((_, bIdx) => (
                                  <div
                                    key={bIdx}
                                    className="absolute rounded-full bg-white/80 animate-ping"
                                    style={{
                                      width: `${(bIdx % 3) + 3}px`,
                                      height: `${(bIdx % 3) + 3}px`,
                                      left: `${(bIdx * 17) % 85 + 8}%`,
                                      bottom: `${((sceneProgress * 3 + bIdx * 25) % 80)}%`,
                                      animationDuration: `${1.2 + (bIdx % 3) * 0.4}s`,
                                    }}
                                  />
                                ))}
                              </div>

                              {/* Center Readout Text in Chamber */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl sm:text-2xl font-black text-white font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                  {sceneProgress.toFixed(0)}%
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-200">
                                  Carga Bioenergética
                                </span>
                              </div>
                            </div>

                            {/* Right Stator Electrode */}
                            <div className="relative z-10 flex flex-col items-center gap-1">
                              <div className="w-4 h-24 rounded-full bg-gradient-to-b from-emerald-400 to-indigo-600 shadow-[0_0_15px_#34d399] animate-pulse" />
                              <span className="text-[9px] font-mono font-black text-emerald-300">POLO (-)</span>
                            </div>

                            {/* Top Telemetry Overlay */}
                            <div className="absolute top-2 right-4 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-300 bg-slate-950/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
                              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                              <span>ΔE = {(sceneProgress * 0.42).toFixed(2)} MJ/mol</span>
                            </div>
                          </div>

                          {/* Bottom parameters */}
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {nodes.map((n, i) => (
                              <div
                                key={n.id || i}
                                className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-mono font-bold text-slate-200 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-white font-extrabold">{n.label}:</span>
                                <span className="text-slate-300 font-normal">{n.sublabel || "Nominal"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    /* ---------------- ENGINE 5: HOLOGRAPHIC HUD & TELEMETRY (DEFAULT) ---------------- */
                    return (
                      <div className="w-full max-w-3xl space-y-5">
                        {/* 3 Radial Progress Dials */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            {
                              title: "Asimilación",
                              value: `${Math.min(100, Math.round(sceneProgress * 1.05))}%`,
                              percent: Math.min(100, Math.round(sceneProgress * 1.05)),
                              color: "#6366f1",
                              icon: Activity,
                            },
                            {
                              title: "Retención Óptima",
                              value: "96%",
                              percent: 96,
                              color: "#10b981",
                              icon: CheckCircle,
                            },
                            {
                              title: "Impacto en Examen",
                              value: "Frecuente",
                              percent: 88,
                              color: "#f59e0b",
                              icon: Target,
                            },
                          ].map((gauge, gIdx) => {
                            const Icon = gauge.icon;
                            return (
                              <div
                                key={gIdx}
                                className="p-4 rounded-2xl bg-slate-900/85 border border-slate-800 flex items-center gap-3.5 shadow-lg"
                              >
                                <div className="relative w-12 h-12 flex items-center justify-center">
                                  <svg className="w-12 h-12 -rotate-90">
                                    <circle
                                      cx="24"
                                      cy="24"
                                      r="18"
                                      stroke="#1e293b"
                                      strokeWidth="3.5"
                                      fill="none"
                                    />
                                    <circle
                                      cx="24"
                                      cy="24"
                                      r="18"
                                      stroke={gauge.color}
                                      strokeWidth="3.5"
                                      fill="none"
                                      strokeDasharray="113"
                                      strokeDashoffset={113 - (gauge.percent / 100) * 113}
                                      className="transition-all duration-500"
                                    />
                                  </svg>
                                  <Icon className="w-5 h-5 absolute" style={{ color: gauge.color }} />
                                </div>
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    {gauge.title}
                                  </span>
                                  <span className="text-base font-extrabold text-white">{gauge.value}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sequential Elements appearing according to timingPercent */}
                  <div className="w-full max-w-2xl space-y-3 sm:space-y-4 mt-4">
                    {currentScene.elements.map((el) => {
                      const isRevealed = sceneProgress >= el.timingPercent;

                      if (el.type === "formula_box") {
                        return (
                          <div
                            key={el.id}
                            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-600 transform ${
                              isRevealed
                                ? "opacity-100 scale-100 translate-y-0"
                                : "opacity-0 scale-95 translate-y-3"
                            }`}
                            style={{
                              borderColor: currentScene.themeColor,
                              backgroundColor: "rgba(15, 23, 42, 0.92)",
                              boxShadow: `0 0 25px ${currentScene.themeColor}33`,
                            }}
                          >
                            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-300 block mb-1">
                              Fórmula / Principio Fundamental
                            </span>
                            <div className="font-mono text-base sm:text-xl font-black text-white text-center">
                              {el.content}
                            </div>
                          </div>
                        );
                      }

                      if (el.type === "callout") {
                        return (
                          <div
                            key={el.id}
                            className={`p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500/80 text-amber-100 flex items-start gap-3 transition-all duration-500 transform ${
                              isRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
                            }`}
                          >
                            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                                {el.highlight || "Punto Clave de Examen"}
                              </span>
                              <p className="text-xs sm:text-sm font-semibold">{el.content}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={el.id}
                          className={`p-3.5 sm:p-4 rounded-xl bg-slate-900/85 border border-slate-700/80 backdrop-blur-md flex items-center gap-3 transition-all duration-500 transform ${
                            isRevealed
                              ? "opacity-100 translate-x-0"
                              : "opacity-0 -translate-x-4"
                          }`}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: currentScene.themeColor }}
                          />
                          <p className="text-xs sm:text-sm font-medium text-slate-100 leading-snug">
                            {el.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* --- FOOTER OF SCENE: SUBTITLES & KEY TAKEAWAY --- */}
                <div className="relative z-10 space-y-3">
                  {/* Real-time Narration Subtitle Bar */}
                  {showCaptions && (
                    <div className="bg-slate-950/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-700/90 shadow-xl max-w-3xl mx-auto text-center">
                      <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed tracking-wide animate-fade-in">
                        "{currentScene.narration}"
                      </p>
                    </div>
                  )}

                  {/* Golden rule / takeaway badge */}
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="flex items-center gap-1.5 font-bold text-amber-400">
                      <Sparkles className="w-4 h-4" />
                      Regla de Oro: {currentScene.keyTakeaway}
                    </span>
                    <span className="hidden sm:inline font-mono">
                      Espacio: Pausar/Reanudar
                    </span>
                  </div>
                </div>

                {/* Scene Progress Indicator (thin bar at top of video) */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
                  <div
                    className="h-full transition-all duration-100"
                    style={{
                      width: `${sceneProgress}%`,
                      backgroundColor: currentScene.themeColor,
                    }}
                  />
                </div>
              </div>

              {/* ================= CONTROLS BAR ================= */}
              <div className="bg-slate-900 px-4 sm:px-6 py-4 border-t border-slate-800 space-y-3">
                {/* Global Scrubber with Scene Markers */}
                <div className="space-y-1">
                  <div className="relative w-full h-2.5 bg-slate-800 rounded-full cursor-pointer overflow-hidden group">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${globalProgressPercent}%` }}
                    />
                  </div>

                  {/* Scene Marks on Timeline */}
                  <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 font-mono">
                    <span>{formatTime(elapsedVideoSeconds)}</span>
                    <div className="flex items-center gap-1">
                      {video.scenes.map((sc, idx) => (
                        <button
                          key={sc.id}
                          onClick={() => goToScene(idx)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            idx === currentSceneIdx
                              ? "bg-indigo-600 text-white"
                              : "hover:bg-slate-800 text-slate-400"
                          }`}
                        >
                          E{sc.sceneNumber}
                        </button>
                      ))}
                    </div>
                    <span>{formatTime(totalVideoDuration)}</span>
                  </div>
                </div>

                {/* Primary Buttons & Toggles */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Left: Playback controls */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => goToScene(Math.max(0, currentSceneIdx - 1))}
                      disabled={currentSceneIdx === 0}
                      className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all"
                      title="Escena anterior"
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                      title={isPlaying ? "Pausar" : "Reproducir"}
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => goToScene(Math.min(video.scenes.length - 1, currentSceneIdx + 1))}
                      disabled={currentSceneIdx === video.scenes.length - 1}
                      className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-all"
                      title="Siguiente escena"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => goToScene(0)}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                      title="Reiniciar desde el principio"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Center: Audio & Speech selector */}
                  <div className="relative flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-2xl border border-slate-700/80 text-xs text-slate-300">
                    {/* Voice selector button */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          sounds.playPop();
                          setShowVoiceMenu(!showVoiceMenu);
                        }}
                        className="flex items-center gap-2 font-bold hover:text-white cursor-pointer px-2.5 py-1 rounded-xl bg-slate-750 hover:bg-slate-700 text-slate-200 border border-slate-600/70 transition-colors"
                        title="Seleccionar locutor y estilo de voz"
                      >
                        {audioMode === "muted" ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : isAudioLoading ? (
                          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        )}

                        <span className="flex items-center gap-1.5">
                          {audioMode === "gemini_tts" ? (
                            <>
                              <span>{HUMAN_VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.icon || "🎙️"}</span>
                              <span className="font-extrabold text-white">
                                {selectedVoice} (Humana)
                              </span>
                            </>
                          ) : audioMode === "browser_tts" ? (
                            <span>Voz Navegador</span>
                          ) : (
                            <span className="text-rose-400 font-bold">Silenciado</span>
                          )}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {/* Dropdown Menu for Voices */}
                      {showVoiceMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-2.5 shadow-2xl z-50 space-y-1.5 animate-fade-in">
                          <div className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800 pb-2">
                            <span>Voces Humanas IA (Gemini)</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                              Natural
                            </span>
                          </div>

                          {HUMAN_VOICE_OPTIONS.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => {
                                sounds.playPop();
                                setSelectedVoice(v.id);
                                setAudioMode("gemini_tts");
                                setShowVoiceMenu(false);
                                if (isPlaying && currentScene) {
                                  playSceneAudio(currentScene, v.id);
                                }
                                showToast(`🎙️ Voz cambiada a ${v.name} (${v.tag})`);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                                audioMode === "gemini_tts" && selectedVoice === v.id
                                  ? "bg-indigo-600/40 border border-indigo-400/60 text-white"
                                  : "hover:bg-slate-800 text-slate-300"
                              }`}
                            >
                              <span className="text-xl shrink-0 mt-0.5">{v.icon}</span>
                              <div className="flex-1 truncate">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-xs">{v.name}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{v.tag}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-tight truncate mt-0.5">
                                  {v.desc}
                                </p>
                              </div>
                              {audioMode === "gemini_tts" && selectedVoice === v.id && (
                                <Check className="w-4 h-4 text-emerald-400 shrink-0 self-center" />
                              )}
                            </button>
                          ))}

                          <div className="border-t border-slate-800 pt-1.5 space-y-1">
                            <button
                              onClick={() => {
                                sounds.playPop();
                                setAudioMode("browser_tts");
                                setShowVoiceMenu(false);
                                if (isPlaying && currentScene) {
                                  playBrowserVoice(currentScene.narration);
                                }
                                showToast("🔊 Activada voz del navegador");
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                                audioMode === "browser_tts"
                                  ? "bg-indigo-600/30 text-white"
                                  : "hover:bg-slate-800 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>🤖</span>
                                <span>Voz del Navegador (Dispositivo)</span>
                              </div>
                              {audioMode === "browser_tts" && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            </button>

                            <button
                              onClick={() => {
                                sounds.playPop();
                                setAudioMode("muted");
                                stopCurrentAudio();
                                setShowVoiceMenu(false);
                                showToast("🔇 Vídeo silenciado");
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                                audioMode === "muted"
                                  ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                                  : "hover:bg-slate-800 text-slate-400"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                                <span>Silenciar locución</span>
                              </div>
                              {audioMode === "muted" && <Check className="w-3.5 h-3.5 text-rose-400" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Subtitles Toggle */}
                    <button
                      onClick={() => {
                        sounds.playPop();
                        setShowCaptions(!showCaptions);
                      }}
                      className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                        showCaptions ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                      title="Activar/desactivar subtítulos"
                    >
                      CC
                    </button>
                  </div>

                  {/* Center-Right: Live Audio Equalizer Waveform */}
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs">
                    <Radio
                      className={`w-3.5 h-3.5 ${
                        isPlaying && isVoiceSpeaking
                          ? "text-cyan-400 animate-pulse"
                          : isPlaying
                          ? "text-amber-400"
                          : "text-slate-500"
                      }`}
                    />
                    <div className="flex items-end gap-[3px] h-3.5">
                      {[35, 75, 95, 60, 40, 85, 100, 70, 50, 90, 65, 45, 80].map((baseH, i) => {
                        const liveH = isPlaying && isVoiceSpeaking
                          ? Math.max(20, Math.min(100, baseH + Math.sin(sceneProgress * 0.8 + i * 0.9) * 40))
                          : isPlaying
                          ? Math.max(15, baseH * 0.35)
                          : 20;
                        return (
                          <span
                            key={i}
                            className={`w-1 rounded-full transition-all duration-150 ${
                              isVoiceSpeaking
                                ? "bg-gradient-to-t from-indigo-500 to-cyan-400"
                                : "bg-slate-600"
                            }`}
                            style={{ height: `${liveH}%` }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] font-mono text-slate-300 font-bold ml-1">
                      {isAudioLoading
                        ? "CARGANDO..."
                        : isVoiceSpeaking
                        ? "LOCUTOR ACTIVO"
                        : isPlaying
                        ? "PAUSA NATURAL"
                        : "PAUSA"}
                    </span>
                  </div>

                  {/* Right: Camera, Speed, Export & Fullscreen */}
                  <div className="flex items-center gap-2">
                    {/* Cinematic Camera Toggle */}
                    <button
                      onClick={() => {
                        sounds.playPop();
                        setCinematicZoomEnabled(!cinematicZoomEnabled);
                        showToast(cinematicZoomEnabled ? "Cámara cinemática desactivada" : "Cámara cinemática activada");
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        cinematicZoomEnabled
                          ? "bg-cyan-950/70 text-cyan-300 border-cyan-700/70"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                      title="Efecto de respiración y zoom cinemático de cámara"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">Cámara</span>
                    </button>

                    {/* Playback speed selector */}
                    <button
                      onClick={() => {
                        sounds.playPop();
                        const speeds = [0.75, 1, 1.25, 1.5];
                        const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                        setPlaybackSpeed(speeds[nextIdx]);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                      title="Velocidad de reproducción"
                    >
                      {playbackSpeed}x
                    </button>

                    {/* Export Script */}
                    <button
                      onClick={handleExportScript}
                      className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                      title="Descargar guion escrito de las escenas"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                      title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =================== STORYBOARD CARDS VIEW =================== */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
              {video.scenes.map((sc, idx) => (
                <div
                  key={sc.id}
                  onClick={() => {
                    goToScene(idx);
                    setActiveTab("player");
                  }}
                  className={`bg-white rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-lg ${
                    idx === currentSceneIdx
                      ? "border-indigo-600 shadow-md ring-4 ring-indigo-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{sc.badgeEmoji}</span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-black text-white"
                        style={{ backgroundColor: sc.themeColor }}
                      >
                        Escena {sc.sceneNumber} • {sc.durationSeconds}s
                      </span>
                    </div>

                    <h4 className="font-black text-lg text-slate-900 leading-tight">
                      {sc.title}
                    </h4>
                    {sc.subtitle && (
                      <p className="text-xs font-bold text-slate-500">{sc.subtitle}</p>
                    )}

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                      "{sc.narration}"
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="text-amber-700 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-amber-500" />
                      {sc.keyTakeaway.slice(0, 45)}...
                    </span>
                    <span className="text-indigo-600 hover:underline flex items-center gap-1">
                      Ver <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scene Carousel Selector Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider uppercase text-slate-600">
                Línea de Tiempo de Escenas ({video.scenes.length})
              </span>
              <span className="text-xs font-bold text-indigo-600">
                Haz clic en cualquier escena para reproducirla
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {video.scenes.map((sc, idx) => (
                <button
                  key={sc.id}
                  onClick={() => goToScene(idx)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    idx === currentSceneIdx
                      ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">{sc.badgeEmoji}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {sc.durationSeconds}s
                    </span>
                  </div>
                  <div className="font-extrabold text-xs truncate">
                    {sc.sceneNumber}. {sc.title.replace(/^\d+\.\s*/, "")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
