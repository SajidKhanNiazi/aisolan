import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || "https://bookzello.com";
  const baseUrl = rawUrl.trim().replace(/[\r\n]+/g, "").replace(/\/+$/, "") || "https://bookzello.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/salon-management-software",
          "/barbershop-booking-software",
          "/spa-booking-software",
          "/pricing",
          "/booking",
          "/login",
          "/signup",
          "/privacy",
          "/terms",
          "/data-deletion",
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
