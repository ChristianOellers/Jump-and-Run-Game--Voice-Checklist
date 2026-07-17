import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useSettingsStore } from "./useSettingsStore";
import type { ApiMode, ThemeMode } from "@/features/types";

const LANGS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "pt-BR", label: "Portuguese (BR)" },
  { value: "it-IT", label: "Italian" },
  { value: "ja-JP", label: "Japanese" },
];

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const hydrated = useSettingsStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) applyTheme(settings.theme);
  }, [settings.theme, hydrated]);

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-xl font-medium">Settings</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border/60">
        <Row label="Speech language" htmlFor="lang">
          <Select value={settings.language} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger id="lang" className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        <Row label="Theme" htmlFor="theme">
          <Select
            value={settings.theme}
            onValueChange={(v) => update({ theme: v as ThemeMode })}
          >
            <SelectTrigger id="theme" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row
          label="Suggestion source"
          hint="Mock runs offline. Real uses a server function — no secrets in the client."
          htmlFor="mode"
        >
          <Select
            value={settings.apiMode}
            onValueChange={(v) => update({ apiMode: v as ApiMode })}
          >
            <SelectTrigger id="mode" className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mock">Mock (offline)</SelectItem>
              <SelectItem value="real">Real (Lovable AI)</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="Voice input" hint="Use the microphone when available." htmlFor="voice">
          <Switch
            id="voice"
            checked={settings.voiceEnabled}
            onCheckedChange={(v) => update({ voiceEnabled: v })}
          />
        </Row>

        <Row
          label="Auto-apply high-confidence"
          hint="Apply suggestions at or above the threshold without asking."
          htmlFor="auto"
        >
          <Switch
            id="auto"
            checked={settings.autoApply}
            onCheckedChange={(v) => update({ autoApply: v })}
          />
        </Row>

        <div className="space-y-2 py-4">
          <div className="flex items-center justify-between">
            <Label>Auto-apply threshold</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {(settings.autoApplyThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[settings.autoApplyThreshold * 100]}
            min={50}
            max={100}
            step={5}
            onValueChange={([v]) => update({ autoApplyThreshold: v / 100 })}
          />
        </div>

        <p className="pt-4 text-xs text-muted-foreground">
          Everything lives in your browser. Clearing site data resets the app.
        </p>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
