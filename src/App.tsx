import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Dumbbell,
  MessageSquareText,
  Sparkles,
  PlusCircle,
  Network,
  AlertTriangle,
  RotateCcw,
  Film,
  Trash2,
} from "lucide-react";
import { StudyMaterial, StudyFile, UserProgress } from "./types";
import { Navbar } from "./components/Navbar";
import { UploadSection } from "./components/UploadSection";
import { StudyOverview } from "./components/StudyOverview";
import { ExplainerVideoStudio } from "./components/ExplainerVideoStudio";
import { MindMapViewer } from "./components/MindMapViewer";
import { ExerciseArena } from "./components/ExerciseArena";
import { TutorChat } from "./components/TutorChat";
import { DailyProgressModal } from "./components/DailyProgressModal";
import { AuthModal } from "./components/AuthModal";
import { FriendsModal } from "./components/FriendsModal";
import { OralExamModal } from "./components/OralExamModal";
import { LandingPage } from "./components/LandingPage";
import { StripeTestCheckoutModal } from "./components/StripeTestCheckoutModal";
import { AppFooter } from "./components/AppFooter";
import { LegalModal } from "./components/LegalModal";
import { SAMPLE_STUDY_MATERIALS } from "./data/sampleTopics";
import { getInitialProgress, saveProgress, addProgressReward, getLocalSavedMaterials, saveLocalMaterials } from "./utils/storage";
import { sounds } from "./utils/audio";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import {
  auth,
  logoutUser,
  ensureUserProfile,
  saveMaterialToDb,
  getUserMaterialsFromDb,
  deleteMaterialFromDb,
  syncProgressToDb,
  testFirestoreConnection,
} from "./firebase";

