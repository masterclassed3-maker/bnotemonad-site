import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "bNote on Monad | Time-Locked Staking Protocol",
  description:
    "bNote is a staking-focused token on Monad designed to reward long-term participation through time-locked incentives.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
