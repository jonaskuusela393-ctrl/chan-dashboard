import type { Metadata } from "next";
import LegalPageClient from "@/app/LegalPageClient";
import { getPublicSiteConfig } from "@/lib/siteConfig";
export const metadata: Metadata = { title: "B2B service terms" };
export default function Page() { return <LegalPageClient kind="terms" config={getPublicSiteConfig()} />; }
