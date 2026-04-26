import React from "react";
import { Header } from "@/components/layout";
import { Footer } from "@/components/layout";

/**
 * Marketing route group layout.
 * Wraps public-facing pages with Header + Footer.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-8rem)]">{children}</main>
      <Footer />
    </>
  );
}
