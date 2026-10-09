import React, { useState, useEffect } from "react";
import { X, ShieldCheck, FileText } from "lucide-react";
import { PRIVACY_POLICY, TERMS_AND_CONDITIONS } from "../data/legalDocuments";
import { sounds } from "../utils/audio";

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: "privacy" | "terms";
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = "privacy",
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentDoc = activeTab === "privacy" ? PRIVACY_POLICY : TERMS_AND_CONDITIONS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[88vh] my-auto">
        {/* Simple Header with Tabs and Close */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setActiveTab("privacy");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "privacy"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Política de Privacidad</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playPop();
                setActiveTab("terms");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "terms"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Términos y Condiciones</span>
            </button>
          </div>

          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean, Simple Readable Text Content */}
        <div className="flex-1 min-h-0 p-5 sm:p-8 overflow-y-auto space-y-6 overscroll-contain touch-pan-y custom-scrollbar text-slate-700 text-sm leading-relaxed">
          {/* Document Header */}
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              {currentDoc.title}
            </h2>
            <p className="text-xs text-slate-500">
              Última actualización: {currentDoc.lastUpdated}
            </p>
          </div>

          {/* Legal Identification Details Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs text-slate-600">
            <p className="font-bold text-slate-900">
              Responsable legal: {currentDoc.legalRepresentative} (NIF: {currentDoc.nif})
            </p>
            <p>Empresa: {currentDoc.companyName} ({currentDoc.commercialName})</p>
            <p>Dirección: {currentDoc.address}</p>
            <p>Email: <a href={`mailto:${currentDoc.email}`} className="text-indigo-600 hover:underline">{currentDoc.email}</a> · Teléfono: {currentDoc.phone}</p>
            <p>Web: <a href={currentDoc.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{currentDoc.website}</a></p>
          </div>

          {/* Sections in simple readable text */}
          <div className="space-y-6 pt-2">
            {currentDoc.sections.map((sec) => (
              <section key={sec.id} className="space-y-2">
                <h3 className="font-bold text-base text-slate-900">
                  {sec.title}
                </h3>
                <div className="space-y-2 text-slate-600 leading-relaxed">
                  {sec.content.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Simple Footer with Close Button */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/70 shrink-0">
          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
