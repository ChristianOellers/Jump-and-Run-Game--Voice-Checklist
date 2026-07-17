export type ItemSource = "user" | "llm";

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  doneAt?: string;
  confidence?: number;
  source: ItemSource;
  order: number;
}

export type SuggestionStatus = "completed" | "partial" | "not_mentioned";

export interface Suggestion {
  itemId: string;
  itemTitle: string;
  status: SuggestionStatus;
  confidence: number;
  reasoning: string;
}

export interface SuggestionBatch {
  id: string;
  transcript: string;
  createdAt: string;
  suggestions: Suggestion[];
}

export type ActivityKind = "apply" | "undo" | "manual";

export interface ActivityEntry {
  id: string;
  timestamp: string;
  transcript?: string;
  suggestions?: Suggestion[];
  appliedActions: string[];
  snapshotBefore: ChecklistItem[];
  kind: ActivityKind;
}

export type ApiMode = "mock" | "real";
export type ThemeMode = "light" | "dark" | "system";

export interface Settings {
  language: string;
  theme: ThemeMode;
  autoApply: boolean;
  autoApplyThreshold: number;
  apiMode: ApiMode;
  voiceEnabled: boolean;
}
