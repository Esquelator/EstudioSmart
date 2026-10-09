import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  Unlock,
  Mic,
  MicOff,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Loader2,
  X,
  CreditCard,
  Volume2,
  RotateCcw,
  Zap,
} from "lucide-react";
import { StudyMaterial, SubscriptionInfo, OralExamEvaluation } from "../types";
import { sounds } from "../utils/audio";
import confetti from "canvas-confetti";

interface OralExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMaterial?: StudyMaterial | null;
  savedMaterials?: StudyMaterial[];
  currentUser?: any;
  onOpenAuth?: () => void;
  onOpenStripeCheckout?: () => void;
}

export const OralExamModal: React.FC<OralExamModalProps> = ({
  isOpen,
  onClose,
  activeMaterial,
  savedMaterials = [],
  currentUser,
  onOpenAuth,
  onOpenStripeCheckout,
}) => {
  const [subInfo, setSubInfo] = useState<SubscriptionInfo>({
    isActive: true,
    planId: "plan_estudiante",
    planName: "Plan Estudiante Pro",
    basePriceEur: 1.99,
    discountPercentage: 15,
    finalPriceEur: 1.99,
    renewsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    daysUntilRenewal: 1,
    canTakeOralExam: true,
    examAttemptUsed: false,
    attemptsCount: 0,
    maxAttempts: 2,
    discountEarned: false,
  });

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [examStep, setExamStep] = useState<"info" | "ready" | "recording" | "evaluating" | "verdict">("info");
  const [currentExamTopic, setCurrentExamTopic] = useState<string>("Tema de estudio");
  const [askedTopics, setAskedTopics] = useState<string[]>([]);
  const [assignedPoint, setAssignedPoint] = useState<{
    title: string;
    expectedContent: string;
    sectionIndex: number;
    topicName: string;
  }>({
    title: "Punto 1: Fundamentos y Mecanismo Principal",
    expectedContent: "El concepto central, sus fases y cómo funciona el mecanismo fundamental.",
    sectionIndex: 0,
    topicName: "General",
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<OralExamEvaluation | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Load subscription status on open
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      pickAssignedPoint();
    }
  }, [isOpen, activeMaterial, savedMaterials]);

  const fetchStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch("/api/subscription/status");
      if (res.ok) {
        const data = await res.json();
        setSubInfo(data);
        if (data.examAttemptUsed && !evaluationResult) {
          // If already attempted in this cycle
          setExamStep(data.discountEarned ? "verdict" : "info");
        }
      }
    } catch (err) {
      console.warn("Could not fetch subscription status:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Smart point picker that searches saved materials in database and avoids repeating topics on 2nd attempt
  const pickAssignedPoint = (excludeTopicTitle?: string) => {
    // Gather all candidate materials from database/saved list
    const candidateMaterials = [...(savedMaterials || [])];
    if (activeMaterial && !candidateMaterials.some((m) => m.id === activeMaterial.id)) {
      candidateMaterials.unshift(activeMaterial);
    }

    let targetMaterial: StudyMaterial | null = null;

    if (excludeTopicTitle) {
      // Find a material with a DIFFERENT topic from the one just failed
      targetMaterial = candidateMaterials.find(
        (m) => m.topic.trim().toLowerCase() !== excludeTopicTitle.trim().toLowerCase()
      ) || null;
    }

    if (!targetMaterial) {
      targetMaterial = activeMaterial || candidateMaterials[0] || null;
    }

    if (targetMaterial) {
      setCurrentExamTopic(targetMaterial.topic);
      setAskedTopics((prev) => Array.from(new Set([...prev, targetMaterial!.topic])));

      if (targetMaterial.sections && targetMaterial.sections.length > 0) {
        const randomIdx = Math.floor(Math.random() * targetMaterial.sections.length);
        const sec = targetMaterial.sections[randomIdx];
        const points =
          sec.detailedBreakdown?.map((b) => `${b.pointTitle}: ${b.explanation}`).join("\n") || sec.content;
        setAssignedPoint({
          title: `Apartado: ${sec.title}`,
          expectedContent: points,
          sectionIndex: randomIdx + 1,
          topicName: targetMaterial.topic,
        });
      } else if (targetMaterial.formalDefinition) {
        setAssignedPoint({
          title: `Punto 1: Definición Formal y Mecanismo`,
          expectedContent: targetMaterial.formalDefinition,
          sectionIndex: 1,
          topicName: targetMaterial.topic,
        });
      } else {
        setAssignedPoint({
          title: "Punto 1: Definición y Mecanismo Principal",
          expectedContent: "Explica con tus propias palabras el concepto fundamental del tema y cómo funciona.",
          sectionIndex: 1,
          topicName: targetMaterial.topic,
        });
      }
    } else {
      setCurrentExamTopic("Ciencias y Conceptos");
      setAssignedPoint({
        title: "Punto 1: Definición y Mecanismo Principal",
        expectedContent: "Explica con tus propias palabras el concepto fundamental del tema y cómo funciona paso a paso.",
        sectionIndex: 1,
        topicName: "Tema de Estudio",
      });
    }
  };

  const handleStartSecondChance = () => {
    sounds.playPop();
    // Exclude the topic that was just asked to ensure a DIFFERENT topic is examined
    pickAssignedPoint(currentExamTopic);
    setAudioBase64("");
    setTranscribedText("");
    setLiveTranscript("");
    setRecordingSeconds(0);
    setEvaluationResult(null);
    setExamStep("ready");
  };

  const simulateCycle = async (days: number, resetAttempt = false) => {
    sounds.playPop();
    try {
      const res = await fetch("/api/subscription/simulate-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysUntilRenewal: days, resetAttempt }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSubInfo(updated);
        if (resetAttempt) {
          setExamStep("info");
          setEvaluationResult(null);
          setAudioBase64("");
          setTranscribedText("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startOralExam = () => {
    sounds.playPop();
    pickAssignedPoint();
    setExamStep("ready");
  };

  const startRecording = async () => {
    sounds.playPop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setLiveTranscript("");

      // Start Web Speech API recognition in parallel for instant visual feedback
      if (typeof window !== "undefined") {
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionClass) {
          try {
            const recognition = new SpeechRecognitionClass();
            recognition.lang = "es-ES";
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (event: any) => {
              let text = "";
              for (let i = 0; i < event.results.length; i++) {
                text += event.results[i][0].transcript + " ";
              }
              if (text.trim()) {
                setLiveTranscript(text.trim());
              }
            };
            recognition.start();
            recognitionRef.current = recognition;
          } catch (_) {}
        }
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          setAudioBase64(base64data);
          // Auto submit to evaluation tribunal
          submitOralExam(base64data);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setExamStep("recording");

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 89) {
            stopRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Necesitamos acceso al micrófono para que puedas realizar el examen oral.");
    }
  };

  const stopRecording = () => {
    sounds.playPop();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const submitOralExam = async (audioData: string) => {
    setExamStep("evaluating");
    try {
      const examTopicName = assignedPoint.topicName || currentExamTopic || activeMaterial?.topic || "Tema de estudio";
      const res = await fetch("/api/study/evaluate-oral-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: examTopicName,
          pointTitle: assignedPoint.title,
          pointExpectedContent: assignedPoint.expectedContent,
          audioBase64: audioData,
          transcription: liveTranscript.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Error al evaluar el examen oral.");
      }

      const evalData: OralExamEvaluation = await res.json();
      setEvaluationResult(evalData);
      setTranscribedText(evalData.transcription || liveTranscript || "");
      setExamStep("verdict");

      // If retryable (e.g. mic silent/too short), DO NOT consume attempt!
      if (evalData.retryable) {
        sounds.playError();
        return;
      }

      // Update local subscription info state
      const isPermanentlyDone = !evalData.canRetrySecondChance;
      setSubInfo((prev) => ({
        ...prev,
        examAttemptUsed: isPermanentlyDone,
        attemptsCount: evalData.currentAttempt || (prev.attemptsCount || 0) + 1,
        discountEarned: evalData.passed && !evalData.aiDetected && !evalData.readVerbatim,
        discountCode: evalData.discountCode,
        finalPriceEur: evalData.passed ? 1.69 : 1.99,
      }));

      if (evalData.passed && !evalData.aiDetected && !evalData.readVerbatim) {
        sounds.playSuccess();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } else {
        sounds.playError();
      }
    } catch (err: any) {
      console.error("Error submitting oral exam:", err);
      alert(err.message || "Hubo un problema al procesar la evaluación.");
      setExamStep("info");
    }
  };

  const handleCheckoutStripe = async () => {
    sounds.playPop();
    if (onOpenStripeCheckout) {
      onOpenStripeCheckout();
      return;
    }
    setCheckoutLoading(true);
    setCheckoutMessage(null);
    try {
      const res = await fetch("/api/subscription/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountCode: subInfo.discountCode || (subInfo.discountEarned ? "ESTUDIO15" : ""),
        }),
      });

      const data = await res.json();
      if (data.url) {
        // Real Stripe checkout redirect
        window.location.href = data.url;
      } else if (data.simulation) {
        // Simulation response
        setCheckoutMessage(data.message);
        setSubInfo((prev) => ({
          ...prev,
          isActive: true,
          finalPriceEur: data.finalPriceEur || 1.99,
        }));
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      alert("Error al conectar con la pasarela de pago.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!isOpen) return null;

  const isUnlocked = subInfo.canTakeOralExam && !subInfo.examAttemptUsed;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-scaleUp">
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
              isUnlocked ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}>
              {isUnlocked ? <Unlock className="w-5 h-5 text-amber-400" /> : <Lock className="w-5 h-5 text-slate-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black font-display tracking-tight text-white">
                  Desafío Examen Oral: Ahorra un 15%
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-slate-950">
                  -15% DTO
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Demuestra que has estudiado con tus propias palabras y rebaja tu cuota de Stripe
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-6 overscroll-contain touch-pan-y custom-scrollbar pb-8">
          {/* Simulation Toggle Bar for testing */}
          <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span>🔧 Modo Prueba:</span>
              <span className="text-slate-500 font-normal">
                {subInfo.daysUntilRenewal <= 1
                  ? "Día previo activo (desbloqueado)"
                  : `${subInfo.daysUntilRenewal} días restantes (bloqueado)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => simulateCycle(1, true)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  subInfo.daysUntilRenewal <= 1 && !subInfo.examAttemptUsed
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                }`}
              >
                🔓 Simular 1 día antes (Desbloquear)
              </button>
              <button
                type="button"
                onClick={() => simulateCycle(15, false)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  subInfo.daysUntilRenewal > 1
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                }`}
              >
                🔒 Simular 15 días antes (Bloquear)
              </button>
            </div>
          </div>

          {/* Pricing & Subscription Card */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 p-5 rounded-3xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700">
                  {subInfo.planName}
                </span>
                {subInfo.discountEarned && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    15% DESCUENTO ACTIVO
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                {subInfo.discountEarned ? (
                  <>
                    <span className="text-2xl font-black text-emerald-700">1,69 €</span>
                    <span className="text-sm font-bold text-slate-400 line-through">1,99 €</span>
                    <span className="text-xs text-slate-500 font-semibold">/ mes</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-slate-900">1,99 €</span>
                    <span className="text-xs text-slate-500 font-semibold">/ mes</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Acceso ilimitado a análisis de PDFs, vídeos animados, mapa mental y ejercicios.
              </p>
            </div>

            <button
              onClick={handleCheckoutStripe}
              disabled={checkoutLoading}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              <span>{subInfo.discountEarned ? "Renovar con 15% Dto (1,69 €)" : "Gestionar en Stripe (1,99 €)"}</span>
            </button>
          </div>

          {checkoutMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{checkoutMessage}</span>
            </div>
          )}

          {/* MAIN STEP 1: LOCKED STATE OR INFO */}
          {examStep === "info" && (
            <div className="space-y-5">
              {/* Padlock status banner */}
              {!isUnlocked ? (
                <div className="p-5 rounded-3xl bg-amber-50/80 border-2 border-amber-200/90 text-amber-950 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-200/60 flex items-center justify-center text-amber-700 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-amber-900">
                        Prueba bloqueada actualmente
                      </h4>
                      <p className="text-xs text-amber-800">
                        {subInfo.examAttemptUsed
                          ? "Ya has utilizado tu intento único en este ciclo de facturación."
                          : `Se desbloqueará exactamente 1 día antes de que renueve tu suscripción (faltan ${subInfo.daysUntilRenewal} días).`}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-amber-900/90 leading-relaxed bg-white/70 p-3 rounded-xl border border-amber-200/60">
                    💡 <strong>Regla del Reto:</strong> Para garantizar que estudias con constancia a lo largo del mes, la prueba se abre 24 horas antes de cada cobro. Dispondrás de una ventana exclusiva para demostrar tu aprendizaje y rebajar la cuota a <strong>1,69 €</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-2 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                      <Unlock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-emerald-900">
                        ¡Prueba oral desbloqueada! (Faltan menos de 24h para renovar)
                      </h4>
                      <p className="text-xs text-emerald-800">
                        Tienes una única oportunidad para ganar el 15% de descuento en tu cuota.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rules & Anti-AI explanation */}
              <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>Reglas estrictas de evaluación y detección de IA:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span>🎙️</span>
                      <span>1. Explicación oral en directo</span>
                    </div>
                    <p className="text-slate-600 leading-snug">
                      La IA te pedirá que expliques un punto concreto de tus apuntes con tu propia voz.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span>🗣️</span>
                      <span>2. Con tus propias palabras</span>
                    </div>
                    <p className="text-slate-600 leading-snug">
                      Debes hablar con naturalidad, explicando el funcionamiento y fases de memoria.
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-rose-900">
                      <span>🚫</span>
                      <span>3. Detección de ChatGPT / IA</span>
                    </div>
                    <p className="text-rose-700 leading-snug">
                      Si el tribunal detecta patrones de IA (conectores artificiales o lectura de ChatGPT), la prueba quedará <strong>ANULADA</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <span>⚡</span>
                      <span>4. Solo 1 intento</span>
                    </div>
                    <p className="text-amber-800 leading-snug">
                      No hay repetición. La grabación se procesará y su veredicto será definitivo para este mes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="text-center pt-2">
                <button
                  onClick={startOralExam}
                  disabled={!isUnlocked}
                  className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all shadow-md ${
                    isUnlocked
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 cursor-pointer active:scale-98"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none"
                  }`}
                >
                  {isUnlocked ? <Unlock className="w-5 h-5 text-amber-300" /> : <Lock className="w-5 h-5" />}
                  <span>{isUnlocked ? "Comenzar Examen Oral (1 Oportunidad)" : "Prueba Bloqueada hasta 24h previas"}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: READY STATE - SHOW ASSIGNED POINT */}
          {examStep === "ready" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                    Punto Asignado por el Tribunal
                  </span>
                  <span className="text-xs text-indigo-300 font-bold">Tiempo máximo: 90s</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
                    {assignedPoint.title}
                  </h3>
                  <p className="text-xs text-indigo-200 leading-relaxed bg-white/10 p-3 rounded-2xl border border-white/10">
                    📝 <strong>Instrucción del tribunal:</strong> Explica ahora este apartado en voz alta. Detalla los conceptos clave y el orden del proceso con tus propias palabras humanas. Recuerda: Prohibido leer respuestas de ChatGPT ni notas ajenas.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  Al pulsar el botón se activará el micrófono. Habla claro y de forma espontánea. Solo tienes una oportunidad.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setExamStep("info")}
                  className="px-5 py-3.5 rounded-2xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={startRecording}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                >
                  <Mic className="w-5 h-5" />
                  <span>Empezar a Grabar mi Explicación</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RECORDING IN PROGRESS */}
          {examStep === "recording" && (
            <div className="py-8 text-center space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300 inline-flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>Grabando Examen Oral en Directo</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  {assignedPoint.title}
                </h3>
              </div>

              {/* Pulsing Mic Visualizer */}
              <div className="relative inline-flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-rose-500/20 animate-ping absolute" />
                <div className="w-24 h-24 rounded-full bg-rose-500/30 animate-pulse absolute" />
                <div className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 relative z-10">
                  <Mic className="w-9 h-9" />
                </div>
              </div>

              {/* Timer */}
              <div className="space-y-1">
                <div className="text-3xl font-black font-mono text-slate-900">
                  00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </div>
                <p className="text-xs text-slate-500">
                  {recordingSeconds < 5
                    ? "Habla con claridad durante al menos 10 segundos explicando el tema"
                    : "Habla con naturalidad y explica el proceso con tus propias palabras (máximo 90s)"}
                </p>
              </div>

              {/* Live speech transcription box if recognized by browser */}
              {liveTranscript && (
                <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-left text-xs space-y-1 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Detectando voz en directo:</span>
                  </div>
                  <p className="text-slate-800 font-medium italic">"{liveTranscript}"</p>
                </div>
              )}

              <div className="max-w-xs mx-auto pt-2">
                <button
                  onClick={stopRecording}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Finalizar y Entregar al Tribunal</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: EVALUATING WITH STRICT ANTI-AI */}
          {examStep === "evaluating" && (
            <div className="py-12 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-900">
                  El Tribunal está analizando tu examen...
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Comprobando fidelidad conceptual a los apuntes, naturalidad de la voz y ejecutando filtros heurísticos de detección de IA y lectura automática.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                <span>Escaneando patrones de ChatGPT / Gemini</span>
              </div>
            </div>
          )}

          {/* STEP 5: VERDICT RESULT */}
          {examStep === "verdict" && evaluationResult && (
            <div className="space-y-6 animate-scaleUp">
              {evaluationResult.retryable ? (
                /* RETRYABLE AUDIO WARNING - ATTEMPT NOT CONSUMED */
                <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                      <Volume2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-amber-950">
                        {evaluationResult.verdictTitle || "Audio no detectado o demasiado breve"}
                      </h3>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                        Intento NO consumido • Puedes repetir la prueba
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/95 border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-2">
                    <p>{evaluationResult.detailedFeedback}</p>
                    <p className="font-bold text-amber-950">
                      💡 Consejo: Asegúrate de permitir el micrófono en tu navegador y de hablar durante al menos 10-15 segundos explicando el proceso paso a paso.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={() => {
                        sounds.playPop();
                        setExamStep("ready");
                      }}
                      className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Volver a Grabar mi Explicación</span>
                    </button>
                  </div>
                </div>
              ) : evaluationResult.aiDetected ? (
                /* AI DETECTED - ANULADO */
                <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-rose-900">
                        {evaluationResult.verdictTitle || "Prueba Anulada por Detección de IA"}
                      </h3>
                      <p className="text-xs text-rose-700 font-bold">
                        Puntuación: {evaluationResult.score}/100 • Intento único agotado
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/90 border border-rose-200 text-xs text-rose-900 leading-relaxed space-y-2">
                    <strong className="block font-black text-rose-950">Informe del Tribunal Examinador:</strong>
                    <p>{evaluationResult.detailedFeedback}</p>
                  </div>

                  <p className="text-[11px] text-rose-800 italic">
                    ⚠️ La política antifraude anula cualquier intento donde se detecte texto de inteligencia artificial o lectura no espontánea. El descuento no se ha aplicado para este mes.
                  </p>
                </div>
              ) : evaluationResult.readVerbatim ? (
                /* VERBATIM READING */
                <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
                      <XCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-amber-900">
                        {evaluationResult.verdictTitle || "No Superado: Lectura Literal"}
                      </h3>
                      <p className="text-xs text-amber-700 font-bold">
                        Puntuación: {evaluationResult.score}/100 • Intento único agotado
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/90 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    {evaluationResult.detailedFeedback}
                  </div>
                </div>
              ) : evaluationResult.passed ? (
                /* PASSED - 15% DISCOUNT GRANTED */
                <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-emerald-950">
                          {evaluationResult.verdictTitle || "¡Enhorabuena! Examen Oral Aprobado"}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900">
                          15% DESCUENTO
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 font-bold">
                        Nota: {evaluationResult.score}/100 • Fidelidad: {evaluationResult.structureFidelityScore}% • Espontaneidad: {evaluationResult.spontaneityScore}%
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/90 border border-emerald-200 text-xs text-emerald-900 leading-relaxed space-y-2">
                    <strong className="block font-black text-emerald-950">Evaluación del Tribunal:</strong>
                    <p>{evaluationResult.detailedFeedback}</p>
                  </div>

                  {evaluationResult.discountCode && (
                    <div className="p-4 rounded-2xl bg-emerald-600 text-white flex items-center justify-between shadow-md">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                          Cupón de descuento generado:
                        </span>
                        <span className="text-base font-black font-mono tracking-wider">
                          {evaluationResult.discountCode}
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-white/20 text-xs font-black">
                        -15% en Stripe
                      </span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleCheckoutStripe}
                      disabled={checkoutLoading}
                      className="w-full py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-base shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Renovar en Stripe por 1,69 €/mes (-15%)</span>
                    </button>
                  </div>
                </div>
              ) : evaluationResult.canRetrySecondChance ? (
                /* SECOND CHANCE OFFERED - ROTATE TOPIC FROM DATABASE */
                <div className="p-6 rounded-3xl bg-indigo-50/90 border-2 border-indigo-300 text-indigo-950 space-y-5 animate-scaleUp">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                      <Sparkles className="w-7 h-7 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-black text-indigo-950">
                          {evaluationResult.verdictTitle || "Definición Incorrecta: Tienes una 2ª Oportunidad"}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                          2ª Oportunidad
                        </span>
                      </div>
                      <p className="text-xs text-indigo-700 font-bold">
                        Puntuación: {evaluationResult.score}/100 • Se examinará un tema diferente de tu base de datos
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/95 border border-indigo-200 text-xs text-indigo-900 leading-relaxed space-y-2.5">
                    <strong className="block font-black text-indigo-950">Informe del 1er Intento:</strong>
                    <p>{evaluationResult.detailedFeedback}</p>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-950 font-medium">
                      🎯 <strong>Regla de rotación:</strong> Para garantizar un aprendizaje real, el tribunal seleccionará ahora un tema diferente que hayas subido o estudiado. Solo tendrás que explicar 1 punto.
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleStartSecondChance}
                      className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>Comenzar 2ª Oportunidad (Tema Diferente)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* FAILED SCORE (All attempts used) */
                <div className="p-6 rounded-3xl bg-slate-100 border border-slate-300 text-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-600 text-white flex items-center justify-center shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        {evaluationResult.verdictTitle || "Examen no superado"}
                      </h3>
                      <p className="text-xs text-slate-600 font-bold">
                        Puntuación obtenida: {evaluationResult.score}/100 (Mínimo necesario: 70)
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    {evaluationResult.detailedFeedback}
                  </div>
                </div>
              )}

              {/* Spoken transcription preview */}
              {transcribedText && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                    Transcripción exacta de lo que dijiste:
                  </span>
                  <p className="text-slate-700 italic">"{transcribedText}"</p>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    sounds.playPop();
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cerrar ventana
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
