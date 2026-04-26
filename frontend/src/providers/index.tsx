"use client";

import React from "react";

/**
 * Root providers wrapper.
 * Add ThemeProvider, QueryClientProvider, etc. here.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
