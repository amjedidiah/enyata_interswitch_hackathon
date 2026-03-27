import PodBrowser from "@/components/pods/PodBrowser";
import { HexPattern } from "@/components/home/HomeHero";

interface PodSummary {
  _id: string;
  name: string;
  contributionAmount: number;
  frequency: "daily" | "weekly" | "monthly";
  members: unknown[];
  maxMembers: number;
  status: "active" | "completed";
}

async function getActivePods(): Promise<PodSummary[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/pods`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function PodsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ create?: string }> }>) {
  const [pods, { create }] = await Promise.all([getActivePods(), searchParams]);

  return (
    <main className="min-h-screen">
      {/* Hero header */}
      <div className="relative bg-brand-primary text-brand-card overflow-hidden">
        <HexPattern />
        <div className="absolute left-0 top-0 h-full w-1 bg-brand-accent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 80% 50%, color-mix(in srgb, var(--color-brand-accent) 10%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-10">
          <p className="text-brand-accent text-xs font-semibold uppercase tracking-widest mb-3">
            Savings Circles
          </p>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">
            Browse Pods
          </h1>
          <p className="text-brand-card/60 mt-3 text-lg max-w-md leading-relaxed">
            Find and join savings circles that match your goals — or start your
            own.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PodBrowser initialPods={pods} initialCreateOpen={create === "1"} />
      </div>
    </main>
  );
}

export default PodsPage;
