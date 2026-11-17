import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/guide", "/faq", "/teach", "/teachers/", "/student/search"],
      disallow: [
        "/admin",
        "/account",
        "/api/",
        "/auth/",
        "/sessions/",
        "/student/bookings",
        "/student/payment",
        "/student/chat",
        "/student/profile",
        "/teacher/",
      ],
    },
    ...(process.env.APP_ORIGIN
      ? { sitemap: `${process.env.APP_ORIGIN}/sitemap.xml` }
      : {}),
  };
}
