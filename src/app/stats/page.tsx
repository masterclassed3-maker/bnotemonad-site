import Link from "next/link";
import GlobalStats from "@/components/GlobalStats";

export default function StatsPage() {
  return (
    <main className="mx-auto w-full">
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <div className="mb-6">
          <Link className="text-sm text-white/60 hover:text-white" href="/">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-black tracking-tight">Stats</h1>
          <p className="mt-2 text-white/70">
            Global protocol metrics pulled directly from the bNote contract (no wallet required).
          </p>
        </div>
      </div>

      <GlobalStats />
    </main>
  );
}
