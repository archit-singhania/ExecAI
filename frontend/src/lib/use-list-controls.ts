"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { haptics } from "@/lib/use-interactions";

/**
 * Multi-select with the shortcuts people expect from a file manager:
 * click to select, shift-click for a range, cmd/ctrl-click to toggle,
 * cmd+A for all, Escape to clear.
 */
export function useMultiSelect<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  const ids = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    setSelected((current) => {
      const valid = new Set(ids);
      const next = new Set([...current].filter((id) => valid.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [ids]);

  const clear = useCallback(() => {
    setSelected(new Set());
    setAnchor(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(ids));
    haptics.select();
  }, [ids]);

  const toggle = useCallback(
    (id: string, event?: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      setSelected((current) => {
        const next = new Set(current);

        if (event?.shiftKey && anchor) {
          const from = ids.indexOf(anchor);
          const to = ids.indexOf(id);
          if (from !== -1 && to !== -1) {
            const [low, high] = from < to ? [from, to] : [to, from];
            for (let index = low; index <= high; index += 1) next.add(ids[index]);
            return next;
          }
        }

        if (event?.metaKey || event?.ctrlKey || !event) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }

        return next.has(id) && next.size === 1 ? new Set() : new Set([id]);
      });

      setAnchor(id);
      haptics.tap();
    },
    [anchor, ids],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        selectAll();
      }

      if (event.key === "Escape" && selected.size) {
        event.preventDefault();
        clear();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear, selectAll, selected.size]);

  return {
    selected,
    count: selected.size,
    isSelected: (id: string) => selected.has(id),
    toggle,
    clear,
    selectAll,
    allSelected: ids.length > 0 && selected.size === ids.length,
  };
}

/**
 * Roving focus through a list with j/k or arrows, Enter to act.
 * Ignores keystrokes while a field has focus.
 */
export function useListKeys({
  count,
  onActivate,
  onSecondary,
  enabled = true,
}: {
  count: number;
  onActivate?: (index: number) => void;
  onSecondary?: (index: number) => void;
  enabled?: boolean;
}) {
  const [cursor, setCursor] = useState(-1);

  useEffect(() => {
    if (cursor >= count) setCursor(count - 1);
  }, [count, cursor]);

  useEffect(() => {
    if (!enabled) return;

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((value) => Math.min(count - 1, value + 1));
      } else if (key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((value) => Math.max(0, value - 1));
      } else if (event.key === "Enter" && cursor >= 0) {
        event.preventDefault();
        onActivate?.(cursor);
      } else if (key === "x" && cursor >= 0) {
        event.preventDefault();
        onSecondary?.(cursor);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, cursor, enabled, onActivate, onSecondary]);

  return { cursor, setCursor };
}

/** Drag-to-reorder using native HTML5 DnD. */
export function useReorder<T extends { id: string }>(
  items: T[],
  onReorder: (next: T[]) => void,
) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const handlers = useCallback(
    (id: string) => ({
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        setDragging(id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
      },
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (over !== id) setOver(id);
      },
      onDragLeave: () => {
        if (over === id) setOver(null);
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        const sourceId = dragging ?? event.dataTransfer.getData("text/plain");
        setDragging(null);
        setOver(null);

        if (!sourceId || sourceId === id) return;

        const from = items.findIndex((item) => item.id === sourceId);
        const to = items.findIndex((item) => item.id === id);
        if (from === -1 || to === -1) return;

        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);

        haptics.select();
        onReorder(next);
      },
      onDragEnd: () => {
        setDragging(null);
        setOver(null);
      },
    }),
    [dragging, items, onReorder, over],
  );

  return { dragging, over, handlers };
}

/** Click-to-edit text that commits on Enter or blur, reverts on Escape. */
export function useInlineEdit(initial: string, onCommit: (value: string) => void) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (!editing) setDraft(initial);
  }, [editing, initial]);

  const commit = useCallback(() => {
    const value = draft.trim();
    setEditing(false);
    if (value && value !== initial) onCommit(value);
  }, [draft, initial, onCommit]);

  const cancel = useCallback(() => {
    setDraft(initial);
    setEditing(false);
  }, [initial]);

  return {
    editing,
    draft,
    setDraft,
    start: () => setEditing(true),
    commit,
    cancel,
    inputProps: {
      value: draft,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      },
      autoFocus: true,
    },
  };
}
