import { create } from "zustand";
import { storage } from "@/lib/storage";

const KEY = "vcl.game.v1";

export type ZoneId = "voice" | "checklist" | "shrine" | null;

interface Persisted {
  steps: number;
  words: number;
  ticks: number;
  seeds: number;
  treeGrowth: number;
  levelSeed: number;
}

interface State extends Persisted {
  hydrated: boolean;
  activeZone: ZoneId;
  dismissedZone: ZoneId;
  hydrate: () => void;
  addSteps: (n: number) => void;
  addWords: (n: number) => void;
  addTicks: (n: number) => void;
  spendSeeds: (n: number) => void;
  growTree: (n: number) => void;
  setActiveZone: (z: ZoneId) => void;
  dismissZone: (z: ZoneId) => void;
  openZone: (z: ZoneId) => void;
  regenLevel: () => void;
}

const DEFAULTS: Persisted = {
  steps: 0,
  words: 0,
  ticks: 0,
  seeds: 0,
  treeGrowth: 0,
  levelSeed: Math.floor(Math.random() * 2 ** 31),
};

const persist = (s: Persisted) => storage.set(KEY, s);

export const useGameStore = create<State>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  activeZone: null,
  hydrate: () => {
    if (get().hydrated) return;
    const saved = storage.get<Persisted | null>(KEY, null);
    const initial = saved ?? DEFAULTS;
    if (!saved) persist(initial);
    set({ ...initial, hydrated: true });
  },
  addSteps: (n) => {
    const steps = get().steps + n;
    const seeds = get().seeds + n;
    const next = { ...pick(get()), steps, seeds };
    persist(next);
    set({ steps, seeds });
  },
  addWords: (n) => {
    const words = get().words + n;
    const seeds = get().seeds + n * 2;
    const next = { ...pick(get()), words, seeds };
    persist(next);
    set({ words, seeds });
  },
  addTicks: (n) => {
    const ticks = get().ticks + n;
    const seeds = get().seeds + n * 5;
    const next = { ...pick(get()), ticks, seeds };
    persist(next);
    set({ ticks, seeds });
  },
  spendSeeds: (n) => {
    const seeds = Math.max(0, get().seeds - n);
    const next = { ...pick(get()), seeds };
    persist(next);
    set({ seeds });
  },
  growTree: (n) => {
    const treeGrowth = get().treeGrowth + n;
    const next = { ...pick(get()), treeGrowth };
    persist(next);
    set({ treeGrowth });
  },
  setActiveZone: (z) => {
    if (get().activeZone === z) return;
    set({ activeZone: z });
  },
  regenLevel: () => {
    const levelSeed = Math.floor(Math.random() * 2 ** 31);
    const next = { ...pick(get()), levelSeed };
    persist(next);
    set({ levelSeed });
  },
}));

function pick(s: State): Persisted {
  return {
    steps: s.steps,
    words: s.words,
    ticks: s.ticks,
    seeds: s.seeds,
    treeGrowth: s.treeGrowth,
    levelSeed: s.levelSeed,
  };
}

// Non-reactive channel for floating +N pops rendered by the HUD overlay canvas.
export type FloatingPop = {
  id: number;
  text: string;
  x: number; // screen px
  y: number; // screen px
  born: number;
  color: string;
};

const popListeners = new Set<(pop: FloatingPop) => void>();
let popId = 0;
export function emitPop(text: string, x: number, y: number, color = "#c05a3a") {
  const pop: FloatingPop = { id: ++popId, text, x, y, born: performance.now(), color };
  popListeners.forEach((l) => l(pop));
}
export function onPop(cb: (pop: FloatingPop) => void) {
  popListeners.add(cb);
  return () => popListeners.delete(cb);
}

// Non-reactive channel for player screen position (used by pop emitters outside the loop).
export const playerScreen = { x: 0, y: 0 };
