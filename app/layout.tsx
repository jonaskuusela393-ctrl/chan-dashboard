import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Terminal Viewport",
  description: "Private terminal dashboard for 4chan, Reddit, YouTube, and chat",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020303",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="topbar">
          <Link className="brand" href="/">black viewport</Link>
          <nav className="nav" aria-label="Main navigation">
            {session ? (
              <>
                <Link href="/chan">4chan</Link>
                <Link href="/reddit">Reddit</Link>
                <Link href="/youtube">YouTube</Link>
                <Link href="/chat">Chat</Link>
                <span className="userpill">{session.username}:{session.role}</span>
                <a href="/api/auth/logout">logout</a>
              </>
            ) : (
              <Link href="/login">login</Link>
            )}
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
