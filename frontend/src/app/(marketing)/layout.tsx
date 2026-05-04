import React from "react";

/**
 * Marketing route group layout.
 * Simplified to allow the new landing page to manage its own Header/Footer.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main>{children}</main>
  );
}
