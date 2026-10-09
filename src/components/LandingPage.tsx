import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Film,
  MessageSquareText,
  Lock,
  Check,
  X,
  CreditCard,
  Flame,
  Trophy,
  Brain,
  ShieldCheck,
  Zap,
  LogIn,
  User,
} from "lucide-react";
import { sounds } from "../utils/audio";
import { AppFooter } from "./AppFooter";
import { LegalModal } from "./LegalModal";

interface LandingPageProps {
  onStart: () => void;
  onOpenAuth: () => void;
  onOpenOralExam: () => void;
  onOpenStripeCheckout: () => void;
  currentUser: any;
  hasActiveDiscount?: boolean;
  onOpenLegal?: (tab: "privacy" | "terms") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onOpenAuth,
  onOpenOralExam,
  onOpenStripeCheckout,
  currentUser,
  hasActiveDiscount = false,
  onOpenLegal,
}) => {
  const [localLegalModalOpen, setLocalLegalModalOpen] = useState(false);
  const [localLegalTab, setLocalLegalTab] = useState<"privacy" | "terms">("privacy");

  const handleOpenLegal = (tab: "privacy" | "terms") => {
    if (onOpenLegal) {
      onOpenLegal(tab);
    } else {
      setLocalLegalTab(tab);
      setLocalLegalModalOpen(true);
    }
  };

  const scrollToPlans = () => {
    sounds.playPop();
    const el = document.getElementById("planes-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-xl sm:text-2xl tracking-tight text-slate-900 font-display">
                Estudio<span className="text-indigo-600">Smart</span>
              </span>
            </div>
          </div>

          {/* Center Links (desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-600">
            <a href="#como-funciona" className="hover:text-indigo-600 transition-colors">
              Cómo funciona
            </a>
            <button
              onClick={scrollToPlans}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Planes (1,99 €)
            </button>
            <button
              onClick={() => {
                sounds.playPop();
                onOpenOralExam();
              }}
              className="flex items-center gap-1.5 hover:text-amber-600 transition-colors cursor-pointer font-extrabold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/70"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Reto Candado (-15%)</span>
            </button>
          </nav>

          {/* Top Right Actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sounds.playPop();
                    onOpenAuth();
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  <User className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.displayName || currentUser.email}</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playPop();
                    onStart();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                >
                  Entrar al Estudio
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    sounds.playPop();
                    onOpenAuth();
                  }}
                  className="px-3.5 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-slate-100 font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4 text-indigo-600" />
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  onClick={() => {
                    sounds.playPop();
                    onStart();
                  }}
                  className="px-4.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
                >
                  Empezar Gratis
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-white via-indigo-50/20 to-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs sm:text-sm font-extrabold shadow-2xs">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>Tutor Inteligente de Estudio con Vídeos Animados y Retos</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight font-display leading-[1.15]">
            Aprende cualquier tema en la mitad de tiempo y a tu manera
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Sube tus <strong>PDFs, fotos de apuntes o enlaces web</strong>. EstudioSmart te los explica con vídeos animados paso a paso, analogías basadas en tus pasiones (fútbol, coches, música) y un examen oral con descuento del 15%.
          </p>

          {/* Central Prominent CTA Button: "Empezar" */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                sounds.playPop();
                onStart();
              }}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-lg sm:text-xl shadow-xl shadow-indigo-600/35 flex items-center justify-center gap-3 transition-all cursor-pointer group"
            >
              <Sparkles className="w-6 h-6 text-amber-300 group-hover:rotate-12 transition-transform" />
              <span>Empezar</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={scrollToPlans}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-extrabold text-sm sm:text-base transition-all cursor-pointer shadow-xs"
            >
              Ver Planes (1,99 €)
            </button>
          </div>

          {/* Trust points */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Sin tarjeta obligatoria para empezar
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Vídeos y resúmenes al instante
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> Reto oral con 15% de ahorro
            </span>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section id="como-funciona" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
              ¿Por qué funciona tan bien?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display">
              Todo lo que necesitas para memorizar y aprobar
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Diseñado con técnicas de estudio activo, repetición espaciada y modelos avanzados de IA pedagógica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">
                Vídeos Explicativos Animados
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Genera al vuelo una animación con escenas dibujadas, locución y pizarra para visualizar los procesos complejos paso a paso.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">
                Analogías según tus Pasiones
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ¿Te gusta el fútbol, los videojuegos o la música? La IA traduce conceptos difíciles a metáforas cotidianas que no se olvidan.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                <Lock className="w-6 h-6 text-amber-700" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-amber-950">
                  Desafío Candado (-15% Dto)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  Ahorro
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                Un día antes de renovar, explica un punto con tu propia voz. Si no usas IA, ¡te llevas un 15% de descuento en tu cuota! Con 2 oportunidades y rotación de temas de tu base de datos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section (ONLY 2 PLANS: GRATIS & 1,99 €) */}
      <section id="planes-section" className="py-16 sm:py-24 bg-slate-100/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
              Planes Transparentes
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display">
              Elige el plan ideal para tu estudio
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Empieza gratis hoy mismo o desbloquea el Plan Pro ilimitado por solo 1,99 €/mes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* PLAN 1: GRATIS */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Plan Gratis</h3>
                    <p className="text-xs text-slate-500">Para probar la plataforma y estudiar puntual</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                    Básico
                  </span>
                </div>

                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-4xl font-black text-slate-900">0 €</span>
                  <span className="text-xs text-slate-500 font-bold">/ para siempre</span>
                </div>

                <ul className="space-y-3 pt-4 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hasta <strong>2 temas al mes</strong> (PDFs o textos)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Resúmenes con analogías de tus pasiones</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tarjetas de memoria (Flashcards)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Test tipo test de repaso</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <X className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Vídeos animados explicativos con IA</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <X className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Tutor IA con preguntas ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <X className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Desafío del Candado (15% de Descuento)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  sounds.playPop();
                  onStart();
                }}
                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-md transition-all cursor-pointer active:scale-98"
              >
                Empezar Gratis
              </button>
            </div>

            {/* PLAN 2: PLAN ESTUDIANTE PRO (1,99 €) */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl border-2 border-indigo-500/50 flex flex-col justify-between space-y-6 relative overflow-hidden">
              {/* Highlight ribbon */}
              <div className="absolute top-5 right-5">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md">
                  Recomendado
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white">Plan Estudiante Pro</h3>
                  <p className="text-xs text-indigo-200">Acceso ilimitado a todas las herramientas IA</p>
                </div>

                <div className="flex items-baseline gap-2 pt-2">
                  {hasActiveDiscount ? (
                    <>
                      <span className="text-4xl font-black text-emerald-400">1,69 €</span>
                      <span className="text-base text-slate-400 line-through font-bold">1,99 €</span>
                      <span className="text-xs text-indigo-300 font-bold">/ mes (-15%)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-white">1,99 €</span>
                      <span className="text-xs text-indigo-300 font-bold">/ mes</span>
                    </>
                  )}
                </div>

                <ul className="space-y-3 pt-4 text-xs sm:text-sm text-indigo-100">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Subidas ilimitadas</strong> de PDFs, fotos y enlaces web</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Vídeos explicativos animados con IA</strong> para cada tema</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Tutor Personal IA 24/7</strong> sin límites de preguntas</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Desafío del Candado (-15% Dto)</strong>: 1,99 € ➔ 1,69 €</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>2 Oportunidades</strong> con rotación de temas de tu base de datos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>Sincronización en la nube</strong> con base de datos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mapas conceptuales interactivos y narración por voz</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    sounds.playPop();
                    onOpenStripeCheckout();
                  }}
                  className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CreditCard className="w-5 h-5 text-slate-950" />
                  <span>Suscribirme por 1,99 €/mes (Prueba)</span>
                </button>
                <p className="text-[10px] text-center text-indigo-300">
                  Pasarela de prueba simulada • Cancela cuando quieras con un clic
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Trust & Legal Footer */}
      <AppFooter onOpenLegal={handleOpenLegal} />

      {/* Local Legal Modal Fallback */}
      <LegalModal
        isOpen={localLegalModalOpen}
        initialTab={localLegalTab}
        onClose={() => setLocalLegalModalOpen(false)}
      />
    </div>
  );
};
