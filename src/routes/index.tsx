import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

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
      { title: "Voice Checklist — talk it through, tick it off" },
      {
        name: "description",
        content:
          "Speak your progress and let AI suggest checklist updates. Review, apply, and undo — all stored locally.",
      },
      { property: "og:title", content: "Voice Checklist" },
      {
        property: "og:description",
        content: "Talk it through, tick it off. A warm, human progress tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function scrollToVoice() {
  const el = document.getElementById("voice-capture");
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const btn = el.querySelector<HTMLButtonElement>('[data-mic-button="true"]');
  btn?.focus();
}

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Voice Checklist
          </p>
          <h1 className="font-serif mt-4 text-4xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Talk it through.
            <br />
            <span className="italic text-primary">Tick it off.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Say what you got done. We&apos;ll suggest which items to check —
            you decide what actually changes. Everything stays on your device.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={scrollToVoice} className="rounded-full px-6">
              Start speaking
            </Button>
            <a
              href="#how"
              className="text-sm font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        {/* Desktop */}
        <div className="hidden gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-8" id="voice-capture">
            <SectionHeader eyebrow="01 — Speak" title="Your progress, in your words." />
            <VoiceCapture />
            <SuggestionsPanel />
          </div>
          <div className="space-y-8">
            <SectionHeader eyebrow="02 — List" title="The things you&rsquo;re getting done." />
            <ChecklistPanel />
          </div>
        </div>

        {/* Mobile / tablet */}
        <div className="lg:hidden">
          <Tabs defaultValue="speak">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="speak">Speak</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="setup">Setup</TabsTrigger>
            </TabsList>
            <TabsContent value="speak" className="mt-6 space-y-4" id="voice-capture">
              <VoiceCapture />
              <SuggestionsPanel />
            </TabsContent>
            <TabsContent value="list" className="mt-6">
              <ChecklistPanel />
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              <ActivityPanel />
            </TabsContent>
            <TabsContent value="setup" className="mt-6">
              <SettingsPanel />
            </TabsContent>
          </Tabs>
        </div>

        {/* Secondary strip — desktop only */}
        <div id="how" className="mt-20 hidden grid-cols-2 gap-10 lg:grid">
          <div className="space-y-8">
            <SectionHeader eyebrow="03 — Log" title="What&rsquo;s changed lately." />
            <ActivityPanel />
          </div>
          <div className="space-y-8">
            <SectionHeader eyebrow="04 — Setup" title="Tune it to your rhythm." />
            <SettingsPanel />
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground">
          <span>Local-first. Nothing leaves your browser unless you enable real AI.</span>
          <span className="font-serif italic">Made with care.</span>
        </div>
      </footer>

      <Toaster richColors position="top-right" />
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2
        className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl"
        dangerouslySetInnerHTML={{ __html: title }}
      />
    </div>
  );
}
