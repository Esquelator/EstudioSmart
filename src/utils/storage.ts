import { UserProgress, DailyActivityLog, StudyMaterial, DailyQuest, AchievementBadge } from "../types";

const STORAGE_KEY = "estudiosmart_user_progress_v2";
const MATERIALS_STORAGE_KEY = "estudiosmart_saved_materials_v2";

export function getLocalSavedMaterials(): StudyMaterial[] {
  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error reading local materials:", e);
    return [];
  }
}

export function saveLocalMaterials(materials: StudyMaterial[]): void {
  try {
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
  } catch (e) {
    console.error("Failed to save local materials:", e);
  }
}

export function removeLocalMaterial(materialId: string): StudyMaterial[] {
  try {
    const current = getLocalSavedMaterials();
    const filtered = current.filter((m) => m.id !== materialId);
    saveLocalMaterials(filtered);
    return filtered;
  } catch (e) {
    console.error("Failed to remove local material:", e);
    return [];
  }
}

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

// Progressive Level Thresholds (Balanced: slightly slower and requires sustained study)
export const LEVEL_TIERS = [
  { level: 1, title: "Novato", minXp: 0, maxXp: 250 },
  { level: 2, title: "Aprendiz Curioso", minXp: 250, maxXp: 650 },
  { level: 3, title: "Estudiante Constante", minXp: 650, maxXp: 1200 },
  { level: 4, title: "Investigador", minXp: 1200, maxXp: 2000 },
  { level: 5, title: "Analista de Élite", minXp: 2000, maxXp: 3100 },
  { level: 6, title: "Maestro del Temario", minXp: 3100, maxXp: 4500 },
  { level: 7, title: "Eminencia Académica", minXp: 4500, maxXp: 8000 },
];

export function calculateLevelInfo(totalXp: number) {
  let currentTier = LEVEL_TIERS[0];
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      currentTier = LEVEL_TIERS[i];
      break;
    }
  }

  const range = Math.max(1, currentTier.maxXp - currentTier.minXp);
  const currentLevelXp = Math.max(0, totalXp - currentTier.minXp);
  const progressPercent = Math.min(100, Math.round((currentLevelXp / range) * 100));
  const xpToNext = Math.max(0, currentTier.maxXp - totalXp);

  return {
    level: currentTier.level,
    title: currentTier.title,
    minXp: currentTier.minXp,
    maxXp: currentTier.maxXp,
    currentLevelXp,
    progressPercent,
    xpToNext,
  };
}

export function getDailyQuests(progress: UserProgress): DailyQuest[] {
  return [
    {
      id: "quest_quiz",
      title: "Puntería en el Quiz",
      description: "Acierta 3 preguntas tipo test de tu temario",
      targetCount: 3,
      currentCount: Math.min(3, progress.quizzesCorrectCount || 0),
      xpReward: 25,
      completed: (progress.quizzesCorrectCount || 0) >= 3,
      category: "quiz",
      icon: "🎯",
    },
    {
      id: "quest_cards",
      title: "Memoria Activa",
      description: "Domina 5 tarjetas de repaso (flashcards)",
      targetCount: 5,
      currentCount: Math.min(5, progress.cardsMasteredCount || 0),
      xpReward: 20,
      completed: (progress.cardsMasteredCount || 0) >= 5,
      category: "flashcards",
      icon: "🧠",
    },
    {
      id: "quest_chat",
      title: "Diálogo con el Tutor",
      description: "Haz 2 preguntas o aclara dudas en el chat",
      targetCount: 2,
      currentCount: Math.min(2, progress.chatQuestionsCount || 0),
      xpReward: 15,
      completed: (progress.chatQuestionsCount || 0) >= 2,
      category: "chat",
      icon: "💬",
    },
    {
      id: "quest_match",
      title: "Conexión de Conceptos",
      description: "Completa 1 reto de emparejar definiciones",
      targetCount: 1,
      currentCount: Math.min(1, progress.matchCompletedCount || 0),
      xpReward: 20,
      completed: (progress.matchCompletedCount || 0) >= 1,
      category: "match",
      icon: "⚡",
    },
    {
      id: "quest_streak",
      title: "Hábito Imparable",
      description: "Alcanza una racha de al menos 2 días de estudio",
      targetCount: 2,
      currentCount: Math.min(2, progress.streakDays || 1),
      xpReward: 35,
      completed: (progress.streakDays || 1) >= 2,
      category: "streak",
      icon: "🔥",
    },
  ];
}

