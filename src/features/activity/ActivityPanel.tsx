import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActivityStore } from "./useActivityStore";

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export function ActivityPanel() {
  const entries = useActivityStore((s) => s.entries);
  const clear = useActivityStore((s) => s.clear);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Activity</CardTitle>
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No activity yet. Applied and undone changes will appear here.
          </p>
        ) : (
          <ol className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {e.kind}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmt(e.timestamp)}</span>
                </div>
                {e.transcript && (
                  <p className="mt-1 text-xs italic text-muted-foreground">“{e.transcript}”</p>
                )}
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {e.appliedActions.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
