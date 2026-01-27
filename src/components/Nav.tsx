import Link from "next/link";
import Image from "next/image";
import { Container } from "./Container";
import { Button } from "./Button";
import { LINKS } from "@/lib/constants";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Buy", href: "#buy" },
  { label: "Stake", href: "#stake" },
  { label: "Token", href: "#token" },
  { label: "FAQ", href: "#faq" },
  { label: "Community", href: "#community" },
];

export function Nav() {
  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/70 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="bNote logo"
              width={28}
              height={28}
              className="rounded-sm"
              priority
            />

            <span className="text-lg font-black tracking-tight">bNote</span>

            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
              Monad
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((i) => (
              <a
                key={i.href}
                href={i.href}
                className="text-sm text-white/70 hover:text-white transition"
              >
                {i.label}
              </a>
            ))}

            {/* Stats link (separate from anchor sections) */}
            <Link
              href="/stats"
              className="text-sm text-white/70 hover:text-white transition"
            >
              Stats
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button href="/stats" variant="secondary" className="hidden sm:inline-flex">
              Stats
            </Button>

            <Button href={LINKS.stake} className="hidden sm:inline-flex">
              Open App
            </Button>

            <Button href={LINKS.telegram} variant="secondary">
              Telegram
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
