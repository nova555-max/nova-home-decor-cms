"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions/action-types";
import { logActionError } from "@/lib/actions/action-helpers";

type CmsMutationOptions<T> = {
  successMessage?: string;
  duplicateMessage?: string;
  refresh?: boolean;
  onSuccess?: (data?: T) => void;
  onError?: (error: string) => void;
};

export function useCmsMutation<T = void>(options?: CmsMutationOptions<T>) {
  const router = useRouter();
  const lockRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (
      action: () => Promise<ActionResult<T>>,
      overrides?: { successMessage?: string },
    ): Promise<ActionResult<T> | null> => {
      if (lockRef.current) {
        if (options?.duplicateMessage) {
          toast.message(options.duplicateMessage);
        }
        return Promise.resolve(null);
      }

      lockRef.current = true;
      setIsSaving(true);

      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            const result = await action();
            if (result.success) {
              if ("data" in result) {
                options?.onSuccess?.(result.data);
              } else {
                options?.onSuccess?.();
              }
              const message =
                overrides?.successMessage ?? options?.successMessage;
              if (message) toast.success(message);
              if (options?.refresh) router.refresh();
            } else {
              toast.error(result.error);
              options?.onError?.(result.error);
              logActionError("mutation", result.error);
            }
            resolve(result);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unexpected error";
            toast.error(message);
            options?.onError?.(message);
            logActionError("mutation", error);
            resolve({ success: false, error: message });
          } finally {
            lockRef.current = false;
            setIsSaving(false);
          }
        });
      });
    },
    [options, router],
  );

  return {
    mutate,
    isBusy: isPending || isSaving,
    isPending,
    isSaving,
  };
}
