import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { canAccess, getSession } from "@/lib/auth";
import { devWorkspaceEnabled } from "@/lib/devGuard";
import { getPublicSiteConfig } from "@/lib/siteConfig";
import PublicHeaderNav from "./PublicHeaderNav";
import "./globals.css";

const config = getPublicSiteConfig();

export const metadata: Metadata = {
  metadataBase: process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL) : undefined,
  title: { default: config.serviceName, template: `%s | ${config.serviceName}` },
  description: "Professional websites for small and medium businesses in Finland, including design, development, launch and optional managed care.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020303",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const chatOnly = session?.role === "user";
  const showDev = devWorkspaceEnabled();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="topbar public-topbar">
          <Link className="brand" href="/">{config.serviceName.toLowerCase()}</Link>
          {session ? (
            chatOnly ? (
              <nav className="nav" aria-label="Private navigation">
                <Link href="/chat">Chat</Link>
                <a href="/api/auth/logout">logout</a>
              </nav>
            ) : (
              <nav className="nav" aria-label="Private navigation">
                <Link href="/">Public site</Link>
                <Link href="/dashboard">Dashboard</Link>
                {canAccess(session, "business") && <Link href="/business">Business</Link>}
                {canAccess(session, "email") && <Link href="/email">Email</Link>}
                {canAccess(session, "youtube") && <Link href="/youtube">YouTube</Link>}
                {showDev && canAccess(session, "dev") && <Link href="/dev">Dev</Link>}
                <Link href="/chat">Chat</Link>
                <span className="userpill">{session.username}:admin</span>
                <a href="/api/auth/logout">logout</a>
              </nav>
            )
          ) : <PublicHeaderNav loggedIn={false} />}
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
