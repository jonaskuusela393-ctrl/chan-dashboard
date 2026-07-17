import type { Metadata, Viewport } from "next";
import { canAccess, getSession } from "@/lib/auth";
import { devWorkspaceEnabled } from "@/lib/devGuard";
import { getPublicSiteConfig } from "@/lib/siteConfig";
import SiteHeader from "./SiteHeader";
import AnalyticsClient from "./AnalyticsClient";
import CookieConsent from "./CookieConsent";
import "./globals.css";

const config = getPublicSiteConfig();

export const metadata: Metadata = {
  metadataBase: process.env.APP_BASE_URL ? new URL(process.env.APP_BASE_URL) : undefined,
  title: { default: config.serviceName, template: `%s | ${config.serviceName}` },
  description: "Clear, professional websites for small and medium businesses in Finland, from planning and launch to ongoing support.",
  applicationName: config.serviceName,
  category: "business",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030805",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const showDev = devWorkspaceEnabled();
  const sessionInfo = session ? { username: session.username, role: session.role } : null;
  const access = {
    business: Boolean(session && canAccess(session, "business")),
    email: Boolean(session && canAccess(session, "email")),
    youtube: Boolean(session && canAccess(session, "youtube")),
    dev: Boolean(session && canAccess(session, "dev")),
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader serviceName={config.serviceName} session={sessionInfo} access={access} showDev={showDev} />
        <main id="main-content" className="shell">{children}</main>
        <AnalyticsClient/>
        <CookieConsent/>
      </body>
    </html>
  );
}
