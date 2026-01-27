import { Container } from "@/components/Container";
import { Nav } from "@/components/Nav";
import { GlowBG } from "@/components/GlowBG";
import { Button } from "@/components/Button";
import { CopyField } from "@/components/CopyField";
import { FAQ } from "@/components/FAQ";
import { StakingStatsLive } from "@/components/StakingStatsLive";
import { CONTRACT_ADDRESS, LINKS } from "@/lib/constants";
import { STAKING } from "@/lib/stakingConfig";
import { readBnoteGlobalStats } from "@/lib/readBnoteGlobalStats";

export default async function HomePage() {
  const stats = await readBnoteGlobalStats();

  return (
    <div className="relative">
      <GlowBG />
      <Nav />

      {/* Hero */}
      <section className="relative py-16 sm:py-24">
        <Container>
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-white/70" />
                Live on Monad
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                bNote on Monad
              </h1>

              <p className="mt-4 max-w-xl text-lg text-white/75 leading-relaxed">
                A staking-focused protocol on Monad designed to reward long-term
                participation through time-locked incentives.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href={LINKS.uniswap} target="_blank" rel="noreferrer">
                  <Button>Buy on Uniswap</Button>
                </a>
                <Button href={LINKS.stake} variant="secondary">
                  Stake bNote
                </Button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["Fast on Monad", "Optimized for a smooth UX."],
                  ["Stake to earn", "Yield via time-locked commitment."],
                  ["Protocol-aligned", "Rules enforced on-chain."],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="font-semibold">{t}</div>
                    <div className="mt-1 text-sm text-white/70">{d}</div>
                  </div>
                ))}
              </div>

              {/* ✅ Price pill belongs inside Container, inside a section */}
              {stats?.priceMon ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                  <span className="text-white/70">bNote</span>
                  <span className="font-semibold">{stats.priceMon} MON</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-white/70">Quick Start</div>

                <ol className="mt-3 space-y-2 text-sm text-white/80">
                  <li>1) Get MON on the Monad network</li>
                  <li>2) Swap MON for bNote on Uniswap</li>
                  <li>3) Stake bNote in the app</li>
                </ol>

                <div className="mt-5">
                  <CopyField value={CONTRACT_ADDRESS} />
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                  <div className="font-semibold">Security Reminder</div>
                  <div className="mt-1">
                    Admins will never DM you first. Never share your seed phrase.
                    Always verify links and contracts.
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <a href={LINKS.explorer} target="_blank" rel="noreferrer">
                    <Button variant="secondary">View on MonadScan</Button>
                  </a>
                  <Button href={LINKS.docs} variant="secondary">
                    Docs
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm text-white/70">Primary Actions</div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <a
                    href={LINKS.uniswap}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                  >
                    <div className="font-semibold">Buy</div>
                    <div className="mt-1 text-xs text-white/70">
                      Swap on Uniswap (Monad).
                    </div>
                  </a>

                  <a
                    href={LINKS.stake}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                  >
                    <div className="font-semibold">Stake</div>
                    <div className="mt-1 text-xs text-white/70">
                      Earn rewards via the app.
                    </div>
                  </a>

                  <a
                    href={LINKS.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                  >
                    <div className="font-semibold">Community</div>
                    <div className="mt-1 text-xs text-white/70">Join Telegram.</div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* About */}
      <section id="about" className="py-16">
        <Container>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <h2 className="text-2xl font-black">About bNote</h2>

              <div className="mt-3 space-y-3 text-white/75 leading-relaxed">
                <p className="font-semibold text-white">
                  bNote is a staking-focused token built on Monad to reward long-term
                  participation.
                </p>

                <p>
                  By staking bNote, participants lock tokens for a chosen duration and
                  earn yield based on time commitment rather than short-term trading.
                </p>

                <p>
                  The protocol operates under transparent rules enforced entirely on-chain,
                  aligning incentives for users who value clarity and long-term engagement.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["Time-locked staking", "Long-term incentives", "On-chain enforced"].map(
                  (x) => (
                    <div
                      key={x}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
                    >
                      {x}
                    </div>
                  )
                )}
              </div>
            </div>

            <div id="buy" className="rounded-3xl border border-white/10 bg-white/5 p-7">
              <h2 className="text-2xl font-black">How to Buy</h2>
              <p className="mt-3 text-white/75 leading-relaxed">
                Use the Monad network on Uniswap. Always verify the contract address
                before swapping.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a href={LINKS.uniswap} target="_blank" rel="noreferrer">
                  <Button>Buy on Uniswap</Button>
                </a>
                <a href={LINKS.telegram} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Ask in Telegram</Button>
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Stake */}
      <section id="stake" className="py-16">
        <Container>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">Staking</h2>
                <p className="mt-2 text-white/75 leading-relaxed">
                  Stake bNote to earn yield through time-locked participation.
                </p>
              </div>

              <div className="flex gap-3">
                <Button href={LINKS.stake}>Open Staking App</Button>
                <Button href={LINKS.docs} variant="secondary">
                  Docs
                </Button>
              </div>
            </div>

            <StakingStatsLive apy={STAKING.nominalApr} stakeAppUrl={LINKS.stake} />
          </div>
        </Container>
      </section>

      {/* Token */}
      <section id="token" className="py-16">
        <Container>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <h2 className="text-2xl font-black">Token Info</h2>
            <p className="mt-2 text-white/75 leading-relaxed">
              Always verify the contract address before interacting.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={LINKS.explorer} target="_blank" rel="noreferrer">
                <Button>View on MonadScan</Button>
              </a>
              <a href={LINKS.uniswap} target="_blank" rel="noreferrer">
                <Button variant="secondary">Open on Uniswap</Button>
              </a>
            </div>

            <div className="mt-5">
              <CopyField value={CONTRACT_ADDRESS} />
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <Container>
          <h2 className="text-2xl font-black">FAQ</h2>
          <p className="mt-2 text-white/75">Quick answers to common questions.</p>
          <div className="mt-6">
            <FAQ />
          </div>
        </Container>
      </section>

      {/* Community */}
      <section id="community" className="py-16">
        <Container>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <h2 className="text-2xl font-black">Community</h2>
            <p className="mt-2 text-white/75 leading-relaxed">
              Join the conversation, ask questions, and help shape the future of bNote.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={LINKS.telegram} target="_blank" rel="noreferrer">
                <Button>Join Telegram</Button>
              </a>
              <a href={LINKS.x} target="_blank" rel="noreferrer">
                <Button variant="secondary">Follow on X</Button>
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white/60">
              © {new Date().getFullYear()} bNote • bnotemonad.com
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <a className="text-white/70 hover:text-white" href={LINKS.docs}>
                Docs
              </a>
              <a
                className="text-white/70 hover:text-white"
                href={LINKS.telegram}
                target="_blank"
                rel="noreferrer"
              >
                Telegram
              </a>
              <a
                className="text-white/70 hover:text-white"
                href={LINKS.x}
                target="_blank"
                rel="noreferrer"
              >
                Follow on X
              </a>
              <a
                className="text-white/70 hover:text-white"
                href={LINKS.explorer}
                target="_blank"
                rel="noreferrer"
              >
                MonadScan
              </a>
            </div>
          </div>

          <div className="mt-4 text-xs text-white/50">
            Not financial advice. For informational purposes only.
          </div>
        </Container>
      </footer>
    </div>
  );
}
