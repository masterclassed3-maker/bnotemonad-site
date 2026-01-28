import Link from "next/link";
import GlobalStats from "@/components/GlobalStats";


export default function StatsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
      {/* Back Home */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
        >
          ← Back Home
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="text-3xl font-black text-white">Stats</div>
        <div className="mt-2 text-sm text-white/70">
          Global protocol metrics pulled directly from the bNote contract (no wallet required).
        </div>
      </div>

      {/* Global stats cards */}
      <GlobalStats />
    </main>
  );
}
