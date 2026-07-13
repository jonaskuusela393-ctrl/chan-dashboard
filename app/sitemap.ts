import type { MetadataRoute } from "next";

function publicBase() {
  const explicit = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicBase();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.35 },
    { url: `${base}/company`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.25 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/accessibility`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/data-processing`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
