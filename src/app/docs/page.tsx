import { Container } from "@/components/Container";
import { Nav } from "@/components/Nav";
import { GlowBG } from "@/components/GlowBG";
import { Button } from "@/components/Button";
import { CopyField } from "@/components/CopyField";
import { CONTRACT_ADDRESS, LINKS } from "@/lib/constants";

function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-black">{title}</h2>
      {subtitle ? <p className="mt-2 text-white/75 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
      {children}
    </div>
  );
}

const quickNav = [
  ["quick-start", "Quick Start"],
  ["key-parameters", "Key Parameters"],
  ["how-it-works", "How Staking Works"],
  ["bonuses", "LPB & BPB Bonuses"],
  ["share-rate", "Share Rate (Up-Only)"],
  ["penalties", "Early & Late Penalties"],
  ["examples", "Worked Examples"],
  ["using-dapp", "Using the dApp"],
  ["analytics", "Analytics Explained"],
  ["mobile", "Mobile Wallet Tips"],
  ["troubleshooting", "Troubleshooting"],
  ["glossary", "Glossary"],
  ["links", "Contract & Links"],
  ["treasury-vesting", "Treasury Vesting"], // ✅ added
  ["disclaimer", "Disclaimer"],
] as const;

export default function DocsPage() {
  return (
    <div className="relative">
      <GlowBG />
      <Nav />

      <section className="py-12 sm:py-16">
        <Container>
          <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm text-white/60">bNote Staking Docs (Monad)</div>
                <h1 className="mt-2 text-4xl font-black tracking-tight">Docs</h1>
                <p className="mt-3 max-w-2xl text-white/75 leading-relaxed">
                  A clear reference for staking mechanics, bonuses, share rate behavior, penalties,
                  and how to use the dApp safely.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button href={LINKS.stake}>Open App</Button>
                <Button href={LINKS.uniswap} variant="secondary">
                  Uniswap
                </Button>
                <Button href={LINKS.explorer} variant="secondary">
                  MonadScan
                </Button>
              </div>
            </div>

            {/* Quick Nav */}
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-white/60">Quick Nav</div>
                  <div className="mt-1 text-lg font-bold">Jump to a section</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickNav.map(([id, label]) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10 transition"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </Card>

            {/* Quick Start */}
            <Card>
              <SectionTitle
                id="quick-start"
                title="Quick Start"
                subtitle="The fastest path from wallet → stake → end stake."
              />
              <ol className="mt-4 space-y-2 text-sm text-white/80">
                <li>
                  <span className="font-semibold">1)</span> Connect your wallet on Monad. If your wallet asks,
                  approve adding/switching to Monad Mainnet (chainId 143).
                </li>
                <li>
                  <span className="font-semibold">2)</span> Enter stake amount and lock days, then review the
                  Estimates (unlock date, bonus multipliers, estimated shares).
                </li>
                <li>
                  <span className="font-semibold">3)</span> Click <span className="font-semibold">Stake</span>.
                  Your bNote converts to shares for the lock duration.
                </li>
                <li>
                  <span className="font-semibold">4)</span> On or after unlock, click{" "}
                  <span className="font-semibold">End</span> to mint back your principal + yield (penalties may apply).
                </li>
              </ol>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                Tip: Ending on the unlock day avoids late penalties. Ending early or very late can reduce payout.
              </div>
            </Card>

            {/* Key Parameters */}
            <Card>
              <SectionTitle
                id="key-parameters"
                title="Key Parameters"
                subtitle="Core staking values and limits used by the system."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Nominal APR", "3.69% (nominal)"],
                  ["Lock range", "1 to 5,555 days"],
                  ["LPB bonus", "+20% per year, capped at +200% (10 years)"],
                  ["BPB bonus", "Up to +10% (scales to the cap)"],
                  ["BPB cap", "75,000 bNote for full BPB bonus"],
                  ["Penalties", "Early + late penalties scale up to 25% (linear)"],
                  ["Share rate", "Up-only ratchet at stake end"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">{k}</div>
                    <div className="mt-1 font-semibold">{v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* How it works */}
            <Card>
              <SectionTitle
                id="how-it-works"
                title="How Staking Works"
                subtitle="Staking converts bNote into shares. Shares determine yield."
              />
              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                When you start a stake, your bNote is converted into shares. Yield accrues based on shares.
                When you end a stake, the protocol mints back tokens based on your principal, bonuses, and the
                share rate at the time you end.
              </p>
            </Card>

            {/* Bonuses */}
            <Card>
              <SectionTitle
                id="bonuses"
                title="LPB & BPB Bonuses"
                subtitle="Two bonuses reward longer locks and bigger stakes."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="font-bold">LPB — Longer Pays Better</div>
                  <p className="mt-2 text-sm text-white/80 leading-relaxed">
                    Longer locks receive a bonus that increases with time: +20% per 365 days,
                    capped at +200% at 10 years.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="font-bold">BPB — Bigger Pays Better</div>
                  <p className="mt-2 text-sm text-white/80 leading-relaxed">
                    Bigger stakes receive up to +10% bonus. It scales proportionally until you
                    reach the BPB cap amount.
                  </p>
                  <div className="mt-3 text-xs text-white/60">
                    BPB cap on Monad: <span className="text-white/80 font-semibold">75,000 bNote</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Share Rate */}
            <Card>
              <SectionTitle
                id="share-rate"
                title="Share Rate (Up-Only)"
                subtitle="The share rate protects earlier stakers and makes future shares more expensive."
              />
              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                The share rate can ratchet upward when a matured stake’s effective payout would otherwise
                allow more shares than it originally purchased. This “up-only” behavior is designed to
                protect earlier stakers and maintain fairness over time.
              </p>
            </Card>

            {/* Penalties */}
            <Card>
              <SectionTitle
                id="penalties"
                title="Early & Late Penalties"
                subtitle="Penalties scale linearly and can reduce payout if you end too early or too late."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="font-bold">Early End</div>
                  <p className="mt-2 text-sm text-white/80 leading-relaxed">
                    Ending before the unlock date applies an early penalty. It’s highest near the start and
                    decreases linearly toward zero at unlock.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="font-bold">Late End</div>
                  <p className="mt-2 text-sm text-white/80 leading-relaxed">
                    Ending long after unlock applies a late penalty. It starts at zero on unlock and increases
                    linearly the longer you wait.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/70">
                Note: App estimates are guidance; final on-chain results depend on exact block timestamps.
              </div>
            </Card>

            {/* Examples */}
            <Card>
              <SectionTitle
                id="examples"
                title="Worked Examples"
                subtitle="The Estimates panel updates live as you change stake amount and days."
              />
              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                Use the app’s Estimates panel to explore scenarios. Adjust amount and lock days to see how
                bonuses, shares, and unlock timing change.
              </p>
            </Card>

            {/* Using dApp */}
            <Card>
              <SectionTitle
                id="using-dapp"
                title="Using the dApp"
                subtitle="Where to start a stake, manage active stakes, and export your data."
              />
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>• Start a stake from the Actions area (Start a Stake).</li>
                <li>• Manage active stakes in Your Stakes.</li>
                <li>• End a stake using the End controls in the table (or by index, if available).</li>
                <li>• Export or copy table data as CSV when provided.</li>
              </ul>
            </Card>

            {/* Analytics */}
            <Card>
              <SectionTitle
                id="analytics"
                title="Analytics Explained"
                subtitle="KPIs and charts help you understand staking distribution and unlocks."
              />
              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                Analytics typically include price context, wallet value, estimated market cap, staked %
                metrics, share rate, and charts that visualize unlock timing and maturity buckets.
              </p>
            </Card>

            {/* Mobile Tips */}
            <Card>
              <SectionTitle
                id="mobile"
                title="Mobile Wallet Tips"
                subtitle="Best practices for staking from mobile wallets."
              />
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>• Use an in-app browser (MetaMask, Rabby, Trust, etc.) when possible.</li>
                <li>• If using WalletConnect, approve the session and allow popups as needed.</li>
                <li>• On iOS, disabling content blockers can help with signing flows.</li>
              </ul>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <SectionTitle
                id="troubleshooting"
                title="Troubleshooting"
                subtitle="Common fixes for connection and UI issues."
              />
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>• Connection issues: switch to Monad Mainnet, then reconnect.</li>
                <li>• WalletConnect issues: clear old sessions in your wallet and try again.</li>
                <li>• UI looks odd: hard refresh (Ctrl/Cmd + Shift + R).</li>
              </ul>
            </Card>

            {/* Glossary */}
            <Card>
              <SectionTitle
                id="glossary"
                title="Glossary"
                subtitle="Quick definitions."
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-semibold">Shares</div>
                  <div className="mt-1 text-sm text-white/75">
                    Internal accounting units that determine how yield accrues.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-semibold">Share Rate</div>
                  <div className="mt-1 text-sm text-white/75">
                    The “cost” of shares, designed to ratchet upward over time.
                  </div>
                </div>
              </div>
            </Card>

            {/* Links */}
            <Card>
              <SectionTitle
                id="links"
                title="Contract & Links"
                subtitle="Always verify addresses before interacting."
              />
              <div className="mt-4">
                <CopyField value={CONTRACT_ADDRESS} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button href={LINKS.explorer}>View on MonadScan</Button>
                <Button href={LINKS.uniswap} variant="secondary">
                  Open on Uniswap
                </Button>
                <Button href={LINKS.telegram} variant="secondary">
                  Telegram
                </Button>
              </div>
            </Card>

            {/* ✅ Treasury Vesting (NEW) */}
            <Card>
              <SectionTitle
                id="treasury-vesting"
                title="bNote Treasury Vesting"
                subtitle="A majority of supply is time-locked and released on-chain according to a fixed schedule."
              />

              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                To strengthen long-term alignment, improve transparency, and mitigate treasury risk, the bNote protocol
                uses a time-based treasury vesting structure on Monad. This ensures that a majority of the bNote supply
                cannot be moved or sold instantly, and is instead released gradually according to a deterministic,
                on-chain schedule. This change was made proactively to improve trust guarantees for users, liquidity
                providers, and third-party risk engines, and it has already resulted in the removal of external
                “suspicious token” warnings.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xs text-white/60">Blockchain</div>
                  <div className="mt-1 font-semibold">Monad</div>

                  <div className="mt-4 text-xs text-white/60">Token Contract Address</div>
                  <div className="mt-1 font-mono text-sm text-white/85 break-all">
                    0x20780bF9eb35235cA33c62976CF6de5AA3395561
                  </div>

                  <div className="mt-4 text-xs text-white/60">Vesting Contract Address</div>
                  <div className="mt-1 font-mono text-sm text-white/85 break-all">
                    0xA512Dd0e6C42775784AC8cA6c438AaD9A17a6596
                  </div>

                  <div className="mt-4 text-xs text-white/60">Beneficiary (Treasury Wallet)</div>
                  <div className="mt-1 font-mono text-sm text-white/85 break-all">
                    0x48b35f0cccfb48ef88adf583384ea41faf79d23c
                  </div>

                  <div className="mt-4 text-xs text-white/55 leading-relaxed">
                    Contract pattern: <span className="text-white/80 font-semibold">OpenZeppelin VestingWallet</span>{" "}
                    (industry-standard, audited pattern). The vesting contract is non-EOA and enforces a fixed release schedule.
                    Once tokens are transferred into it, there is no mechanism to bypass, accelerate, or drain vesting.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-xs text-white/60">Total Vested Amount</div>
                  <div className="mt-1 text-2xl font-black text-white">1,100,000 bNote</div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Total bNote Supply", "2,100,000"],
                      ["% Under Vesting", "~52.38%"],
                      ["Cliff", "3 months (90 days)"],
                      ["Vesting Duration", "24 months (730 days)"],
                      ["Release Type", "Linear after cliff"],
                      ["Approx. Monthly Rate", "~45,833 bNote"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-xs text-white/60">{k}</div>
                        <div className="mt-1 font-semibold text-white/85">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold text-white/70">Conceptual timeline</div>
                    <div className="mt-3 space-y-2 text-xs text-white/70">
                      <div className="flex items-center justify-between gap-3">
                        <span>Months 0–3</span>
                        <span className="text-white/85">Cliff period, no tokens released</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Month 4</span>
                        <span className="text-white/85">First release (~45,833 bNote)</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Months 5–27</span>
                        <span className="text-white/85">Continuous linear vesting</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>End of Month 27</span>
                        <span className="text-white/85">100% of vested tokens released</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-semibold text-white">On-chain verifiability</div>
                <p className="mt-2 text-sm text-white/80 leading-relaxed">
                  The vesting contract exposes standard view and release functions. Anyone can verify how many bNote are locked,
                  how many are releasable, and the beneficiary address directly on-chain.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="font-mono text-xs text-white/85">releasable(address token)</div>
                    <div className="mt-1 text-xs text-white/60">
                      Returns how many bNote can be released at the current time.
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="font-mono text-xs text-white/85">release(address token)</div>
                    <div className="mt-1 text-xs text-white/60">
                      Releases only the currently vested amount to the beneficiary.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-semibold text-white">Treasury distribution context (post-vesting)</div>
                <div className="mt-3 space-y-2 text-sm text-white/80">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">Vesting Contract</span>
                    <span className="font-semibold">~1,100,000 bNote</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">Dev Wallet</span>
                    <span className="font-semibold">~33,000 bNote</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">Liquidity Pools</span>
                    <span className="font-semibold">Remainder of circulating supply</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-white/55">
                  No single externally owned account controls a majority of bNote supply.
                </div>
              </div>
            </Card>

            {/* Disclaimer */}
            <Card>
              <SectionTitle
                id="disclaimer"
                title="Disclaimer"
                subtitle="Please read."
              />
              <p className="mt-4 text-sm text-white/80 leading-relaxed">
                This documentation is for informational purposes only and is not financial advice.
                Use at your own risk. Always verify links, contracts, and transactions before interacting.
              </p>
            </Card>

            <div className="pb-4 text-xs text-white/50">
              Docs content adapted and restructured from the original bNote staking reference.
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