type ActiveTab = "overview" | "video" | "mindmap" | "exercises" | "chat";

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [savedMaterials, setSavedMaterials] = useState<StudyMaterial[]>(() => getLocalSavedMaterials());
  const [progress, setProgress] = useState<UserProgress>(() => getInitialProgress());
  const [activeMaterial, setActiveMaterial] = useState<StudyMaterial | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastAnalysisPayload, setLastAnalysisPayload] = useState<{
    files: StudyFile[];
    manualText: string;
    webUrl?: string;
    webUrls?: string[];
    passions: string[];
    studyDepth?: "resumido" | "normal" | "profundo";
    customInstructions?: string;
  } | null>(null);
  const [currentView, setCurrentView] = useState<"landing" | "workspace">("landing");
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isOralExamModalOpen, setIsOralExamModalOpen] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [hasActiveDiscount, setHasActiveDiscount] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingActive, setIsDeletingActive] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"privacy" | "terms">("privacy");

  const handleOpenLegal = (tab: "privacy" | "terms") => {
    sounds.playPop();
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.discountEarned) {
          setHasActiveDiscount(true);
        }
      })
      .catch(() => {});
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Listen to Firebase Auth state & load user data from Firestore
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await ensureUserProfile(user);
          // Sync database metrics into local progress
          if (profile) {
            setProgress((prev) => {
              const updated = {
                ...prev,
                totalXp: Math.max(prev.totalXp, profile.totalXp || 0),
                level: Math.max(prev.level, profile.level || 1),
                streakDays: Math.max(prev.streakDays, profile.streakDays || 1),
              };
              saveProgress(updated);
              return updated;
            });
          }
          // Fetch user saved materials from Firestore database and merge with local
          const dbMats = await getUserMaterialsFromDb(user.uid);
          const localMats = getLocalSavedMaterials();
          const map = new Map<string, StudyMaterial>();
          for (const m of localMats) map.set(m.id, m);
          for (const m of dbMats) map.set(m.id, m);
          const merged = Array.from(map.values());
          setSavedMaterials(merged);
          saveLocalMaterials(merged);
        } catch (e) {
          console.error("Error loading user profile from Firestore:", e);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAnalyze = async (data: {
    files: StudyFile[];
    manualText: string;
    webUrl?: string;
    webUrls?: string[];
    passions: string[];
    studyDepth?: "resumido" | "normal" | "profundo";
    customInstructions?: string;
  }) => {
    try {
      setIsLoading(true);
      setAnalysisError(null);
      setLastAnalysisPayload(data);

      let res = await fetch("/api/study/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      let rawText = await res.text().catch(() => "");
      let responseData: any = null;

      // If initial response was a gateway timeout (HTML) or 502/504, auto-retry once after 1.5s
      if ((rawText.includes("<!doctype") || rawText.includes("<html") || res.status === 504 || res.status === 502) && !res.ok) {
        console.warn("First request timed out or received HTML gateway page, retrying once automatically...");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        res = await fetch("/api/study/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        rawText = await res.text().catch(() => "");
      }

      try {
        if (rawText.trim().startsWith("{")) {
          responseData = JSON.parse(rawText);
        } else {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            responseData = JSON.parse(match[0]);
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse response as JSON:", rawText.slice(0, 300));
      }

      if (!res.ok || !responseData) {
        if (rawText.includes("<!doctype") || rawText.includes("<html")) {
          throw new Error(
            "El servidor o la red tardó en responder al procesar el material. Por favor pulsa en 'Reintentar' para continuar."
          );
        }
        const errorMsg =
          responseData?.error ||
          (res.status === 429 || res.status === 503
            ? "El servicio de IA ha alcanzado temporalmente el límite de solicitudes por minuto. Por favor, espera unos segundos y pulsa en 'Reintentar'."
            : `Error al procesar el material (${responseData?.error || `código ${res.status || "desconocido"}`}). Inténtalo de nuevo.`);
        throw new Error(errorMsg);
      }

      const studyData: StudyMaterial = responseData;
      setActiveMaterial(studyData);
      setActiveTab("overview");
      setAnalysisError(null);
      sounds.playSuccess();

      const updated = addProgressReward(progress, {
        xp: 30,
        topic: studyData.topic,
      });
      setProgress(updated);

      // Persist locally and to Cloud Firestore if logged in
      setSavedMaterials((prev) => {
        const next = [studyData, ...prev.filter((m) => m.id !== studyData.id)];
        saveLocalMaterials(next);
        return next;
      });

      if (currentUser) {
        try {
          await saveMaterialToDb(currentUser.uid, studyData);
          await syncProgressToDb(currentUser.uid, updated);
          showNotification(`🎉 ¡Tema guardado en tu base de datos! +30 XP`);
        } catch (e) {
          console.error("Error saving material to Firestore:", e);
          showNotification(`🎉 ¡Tema guardado localmente! +30 XP`);
        }
      } else {
        showNotification(`🎉 ¡Tema listo para estudiar! +30 XP`);
      }
    } catch (err: any) {
      console.error("Error analyzing material:", err);
      setAnalysisError(
        err?.message || "Ocurrió una pausa temporal en los modelos de IA. Puedes pulsar en reintentar para continuar."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateMaterial = (updated: StudyMaterial) => {
    setActiveMaterial(updated);
    setSavedMaterials((prev) => {
      const next = prev.map((m) => (m.id === updated.id ? updated : m));
      saveLocalMaterials(next);
      return next;
    });
    if (currentUser) {
      saveMaterialToDb(currentUser.uid, updated).catch(console.error);
    }
  };

  const handleLoadSample = (sampleKey: string) => {
    sounds.playPop();
    const sample = SAMPLE_STUDY_MATERIALS[sampleKey];
    if (sample) {
      setActiveMaterial(sample);
      setActiveTab("overview");
      sounds.playSuccess();
      showNotification(`🌿 Tema cargado: "${sample.topic}"`);
    }
  };

  const handleDeleteSavedMaterial = async (materialId: string) => {
    try {
      sounds.playPop();
      if (currentUser) {
        await deleteMaterialFromDb(currentUser.uid, materialId);
      }
      setSavedMaterials((prev) => {
        const next = prev.filter((m) => m.id !== materialId);
        saveLocalMaterials(next);
        return next;
      });
      if (activeMaterial?.id === materialId) {
        setActiveMaterial(null);
      }
      sounds.playSuccess();
      showNotification("🗑️ Tema eliminado correctamente de la base de datos");
    } catch (err) {
      console.error("Error deleting material:", err);
      // Still remove locally to unblock the user
      setSavedMaterials((prev) => {
        const next = prev.filter((m) => m.id !== materialId);
        saveLocalMaterials(next);
        return next;
      });
      showNotification("🗑️ Tema eliminado de tu lista");
    }
  };

  const handleConfirmDeleteActive = async () => {
    if (!activeMaterial) return;
    try {
      setIsDeletingActive(true);
      if (currentUser) {
        await deleteMaterialFromDb(currentUser.uid, activeMaterial.id);
      }
      const targetId = activeMaterial.id;
      setSavedMaterials((prev) => {
        const next = prev.filter((m) => m.id !== targetId);
        saveLocalMaterials(next);
        return next;
      });
      setActiveMaterial(null);
      setIsDeleteModalOpen(false);
      sounds.playSuccess();
      showNotification("🗑️ Tema eliminado correctamente de la base de datos");
    } catch (err) {
      console.error("Error deleting active material:", err);
      showNotification("❌ Error al eliminar el tema");
    } finally {
      setIsDeletingActive(false);
    }
  };

  const handleRewardXp = (
    xp: number,
    isCardMastered?: boolean,
    isQuizAnswered?: boolean,
    isQuizCorrect?: boolean,
    isChatQuestion?: boolean,
    isMatchCompleted?: boolean
  ) => {
    if (!activeMaterial) return;
    const prevLevel = progress.level;
    const updated = addProgressReward(progress, {
      xp,
      topic: activeMaterial.topic,
      isCardMastered,
      isQuizAnswered,
      isQuizCorrect,
      isChatQuestion,
      isMatchCompleted,
    });
    setProgress(updated);
    if (currentUser) {
      syncProgressToDb(currentUser.uid, updated);
    }
    if (updated.level > prevLevel) {
      showNotification(`🎉 ¡SUBISTE AL NIVEL ${updated.level}!`);
    } else {
      showNotification(`⚡ +${xp} XP`);
    }
  };

  const handleUpdateGoal = (newGoal: number) => {
    const updated = { ...progress, dailyGoalItems: newGoal };
    setProgress(updated);
    saveProgress(updated);
    if (currentUser) {
      syncProgressToDb(currentUser.uid, updated);
    }
    showNotification(`🎯 Meta: ${newGoal} retos al día`);
  };

  const handleResetProgress = () => {
    const resetData: UserProgress = {
      streakDays: 1,
      lastStudyDate: new Date().toISOString().split("T")[0],
      totalXp: 0,
      level: 1,
      dailyGoalItems: 10,
      todayCompletedItems: 0,
      todayMinutes: 0,
      cardsMasteredCount: 0,
      quizzesCorrectCount: 0,
      quizzesTotalCount: 0,
      activityHistory: [],
    };
    setProgress(resetData);
    saveProgress(resetData);
    if (currentUser) {
      syncProgressToDb(currentUser.uid, resetData);
    }
    sounds.playPop();
    showNotification("Estadísticas reiniciadas");
  };

  const handleLogout = async () => {
    sounds.playPop();
    await logoutUser();
    showNotification("Sesión cerrada correctamente");
  };

  const resetToNew = () => {
    sounds.playPop();
    setActiveMaterial(null);
    setCurrentView("landing");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {currentView === "landing" ? (
        <LandingPage
          onStart={() => {
            sounds.playPop();
            setCurrentView("workspace");
          }}
          onOpenAuth={() => {
            sounds.playPop();
            setIsAuthModalOpen(true);
          }}
          onOpenOralExam={() => {
            sounds.playPop();
            setIsOralExamModalOpen(true);
          }}
          onOpenStripeCheckout={() => {
            sounds.playPop();
            setIsStripeModalOpen(true);
          }}
          currentUser={currentUser}
          hasActiveDiscount={hasActiveDiscount}
          onOpenLegal={handleOpenLegal}
        />
      ) : (
        <>
          {/* Global Navbar with Auth Status */}
          <Navbar
            progress={progress}
            currentUser={currentUser}
            onOpenProgress={() => {
              sounds.playPop();
              setIsProgressModalOpen(true);
            }}
            onOpenFriends={() => {
              sounds.playPop();
              setIsFriendsModalOpen(true);
            }}
            onOpenOralExam={() => {
              sounds.playPop();
              setIsOralExamModalOpen(true);
            }}
            onResetToNew={resetToNew}
            onOpenAuth={() => {
              sounds.playPop();
              setIsAuthModalOpen(true);
            }}
            onLogout={handleLogout}
            hasActiveTopic={Boolean(activeMaterial)}
          />

          {/* Main Container - Centered, Broad and Spacious */}
          <main className="flex-1 max-w-5xl lg:max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {!activeMaterial ? (
              /* Step 1: Upload View */
          <div className="space-y-8 sm:space-y-10">
            {analysisError && (
              <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/95 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm animate-fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-base text-amber-950">
                      Aviso de disponibilidad temporal
                    </h4>
                    <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed max-w-2xl">
                      {analysisError}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                  {lastAnalysisPayload && (
                    <button
                      onClick={() => handleAnalyze(lastAnalysisPayload)}
                      disabled={isLoading}
                      className="px-4.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                      <span>Reintentar</span>
                    </button>
                  )}
                  <button
                    onClick={() => setAnalysisError(null)}
                    className="px-3 py-2 text-xs sm:text-sm text-amber-800 hover:text-amber-950 font-bold cursor-pointer"
                  >
                    Ocultar
                  </button>
                </div>
              </div>
            )}

            <UploadSection
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              onLoadSample={handleLoadSample}
              savedMaterials={savedMaterials}
              onSelectSavedMaterial={(mat) => {
                setActiveMaterial(mat);
                setActiveTab("overview");
                showNotification(`📚 Tema cargado: "${mat.topic}"`);
              }}
              onDeleteSavedMaterial={handleDeleteSavedMaterial}
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onOpenOralExam={() => {
                sounds.playPop();
                setIsOralExamModalOpen(true);
              }}
            />
          </div>
        ) : (
          /* Step 2: Study Workspace */
          <div className="space-y-8 sm:space-y-10">
            {/* Topic Banner with Quick Reset & Delete */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-6 sm:px-8 py-5 rounded-3xl border border-slate-200/90 shadow-sm gap-4">
              <div className="flex items-center gap-4 truncate">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                  📚
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Tema activo en estudio
                  </span>
                  <span className="font-black text-xl sm:text-2xl text-slate-900 truncate block font-display">
                    {activeMaterial.topic}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
                <button
                  onClick={() => {
                    sounds.playPop();
                    setIsDeleteModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                  title="Eliminar este tema guardado"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Eliminar tema</span>
                </button>

                <button
                  onClick={resetToNew}
                  className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                  title="Estudiar otro tema o subir nuevos apuntes"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  <span>Cambiar de tema</span>
                </button>
              </div>
            </div>

            {/* Centered Large Navigation Tabs with Clear Separation */}
            <div className="flex justify-center">
              <div className="inline-flex p-1.5 bg-slate-200/70 backdrop-blur-xs rounded-2xl border border-slate-300/80 shadow-inner gap-2 flex-wrap justify-center max-w-full">
                <button
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("overview");
                  }}
                  className={`px-4 sm:px-5 py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                      : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Resumen</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("video");
                  }}
                  className={`px-4 sm:px-5 py-3 rounded-xl font-black text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "video"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                      : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
                  }`}
                >
                  <Film className="w-5 h-5 text-amber-400" />
                  <span>Vídeo Animado</span>
                  <span className="text-[10px] font-black uppercase bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md">
                    IA
                  </span>
                </button>

                <button
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("mindmap");
                  }}
                  className={`px-4 sm:px-5 py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "mindmap"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                      : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
                  }`}
                >
                  <Network className="w-5 h-5" />
                  <span>Mapa Mental</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("exercises");
                  }}
                  className={`px-4 sm:px-5 py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "exercises"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                      : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
                  }`}
                >
                  <Dumbbell className="w-5 h-5" />
                  <span>Ejercicios</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playPop();
                    setActiveTab("chat");
                  }}
                  className={`px-4 sm:px-5 py-3 rounded-xl font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "chat"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                      : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
                  }`}
                >
                  <MessageSquareText className="w-5 h-5" />
                  <span>Tutor IA</span>
                </button>
              </div>
            </div>

            {/* Active Content */}
            {activeTab === "overview" && (
              <StudyOverview
                material={activeMaterial}
                onOpenOralExam={() => {
                  sounds.playPop();
                  setIsOralExamModalOpen(true);
                }}
              />
            )}

            {activeTab === "video" && (
              <ExplainerVideoStudio
                material={activeMaterial}
                onUpdateMaterialVideo={(updatedVideo) => {
                  setActiveMaterial((prev) => (prev ? { ...prev, animatedVideo: updatedVideo } : null));
                }}
                onAskTutorAboutScene={(sceneTitle, narration) => {
                  sounds.playPop();
                  setActiveTab("chat");
                  showNotification(`💬 Pregunta sobre "${sceneTitle}" lista para el Tutor`);
                }}
                onRewardXp={(xp) => handleRewardXp(xp, true)}
              />
            )}

            {activeTab === "mindmap" && (
              <MindMapViewer
                mindMap={activeMaterial.mindMap}
                topicTitle={activeMaterial.topic}
                onRewardXp={(xp) => handleRewardXp(xp, true)}
              />
            )}

            {activeTab === "exercises" && (
              <ExerciseArena
                material={activeMaterial}
                onRewardXp={handleRewardXp}
                onUpdateMaterial={handleUpdateMaterial}
              />
            )}

            {activeTab === "chat" && (
              <TutorChat
                material={activeMaterial}
                onRewardXp={(xp) => handleRewardXp(xp, false, false, false, true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Modern Trust & Legal Footer in Workspace */}
      <AppFooter onOpenLegal={handleOpenLegal} />
    </>
  )}

      {/* Floating XP Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-bold border border-slate-700 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Daily Progress Modal */}
      <DailyProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        progress={progress}
        onUpdateGoal={handleUpdateGoal}
        onResetProgress={handleResetProgress}
      />

      {/* Friends & Leaderboard Modal */}
      <FriendsModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => {
          setIsFriendsModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        currentProgress={progress}
      />

      {/* Oral Exam 15% Discount Padlock Modal */}
      <OralExamModal
        isOpen={isOralExamModalOpen}
        onClose={() => setIsOralExamModalOpen(false)}
        activeMaterial={activeMaterial}
        savedMaterials={savedMaterials}
        currentUser={currentUser}
        onOpenAuth={() => {
          setIsOralExamModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onOpenStripeCheckout={() => {
          setIsOralExamModalOpen(false);
          setIsStripeModalOpen(true);
        }}
      />

      {/* Stripe Test Mode Checkout Modal */}
      <StripeTestCheckoutModal
        isOpen={isStripeModalOpen}
        onClose={() => setIsStripeModalOpen(false)}
        discountEarned={hasActiveDiscount}
        onSuccessPayment={() => {
          showNotification("🎉 ¡Plan Estudiante Pro activado con éxito en modo prueba!");
        }}
        currentUser={currentUser}
      />

      {/* Cloud Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(name) => {
          showNotification(`👋 ¡Bienvenido ${name}! Tu cuenta está conectada a la base de datos.`);
        }}
      />

      {/* Delete Topic Confirmation Modal */}
      {isDeleteModalOpen && activeMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scale-up my-auto">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg text-slate-900 font-display">
                  ¿Eliminar tema guardado?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Se eliminará permanentemente <strong>"{activeMaterial.topic}"</strong> de la base de datos y de tu lista de temas. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteActive}
                disabled={isDeletingActive}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-extrabold flex items-center gap-2 transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingActive ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Sí, eliminar tema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Legal Documents Modal (Política de Privacidad y Términos y Condiciones) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialTab={legalModalTab}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
}
