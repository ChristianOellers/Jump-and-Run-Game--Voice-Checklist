import { create } from "zustand";
import { storage, uid } from "@/lib/storage";
import type { ActivityEntry } from "@/features/types";

const KEY = "vcl.activity.v1";
const MAX = 100;

interface State {
  entries: ActivityEntry[];
  hydrated: boolean;
  hydrate: () => void;
  add: (entry: Omit<ActivityEntry, "id" | "timestamp">) => ActivityEntry;
  clear: () => void;
}

export const useActivityStore = create<State>((set, get) => ({
  entries: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ entries: storage.get<ActivityEntry[]>(KEY, []), hydrated: true });
  },
  add: (entry) => {
    const full: ActivityEntry = { ...entry, id: uid(), timestamp: new Date().toISOString() };
    const entries = [full, ...get().entries].slice(0, MAX);
    storage.set(KEY, entries);
    set({ entries });
    return full;
  },
  clear: () => {
    storage.set(KEY, []);
    set({ entries: [] });
  },
}));
