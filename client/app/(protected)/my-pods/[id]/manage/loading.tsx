function Loading() {
  return (
    <main className="min-h-screen pt-24 px-6 pb-12">
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-brand-border rounded w-1/2" />
        <div className="h-32 bg-brand-border rounded-2xl" />
        <div className="h-32 bg-brand-border rounded-2xl" />
        <div className="h-48 bg-brand-border rounded-2xl" />
      </div>
    </main>
  );
}

export default Loading;
