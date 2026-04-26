"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to evaluate a CSS media query.
 * @param query - A valid CSS media query string, e.g. "(min-width: 768px)"
 * @returns `true` if the media query matches, `false` otherwise.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
