function Loading() {
  return (
    <main className="min-h-screen pt-24 px-6 pb-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col gap-2">
          <div className="h-8 w-2/3 bg-brand-muted/20 rounded-lg" />
          <div className="h-4 w-1/3 bg-brand-muted/10 rounded-lg" />
        </div>

        {/* Amount skeleton */}
        <div className="bg-brand-surface rounded-2xl p-6 flex flex-col gap-2">
          <div className="h-3 w-32 bg-brand-muted/20 rounded" />
          <div className="h-10 w-40 bg-brand-muted/20 rounded-lg" />
        </div>

        {/* Progress skeleton */}
        <div className="bg-brand-surface rounded-2xl p-6 flex flex-col gap-3">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-brand-muted/20 rounded" />
            <div className="h-4 w-32 bg-brand-muted/20 rounded" />
          </div>
          <div className="w-full h-2 bg-brand-muted/20 rounded-full" />
        </div>

        {/* Members skeleton */}
        <div className="bg-brand-surface rounded-2xl p-6 flex flex-col gap-3">
          <div className="h-4 w-20 bg-brand-muted/20 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-muted/20" />
              <div className="h-4 w-28 bg-brand-muted/20 rounded" />
            </div>
          ))}
        </div>

        {/* Button skeleton */}
        <div className="h-12 w-full bg-brand-muted/20 rounded-xl" />
      </div>
    </main>
  );
}

export default Loading;
