import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!process.env.APP_ORIGIN) return [];
  return [
    "/student",
    "/teacher",
    "/student/search",
    "/student/teachers",
    "/guide",
    "/faq",
    "/teach",
  ].map((path) => ({
    url: new URL(path, process.env.APP_ORIGIN).toString(),
    changeFrequency: "weekly" as const,
  }));
}
