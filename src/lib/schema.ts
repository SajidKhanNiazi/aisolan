/**
 * Unified Schema.org Structured Data Builders for Bookzello
 * Follows Google Search Central & Schema.org guidelines.
 * Uses a single connected @graph per page with stable entity @ids.
 */

export const SCHEMA_CONSTANTS = {
  ORGANIZATION_ID: "https://bookzello.com/#organization",
  WEBSITE_ID: "https://bookzello.com/#website",
  SOFTWARE_ID: "https://bookzello.com/#software",
  LOGO_URL: "https://bookzello.com/icon-512.png",
  SAME_AS: [
    "https://www.instagram.com/bookzello/",
    "https://web.facebook.com/profile.php?id=61595843493664",
  ],
} as const;

export interface FaqItem {
  question: string;
  answer: string;
}

export function getOrganizationEntity() {
  return {
    "@type": "Organization",
    "@id": SCHEMA_CONSTANTS.ORGANIZATION_ID,
    name: "Bookzello",
    url: "https://bookzello.com/",
    logo: {
      "@type": "ImageObject",
      "@id": "https://bookzello.com/#logo",
      url: SCHEMA_CONSTANTS.LOGO_URL,
      width: 512,
      height: 512,
      caption: "Bookzello Logo",
    },
    sameAs: [...SCHEMA_CONSTANTS.SAME_AS],
  };
}

export function getWebSiteEntity() {
  return {
    "@type": "WebSite",
    "@id": SCHEMA_CONSTANTS.WEBSITE_ID,
    url: "https://bookzello.com/",
    name: "Bookzello",
    description: "Online salon booking software, staff scheduling, and appointment management for beauty and wellness businesses.",
    publisher: {
      "@id": SCHEMA_CONSTANTS.ORGANIZATION_ID,
    },
  };
}

export function getSoftwareApplicationEntity() {
  return {
    "@type": "SoftwareApplication",
    "@id": SCHEMA_CONSTANTS.SOFTWARE_ID,
    name: "Bookzello Salon Booking Software",
    url: "https://bookzello.com/",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Online appointment booking, staff availability, and daily calendar management software for hair salons, barbershops, and spas.",
    featureList: [
      "24/7 online client appointment booking",
      "Individual staff schedules and working hours",
      "Automatic double-booking prevention with buffer times",
      "Centralized daily appointment dashboard",
      "AI chatbot receptionist for booking inquiries",
    ],
    publisher: {
      "@id": SCHEMA_CONSTANTS.ORGANIZATION_ID,
    },
  };
}

export function getWebPageEntity({
  url,
  name,
  description,
  breadcrumbId,
}: {
  url: string;
  name: string;
  description: string;
  breadcrumbId?: string;
}) {
  const entity: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: {
      "@id": SCHEMA_CONSTANTS.WEBSITE_ID,
    },
    about: {
      "@id": SCHEMA_CONSTANTS.SOFTWARE_ID,
    },
    publisher: {
      "@id": SCHEMA_CONSTANTS.ORGANIZATION_ID,
    },
  };

  if (breadcrumbId) {
    entity.breadcrumb = {
      "@id": breadcrumbId,
    };
  }

  return entity;
}

export function getBreadcrumbListEntity({
  pageUrl,
  pageName,
}: {
  pageUrl: string;
  pageName: string;
}) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://bookzello.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: pageUrl,
      },
    ],
  };
}

export function getFaqPageEntity({
  pageUrl,
  faqs,
}: {
  pageUrl: string;
  faqs: FaqItem[];
}) {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Builds homepage schema graph
 */
export function buildHomepageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationEntity(),
      getWebSiteEntity(),
      getSoftwareApplicationEntity(),
      getWebPageEntity({
        url: "https://bookzello.com/",
        name: "Salon Booking Software That Keeps Every Appointment Organized",
        description: "Bookzello brings online salon booking, staff availability, and appointment management into one system. Manage your team's daily calendar without juggling separate lists.",
        breadcrumbId: undefined,
      }),
      getFaqPageEntity({
        pageUrl: "https://bookzello.com/",
        faqs,
      }),
    ],
  };
}

/**
 * Builds inner landing page schema graph
 */
export function buildLandingPageSchema({
  url,
  name,
  description,
  breadcrumbName,
  faqs,
}: {
  url: string;
  name: string;
  description: string;
  breadcrumbName: string;
  faqs: FaqItem[];
}) {
  const breadcrumbId = `${url}#breadcrumb`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      getOrganizationEntity(),
      getWebSiteEntity(),
      getSoftwareApplicationEntity(),
      getWebPageEntity({
        url,
        name,
        description,
        breadcrumbId,
      }),
      getBreadcrumbListEntity({
        pageUrl: url,
        pageName: breadcrumbName,
      }),
      getFaqPageEntity({
        pageUrl: url,
        faqs,
      }),
    ],
  };
}

/**
 * Builds pricing page schema graph
 */
export function buildPricingPageSchema(faqs?: FaqItem[]) {
  const url = "https://bookzello.com/pricing";
  const breadcrumbId = `${url}#breadcrumb`;

  const graph: Array<Record<string, unknown>> = [
    getOrganizationEntity(),
    getWebSiteEntity(),
    getSoftwareApplicationEntity(),
    getWebPageEntity({
      url,
      name: "Bookzello Pricing & Plans",
      description: "Early Access — Pricing to Be Announced. Explore Bookzello salon booking software and AI receptionist capabilities.",
      breadcrumbId,
    }),
    getBreadcrumbListEntity({
      pageUrl: url,
      pageName: "Pricing & Plans",
    }),
  ];

  if (faqs && faqs.length > 0) {
    graph.push(
      getFaqPageEntity({
        pageUrl: url,
        faqs,
      })
    );
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
