import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_BASE_URL || "https://example.com";
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/privacy", "/terms"], disallow: ["/api/", "/dashboard", "/business", "/email", "/chat", "/dev", "/youtube", "/login"] },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
