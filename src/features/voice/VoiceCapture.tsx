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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Voice update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {canUseVoice ? (
            <Button
              type="button"
              variant={speech.listening ? "destructive" : "default"}
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-pressed={speech.listening}
            >
              {speech.listening ? (
                <>
                  <MicOff className="mr-2 h-4 w-4" /> Stop
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" /> Record
                </>
              )}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {!settings.voiceEnabled
                ? "Voice disabled in settings — use the text field below."
                : "Speech recognition unavailable in this browser — type instead."}
            </span>
          )}
          {speech.listening && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive",
              )}
              aria-live="polite"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Listening…
            </span>
          )}
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
        />

        <div className="flex justify-end">
          <Button onClick={submit} disabled={analyzing}>
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
