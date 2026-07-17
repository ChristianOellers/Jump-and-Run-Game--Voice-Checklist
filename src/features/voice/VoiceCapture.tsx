import { useMemo, useState } from "react";
import { Mic, MicOff, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSettingsStore } from "@/features/settings/useSettingsStore";
import { useChecklistStore } from "@/features/checklist/useChecklistStore";
import { useSuggestionsStore } from "@/features/suggestions/useSuggestionsStore";
import { analyze } from "@/services/llm";
import type { Suggestion } from "@/features/types";

export function VoiceCapture() {
  const settings = useSettingsStore((s) => s.settings);
  const items = useChecklistStore((s) => s.items);
  const setBatch = useSuggestionsStore((s) => s.setBatch);
  const [manual, setManual] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const speech = useSpeechRecognition({
    language: settings.language,
    onFinal: (text) => setManual(text),
  });

  const canUseVoice = settings.voiceEnabled && speech.supported;
  const displayed = useMemo(() => {
    if (speech.listening) return `${speech.transcript} ${speech.interim}`.trim();
    return manual || speech.transcript;
  }, [manual, speech.transcript, speech.interim, speech.listening]);

  const submit = async () => {
    const transcript = (manual || speech.transcript).trim();
    if (!transcript) {
      toast.warning("Type or speak something first.");
      return;
    }
    if (items.length === 0) {
      toast.warning("Add checklist items before analyzing.");
      return;
    }
    setAnalyzing(true);
    try {
      const suggestions = await analyze({
        transcript,
        items,
        language: settings.language,
        mode: settings.apiMode,
      });
      setBatch({ transcript, suggestions });
    } catch (err) {
      const fallback = (err as { fallback?: Suggestion[] }).fallback;
      if (fallback) {
        setBatch({ transcript, suggestions: fallback });
        toast.error("LLM failed. Showing mock suggestions instead.");
      } else {
        toast.error((err as Error).message || "Analysis failed.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-xl font-medium">Voice update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-2">
          {canUseVoice ? (
            <button
              type="button"
              data-mic-button="true"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop recording" : "Start recording"}
              className={cn(
                "relative inline-flex h-20 w-20 items-center justify-center rounded-full border transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                speech.listening
                  ? "mic-pulse border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
              )}
            >
              {speech.listening ? (
                <MicOff className="h-7 w-7 relative" />
              ) : (
                <Mic className="h-7 w-7 relative" />
              )}
            </button>
          ) : (
            <div className="rounded-full border border-dashed border-border px-4 py-3 text-center text-xs text-muted-foreground">
              {!settings.voiceEnabled
                ? "Voice disabled in settings — type below."
                : "Speech unavailable in this browser — type below."}
            </div>
          )}
          <p
            className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
            aria-live="polite"
          >
            {speech.listening ? "Listening…" : canUseVoice ? "Tap to speak" : "Type your update"}
          </p>
        </div>

        {speech.error && (
          <Alert variant="destructive">
            <AlertDescription>{speech.error}</AlertDescription>
          </Alert>
        )}

        <Textarea
          value={displayed}
          onChange={(e) => setManual(e.target.value)}
          placeholder='e.g. "I finished the logo and started on the homepage."'
          rows={3}
          aria-label="Progress transcript"
          className="font-serif italic text-base leading-relaxed"
        />

        <div className="flex justify-end">
          <Button onClick={submit} disabled={analyzing} className="rounded-full">
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Analyze
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
