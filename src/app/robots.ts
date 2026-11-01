import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/booking",
          "/login",
          "/signup",
          "/privacy",
          "/terms",
          "/data-deletion",
          "/salon-management-software",
        ],
        disallow: [
          "/dashboard/",
          "/api/",
          "/manage-booking/",
          "/reset-password",
          "/auth/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
