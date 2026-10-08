"use client";
import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "../lib/utils";

export type DragHandleProps = React.HTMLAttributes<HTMLButtonElement>;

function SortableItem({
  id,
  children,
  className,
}: {
  id: string;
  children: (handle: DragHandleProps, dragging: boolean) => React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && "relative z-10 opacity-90 shadow-xl")}
    >
      {children({ ...attributes, ...listeners } as DragHandleProps, isDragging)}
    </div>
  );
}

/**
 * Drag-to-reorder list. Works with pointer and keyboard (focus the handle, press space,
 * then use the arrow keys).
 */
export function SortableList<T>({
  items,
  getId,
  onChange,
  children,
  grid = false,
  className,
  itemClassName,
}: {
  items: T[];
  getId: (item: T, index: number) => string;
  onChange: (items: T[]) => void;
  children: (item: T, index: number, handle: DragHandleProps, dragging: boolean) => React.ReactNode;
  grid?: boolean;
  className?: string;
  itemClassName?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((item, i) => getId(item, i));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, i) => (
            <SortableItem key={ids[i]} id={ids[i]} className={itemClassName}>
              {(handle, dragging) => children(item, i, handle, dragging)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function DragHandle({ className, ...props }: DragHandleProps & { className?: string }) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className={cn(
        "flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground active:cursor-grabbing",
        className,
      )}
      {...props}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
