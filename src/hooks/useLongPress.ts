import React from "react";

export const useLongPress = (
  callback: () => void,
  ms = 1000,
  options?: { onRelease?: () => void }
) => {
  const timerRef = React.useRef<any>(null);
  const startPos = React.useRef({ x: 0, y: 0 });
  const didTriggerRef = React.useRef(false);

  const start = (e: any) => {
    didTriggerRef.current = false;
    const cX = e.clientX || (e.touches && e.touches[0].clientX);
    const cY = e.clientY || (e.touches && e.touches[0].clientY);
    startPos.current = { x: cX, y: cY };
    timerRef.current = setTimeout(() => {
      didTriggerRef.current = true;
      callback();
    }, ms);
  };

  const stop = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (didTriggerRef.current) {
      didTriggerRef.current = false;
      if (options?.onRelease) {
        options.onRelease();
      }
    }
  };

  const move = (e: any) => {
    const cX = e.clientX || (e.touches && e.touches[0].clientX);
    const cY = e.clientY || (e.touches && e.touches[0].clientY);
    const dist = Math.sqrt(
      Math.pow(cX - startPos.current.x, 2) + Math.pow(cY - startPos.current.y, 2)
    );
    if (dist > 10) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onPointerMove: move
  };
};
