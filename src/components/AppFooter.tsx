import React from "react";
import { Sparkles, ShieldCheck, FileText } from "lucide-react";
import { sounds } from "../utils/audio";

interface AppFooterProps {
  onOpenLegal: (tab: "privacy" | "terms") => void;
  className?: string;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onOpenLegal,
  className = "",
}) => {
  return (
    <footer
      className={`mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-8 text-xs text-slate-500 ${className}`}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand & brief description */}
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-800 text-sm">EstudioSmart</span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span className="text-slate-400 text-xs hidden sm:inline">
            Tutor de estudio interactivo
          </span>
        </div>

        {/* Legal Links */}
        <div className="flex items-center gap-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              onOpenLegal("privacy");
            }}
            className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Política de Privacidad</span>
          </button>

          <span className="text-slate-300">·</span>

          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              onOpenLegal("terms");
            }}
            className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Términos y Condiciones</span>
          </button>
        </div>

        {/* Copyright */}
        <div className="text-slate-400 text-[11px] text-center sm:text-right">
          © {new Date().getFullYear()} Todos los derechos reservados
        </div>
      </div>
    </footer>
  );
};
