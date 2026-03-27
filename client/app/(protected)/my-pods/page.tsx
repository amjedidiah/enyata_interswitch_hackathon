import MyPods from "@/components/pods/MyPods";
import { HexPattern } from "@/components/home/HomeHero";

function MyPodsPage() {
  return (
    <main className="min-h-screen">
      {/* ── Hero header ── */}
      <div className="relative bg-brand-primary text-brand-card overflow-hidden">
        <HexPattern />
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, var(--color-brand-accent) 7%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-10">
          <h1 className="text-4xl md:text-5xl font-black leading-tight">
            My Pods
          </h1>
          <p className="text-brand-card/60 mt-3 text-lg max-w-md leading-relaxed">
            Pods you&apos;ve joined or created.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <MyPods />
      </div>
    </main>
  );
}

export default MyPodsPage;
