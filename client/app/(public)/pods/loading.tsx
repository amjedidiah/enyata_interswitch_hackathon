function Loading() {
  return (
    <main className="min-h-screen pt-24 px-6 pb-12">
      <div className="max-w-5xl mx-auto animate-pulse">
        {/* Page heading */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="h-8 w-40 bg-brand-muted/20 rounded-lg" />
          <div className="h-4 w-64 bg-brand-muted/10 rounded-lg" />
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="h-10 flex-1 bg-brand-muted/20 rounded-xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-16 bg-brand-muted/10 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Pod card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-brand-surface rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="h-5 w-3/4 bg-brand-muted/20 rounded" />
              <div className="h-3 w-1/2 bg-brand-muted/10 rounded" />
              <div className="flex justify-between mt-2">
                <div className="h-3 w-20 bg-brand-muted/10 rounded" />
                <div className="h-3 w-16 bg-brand-muted/10 rounded" />
              </div>
              <div className="h-9 w-full bg-brand-muted/20 rounded-xl mt-1" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default Loading;
