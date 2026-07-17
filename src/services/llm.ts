import { analyzeTranscript } from "@/lib/ai.functions";
import type { ChecklistItem, Suggestion } from "@/features/types";
import { mockAnalyze } from "./suggestionEngine";

export interface AnalyzeArgs {
  transcript: string;
  items: ChecklistItem[];
  language: string;
  mode: "mock" | "real";
}

export async function analyze({
  transcript,
  items,
  language,
  mode,
}: AnalyzeArgs): Promise<Suggestion[]> {
  if (mode === "mock" || items.length === 0) {
    return mockAnalyze(transcript, items);
  }

  try {
    const res = await analyzeTranscript({
      data: {
        transcript,
        language,
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          done: i.done,
        })),
      },
    });

    const titleById = new Map(items.map((i) => [i.id, i.title]));
    return res.suggestions.map<Suggestion>((s) => ({
      itemId: s.itemId,
      itemTitle: titleById.get(s.itemId) ?? "",
      status: s.status,
      confidence: s.confidence,
      reasoning: s.reasoning,
    }));
  } catch (err) {
    // fail soft: fall back to mock so the app remains usable
    console.error("LLM analyze failed, falling back to mock:", err);
    const fallback = mockAnalyze(transcript, items);
    throw Object.assign(new Error((err as Error).message || "LLM request failed"), {
      fallback,
    });
  }
}
