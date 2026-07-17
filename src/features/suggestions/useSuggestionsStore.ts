import { create } from "zustand";
import { uid } from "@/lib/storage";
import type { Suggestion, SuggestionBatch } from "@/features/types";

interface State {
  batch: SuggestionBatch | null;
  setBatch: (input: { transcript: string; suggestions: Suggestion[] }) => void;
  clear: () => void;
}

export const useSuggestionsStore = create<State>((set) => ({
  batch: null,
  setBatch: ({ transcript, suggestions }) =>
    set({
      batch: {
        id: uid(),
        transcript,
        createdAt: new Date().toISOString(),
        suggestions,
      },
    }),
  clear: () => set({ batch: null }),
}));
