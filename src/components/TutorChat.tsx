import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ChatMessage, StudyMaterial } from "../types";
import { sounds } from "../utils/audio";
import { FormattedTutorMessage } from "./FormattedTutorMessage";

interface TutorChatProps {
  material: StudyMaterial;
  onRewardXp?: (xp: number) => void;
}

export const TutorChat: React.FC<TutorChatProps> = ({ material, onRewardXp }) => {
  const isNoAnalogyMode =
    !material.selectedPassions ||
    material.selectedPassions.length === 0 ||
    material.selectedPassions.some((p) =>
      /sin analog|normal|ningun|directo|clasico/i.test(p)
    );

  const initialWelcome = useMemo(() => {
    if (isNoAnalogyMode) {
      return `¡Hola! Soy tu tutor para **"${material.topic}"**.\n\nPuedes preguntarme cualquier concepto, fórmula o duda del temario y te lo explicaré de forma directa y clara. ¿Por qué parte empezamos?`;
    }
    const passions = material.selectedPassions.join(", ");
    return `¡Hola! Soy tu tutor para **"${material.topic}"**.\n\nPodemos resolver dudas paso a paso o relacionarlas con lo que te gusta (**${passions}**). ¿Qué duda quieres revisar primero?`;
  }, [material.topic, material.selectedPassions, isNoAnalogyMode]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m_welcome",
      role: "assistant",
      content: initialWelcome,
      timestamp: Date.now(),
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Audio speech synthesis helper
  const handleSpeak = (text: string, msgId: string) => {
    sounds.playPop();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeech = text
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`{1,3}/g, "")
      .replace(/>\s*/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text || isLoading) return;

    sounds.playPop();
    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputVal("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/study/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          topic: material.topic,
          overview: material.overview,
          passions: material.selectedPassions,
          studyDepth: material.studyDepth,
          customInstructions: material.customInstructions,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("json") ? await res.json().catch(() => ({})) : {};
      const botMsg: ChatMessage = {
        id: "msg_bot_" + Date.now(),
        role: "assistant",
        content: data.reply || data.error || "No pude procesar la respuesta, pero seguimos estudiando.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      sounds.playSuccess();
      onRewardXp?.(10);
    } catch (err) {
      console.error("Chat error:", err);
      const errMsg: ChatMessage = {
        id: "msg_err_" + Date.now(),
        role: "assistant",
        content: "Hubo un pequeño error al contactar con el Tutor. ¿Podrías volver a preguntarme?",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
      sounds.playError();
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (suggestedText: string) => {
    sounds.playPop();
    if (suggestedText.endsWith(" ")) {
      setInputVal(suggestedText);
      inputRef.current?.focus();
    } else {
      handleSendMessage(suggestedText);
    }
  };

  const toggleRecording = async () => {
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

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          stream.getTracks().forEach((t) => t.stop());

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
                setInputVal((prev) => (prev ? `${prev} ${data.transcription}` : data.transcription));
                sounds.playSuccess();
              }
            } catch (err) {
              console.error("Transcribe error in chat:", err);
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
        sounds.playPop();
      } catch (err) {
        console.error("Mic error:", err);
      }
    }
  };

  // Simple, calm quick prompts
  const smartQuickPrompts = useMemo(() => {
    const list: string[] = [];
    if (material.glossary && material.glossary.length > 0) {
      list.push(`¿Qué significa "${material.glossary[0].term}"?`);
    } else if (material.sections && material.sections.length > 0) {
      list.push(`Explícame el punto clave de "${material.sections[0].title}"`);
    } else {
      list.push("Explícame los conceptos esenciales paso a paso");
    }
    list.push("Ponme un ejemplo práctico de esto");
    list.push("¿Qué suelen preguntar en el examen sobre esto?");
    return list;
  }, [material.glossary, material.sections]);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col h-[620px] sm:h-[680px] overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-900 font-display">
                Tutor de Estudio
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                · {material.topic}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isNoAnalogyMode ? "Explicación directa" : `Con analogías de ${material.selectedPassions.join(", ")}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sounds.playPop();
            window.speechSynthesis?.cancel();
            setSpeakingMsgId(null);
            setMessages([
              {
                id: "m_welcome",
                role: "assistant",
                content: `Conversación reiniciada. ¿Qué concepto de **"${material.topic}"** quieres repasar?`,
                timestamp: Date.now(),
              },
            ]);
          }}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Reiniciar chat"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reiniciar</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-white">
        {messages.map((msg) => {
          const isAssistant = msg.role === "assistant";

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isAssistant ? "" : "flex-row-reverse"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isAssistant
                    ? "bg-slate-100 text-indigo-600"
                    : "bg-slate-900 text-white"
                }`}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[82%] text-sm sm:text-base leading-relaxed ${
                  isAssistant
                    ? "bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-2xs"
                    : "bg-indigo-600 text-white rounded-2xl rounded-tr-xs p-3.5 sm:p-4 shadow-2xs font-medium"
                }`}
              >
                {isAssistant ? (
                  <FormattedTutorMessage
                    content={msg.content}
                    onQuickReply={handleQuickReply}
                    onSpeak={() => handleSpeak(msg.content, msg.id)}
                    isSpeaking={speakingMsgId === msg.id}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading / Thinking State */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs sm:text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Pensando respuesta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Clean Quick Prompts Carousel */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2 overflow-x-auto select-none">
        <span className="text-[11px] font-bold text-slate-400 shrink-0">
          Sugerencias:
        </span>
        {smartQuickPrompts.map((prompt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-3 py-1 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 shrink-0 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Microphone button */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isTranscribing || isLoading}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
              isRecording
                ? "bg-rose-500 text-white animate-pulse"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            title={isRecording ? "Detener grabación" : "Hablar con el tutor"}
          >
            {isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isLoading}
            placeholder={
              isRecording
                ? "Escuchando... habla con naturalidad"
                : isTranscribing
                ? "Transcribiendo audio..."
                : `Pregunta cualquier duda sobre "${material.topic}"...`
            }
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className="p-2.5 sm:p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold cursor-pointer transition-colors shadow-xs shrink-0"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
