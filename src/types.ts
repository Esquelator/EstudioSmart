export interface StudyFile {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'text' | 'doc';
  size: number;
  previewUrl?: string;
  base64?: string;
  mimeType: string;
}

export interface AnalogyItem {
  passion: string;
  concept: string;
  analogy: string;
  takeaway: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  analogyHint?: string;
}

export type QuestionDifficulty = 'facil' | 'medio' | 'dificil';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  analogyExplanation: string;
  difficulty?: QuestionDifficulty;
}

export interface TrueFalseQuestion {
  id: string;
  statement: string;
  isTrue: boolean;
  explanation: string;
  difficulty?: QuestionDifficulty;
}

export interface MatchPair {
  id: string;
  term: string;
  definition: string;
}

export interface FillBlankQuestion {
  id: string;
  sentenceWithBlank: string; // contains '____'
  answer: string;
  options: string[];
  hint: string;
}

export interface TermDefinition {
  term: string;
  formalDefinition: string;
  simpleExplanation: string;
  category?: string;
  example?: string;
}

export interface SectionBreakdownPoint {
  pointTitle: string;
  explanation: string;
  keyRule?: string;
}

export interface StudySection {
  id: string;
  title: string;
  content: string;
  keyConcepts: string[];
  detailedBreakdown?: SectionBreakdownPoint[];
}

export interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  emoji?: string;
  color?: string;
  category?: string;
  keyPoints?: string[];
  analogy?: string;
  example?: string;
  examTip?: string;
  quickQuestion?: {
    question: string;
    answer: string;
    options?: string[];
  };
  children?: MindMapNode[];
}

export type VideoVisualType = "intro" | "whiteboard" | "diagram" | "formula" | "analogy" | "summary";

export interface VideoSceneElement {
  id: string;
  type: "heading" | "text" | "bullet" | "formula_box" | "flow_step" | "badge" | "callout" | "analogy_card" | "svg_icon";
  content: string;
  highlight?: string;
  icon?: string;
  timingPercent: number; // 0-100% within the scene duration
  animation: "fade_in" | "slide_up" | "pop" | "draw_border" | "typewriter" | "bounce" | "glow";
}

export interface VideoDiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  color?: string;
}

export interface VideoDiagramArrow {
  from: string;
  to: string;
  label?: string;
}

export interface AnimatedVideoScene {
  id: string;
  sceneNumber: number;
  title: string;
  subtitle?: string;
  durationSeconds: number; // e.g. 10 - 20s
  narration: string; // Voiceover script in clear Spanish
  sceneType: VideoVisualType;
  themeColor: string; // Hex color e.g. #4f46e5
  badgeEmoji: string;
  elements: VideoSceneElement[];
  visualDiagram?: {
    type: "flow" | "comparison" | "cycle" | "stats" | "equation" | "orbit" | "circuit" | "mechanics" | "reactor";
    nodes: VideoDiagramNode[];
    arrows?: VideoDiagramArrow[];
  };
  keyTakeaway: string;
}

export interface AnimatedVideo {
  id: string;
  topic: string;
  title: string;
  description: string;
  totalDurationSeconds: number;
  scenes: AnimatedVideoScene[];
  style?: "whiteboard" | "masterclass" | "exam_prep" | "analogy_mode";
  createdAt: string;
}

export type StudyDepth = "resumido" | "normal" | "profundo";

export interface StudyMaterial {
  id: string;
  topic: string;
  formalDefinition?: string;
  passionExplanation?: string;
  quickTakeaways?: string[];
  overview: string;
  studyDepth?: StudyDepth;
  customInstructions?: string;
  glossary?: TermDefinition[];
  sections?: StudySection[];
  mindMap?: MindMapNode;
  animatedVideo?: AnimatedVideo;
  selectedPassions: string[];
  keyPoints: string[];
  analogies: AnalogyItem[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  trueFalseQuestions: TrueFalseQuestion[];
  matchPairs: MatchPair[];
  fillBlanks: FillBlankQuestion[];
  createdAt: string;
}

export interface DailyActivityLog {
  date: string; // YYYY-MM-DD
  topic: string;
  xpEarned: number;
  itemsCompleted: number;
  timeSpentMinutes: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  xpReward: number;
  completed: boolean;
  category: 'quiz' | 'flashcards' | 'chat' | 'match' | 'streak';
  icon: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
  unlockedAt?: string;
  category: 'mastery' | 'streak' | 'accuracy' | 'exploration';
}

export interface UserProgress {
  streakDays: number;
  lastStudyDate: string;
  totalXp: number;
  level: number;
  dailyGoalItems: number;
  todayCompletedItems: number;
  todayMinutes: number;
  cardsMasteredCount: number;
  quizzesCorrectCount: number;
  quizzesTotalCount: number;
  chatQuestionsCount?: number;
  matchCompletedCount?: number;
  unlockedBadgeIds?: string[];
  activityHistory: DailyActivityLog[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SubscriptionInfo {
  isActive: boolean;
  planId: string;
  planName: string;
  basePriceEur: number;
  discountPercentage: number;
  finalPriceEur: number;
  renewsAt: string; // ISO date string
  daysUntilRenewal: number;
  canTakeOralExam: boolean; // True exactly 1 day before renewal
  examAttemptUsed: boolean;
  attemptsCount?: number;
  maxAttempts?: number;
  discountEarned: boolean;
  discountCode?: string;
}

export interface OralExamEvaluation {
  passed: boolean;
  score: number; // 0 to 100
  aiDetected: boolean;
  readVerbatim: boolean;
  verdictTitle: string;
  detailedFeedback: string;
  structureFidelityScore: number;
  spontaneityScore: number;
  discountCode?: string;
  transcription?: string;
  retryable?: boolean;
  attemptConsumed?: boolean;
  canRetrySecondChance?: boolean;
  currentAttempt?: number;
  maxAttempts?: number;
}
