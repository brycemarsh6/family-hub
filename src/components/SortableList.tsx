"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
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
import { GripVertical } from "lucide-react";

/**
 * The one drag-to-reorder list. Dragging starts only from the grip button, so a
 * finger on the rest of a row still scrolls the page and still taps through.
 * (Proven on a real iPad in the PR B spike: `touch-action: none` on the grip
 * alone is what keeps the browser from stealing the drag.) It holds no order
 * of its own: the caller passes `items` in order and gets the new order of ids
 * from `onReorder`, which is where the caller updates its state and saves.
 * Pointer and keyboard (space, arrows) both work; the page edge auto-scrolls.
 */
export function SortableList<T extends { id: string }>({
  items,
  label,
  onReorder,
  renderItem,
  className,
  itemClassName = "",
}: {
  /** The rows, in their current order. Ids must be unique. */
  items: T[];
  /** Names a row for the grip's screen-reader label ("Reorder Meds"). */
  label: (item: T) => string;
  /** Called after a drop that changed the order, with every id in its new order. */
  onReorder: (ids: string[]) => void;
  /** The row's content; place `grip` where the handle should sit. `dragging` is true while it is lifted. */
  renderItem: (item: T, parts: { grip: ReactNode; dragging: boolean }) => ReactNode;
  /** Classes for the `ul`. */
  className?: string;
  /** Classes for every `li`. */
  itemClassName?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((item) => item.id);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} label={label(item)} className={itemClassName}>
              {(parts) => renderItem(item, parts)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className: string;
  children: (parts: { grip: ReactNode; dragging: boolean }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const grip = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${label}`}
      // touch-action none keeps the browser from scrolling instead of dragging;
      // the other two stop iOS from popping a text-selection or callout menu.
      style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none", WebkitUserSelect: "none" }}
      className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center text-muted"
    >
      <GripVertical aria-hidden="true" size={22} />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${className} ${isDragging ? "z-10 rounded-xl border border-accent bg-surface shadow-lg" : ""}`}
    >
      {children({ grip, dragging: isDragging })}
    </li>
  );
}
