import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Private Dashboard",
    template: "%s · Private Dashboard",
  },
  description: "Custom private read-only dashboard",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#05070a",
};

const navItems = [
  { href: "/chan", label: "4chan" },
  { href: "/dreamviews", label: "DreamViews" },
  { href: "/movies", label: "Movies" },
  { href: "/youtube", label: "YouTube" },
  { href: "/llm", label: "LLM" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="topbar">
          <Link href="/" className="brand" aria-label="Go to dashboard home">
            private viewport
          </Link>

          <nav aria-label="Main navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="shell">{children}</main>
      </body>
    </html>
  );
}