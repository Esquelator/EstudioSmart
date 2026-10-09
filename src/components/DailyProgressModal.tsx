import React, { useState } from "react";
import {
  X,
  Flame,
  Trophy,
  Target,
  Award,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";
import { UserProgress } from "../types";
import { sounds } from "../utils/audio";
import {
  calculateLevelInfo,
  getDailyQuests,
  getAchievementBadges,
} from "../utils/storage";

interface DailyProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress;
  onUpdateGoal: (newGoal: number) => void;
  onResetProgress: () => void;
}

export const DailyProgressModal: React.FC<DailyProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  onUpdateGoal,
  onResetProgress,
}) => {
  const [activeTab, setActiveTab] = useState<"quests" | "badges" | "level">("quests");

  if (!isOpen) return null;

  const levelInfo = calculateLevelInfo(progress.totalXp);
  const dailyQuests = getDailyQuests(progress);
  const badges = getAchievementBadges(progress);

  const completedQuestsCount = dailyQuests.filter((q) => q.completed).length;
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Retos y Nivel Académico
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Gana experiencia constante y desbloquea rangos reales
            </p>
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

        {/* Level & Rank Summary Banner */}
        <div className="p-3.5 sm:p-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shrink-0 space-y-2.5 sm:space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                Nivel {levelInfo.level}
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-white font-display">
                {levelInfo.title}
              </h3>
            </div>

            <div className="text-right">
              <div className="text-xl sm:text-3xl font-black text-amber-300 font-display">
                {progress.totalXp} XP
              </div>
              <p className="text-[10px] sm:text-xs text-indigo-200/80">
                Faltan {levelInfo.xpToNext} XP para el siguiente rango
              </p>
            </div>
          </div>

          {/* Progress Bar to next level */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] sm:text-xs text-indigo-200 font-semibold">
              <span>{levelInfo.minXp} XP</span>
              <span>{levelInfo.progressPercent}% completado</span>
              <span>{levelInfo.maxXp} XP</span>
            </div>
            <div className="w-full h-2.5 sm:h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
            <div className="p-1.5 sm:p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-center gap-1 text-amber-400 font-black text-sm sm:text-base">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{progress.streakDays}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300">Días racha</p>
            </div>

            <div className="p-1.5 sm:p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-sm sm:text-base font-black text-indigo-300">
                {progress.quizzesCorrectCount || 0}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300">Aciertos test</p>
            </div>

            <div className="p-1.5 sm:p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-sm sm:text-base font-black text-emerald-400">
                {progress.cardsMasteredCount || 0}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300">Tarjetas fijadas</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              setActiveTab("quests");
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "quests"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Misiones Diarias ({completedQuestsCount}/{dailyQuests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              setActiveTab("badges");
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "badges"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Insignias ({unlockedBadgesCount}/{badges.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playPop();
              setActiveTab("level");
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "level"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Escala</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain touch-pan-y custom-scrollbar pb-8">
          {/* 1. Misiones Diarias */}
          {activeTab === "quests" && (
            <div className="space-y-3 pb-6">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                <span>Completa retos para ganar XP adicional</span>
                <span className="text-indigo-600">{completedQuestsCount} de {dailyQuests.length} listos</span>
              </div>

              {dailyQuests.map((quest) => {
                const percent = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      quest.completed
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                        : "bg-white border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">{quest.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base leading-snug">
                            {quest.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {quest.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                            quest.completed
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}
                        >
                          +{quest.xpReward} XP
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            quest.completed ? "bg-emerald-600" : "bg-indigo-600"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500 shrink-0">
                        {quest.currentCount}/{quest.targetCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. Insignias */}
          {activeTab === "badges" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-6">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                    badge.unlocked
                      ? "bg-amber-50/60 border-amber-300 text-amber-950"
                      : "bg-slate-50/70 border-slate-200 text-slate-400 opacity-70"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                      badge.unlocked ? "bg-amber-100 shadow-2xs" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {badge.unlocked ? badge.icon : <Lock className="w-5 h-5 text-slate-400" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {badge.title}
                      </h4>
                      {badge.unlocked && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Escala de Rangos */}
          {activeTab === "level" && (
            <div className="space-y-4 pb-6">
              <div className="text-xs text-slate-500 font-medium px-1">
                La experiencia se acumula de forma constante. Cada nivel exige mayor dominio del material.
              </div>

              <div className="space-y-2.5">
                {[
                  { level: 1, title: "Novato", range: "0 - 300 XP" },
                  { level: 2, title: "Aprendiz Curioso", range: "300 - 750 XP" },
                  { level: 3, title: "Estudiante Constante", range: "750 - 1,400 XP" },
                  { level: 4, title: "Investigador", range: "1,400 - 2,300 XP" },
                  { level: 5, title: "Analista de Élite", range: "2,300 - 3,500 XP" },
                  { level: 6, title: "Maestro del Temario", range: "3,500 - 5,000 XP" },
                  { level: 7, title: "Eminencia Académica", range: "5,000+ XP" },
                ].map((item) => {
                  const isCurrent = levelInfo.level === item.level;
                  const isPassed = levelInfo.level > item.level;

                  return (
                    <div
                      key={item.level}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-bold"
                          : isPassed
                          ? "bg-slate-50 border-slate-200 text-slate-700"
                          : "bg-white border-slate-200 text-slate-400 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${
                            isCurrent
                              ? "bg-indigo-600 text-white"
                              : isPassed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {item.level}
                        </span>
                        <div>
                          <div className="text-sm font-extrabold">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.range}</div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-black text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                          Rango Actual
                        </span>
                      ) : isPassed ? (
                        <span className="text-xs font-bold text-emerald-700">Completado ✓</span>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">Bloqueado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Goal customizer */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mt-4">
                <span className="text-xs font-bold text-slate-700">Ajustar meta diaria de repasos:</span>
                <div className="flex gap-2">
                  {[5, 10, 15].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        sounds.playPop();
                        onUpdateGoal(num);
                      }}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                        progress.dailyGoalItems === num
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-slate-200 text-slate-700"
                      }`}
                    >
                      {num} ejercicios
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <button
            onClick={() => {
              if (confirm("¿Seguro que deseas reiniciar tus estadísticas de progreso?")) {
                onResetProgress();
              }
            }}
            className="text-xs text-slate-400 hover:text-rose-600 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar estadísticas</span>
          </button>

          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-sm cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            Continuar estudiando
          </button>
        </div>
      </div>
    </div>
  );
};
