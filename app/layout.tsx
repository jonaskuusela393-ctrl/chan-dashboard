import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { canAccess, getSession } from "@/lib/auth";
import { devWorkspaceEnabled } from "@/lib/devGuard";
import "./globals.css";

const serviceName = process.env.NEXT_PUBLIC_SERVICE_NAME || "Jonas Web Studio";

export const metadata: Metadata = {
  metadataBase: process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL) : undefined,
  title: { default: serviceName, template: `%s | ${serviceName}` },
  description: "Business websites, deployment and managed support.",
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
          <Link className="brand" href="/">{serviceName.toLowerCase()}</Link>
          <nav className="nav" aria-label="Main navigation">
            {session ? (
              chatOnly ? (
                <>
                  <Link href="/chat">Chat</Link>
                  <a href="/api/auth/logout">logout</a>
                </>
              ) : (
                <>
                  <Link href="/">Public site</Link>
                  <Link href="/dashboard">Dashboard</Link>
                  {canAccess(session, "business") && <Link href="/business">Business</Link>}
                  {canAccess(session, "email") && <Link href="/email">Email</Link>}
                  {canAccess(session, "youtube") && <Link href="/youtube">YouTube</Link>}
                  {showDev && canAccess(session, "dev") && <Link href="/dev">Dev</Link>}
                  <Link href="/chat">Chat</Link>
                  <span className="userpill">{session.username}:admin</span>
                  <a href="/api/auth/logout">logout</a>
                </>
              )
            ) : (
              <>
                <a href="/#services">Services</a>
                <a href="/#estimate">Estimate</a>
                <a href="/#contact">Contact</a>
                <Link href="/login">Private login</Link>
              </>
            )}
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