export function getAchievementBadges(progress: UserProgress): AchievementBadge[] {
  return [
    {
      id: "badge_first_step",
      title: "Primer Paso",
      description: "Inicia tu camino de estudio acumulando tus primeros 50 XP",
      unlocked: progress.totalXp >= 50,
      icon: "🛡️",
      category: "exploration",
    },
    {
      id: "badge_sharp_mind",
      title: "Cerebro Afilado",
      description: "Acierta 10 preguntas tipo test en total",
      unlocked: (progress.quizzesCorrectCount || 0) >= 10,
      icon: "🎓",
      category: "accuracy",
    },
    {
      id: "badge_flash_master",
      title: "Maestro de Tarjetas",
      description: "Domina 12 tarjetas de memoria en total",
      unlocked: (progress.cardsMasteredCount || 0) >= 12,
      icon: "🧠",
      category: "mastery",
    },
    {
      id: "badge_connect_expert",
      title: "Conector de Ideas",
      description: "Completa 2 partidas de emparejar conceptos",
      unlocked: (progress.matchCompletedCount || 0) >= 2,
      icon: "⚡",
      category: "mastery",
    },
    {
      id: "badge_streak_3",
      title: "Constancia de Hierro",
      description: "Mantén una racha de 3 días consecutivos de estudio",
      unlocked: (progress.streakDays || 0) >= 3,
      icon: "🔥",
      category: "streak",
    },
    {
      id: "badge_scholar",
      title: "Investigador Avanzado",
      description: "Alcanza el Nivel 4 (Investigador)",
      unlocked: progress.level >= 4,
      icon: "👑",
      category: "exploration",
    },
  ];
}

export function getInitialProgress(): UserProgress {
  const today = getTodayString();
  const defaultData: UserProgress = {
    streakDays: 1,
    lastStudyDate: today,
    totalXp: 25,
    level: 1,
    dailyGoalItems: 5,
    todayCompletedItems: 0,
    todayMinutes: 5,
    cardsMasteredCount: 0,
    quizzesCorrectCount: 0,
    quizzesTotalCount: 0,
    chatQuestionsCount: 0,
    matchCompletedCount: 0,
    activityHistory: [
      {
        date: today,
        topic: "Bienvenida a EstudioSmart",
        xpEarned: 25,
        itemsCompleted: 1,
        timeSpentMinutes: 5,
      },
    ],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return defaultData;
    }
    const parsed = JSON.parse(raw) as UserProgress;

    // Check streak logic based on date
    const lastDate = parsed.lastStudyDate || today;
    if (lastDate !== today) {
      const last = new Date(lastDate);
      const now = new Date(today);
      const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        parsed.streakDays += 1;
      } else if (diffDays > 1) {
        parsed.streakDays = 1;
      }
      parsed.lastStudyDate = today;
      parsed.todayCompletedItems = 0;
      parsed.todayMinutes = 0;
      saveProgress(parsed);
    }

    // Ensure level matches new progressive formula
    parsed.level = calculateLevelInfo(parsed.totalXp).level;
    return parsed;
  } catch (_) {
    return defaultData;
  }
}

export function saveProgress(progress: UserProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save progress:", e);
  }
}

export function addProgressReward(
  current: UserProgress,
  options: {
    xp: number;
    topic: string;
    isCardMastered?: boolean;
    isQuizAnswered?: boolean;
    isQuizCorrect?: boolean;
    isChatQuestion?: boolean;
    isMatchCompleted?: boolean;
  }
): UserProgress {
  const today = getTodayString();
  const updated = { ...current };

  updated.totalXp += options.xp;
  updated.level = calculateLevelInfo(updated.totalXp).level;
  updated.todayCompletedItems += 1;
  updated.todayMinutes = Math.min(240, (updated.todayMinutes || 0) + 2);

  if (options.isCardMastered) {
    updated.cardsMasteredCount = (updated.cardsMasteredCount || 0) + 1;
  }
  if (options.isQuizAnswered) {
    updated.quizzesTotalCount = (updated.quizzesTotalCount || 0) + 1;
    if (options.isQuizCorrect) {
      updated.quizzesCorrectCount = (updated.quizzesCorrectCount || 0) + 1;
    }
  }
  if (options.isChatQuestion) {
    updated.chatQuestionsCount = (updated.chatQuestionsCount || 0) + 1;
  }
  if (options.isMatchCompleted) {
    updated.matchCompletedCount = (updated.matchCompletedCount || 0) + 1;
  }

  // Update activity history
  const existingTodayLog = updated.activityHistory.find((log) => log.date === today && log.topic === options.topic);
  if (existingTodayLog) {
    existingTodayLog.xpEarned += options.xp;
    existingTodayLog.itemsCompleted += 1;
    existingTodayLog.timeSpentMinutes += 2;
  } else {
    updated.activityHistory.unshift({
      date: today,
      topic: options.topic,
      xpEarned: options.xp,
      itemsCompleted: 1,
      timeSpentMinutes: 2,
    });
  }

  if (updated.activityHistory.length > 30) {
    updated.activityHistory = updated.activityHistory.slice(0, 30);
  }

  saveProgress(updated);
  return updated;
}
