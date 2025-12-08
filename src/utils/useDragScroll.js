import { useCallback, useEffect, useRef } from "react";


export function useDragScroll(containerRef) {
  const dragState = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });

  const endDrag = useCallback(
    (pointerId) => {
      if (!dragState.current.active) return;
      const el = containerRef.current;
      dragState.current.active = false;
      if (el) {
        el.dataset.dragging = "false";
        if (pointerId !== undefined) {
          el.releasePointerCapture?.(pointerId);
        }
      }
    },
    [containerRef]
  );

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0 || e.pointerType === "touch") return;
      const el = containerRef.current;
      if (!el) return;

      dragState.current = {
        active: true,
        startX: e.clientX,
        scrollLeft: el.scrollLeft,
        hasDragged: false,
      };

      el.dataset.dragging = "true";
      el.setPointerCapture?.(e.pointerId);
    },
    [containerRef]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragState.current.active) return;
      const el = containerRef.current;
      if (!el) return;

      const delta = e.clientX - dragState.current.startX;
      if (Math.abs(delta) > 2) {
        dragState.current.hasDragged = true;
      }
      el.scrollLeft = dragState.current.scrollLeft - delta;
      e.preventDefault();
    },
    [containerRef]
  );

  const onPointerUp = useCallback(
    (e) => {
      endDrag(e.pointerId);
    },
    [endDrag]
  );

  const onPointerLeave = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const onPointerCancel = onPointerLeave;

  const onClickCapture = useCallback((e) => {
    if (!dragState.current.hasDragged) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current.hasDragged = false;
  }, []);

  useEffect(() => {
    return () => {
      const el = containerRef.current;
      if (el) el.dataset.dragging = "false";
    };
  }, [containerRef]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onClickCapture,
  };
}
