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
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-xl font-medium">Activity</CardTitle>
          {entries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing yet. Applied and undone changes will show up here.
          </p>
        ) : (
          <ol className="relative space-y-5 border-l border-border/70 pl-5">
            {entries.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={
                    "absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full " +
                    (e.kind === "apply" ? "bg-primary" : "bg-muted-foreground/50")
                  }
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {e.kind === "apply" ? "Applied" : "Undone"}
                  </span>
                  <span className="font-mono text-[0.7rem] text-muted-foreground">
                    {fmt(e.timestamp)}
                  </span>
                </div>
                {e.transcript && (
                  <p className="font-serif mt-1 text-sm italic leading-relaxed text-foreground/80">
                    &ldquo;{e.transcript}&rdquo;
                  </p>
                )}
                <ul className="mt-2 space-y-0.5 text-sm text-foreground/90">
                  {e.appliedActions.map((a, idx) => (
                    <li key={idx}>— {a}</li>
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
