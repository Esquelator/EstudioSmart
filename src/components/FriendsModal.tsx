import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  UserPlus,
  Trophy,
  Flame,
  Search,
  Check,
  Trash2,
  Loader2,
  LogIn,
  Brain,
  Target,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import {
  UserAccountProfile,
  getUserFriendsFromDb,
  searchUsersInDb,
  addFriendToDb,
  removeFriendFromDb,
  getCommunityLeaderboard,
} from "../firebase";
import { calculateLevelInfo } from "../utils/storage";
import { sounds } from "../utils/audio";
import { UserProgress } from "../types";

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  onOpenAuth: () => void;
  currentProgress: UserProgress;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  currentProgress,
}) => {
  const [activeTab, setActiveTab] = useState<"friends" | "search" | "leaderboard">("friends");

  // State
  const [friendsList, setFriendsList] = useState<UserAccountProfile[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserAccountProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addedFriendIds, setAddedFriendIds] = useState<Set<string>>(new Set());

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<UserAccountProfile[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Load friends when modal opens
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    loadFriends();
    loadLeaderboard();
  }, [isOpen, currentUser]);

  const loadFriends = async () => {
    if (!currentUser) return;
    try {
      setIsLoadingFriends(true);
      const friends = await getUserFriendsFromDb(currentUser.uid);
      setFriendsList(friends);
      setAddedFriendIds(new Set(friends.map((f) => f.uid)));
    } catch (err) {
      console.error("Error loading friends:", err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setIsLoadingLeaderboard(true);
      const top = await getCommunityLeaderboard(25);
      setLeaderboard(top);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !currentUser) return;

    try {
      setIsSearching(true);
      const results = await searchUsersInDb(searchQuery, currentUser.uid);
      setSearchResults(results);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friend: UserAccountProfile) => {
    if (!currentUser) return;
    sounds.playPop();
    try {
      const ok = await addFriendToDb(currentUser.uid, friend);
      if (ok) {
        sounds.playSuccess();
        setAddedFriendIds((prev) => new Set(prev).add(friend.uid));
        // Refresh list
        loadFriends();
      }
    } catch (err) {
      console.error("Error adding friend:", err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return;
    if (!confirm("¿Deseas eliminar a este amigo de tu lista?")) return;
    sounds.playPop();
    try {
      const ok = await removeFriendFromDb(currentUser.uid, friendId);
      if (ok) {
        setFriendsList((prev) => prev.filter((f) => f.uid !== friendId));
        setAddedFriendIds((prev) => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
      }
    } catch (err) {
      console.error("Error removing friend:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                Comunidad y Amigos
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Sigue el progreso de tus compañeros y compite de forma sana
              </p>
            </div>
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

        {/* Auth prompt if not logged in */}
        {!currentUser ? (
          <div className="p-8 sm:p-10 text-center space-y-5 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-xl font-extrabold text-slate-900">
                Conecta con tus amigos de estudio
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Inicia sesión en tu cuenta para poder buscar compañeros, agregarlos como amigos y ver sus rachas, niveles y tarjetas dominadas en tiempo real.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center gap-2 mx-auto cursor-pointer shadow-md shadow-indigo-600/25 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar sesión o Crear cuenta</span>
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setActiveTab("friends");
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "friends"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Mis Amigos ({friendsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setActiveTab("search");
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "search"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Buscar Amigos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  setActiveTab("leaderboard");
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "leaderboard"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Clasificación</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain touch-pan-y custom-scrollbar pb-8">
              {/* 1. MIS AMIGOS */}
              {activeTab === "friends" && (
                <div className="space-y-3">
                  {isLoadingFriends ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                      <p className="text-xs font-semibold">Cargando amigos...</p>
                    </div>
                  ) : friendsList.length === 0 ? (
                    <div className="py-10 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-base text-slate-900">
                          Aún no tienes amigos agregados
                        </h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Busca compañeros por su email o nombre para ver sus progresos y compartir vuestra racha de estudio.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("search")}
                        className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Buscar amigos ahora
                      </button>
                    </div>
                  ) : (
                    friendsList.map((friend) => {
                      const levelInfo = calculateLevelInfo(friend.totalXp || 0);

                      return (
                        <div
                          key={friend.uid}
                          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {friend.photoURL ? (
                                <img
                                  src={friend.photoURL}
                                  alt={friend.displayName}
                                  className="w-11 h-11 rounded-2xl object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-800 font-black text-base flex items-center justify-center">
                                  {(friend.displayName || friend.email).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-black text-sm sm:text-base text-slate-900 leading-tight">
                                  {friend.displayName}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  <span className="font-bold text-indigo-600">
                                    Nivel {levelInfo.level} · {levelInfo.title}
                                  </span>
                                  {friend.lastActiveDate && (
                                    <>
                                      <span>·</span>
                                      <span className="text-[11px] text-slate-400">
                                        Activo: {friend.lastActiveDate}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveFriend(friend.uid)}
                              className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Eliminar de amigos"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-center text-xs">
                            <div className="p-2 rounded-xl bg-slate-50">
                              <div className="font-black text-slate-900 text-sm">
                                {friend.totalXp || 0} XP
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium">Experiencia</span>
                            </div>

                            <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                              <div className="font-black text-amber-900 text-sm flex items-center justify-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span>{friend.streakDays || 1} d</span>
                              </div>
                              <span className="text-[10px] text-amber-800 font-medium">Racha activa</span>
                            </div>

                            <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100">
                              <div className="font-black text-indigo-900 text-sm">
                                {friend.quizzesCorrectCount || 0} aciertos
                              </div>
                              <span className="text-[10px] text-indigo-800 font-medium">Tests logrados</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 2. BUSCAR AMIGOS */}
              {activeTab === "search" && (
                <div className="space-y-4">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por email o nombre..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Buscar</span>
                    </button>
                  </form>

                  {/* Results */}
                  <div className="space-y-2.5 pt-1">
                    {isSearching ? (
                      <div className="py-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                        <p className="text-xs font-semibold mt-2">Buscando compañeros...</p>
                      </div>
                    ) : searchResults.length === 0 && searchQuery.trim() ? (
                      <div className="py-8 text-center text-slate-400 space-y-1">
                        <p className="text-xs font-bold text-slate-600">No se encontraron usuarios</p>
                        <p className="text-[11px] text-slate-400">Verifica el correo electrónico exacto de tu compañero</p>
                      </div>
                    ) : (
                      searchResults.map((user) => {
                        const isAlreadyFriend = addedFriendIds.has(user.uid);
                        const levelInfo = calculateLevelInfo(user.totalXp || 0);

                        return (
                          <div
                            key={user.uid}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.displayName}
                                  className="w-10 h-10 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center">
                                  {(user.displayName || user.email).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                                  {user.displayName}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span>{user.email}</span>
                                  <span>·</span>
                                  <span className="font-bold text-indigo-600">
                                    Nivel {levelInfo.level} ({user.totalXp || 0} XP)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {isAlreadyFriend ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-1 border border-emerald-200">
                                <Check className="w-3.5 h-3.5" />
                                <span>Amigos</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddFriend(user)}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Añadir</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* 3. CLASIFICACIÓN & RANKING */}
              {activeTab === "leaderboard" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                    <span>Estudiantes con mayor experiencia</span>
                    <span>Top 25</span>
                  </div>

                  {isLoadingLeaderboard ? (
                    <div className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                      <p className="text-xs font-semibold mt-2">Cargando clasificación...</p>
                    </div>
                  ) : (
                    leaderboard.map((item, idx) => {
                      const isMe = item.uid === currentUser?.uid;
                      const levelInfo = calculateLevelInfo(item.totalXp || 0);

                      let rankBadge = `${idx + 1}º`;
                      if (idx === 0) rankBadge = "🥇 1º";
                      else if (idx === 1) rankBadge = "🥈 2º";
                      else if (idx === 2) rankBadge = "🥉 3º";

                      return (
                        <div
                          key={item.uid}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                            isMe
                              ? "bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-black text-xs sm:text-sm w-8 text-center text-slate-700">
                              {rankBadge}
                            </span>

                            {item.photoURL ? (
                              <img
                                src={item.photoURL}
                                alt={item.displayName}
                                className="w-9 h-9 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center">
                                {(item.displayName || item.email || "U").charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                                  {item.displayName || item.email?.split("@")[0]}
                                </h4>
                                {isMe && (
                                  <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-md">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-medium">
                                Nivel {levelInfo.level} · {levelInfo.title}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-slate-900 text-sm sm:text-base">
                              {item.totalXp || 0} XP
                            </div>
                            <div className="flex items-center justify-end gap-1 text-[11px] text-amber-800 font-bold">
                              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span>{item.streakDays || 1} d racha</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <span className="text-xs text-slate-500">
                Tu progreso actual: <strong className="text-slate-900">{currentProgress.totalXp} XP</strong> (Nivel {currentProgress.level})
              </span>
              <button
                onClick={() => {
                  sounds.playPop();
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs cursor-pointer shadow-xs transition-all active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
