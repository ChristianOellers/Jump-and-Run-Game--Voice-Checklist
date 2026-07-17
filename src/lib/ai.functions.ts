import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  transcript: z.string().min(1),
  language: z.string().default("en"),
  items: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        done: z.boolean(),
      }),
    )
    .max(200),
});

const OutSuggestion = z.object({
  itemId: z.string(),
  status: z.enum(["completed", "partial", "not_mentioned"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

type LlmSuggestion = z.infer<typeof OutSuggestion>;

export const analyzeTranscript = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const system = `You analyze a spoken progress update from a user against a checklist.
For EVERY checklist item, return exactly one suggestion.
- "completed" = the user clearly finished the item.
- "partial" = the user made progress but not done.
- "not_mentioned" = item was not referenced. Use confidence 0 for these.
Confidence is 0..1. Be conservative. Never invent items. Never suggest deletions.
Reply ONLY with strict JSON matching the schema.`;

    const user = `Language: ${data.language}
Transcript: """${data.transcript}"""
Checklist items (JSON):
${JSON.stringify(data.items, null, 2)}

Return JSON of shape:
{"suggestions":[{"itemId":"...","status":"completed|partial|not_mentioned","confidence":0..1,"reasoning":"short"}]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("LLM returned malformed JSON");
    }

    const shape = z.object({ suggestions: z.array(OutSuggestion) }).safeParse(parsed);
    if (!shape.success) {
      throw new Error("LLM response did not match schema");
    }

    // keep only ids we know about
    const knownIds = new Set(data.items.map((i) => i.id));
    const filtered: LlmSuggestion[] = shape.data.suggestions.filter((s) =>
      knownIds.has(s.itemId),
    );

    return { suggestions: filtered };
  });
