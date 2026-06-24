/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MatnVerse {
  id: number;
  s1: string; // First half of verse
  s2: string; // Second half of verse
  chapter?: string; // Optional chapter name
}

export interface MatnInfo {
  name: string;
  author: string;
  era?: string;
  summary: string;
  benefits: string[];
  chapters: string[];
  sampleVerses: MatnVerse[];
}

export interface ExplanationResult {
  verseText: string;
  meaning: string;
  grammarAnalysis: string; // إعراب
  tajweedRules: string[];
  educationalTip: string;
  vocabularyExplanation?: string; // شرح مفردات البيت
  overallMeaning?: string; // المعنى الإجمالي
  scientificBenefits?: string[]; // الفوائد العلمية
  practicalExamples?: string[]; // الأمثلة التطبيقية
}

export interface QuizQuestion {
  id: number;
  type: "multiple-choice" | "true-false" | "fill-in-blank" | "explanation";
  questionText: string;
  options?: string[]; // For MCQ
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  correctionFeedback?: string; // Explain why
}

export interface QuizReport {
  score: number;
  totalQuestions: number;
  gradedQuestions: QuizQuestion[];
  overallFeedback: string;
  recommendedReviewPlan: string;
}

export interface RecitationError {
  type:
    | "omission"
    | "addition"
    | "substitution"
    | "wrong_spelling"
    | "tajweed_or_diacritics";
  wordInUserText: string;
  wordInCorrectText: string;
  description: string;
}

export interface RecitationCorrection {
  detectedMatn: string;
  identifiedVerse: string;
  isCorrect: boolean;
  score: number;
  errors: RecitationError[];
  correctText: string;
  feedback: string;
}

export interface LearningSession {
  id: string;
  matnName: string;
  type: "recitation" | "quiz" | "chat";
  date: string;
  score: number;
}

export interface PerformanceStats {
  totalRecitations: number;
  averageMastery: number; // 0 - 100
  commonErrors: Array<{ word: string; count: number; errorType: string }>;
  hifzLevel: "مبتدئ" | "متوسط" | "متقن" | "حافظ مجاز";
  totalQuizzes: number;
  quizSuccessRate: number; // percentage
  weeklyProgress: Array<{ week: string; count: number }>;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  explanation?: ExplanationResult;
}
