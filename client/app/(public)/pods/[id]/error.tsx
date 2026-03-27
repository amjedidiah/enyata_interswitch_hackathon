"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

function PageError({
  error,
  reset,
}: Readonly<{
  error: Error;
  reset: () => void;
}>) {
  const router = useRouter();

  return (
    <main className="min-h-screen pt-24 flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-brand-surface rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
        <AlertCircle size={48} className="text-brand-danger" />
        <div>
          <h1 className="text-xl font-bold text-brand-primary">
            Could not load pod
          </h1>
          <p className="text-sm text-brand-muted mt-1">{error.message}</p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => router.push("/pods")}
            className="flex-1 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-muted hover:bg-brand-card transition-colors"
          >
            Back to Pods
          </button>
          <button
            onClick={reset}
            className="flex-1 py-2.5 rounded-xl bg-brand-primary text-brand-card text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}

export default PageError;
