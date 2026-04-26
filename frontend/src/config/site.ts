/**
 * Site-wide configuration.
 * Used by layout metadata, SEO, and shared UI.
 */

export const siteConfig = {
  name: "Agartha Reef",
  description: "Explore the depths of Agartha Reef",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og-image.png",
  links: {
    twitter: "",
    github: "",
  },
};
