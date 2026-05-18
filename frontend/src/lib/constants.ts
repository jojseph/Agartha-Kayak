/**
 * Application-wide constants.
 * Keep all magic strings and configuration values here.
 */

export const SITE_NAME = "Agartha Kayak";
export const SITE_DESCRIPTION = "Explore the depths of Agartha Kayak";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
