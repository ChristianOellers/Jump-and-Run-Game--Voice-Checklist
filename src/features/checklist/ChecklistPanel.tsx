import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Check, X, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useChecklistStore } from "./useChecklistStore";
import type { ChecklistItem } from "@/features/types";

function SortableRow({ item, onEdit }: { item: ChecklistItem; onEdit: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const toggle = useChecklistStore((s) => s.toggle);
  const remove = useChecklistStore((s) => s.remove);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors",
        item.done && "bg-muted/40",
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="mt-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox
        checked={item.done}
        onCheckedChange={() => toggle(item.id)}
        aria-label={`Mark ${item.title} as ${item.done ? "not done" : "done"}`}
        className="mt-1"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium text-foreground",
              item.done && "line-through text-muted-foreground",
            )}
          >
            {item.title}
          </span>
          {item.source === "llm" && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> AI
            </Badge>
          )}
          {item.confidence !== undefined && (
            <span className="text-xs text-muted-foreground">
              {(item.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => onEdit(item.id)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete"
          onClick={() => remove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function EditForm({
  item,
  onCancel,
}: {
  item: ChecklistItem;
  onCancel: () => void;
}) {
  const update = useChecklistStore((s) => s.update);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");

  const save = () => {
    if (!title.trim()) return;
    update(item.id, { title: title.trim(), description: description.trim() || undefined });
    onCancel();
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Title"
        placeholder="Title"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label="Description"
        placeholder="Description (optional)"
        rows={2}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1 h-4 w-4" /> Cancel
        </Button>
        <Button size="sm" onClick={save}>
          <Check className="mr-1 h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  );
}

export function ChecklistPanel() {
  const items = useChecklistStore((s) => s.items);
  const add = useChecklistStore((s) => s.add);
  const reorder = useChecklistStore((s) => s.reorder);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => a.order - b.order);
  const doneCount = sorted.filter((i) => i.done).length;
  const pct = sorted.length ? Math.round((doneCount / sorted.length) * 100) : 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorder(String(active.id), String(over.id));
  };

  const submit = () => {
    if (!newTitle.trim()) return;
    add(newTitle);
    setNewTitle("");
  };

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <CardTitle className="font-serif text-xl font-medium">Checklist</CardTitle>
          <span className="shrink-0 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {doneCount} / {sorted.length} · {pct}%
          </span>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
            aria-label={`${pct}% complete`}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a checklist item…"
            aria-label="New item title"
            className="rounded-full"
          />
          <Button type="submit" aria-label="Add item" className="rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing here yet. Add your first item above.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sorted.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {sorted.map((item) =>
                  editingId === item.id ? (
                    <li key={item.id}>
                      <EditForm item={item} onCancel={() => setEditingId(null)} />
                    </li>
                  ) : (
                    <SortableRow key={item.id} item={item} onEdit={setEditingId} />
                  ),
                )}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
