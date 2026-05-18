/**
 * Site-wide configuration.
 * Used by layout metadata, SEO, and shared UI.
 */

export const siteConfig = {
  name: "Agartha Kayak",
  description: "Explore the depths of Agartha Kayak",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og-image.png",
  links: {
    twitter: "",
    github: "",
  },
};
