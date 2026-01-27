import Link from "next/link";
import { GlowBG } from "@/components/GlowBG";
import { Container } from "@/components/Container";
import { StakeWidget } from "@/components/StakeWidget";
import { CopyField } from "@/components/CopyField";

export default function AppPage() {
  return (
    <div className="relative">
      <GlowBG />

      <Container>
        <div className="py-16">
          {/* Back to Home */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center text-sm text-white/70 hover:text-white"
          >
            ← Back to Home
          </Link>

          {/* Header */}
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold">bNote Staking</h1>
            <p className="mt-3 text-white/70">
              Stake bNote directly through the token contract on Monad.
            </p>
          </div>

          {/* Staking Widget */}
          <div className="mt-12">
            <StakeWidget />
          </div>

          {/* Contract */}
          <div className="mt-14 max-w-xl">
            <div className="mb-2 text-xs text-white/60">
              bNote Contract Address
            </div>
            <CopyField value="0x20780bF9eb35235cA33c62976CF6de5AA3395561" />
          </div>
        </div>
      </Container>
    </div>
  );
}

