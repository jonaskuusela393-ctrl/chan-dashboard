import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getPublicSiteConfig } from "@/lib/siteConfig";
import PublicLandingClient from "./PublicLandingClient";

const config = getPublicSiteConfig();

export const metadata: Metadata = {
  title: "Websites that help businesses get found and contacted",
  description: "Professional Finnish business websites with clear pricing, documented ownership, complete launch and optional ongoing support.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${config.serviceName} — professional business websites`,
    description: "Get a clear estimate, a complete website build and optional ongoing support without technical confusion.",
    type: "website",
  },
};

export default async function PublicHome() {
  const session = await getSession();
  return (
    <PublicLandingClient
      config={config}
      loggedIn={Boolean(session)}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
    />
  );
}
