"use client";

import { useCallback, useRef, useState } from "react";

export function useContentUndoRedo<T>(initial: T, maxDepth = 40) {
  const [value, setValue] = useState(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);

  const setWithHistory = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        undoStack.current = [prev, ...undoStack.current].slice(0, maxDepth);
        redoStack.current = [];
        return resolved;
      });
    },
    [maxDepth],
  );

  const undo = useCallback(() => {
    setValue((prev) => {
      const previous = undoStack.current.shift();
      if (!previous) return prev;
      redoStack.current = [prev, ...redoStack.current].slice(0, maxDepth);
      return previous;
    });
  }, [maxDepth]);

  const redo = useCallback(() => {
    setValue((prev) => {
      const next = redoStack.current.shift();
      if (!next) return prev;
      undoStack.current = [prev, ...undoStack.current].slice(0, maxDepth);
      return next;
    });
  }, [maxDepth]);

  const reset = useCallback((next: T) => {
    undoStack.current = [];
    redoStack.current = [];
    setValue(next);
  }, []);

  return {
    value,
    setValue: setWithHistory,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    reset,
  };
}
