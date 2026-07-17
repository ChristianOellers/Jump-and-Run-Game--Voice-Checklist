import { create } from "zustand";
import { storage, uid } from "@/lib/storage";
import type { ChecklistItem, ItemSource } from "@/features/types";

const KEY = "vcl.checklist.v1";
const seed = (): ChecklistItem[] => [
  { id: uid(), title: "Design the logo", description: "Draft, refine, export SVG", done: false, source: "user", order: 0 },
  { id: uid(), title: "Set up the homepage", description: "Hero, features, footer", done: false, source: "user", order: 1 },
  { id: uid(), title: "Write copy for About page", done: false, source: "user", order: 2 },
  { id: uid(), title: "Configure deployment", done: false, source: "user", order: 3 },
];

interface State {
  items: ChecklistItem[];
  hydrated: boolean;
  hydrate: () => void;
  add: (title: string, description?: string, source?: ItemSource) => ChecklistItem;
  update: (id: string, patch: Partial<Omit<ChecklistItem, "id">>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  reorder: (fromId: string, toId: string) => void;
  replaceAll: (items: ChecklistItem[]) => void;
  snapshot: () => ChecklistItem[];
}

const persist = (items: ChecklistItem[]) => storage.set(KEY, items);

export const useChecklistStore = create<State>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const items = storage.get<ChecklistItem[] | null>(KEY, null);
    const initial = items && items.length >= 0 ? items : seed();
    if (!items) persist(initial);
    set({ items: initial, hydrated: true });
  },
  add: (title, description, source = "user") => {
    const item: ChecklistItem = {
      id: uid(),
      title: title.trim(),
      description: description?.trim() || undefined,
      done: false,
      source,
      order: get().items.length,
    };
    const items = [...get().items, item];
    persist(items);
    set({ items });
    return item;
  },
  update: (id, patch) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    persist(items);
    set({ items });
  },
  remove: (id) => {
    const items = get().items.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx }));
    persist(items);
    set({ items });
  },
  toggle: (id) => {
    const items = get().items.map((i) =>
      i.id === id
        ? { ...i, done: !i.done, doneAt: !i.done ? new Date().toISOString() : undefined }
        : i,
    );
    persist(items);
    set({ items });
  },
  reorder: (fromId, toId) => {
    const list = [...get().items].sort((a, b) => a.order - b.order);
    const from = list.findIndex((i) => i.id === fromId);
    const to = list.findIndex((i) => i.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const items = list.map((i, idx) => ({ ...i, order: idx }));
    persist(items);
    set({ items });
  },
  replaceAll: (items) => {
    const next = items.map((i, idx) => ({ ...i, order: idx }));
    persist(next);
    set({ items: next });
  },
  snapshot: () => get().items.map((i) => ({ ...i })),
}));
