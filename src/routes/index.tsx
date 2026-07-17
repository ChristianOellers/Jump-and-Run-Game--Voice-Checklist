import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";

import { GameCanvas } from "@/features/game/GameCanvas";
import { HUD } from "@/features/game/HUD";
import { WorldPopover } from "@/features/game/WorldPopover";
import { RewardBridge } from "@/features/game/RewardBridge";
import { useGameStore } from "@/features/game/useGameStore";

import { ChecklistPanel } from "@/features/checklist/ChecklistPanel";
import { VoiceCapture } from "@/features/voice/VoiceCapture";
import { SuggestionsPanel } from "@/features/suggestions/SuggestionsPanel";

import { useChecklistStore } from "@/features/checklist/useChecklistStore";
import { useActivityStore } from "@/features/activity/useActivityStore";
import { useSettingsStore } from "@/features/settings/useSettingsStore";
import { useSuggestionsStore } from "@/features/suggestions/useSuggestionsStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voice Checklist — a tiny world for getting things done" },
      {
        name: "description",
        content:
          "Run and jump through a pixel world. Speak your progress on the left, tick items off on the right, grow a tree in the middle.",
      },
      { property: "og:title", content: "Voice Checklist — a tiny world for getting things done" },
      {
        property: "og:description",
        content: "Run and jump through a pixel world. Speak your progress on the left, tick items off on the right, grow a tree in the middle.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const hydrateChecklist = useChecklistStore((s) => s.hydrate);
  const hydrateActivity = useActivityStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateGame = useGameStore((s) => s.hydrate);
  const activeZone = useGameStore((s) => s.activeZone);
  const dismissedZone = useGameStore((s) => s.dismissedZone);
  const dismissZone = useGameStore((s) => s.dismissZone);
  const hasSuggestions = useSuggestionsStore((s) => !!s.batch);

  useEffect(() => {
    hydrateChecklist();
    hydrateActivity();
    hydrateSettings();
    hydrateGame();
  }, [hydrateChecklist, hydrateActivity, hydrateSettings, hydrateGame]);

  const voiceOpen = activeZone === "voice" && dismissedZone !== "voice";
  const checklistOpen = activeZone === "checklist" && dismissedZone !== "checklist";

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#c9e0ea]">
      <GameCanvas />
      <RewardBridge />
      <HUD />

      <WorldPopover
        open={voiceOpen}
        side="left"
        title="Voice Update"
        onClose={() => dismissZone("voice")}
      >
        <div className="space-y-3">
          <VoiceCapture />
          {hasSuggestions && <SuggestionsPanel />}
        </div>
      </WorldPopover>

      <WorldPopover
        open={checklistOpen}
        side="right"
        title="Checklist"
        onClose={() => dismissZone("checklist")}
      >
        <ChecklistPanel />
      </WorldPopover>

      <Toaster richColors position="top-right" />
    </div>
  );
}
