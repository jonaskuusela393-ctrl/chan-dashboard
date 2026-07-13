import type { Metadata } from "next";
import { getPublicSiteConfig } from "@/lib/siteConfig";
import ClientSupportClient from "../ClientSupportClient";

const config = getPublicSiteConfig();

export const metadata: Metadata = {
  title: "Client support",
  description: "Submit a website change, question or fault report using a private project code. No customer login is required.",
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return <ClientSupportClient serviceName={config.serviceName} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}/>;
}
