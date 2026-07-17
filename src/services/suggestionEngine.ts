import type { ChecklistItem, Suggestion, SuggestionStatus } from "@/features/types";

const STOP = new Set([
  "the","a","an","and","or","to","of","in","on","for","with","is","was","i","we","my","our","have","has","had",
  "did","do","done","finished","completed","started","working","today","just","up","set","setup","made","make",
  "created","built","added","fixed","also","then","now","it","this","that",
]);

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

const COMPLETE_HINTS = /\b(finished|completed|done|shipped|wrapped up|nailed|closed out)\b/i;
const PARTIAL_HINTS = /\b(started|working on|progress|halfway|almost|nearly|partially|in progress)\b/i;

export function mockAnalyze(transcript: string, items: ChecklistItem[]): Suggestion[] {
  const tTokens = new Set(tokens(transcript));

  return items.map<Suggestion>((item) => {
    const iTokens = tokens(`${item.title} ${item.description ?? ""}`);
    if (iTokens.length === 0) {
      return {
        itemId: item.id,
        itemTitle: item.title,
        status: "not_mentioned",
        confidence: 0,
        reasoning: "No searchable keywords for this item.",
      };
    }

    let matches = 0;
    for (const t of iTokens) if (tTokens.has(t)) matches += 1;
    const overlap = matches / iTokens.length;

    let status: SuggestionStatus = "not_mentioned";
    let confidence = 0;
    let reasoning = "No mention detected in transcript.";

    if (overlap > 0) {
      const nearbyText = transcript.toLowerCase();
      const complete = COMPLETE_HINTS.test(nearbyText);
      const partial = PARTIAL_HINTS.test(nearbyText);
      if (complete && overlap >= 0.35) {
        status = "completed";
        confidence = Math.min(0.95, 0.6 + overlap * 0.4);
        reasoning = `Transcript mentions completion cues and overlaps with "${item.title}".`;
      } else if (partial || (overlap >= 0.5 && !complete)) {
        status = "partial";
        confidence = Math.min(0.8, 0.4 + overlap * 0.4);
        reasoning = `Transcript references "${item.title}" but doesn't clearly mark it done.`;
      } else if (overlap >= 0.25) {
        status = "partial";
        confidence = 0.35 + overlap * 0.2;
        reasoning = `Weak keyword overlap with "${item.title}".`;
      }
    }

    return { itemId: item.id, itemTitle: item.title, status, confidence, reasoning };
  });
}
