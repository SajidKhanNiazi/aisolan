import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Bookzello Schema.org Graph Audit & Validation Suite", () => {
  const pages = [
    {
      name: "Homepage",
      path: "../../src/app/(marketing)/page.tsx",
      expectedUrl: "https://bookzello.com/",
      hasBreadcrumb: false,
    },
    {
      name: "Salon Management Software",
      path: "../../src/app/(marketing)/salon-management-software/page.tsx",
      expectedUrl: "https://bookzello.com/salon-management-software",
      hasBreadcrumb: true,
    },
    {
      name: "Barbershop Booking Software",
      path: "../../src/app/(marketing)/barbershop-booking-software/page.tsx",
      expectedUrl: "https://bookzello.com/barbershop-booking-software",
      hasBreadcrumb: true,
    },
    {
      name: "Spa Booking Software",
      path: "../../src/app/(marketing)/spa-booking-software/page.tsx",
      expectedUrl: "https://bookzello.com/spa-booking-software",
      hasBreadcrumb: true,
    },
    {
      name: "Pricing Page",
      path: "../../src/app/pricing/page.tsx",
      expectedUrl: "https://bookzello.com/pricing",
      hasBreadcrumb: true,
    },
  ];

  for (const page of pages) {
    describe(`Page Schema: ${page.name}`, () => {
      const fullPath = path.resolve(__dirname, page.path);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Extract jsonLd object
      const jsonMatch = content.match(/const jsonLd = (\{[\s\S]*?\n  \});/);
      expect(jsonMatch).not.toBeNull();

      // Evaluate the JSON-LD string safely using Function
      const jsonLd = new Function("faqData", "pricingFaq", `return ${jsonMatch![1]};`)(
        [
          { question: "Q1", answer: "A1" },
          { question: "Q2", answer: "A2" },
        ],
        [
          { q: "Q1", a: "A1" },
          { q: "Q2", a: "A2" },
        ]
      );

      it("has valid Schema.org context and graph container", () => {
        expect(jsonLd["@context"]).toBe("https://schema.org");
        expect(Array.isArray(jsonLd["@graph"])).toBe(true);
        expect(jsonLd["@graph"].length).toBeGreaterThanOrEqual(4);
      });

      it("maintains a unified, consistent Organization entity", () => {
        const org = jsonLd["@graph"].find((e: Record<string, unknown>) => e["@type"] === "Organization");
        expect(org).toBeDefined();
        expect(org["@id"]).toBe("https://bookzello.com/#organization");
        expect(org.name).toBe("Bookzello");
        expect(org.url).toBe("https://bookzello.com/");
        expect(org.logo).toEqual({
          "@type": "ImageObject",
          "@id": "https://bookzello.com/#logo",
          url: "https://bookzello.com/icon-512.png",
          width: 512,
          height: 512,
          caption: "Bookzello Logo",
        });
        expect(org.sameAs).toEqual([
          "https://www.instagram.com/bookzello/",
          "https://web.facebook.com/profile.php?id=61595843493664",
        ]);
      });

      it("maintains a unified, consistent WebSite entity referencing Organization", () => {
        const site = jsonLd["@graph"].find((e: Record<string, unknown>) => e["@type"] === "WebSite");
        expect(site).toBeDefined();
        expect(site["@id"]).toBe("https://bookzello.com/#website");
        expect(site.url).toBe("https://bookzello.com/");
        expect(site.name).toBe("Bookzello");
        expect(site.publisher).toEqual({
          "@id": "https://bookzello.com/#organization",
        });
      });

      it("maintains a single canonical SoftwareApplication identity (#software)", () => {
        const app = jsonLd["@graph"].find((e: Record<string, unknown>) => e["@type"] === "SoftwareApplication");
        expect(app).toBeDefined();
        expect(app["@id"]).toBe("https://bookzello.com/#software");
        expect(app.applicationCategory).toBe("BusinessApplication");
        expect(app.operatingSystem).toBe("Web");
        expect(app.publisher).toEqual({
          "@id": "https://bookzello.com/#organization",
        });
        // Must NOT have incomplete offer or fake ratings
        expect(app.aggregateRating).toBeUndefined();
        expect(app.review).toBeUndefined();
      });

      it("declares a page-specific WebPage entity with stable @id and valid relations", () => {
        const webPage = jsonLd["@graph"].find((e: Record<string, unknown>) => e["@type"] === "WebPage");
        expect(webPage).toBeDefined();
        expect(webPage["@id"]).toBe(`${page.expectedUrl}#webpage`);
        expect(webPage.url).toBe(page.expectedUrl);
        expect(webPage.isPartOf).toEqual({
          "@id": "https://bookzello.com/#website",
        });
        expect(webPage.about).toEqual({
          "@id": "https://bookzello.com/#software",
        });
        expect(webPage.publisher).toEqual({
          "@id": "https://bookzello.com/#organization",
        });
      });

      if (page.hasBreadcrumb) {
        it("declares a valid BreadcrumbList matching the navigation hierarchy", () => {
          const breadcrumbs = jsonLd["@graph"].find((e: Record<string, unknown>) => e["@type"] === "BreadcrumbList");
          expect(breadcrumbs).toBeDefined();
          expect(breadcrumbs["@id"]).toBe(`${page.expectedUrl}#breadcrumb`);
          expect(Array.isArray(breadcrumbs.itemListElement)).toBe(true);
          expect(breadcrumbs.itemListElement[0].position).toBe(1);
          expect(breadcrumbs.itemListElement[0].item).toBe("https://bookzello.com/");
          expect(breadcrumbs.itemListElement[1].position).toBe(2);
          expect(breadcrumbs.itemListElement[1].item).toBe(page.expectedUrl);
        });
      }

      it("includes a valid FAQPage entity with questions and answers", () => {
        const faq = jsonLd["@graph"].find((e: Record<string, unknown>) => e["@type"] === "FAQPage");
        expect(faq).toBeDefined();
        expect(faq["@id"]).toBe(`${page.expectedUrl}#faq`);
        expect(Array.isArray(faq.mainEntity)).toBe(true);
        expect(faq.mainEntity.length).toBeGreaterThanOrEqual(1);
        for (const item of faq.mainEntity) {
          expect(item["@type"]).toBe("Question");
          expect(typeof item.name).toBe("string");
          expect(item.acceptedAnswer["@type"]).toBe("Answer");
          expect(typeof item.acceptedAnswer.text).toBe("string");
        }
      });
    });
  }
});
