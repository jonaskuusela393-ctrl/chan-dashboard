import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { canAccess, getSession } from "@/lib/auth";
import { devWorkspaceEnabled } from "@/lib/devGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Terminal Viewport",
  description: "Private terminal dashboard for chat, browsing, local leads, email, and mobile coding",
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
        <header className="topbar">
          <Link className="brand" href={chatOnly ? "/chat" : "/"}>{chatOnly ? "chat" : "black viewport"}</Link>
          <nav className="nav" aria-label="Main navigation">
            {session ? (
              chatOnly ? (
                <>
                  <Link href="/chat">Chat</Link>
                  <a href="/api/auth/logout">logout</a>
                </>
              ) : (
                <>
                  {canAccess(session, "chan") && <Link href="/chan">4chan</Link>}
                  {canAccess(session, "reddit") && <Link href="/reddit">Reddit</Link>}
                  {canAccess(session, "youtube") && <Link href="/youtube">YouTube</Link>}
                  {canAccess(session, "business") && <Link href="/business">Money</Link>}
                  {canAccess(session, "email") && <Link href="/email">Email</Link>}
                  {showDev && canAccess(session, "dev") && <Link href="/dev">Dev</Link>}
                  <Link href="/chat">Chat</Link>
                  <span className="userpill">{session.username}:admin</span>
                  <a href="/api/auth/logout">logout</a>
                </>
              )
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
