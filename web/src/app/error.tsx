"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="text-lg text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  );
}
