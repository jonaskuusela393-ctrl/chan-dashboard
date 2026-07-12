import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import PublicLandingClient from "./PublicLandingClient";

const serviceName = process.env.NEXT_PUBLIC_SERVICE_NAME || "Jonas Web Studio";

export const metadata: Metadata = {
  title: "Business websites built and managed",
  description: "Complete websites for small and medium businesses: design, development, deployment, domain connection, forms and optional managed support.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Business websites built and managed",
    description: "Get a clear project estimate, a complete website build and optional ongoing support.",
    type: "website",
  },
};

export default async function PublicHome() {
  const session = await getSession();
  return (
    <PublicLandingClient
      serviceName={serviceName}
      serviceEmail={process.env.NEXT_PUBLIC_SERVICE_EMAIL || ""}
      serviceLocation={process.env.NEXT_PUBLIC_SERVICE_LOCATION || "Finland"}
      loggedIn={Boolean(session)}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
    />
  );
}
