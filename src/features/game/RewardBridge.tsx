import { useEffect, useRef } from "react";
import { useChecklistStore } from "@/features/checklist/useChecklistStore";
import { useSuggestionsStore } from "@/features/suggestions/useSuggestionsStore";
import { useGameStore, emitPop, playerScreen } from "./useGameStore";

/**
 * Subscribes to feature stores and emits reward pops + counter updates.
 * Purely additive — never mutates the source stores.
 */
export function RewardBridge() {
  const prevDone = useRef<Set<string>>(new Set());
  const prevBatchId = useRef<string | null>(null);

  useEffect(() => {
    // seed prevDone with current state so we don't fire on hydrate
    const s = useChecklistStore.getState();
    prevDone.current = new Set(s.items.filter((i) => i.done).map((i) => i.id));

    const unsub = useChecklistStore.subscribe((state) => {
      const nowDone = new Set(state.items.filter((i) => i.done).map((i) => i.id));
      let newlyDone = 0;
      for (const id of nowDone) if (!prevDone.current.has(id)) newlyDone++;
      if (newlyDone > 0) {
        useGameStore.getState().addTicks(newlyDone);
        emitPop(`+${newlyDone} ✓`, playerScreen.x, playerScreen.y - 40, "#4d8f5a");
      }
      prevDone.current = nowDone;
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = useSuggestionsStore.subscribe((state) => {
      const b = state.batch;
      if (!b || b.id === prevBatchId.current) return;
      prevBatchId.current = b.id;
      const words = b.transcript.trim().split(/\s+/).filter(Boolean).length;
      if (words > 0) {
        useGameStore.getState().addWords(words);
        emitPop(`+${words} words`, playerScreen.x, playerScreen.y - 60, "#3b6b8a");
      }
    });
    return unsub;
  }, []);

  return null;
}
