import Link from "next/link";

function NotFound() {
  return (
    <main className="min-h-screen pt-24 flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-brand-surface rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
        <p className="text-6xl font-black text-brand-accent">404</p>
        <div>
          <h1 className="text-xl font-bold text-brand-primary">
            Page not found
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <Link
            href="/pods"
            className="flex-1 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-muted hover:bg-brand-card transition-colors text-center"
          >
            Browse Pods
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 py-2.5 rounded-xl bg-brand-primary text-brand-card text-sm font-semibold hover:bg-brand-primary/90 transition-colors text-center"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default NotFound;
