"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

function isStaleServerActionError(error: Error) {
  return (
    error.name === "UnrecognizedActionError" ||
    error.message.includes("failed to find server action") ||
    error.message.includes("Server Action") ||
    error.message.includes("UnrecognizedActionError")
  );
}

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const staleAction = isStaleServerActionError(error);

  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  const hardReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold">
        {staleAction ? "Dev cache mismatch" : "Something went wrong"}
      </h2>
      <p className="text-muted-foreground max-w-md text-sm">
        {staleAction
          ? "The browser is using an old admin bundle after the dev server rebuilt. Reload the page to sync server actions."
          : "An error occurred while loading this page. Please try again."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {staleAction ? (
          <Button onClick={hardReload} className="rounded-xl">
            Reload page
          </Button>
        ) : (
          <Button onClick={reset} className="rounded-xl">
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
