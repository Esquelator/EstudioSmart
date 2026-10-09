import React, { useState } from "react";
import { Sparkles, Flame, Trophy, BarChart2, User, LogIn, LogOut, CloudCheck, ChevronDown, Users, Lock } from "lucide-react";
import { UserProgress } from "../types";
import { User as FirebaseUser } from "firebase/auth";

interface NavbarProps {
  progress: UserProgress;
  currentUser: FirebaseUser | null;
  onOpenProgress: () => void;
  onOpenFriends: () => void;
  onOpenOralExam?: () => void;
  onResetToNew: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  hasActiveTopic: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  progress,
  currentUser,
  onOpenProgress,
  onOpenFriends,
  onOpenOralExam,
  onResetToNew,
  onOpenAuth,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={onResetToNew}
          className="flex items-center gap-3.5 text-left group transition-transform active:scale-95 cursor-pointer shrink-0"
          title="Ir al inicio"
        >
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 font-display">
              Estudio<span className="text-indigo-600">Smart</span>
            </span>
          </div>
        </button>

        {/* Live Simple Stats & User Account */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak badge */}
          <button
            onClick={onOpenProgress}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-bold cursor-pointer hover:bg-amber-100 transition-colors shadow-2xs"
            title="Días de racha de estudio"
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-extrabold">{progress.streakDays} días</span>
          </button>

          {/* XP Badge */}
          <button
            onClick={onOpenProgress}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-bold cursor-pointer hover:bg-indigo-100 transition-colors shadow-2xs"
            title="Puntos de experiencia"
          >
            <Trophy className="w-4 h-4 text-indigo-600" />
            <span className="font-extrabold">{progress.totalXp} XP</span>
          </button>

          {/* Friends & Leaderboard Button */}
          <button
            onClick={onOpenFriends}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer transition-colors shadow-2xs"
            title="Ver amigos y clasificación"
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Amigos</span>
          </button>

          {/* Oral Exam 15% Discount Padlock Button */}
          {onOpenOralExam && (
            <button
              onClick={onOpenOralExam}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/90 text-amber-900 text-xs sm:text-sm font-black cursor-pointer transition-colors shadow-2xs"
              title="Desafío del Candado: Ahorra un 15% en tu cuota con el examen oral anti-trampas"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden md:inline">Reto 15% Dto</span>
              <span className="md:hidden font-black">-15%</span>
            </button>
          )}

          {/* Progress Modal Button */}
          <button
            onClick={onOpenProgress}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Ver mi progreso diario"
            aria-label="Ver progreso diario"
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <div className="h-6 w-[1px] bg-slate-200 mx-1" />

          {/* Authentication Section */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-slate-100/80 transition-all cursor-pointer shadow-2xs"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "Usuario"}
                    className="w-7 h-7 rounded-xl object-cover border border-indigo-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center">
                    {(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[110px]">
                    {currentUser.displayName || currentUser.email?.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                    <CloudCheck className="w-3 h-3" />
                    <span>Nube activa</span>
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in text-xs font-semibold">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <div className="font-extrabold text-slate-900 truncate text-sm">
                        {currentUser.displayName || "Estudiante"}
                      </div>
                      <div className="text-slate-400 truncate text-[11px]">
                        {currentUser.email}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenFriends();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>Amigos y Clasificación</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProgress();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <BarChart2 className="w-4 h-4" />
                      <span>Mi Progreso y Retos</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar sesión</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
