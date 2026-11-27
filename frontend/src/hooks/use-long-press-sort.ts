import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

interface SortableItem {
  id: number;
}

interface LongPressSortOptions<T extends SortableItem> {
  items: T[];
  group: string;
  onCommit: (items: T[]) => void;
  disabled?: boolean;
  delay?: number;
}

interface DragState<T extends SortableItem> {
  pointerId: number;
  id: number;
  startX: number;
  startY: number;
  active: boolean;
  changed: boolean;
  list: T[];
  timer: number | null;
}

const CANCEL_DISTANCE = 12;
const TARGET_TOLERANCE = 40;

export function useLongPressSort<T extends SortableItem>({
  items,
  group,
  onCommit,
  disabled = false,
  delay = 220,
}: LongPressSortOptions<T>) {
  const [preview, setPreview] = useState<T[] | null>(null);
  const [pressingId, setPressingId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const itemsRef = useRef(items);
  const onCommitRef = useRef(onCommit);
  const dragRef = useRef<DragState<T> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  itemsRef.current = items;
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (!dragRef.current) setPreview(null);
  }, [items]);

  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  const findTarget = (clientX: number, clientY: number): number | null => {
    const owner = document.querySelector<HTMLElement>(
      `[data-sortable-group="${group}"]`,
    );
    if (!owner) return null;
    let closest: HTMLElement | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const item of owner.querySelectorAll<HTMLElement>("[data-sortable-id]")) {
      const rect = item.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
      const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = item;
      }
    }
    if (!closest || closestDistance > TARGET_TOLERANCE) return null;
    const id = Number(closest.dataset.sortableId);
    return Number.isFinite(id) ? id : null;
  };

  const startPress = (id: number, event: PointerEvent<HTMLElement>) => {
    if (disabled || event.button !== 0 || !event.isPrimary) return;
    cleanupRef.current?.();

    const drag: DragState<T> = {
      pointerId: event.pointerId,
      id,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      changed: false,
      list: itemsRef.current.slice(),
      timer: null,
    };
    dragRef.current = drag;
    setPressingId(id);

    const finish = (commit: boolean) => {
      if (dragRef.current !== drag) return;
      if (drag.timer !== null) window.clearTimeout(drag.timer);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      window.removeEventListener("blur", handleCancel);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      dragRef.current = null;
      cleanupRef.current = null;
      setPressingId(null);
      setDraggingId(null);
      setPreview(null);
      if (commit) onCommitRef.current(drag.list);
    };

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== drag.pointerId) return;
      if (!drag.active) {
        if (
          Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY) >
          CANCEL_DISTANCE
        ) {
          finish(false);
        }
        return;
      }
      moveEvent.preventDefault();
      const overId = findTarget(moveEvent.clientX, moveEvent.clientY);
      if (overId === null || overId === drag.id) return;
      const fromIndex = drag.list.findIndex((entry) => entry.id === drag.id);
      const toIndex = drag.list.findIndex((entry) => entry.id === overId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      const next = [...drag.list];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return;
      next.splice(toIndex, 0, moved);
      drag.list = next;
      drag.changed = true;
      setPreview(next);
    };

    const handleUp = (upEvent: globalThis.PointerEvent) => {
      if (upEvent.pointerId !== drag.pointerId) return;
      finish(drag.active && drag.changed);
    };

    const handleCancel = () => finish(false);

    drag.timer = window.setTimeout(() => {
      if (dragRef.current !== drag) return;
      drag.active = true;
      drag.list = itemsRef.current.slice();
      setPressingId(null);
      setDraggingId(id);
      setPreview(drag.list);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    }, delay);

    cleanupRef.current = () => finish(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    window.addEventListener("blur", handleCancel);
  };

  const getItemProps = (id: number) => ({
    tabIndex: 0,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      const interactive = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "button, a, input, textarea, select, [data-no-sort]",
      );
      if (interactive) return;
      event.preventDefault();
      startPress(id, event);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (disabled || event.target !== event.currentTarget) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const list = itemsRef.current.slice();
      const fromIndex = list.findIndex((item) => item.id === id);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= list.length) return;
      const [moved] = list.splice(fromIndex, 1);
      if (!moved) return;
      list.splice(toIndex, 0, moved);
      onCommitRef.current(list);
    },
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      if (dragRef.current?.id === id) event.preventDefault();
    },
  });

  return {
    items: preview ?? items,
    pressingId,
    draggingId,
    getItemProps,
  };
}
