import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ChecklistPanel } from "@/features/checklist/ChecklistPanel";
import { VoiceCapture } from "@/features/voice/VoiceCapture";
import { SuggestionsPanel } from "@/features/suggestions/SuggestionsPanel";
import { ActivityPanel } from "@/features/activity/ActivityPanel";
import { SettingsPanel } from "@/features/settings/SettingsPanel";

import { useChecklistStore } from "@/features/checklist/useChecklistStore";
import { useActivityStore } from "@/features/activity/useActivityStore";
import { useSettingsStore } from "@/features/settings/useSettingsStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voice Checklist — track progress by speaking" },
      {
        name: "description",
        content:
          "Speak your progress and let AI suggest checklist updates. Review, apply, and undo — all stored locally.",
      },
      { property: "og:title", content: "Voice Checklist" },
      {
        property: "og:description",
        content: "Track progress by speaking. AI suggests checklist updates you confirm.",
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

  useEffect(() => {
    hydrateChecklist();
    hydrateActivity();
    hydrateSettings();
  }, [hydrateChecklist, hydrateActivity, hydrateSettings]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Voice Checklist</h1>
            <p className="text-xs text-muted-foreground">
              Speak progress. Review AI suggestions. Nothing changes without you.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Desktop: two columns */}
        <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <ChecklistPanel />
            <ActivityPanel />
          </div>
          <div className="space-y-6">
            <VoiceCapture />
            <SuggestionsPanel />
            <SettingsPanel />
          </div>
        </div>

        {/* Mobile / tablet: tabs */}
        <div className="lg:hidden">
          <Tabs defaultValue="checklist">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="checklist">List</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="activity">Log</TabsTrigger>
              <TabsTrigger value="settings">More</TabsTrigger>
            </TabsList>
            <TabsContent value="checklist" className="mt-4">
              <ChecklistPanel />
            </TabsContent>
            <TabsContent value="voice" className="mt-4 space-y-4">
              <VoiceCapture />
              <SuggestionsPanel />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <ActivityPanel />
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <SettingsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
