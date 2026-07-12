import type { Metadata } from "next";
import LegalPageClient from "@/app/LegalPageClient";
import { getPublicSiteConfig } from "@/lib/siteConfig";
export const metadata: Metadata = { title: "Data-processing principles" };
export default function Page() { return <LegalPageClient kind="data-processing" config={getPublicSiteConfig()} />; }
