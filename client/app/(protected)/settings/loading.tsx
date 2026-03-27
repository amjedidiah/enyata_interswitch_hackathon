function Loading() {
  return (
    <main className="min-h-screen">
      <div className="relative bg-brand-primary text-brand-card overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-10">
          <div className="h-3 w-20 bg-brand-card/10 rounded mb-3 animate-pulse" />
          <div className="h-10 w-40 bg-brand-card/10 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-brand-card/10 rounded mt-3 animate-pulse" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 md:p-8 relative overflow-hidden max-w-xl animate-pulse">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-brand-accent/30" />
          <div className="pl-3 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-muted/15" />
              <div className="flex flex-col gap-1.5">
                <div className="h-5 w-28 bg-brand-muted/20 rounded" />
                <div className="h-3 w-48 bg-brand-muted/10 rounded" />
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <div className="h-3.5 w-20 bg-brand-muted/15 rounded mb-2" />
                <div className="h-10 w-full bg-brand-muted/10 rounded-xl" />
              </div>
              <div>
                <div className="h-3.5 w-28 bg-brand-muted/15 rounded mb-2" />
                <div className="h-10 w-full bg-brand-muted/10 rounded-xl" />
              </div>
              <div className="h-10 w-full bg-brand-muted/15 rounded-xl mt-2" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Loading;
