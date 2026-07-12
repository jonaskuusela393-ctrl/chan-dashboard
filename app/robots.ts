import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_BASE_URL || "https://example.com").replace(/\/$/, "");
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/company", "/privacy", "/cookies", "/terms", "/accessibility", "/data-processing"],
      disallow: ["/api/", "/dashboard", "/business", "/email", "/chat", "/dev", "/youtube", "/login"],
    }],
    sitemap: `${base}/sitemap.xml`,
  };
}
