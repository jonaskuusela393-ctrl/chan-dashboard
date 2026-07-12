import type { Metadata } from "next";
import LegalPageClient from "@/app/LegalPageClient";
import { getPublicSiteConfig } from "@/lib/siteConfig";
export const metadata: Metadata = { title: "Privacy notice" };
export default function Page() { return <LegalPageClient kind="privacy" config={getPublicSiteConfig()} />; }
