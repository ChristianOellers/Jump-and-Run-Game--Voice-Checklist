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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lang">Speech language</Label>
          <Select value={settings.language} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger id="lang">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={settings.theme}
            onValueChange={(v) => update({ theme: v as ThemeMode })}
          >
            <SelectTrigger id="theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mode">Suggestion source</Label>
          <Select
            value={settings.apiMode}
            onValueChange={(v) => update({ apiMode: v as ApiMode })}
          >
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mock">Mock (offline, keyword match)</SelectItem>
              <SelectItem value="real">Real (Lovable AI)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Mock runs entirely in the browser. Real uses a server function — no secrets in the
            client.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="voice">Voice input</Label>
            <p className="text-xs text-muted-foreground">Use the microphone when available.</p>
          </div>
          <Switch
            id="voice"
            checked={settings.voiceEnabled}
            onCheckedChange={(v) => update({ voiceEnabled: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto">Auto-apply high-confidence</Label>
            <p className="text-xs text-muted-foreground">
              Apply suggestions ≥ threshold without confirmation.
            </p>
          </div>
          <Switch
            id="auto"
            checked={settings.autoApply}
            onCheckedChange={(v) => update({ autoApply: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Auto-apply threshold: {(settings.autoApplyThreshold * 100).toFixed(0)}%
          </Label>
          <Slider
            value={[settings.autoApplyThreshold * 100]}
            min={50}
            max={100}
            step={5}
            onValueChange={([v]) => update({ autoApplyThreshold: v / 100 })}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          All data is stored locally in your browser. Clearing site data will reset the app.
        </div>

        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Storage keys
          </summary>
          <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
            <li>vcl.checklist.v1</li>
            <li>vcl.activity.v1</li>
            <li>vcl.settings.v1</li>
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
