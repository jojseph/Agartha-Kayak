import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Agartha Reef. All rights reserved.
      </div>
    </footer>
  );
}
