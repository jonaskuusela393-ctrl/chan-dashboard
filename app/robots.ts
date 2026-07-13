import type { MetadataRoute } from "next";

function publicBase() {
  const explicit = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const base = publicBase();
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/support", "/company", "/privacy", "/cookies", "/terms", "/accessibility", "/data-processing"],
      disallow: ["/api/", "/dashboard", "/business", "/email", "/chat", "/dev", "/youtube", "/login"],
    }],
    sitemap: `${base}/sitemap.xml`,
  };
}
