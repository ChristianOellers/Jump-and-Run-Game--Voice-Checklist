import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Circle, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { useSuggestionsStore } from "./useSuggestionsStore";
import { useChecklistStore } from "@/features/checklist/useChecklistStore";
import { useSettingsStore } from "@/features/settings/useSettingsStore";
import { useActivityStore } from "@/features/activity/useActivityStore";
import type { SuggestionStatus } from "@/features/types";

const STATUS_META: Record<
  SuggestionStatus,
  { label: string; Icon: typeof CheckCircle2; className: string }
> = {
  completed: { label: "Completed", Icon: CheckCircle2, className: "text-emerald-600" },
  partial: { label: "In progress", Icon: CircleDashed, className: "text-amber-600" },
  not_mentioned: { label: "Not mentioned", Icon: Circle, className: "text-muted-foreground" },
};

export function SuggestionsPanel() {
  const batch = useSuggestionsStore((s) => s.batch);
  const clear = useSuggestionsStore((s) => s.clear);
  const settings = useSettingsStore((s) => s.settings);
  const items = useChecklistStore((s) => s.items);
  const snapshot = useChecklistStore((s) => s.snapshot);
  const update = useChecklistStore((s) => s.update);
  const replaceAll = useChecklistStore((s) => s.replaceAll);
  const logActivity = useActivityStore((s) => s.add);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [autoAppliedBatchId, setAutoAppliedBatchId] = useState<string | null>(null);

  const actionable = useMemo(
    () => batch?.suggestions.filter((s) => s.status !== "not_mentioned") ?? [],
    [batch],
  );

  // preselect items above threshold
  useEffect(() => {
    if (!batch) return;
    const next: Record<string, boolean> = {};
    for (const s of actionable) {
      next[s.itemId] = s.confidence >= settings.autoApplyThreshold;
    }
    setSelected(next);
  }, [batch, actionable, settings.autoApplyThreshold]);

  const applySelected = () => {
    if (!batch) return;
    const before = snapshot();
    const actions: string[] = [];
    for (const s of actionable) {
      if (!selected[s.itemId]) continue;
      const item = items.find((i) => i.id === s.itemId);
      if (!item) continue;
      if (s.status === "completed" && !item.done) {
        update(s.itemId, {
          done: true,
          doneAt: new Date().toISOString(),
          confidence: s.confidence,
          source: "llm",
        });
        actions.push(`Marked "${item.title}" done`);
      } else if (s.status === "partial") {
        update(s.itemId, { confidence: s.confidence });
        actions.push(`Noted progress on "${item.title}"`);
      }
    }
    if (actions.length === 0) {
      toast.info("Nothing selected to apply.");
      return;
    }
    logActivity({
      transcript: batch.transcript,
      suggestions: batch.suggestions,
      appliedActions: actions,
      snapshotBefore: before,
      kind: "apply",
    });
    toast.success(`Applied ${actions.length} change${actions.length === 1 ? "" : "s"}.`);
    clear();
  };

  // Auto-apply flow
  useEffect(() => {
    if (!batch || !settings.autoApply || batch.id === autoAppliedBatchId) return;
    const highConf = actionable.filter((s) => s.confidence >= settings.autoApplyThreshold);
    if (highConf.length === 0) return;
    setAutoAppliedBatchId(batch.id);
    const before = snapshot();
    const actions: string[] = [];
    for (const s of highConf) {
      const item = items.find((i) => i.id === s.itemId);
      if (!item) continue;
      if (s.status === "completed" && !item.done) {
        update(s.itemId, {
          done: true,
          doneAt: new Date().toISOString(),
          confidence: s.confidence,
          source: "llm",
        });
        actions.push(`Auto-marked "${item.title}" done`);
      } else if (s.status === "partial") {
        update(s.itemId, { confidence: s.confidence });
        actions.push(`Auto-noted progress on "${item.title}"`);
      }
    }
    if (actions.length > 0) {
      logActivity({
        transcript: batch.transcript,
        suggestions: batch.suggestions,
        appliedActions: actions,
        snapshotBefore: before,
        kind: "apply",
      });
      toast.success(`Auto-applied ${actions.length} change${actions.length === 1 ? "" : "s"}.`);
      // remove auto-applied from local selection so user only sees remaining
      const remainingSelected = { ...selected };
      for (const s of highConf) delete remainingSelected[s.itemId];
      setSelected(remainingSelected);
    }
  }, [
    batch,
    settings.autoApply,
    settings.autoApplyThreshold,
    actionable,
    autoAppliedBatchId,
    items,
    logActivity,
    selected,
    snapshot,
    update,
  ]);

  // Undo latest
  const lastApply = useActivityStore((s) => s.entries.find((e) => e.kind === "apply"));
  const undoLast = () => {
    if (!lastApply) return;
    const before = snapshot();
    replaceAll(lastApply.snapshotBefore);
    logActivity({
      appliedActions: [`Undid: ${lastApply.appliedActions.join(", ")}`],
      snapshotBefore: before,
      kind: "undo",
    });
    toast.success("Reverted last change.");
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-xl font-medium">Suggestions</CardTitle>
          {lastApply && (
            <Button variant="ghost" size="sm" onClick={undoLast}>
              Undo last
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!batch ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Speak or type an update, then Analyze to see suggested changes here.
          </p>
        ) : (
          <>
            <blockquote className="border-l-2 border-primary/50 pl-4">
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                You said
              </p>
              <p className="font-serif mt-1 text-base italic leading-relaxed text-foreground">
                &ldquo;{batch.transcript}&rdquo;
              </p>
            </blockquote>

            {actionable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checklist items appear to match this update. Nothing to change.
              </p>
            ) : (
              <ul className="space-y-2">
                {actionable.map((s) => {
                  const meta = STATUS_META[s.status];
                  const item = items.find((i) => i.id === s.itemId);
                  if (!item) return null;
                  return (
                    <li
                      key={s.itemId}
                      className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40"
                    >
                      <Checkbox
                        checked={!!selected[s.itemId]}
                        onCheckedChange={(c) =>
                          setSelected((prev) => ({ ...prev, [s.itemId]: !!c }))
                        }
                        aria-label={`Select ${item.title}`}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{item.title}</span>
                          <Badge variant="outline" className={cn("gap-1 font-normal", meta.className)}>
                            <meta.Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{s.reasoning}</p>
                        <div
                          className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-muted"
                          aria-label={`Confidence ${(s.confidence * 100).toFixed(0)} percent`}
                        >
                          <div
                            className="h-full bg-primary/70"
                            style={{ width: `${Math.round(s.confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={clear}>
                <X className="mr-1 h-4 w-4" /> Dismiss
              </Button>
              <Button
                onClick={applySelected}
                disabled={actionable.length === 0}
                className="rounded-full"
              >
                <Check className="mr-1 h-4 w-4" /> Apply selected
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
