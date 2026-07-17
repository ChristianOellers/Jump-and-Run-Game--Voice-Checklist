import { create } from "zustand";
import { storage } from "@/lib/storage";
import type { Settings } from "@/features/types";

const KEY = "vcl.settings.v1";
const defaults: Settings = {
  language: "en-US",
  theme: "system",
  autoApply: false,
  autoApplyThreshold: 0.8,
  apiMode: "mock",
  voiceEnabled: true,
};

interface State {
  settings: Settings;
  hydrated: boolean;
  hydrate: () => void;
  update: (patch: Partial<Settings>) => void;
}

export const useSettingsStore = create<State>((set, get) => ({
  settings: defaults,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ settings: { ...defaults, ...storage.get<Partial<Settings>>(KEY, {}) }, hydrated: true });
  },
  update: (patch) => {
    const settings = { ...get().settings, ...patch };
    storage.set(KEY, settings);
    set({ settings });
  },
}));
