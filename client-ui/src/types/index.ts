export type PoseBuffer = {
  frames: number[][][];
  fps: number;
  sourceUrl?: string;
};

export type DictionaryItem = {
  wordId: number;
  englishText: string;
  normalizedText?: string;
  entryType?: string | null;
  spokenLang?: string;
  signedLang?: string;
  cacheSource?: string | null;
  fswCode?: string;
  poseFilePath?: string;
  isVerified?: boolean;
  verifiedByUserId?: number | null;
};

export type HistoryItem = {
  historyId: number;
  wordId?: number | null;
  inputText?: string;
  fswResult?: string;
  poseFilePath?: string;
  processingTimeMs?: number;
  createdAt?: string;
};

export type FeedbackItem = {
  feedbackId: number;
  historyId?: number | null;
  rating?: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfile = {
  userId: number;
  username: string;
  email?: string;
  roles?: string[] | string;
  createdAt?: string;
  emailVerified?: boolean;
};

export type TabType = "translate" | "dictionary" | "history" | "feedback" | "account";
export type FeedbackSortType = "latest" | "oldest" | "rating_high" | "rating_low";
export type InputModeType = "text" | "upload" | "record";
export type LangType = "en" | "vi";

export type FeedbackFormData = {
  historyId: string;
  rating: string;
  comment: string;
};
