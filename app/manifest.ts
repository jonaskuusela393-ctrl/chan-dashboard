import type { MetadataRoute } from "next";
import { getPublicSiteConfig } from "@/lib/siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  const config = getPublicSiteConfig();
  return {
    name: config.serviceName,
    short_name: config.serviceName,
    description: "Professional websites and managed digital services for businesses.",
    start_url: "/",
    display: "standalone",
    background_color: "#030805",
    theme_color: "#030805",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
