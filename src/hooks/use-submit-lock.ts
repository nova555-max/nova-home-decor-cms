import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type SubmitLockOptions = {
  duplicateMessage?: string;
};

/** Prevents duplicate form submits while an async action is in flight. */
export function useSubmitLock(options?: SubmitLockOptions) {
  const lockRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);

  const runLocked = useCallback(
    async (task: () => Promise<void>): Promise<boolean> => {
      if (lockRef.current) {
        if (options?.duplicateMessage) {
          toast.message(options.duplicateMessage);
        }
        return false;
      }

      lockRef.current = true;
      setIsLocked(true);
      try {
        await task();
        return true;
      } finally {
        lockRef.current = false;
        setIsLocked(false);
      }
    },
    [options?.duplicateMessage],
  );

  return { runLocked, isLocked };
}
