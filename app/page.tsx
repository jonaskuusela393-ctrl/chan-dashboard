import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getPublicSiteConfig } from "@/lib/siteConfig";
import PublicLandingClient from "./PublicLandingClient";

const config = getPublicSiteConfig();

export const metadata: Metadata = {
  title: "Business websites built, launched and managed",
  description: "Clear website packages for small and medium businesses: design, development, deployment, domain connection, forms and optional managed support.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${config.serviceName} — business websites built and managed`,
    description: "Get a clear project estimate, a complete website build and optional ongoing support.",
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
