import React, { useState } from "react";
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  ArrowRight,
} from "lucide-react";

interface FormattedTutorMessageProps {
  content: string;
  onQuickReply?: (text: string) => void;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}

export const FormattedTutorMessage: React.FC<FormattedTutorMessageProps> = ({
  content,
  onQuickReply,
  onSpeak,
  isSpeaking = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to render bold, italic, code inline tags quietly without visual clutter
  const renderInline = (text: string): React.ReactNode => {
    const codeParts = text.split(/(`[^`]+`)/g);

    return codeParts.map((codeSegment, cIdx) => {
      if (codeSegment.startsWith("`") && codeSegment.endsWith("`")) {
        return (
          <code
            key={cIdx}
            className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
          >
            {codeSegment.slice(1, -1)}
          </code>
        );
      }

      const boldParts = codeSegment.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((boldSegment, bIdx) => {
        if (boldSegment.startsWith("**") && boldSegment.endsWith("**")) {
          return (
            <strong key={`${cIdx}-${bIdx}`} className="font-extrabold text-slate-950">
              {boldSegment.slice(2, -2)}
            </strong>
          );
        }

        const italicParts = boldSegment.split(/(\*[^*]+\*)/g);
        return italicParts.map((italicSegment, iIdx) => {
          if (italicSegment.startsWith("*") && italicSegment.endsWith("*")) {
            return (
              <em key={`${cIdx}-${bIdx}-${iIdx}`} className="italic text-slate-700">
                {italicSegment.slice(1, -1)}
              </em>
            );
          }
          return italicSegment;
        });
      });
    });
  };

  // Parse lines into clean text, simple quotes, lists, or headers
  const parseLines = (raw: string) => {
    const lines = raw.split("\n");
    const blocks: {
      type: "header" | "quote" | "numbered" | "bullet" | "paragraph" | "challenge";
      content: string;
      num?: string;
    }[] = [];

    let currentParagraph: string[] = [];

    const flush = () => {
      if (currentParagraph.length > 0) {
        const p = currentParagraph.join(" ").trim();
        if (p) blocks.push({ type: "paragraph", content: p });
        currentParagraph = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        flush();
        continue;
      }

      // Headers (### or ##)
      const hMatch = line.match(/^#{1,4}\s+(.+)$/);
      if (hMatch) {
        flush();
        const title = hMatch[1];
        if (/mini-?reto|reto|pregunta/i.test(title)) {
          blocks.push({ type: "challenge", content: title });
        } else {
          blocks.push({ type: "header", content: title });
        }
        continue;
      }

      // Quotes (> ...)
      if (line.startsWith(">")) {
        flush();
        blocks.push({ type: "quote", content: line.replace(/^>\s*/, "") });
        continue;
      }

      // Numbered (1. , 2. )
      const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        flush();
        blocks.push({ type: "numbered", num: numMatch[1], content: numMatch[2] });
        continue;
      }

      // Bullet (- , * , • )
      const bMatch = line.match(/^[-*•]\s+(.+)$/);
      if (bMatch) {
        flush();
        blocks.push({ type: "bullet", content: bMatch[1] });
        continue;
      }

      currentParagraph.push(line);
    }

    flush();
    return blocks;
  };

  const blocks = parseLines(content);

  return (
    <div className="space-y-3.5 text-slate-800 leading-relaxed font-sans select-text">
      {blocks.map((block, idx) => {
        // Headers: Clean and calm
        if (block.type === "header") {
          return (
            <h4
              key={idx}
              className="text-base font-extrabold text-slate-900 pt-1 tracking-tight font-display"
            >
              {renderInline(block.content)}
            </h4>
          );
        }

        // Clean subtle quote (no heavy boxes)
        if (block.type === "quote") {
          return (
            <div
              key={idx}
              className="pl-3.5 border-l-2 border-indigo-500 my-2 text-slate-700 text-sm sm:text-base leading-relaxed"
            >
              {renderInline(block.content)}
            </div>
          );
        }

        // Mini Challenge / Question
        if (block.type === "challenge") {
          return (
            <div key={idx} className="pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 space-y-2">
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>{renderInline(block.content)}</span>
                </div>
                {onQuickReply && (
                  <button
                    type="button"
                    onClick={() => onQuickReply("Creo que la respuesta es: ")}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Responder al reto</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        }

        // Numbered steps
        if (block.type === "numbered") {
          return (
            <div key={idx} className="flex items-start gap-2.5 text-sm sm:text-base my-1">
              <span className="font-bold text-slate-900 shrink-0 text-xs mt-1 w-4">
                {block.num}.
              </span>
              <div className="flex-1 text-slate-800 leading-relaxed">
                {renderInline(block.content)}
              </div>
            </div>
          );
        }

        // Bullet
        if (block.type === "bullet") {
          return (
            <div key={idx} className="flex items-start gap-2 text-sm sm:text-base my-1 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2.5" />
              <div className="flex-1 text-slate-800 leading-relaxed">
                {renderInline(block.content)}
              </div>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-sm sm:text-base leading-relaxed text-slate-800">
            {renderInline(block.content)}
          </p>
        );
      })}

      {/* Quiet Minimalist Controls */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center gap-3">
          {onSpeak && (
            <button
              type="button"
              onClick={() => onSpeak(content)}
              className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-xs cursor-pointer transition-colors"
              title={isSpeaking ? "Detener voz" : "Escuchar"}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-indigo-600" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isSpeaking ? "Pausar" : "Escuchar"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-xs cursor-pointer transition-colors"
            title="Copiar texto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
        </div>

        {onQuickReply && (
          <button
            type="button"
            onClick={() => onQuickReply("¿Podrías darme un ejemplo práctico y sencillo de esto?")}
            className="text-xs text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors font-medium"
          >
            Ver ejemplo
          </button>
        )}
      </div>
    </div>
  );
};
