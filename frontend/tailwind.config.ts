import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#681CFF",
        secondary: "#FD3F83"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "tenon", "sans-serif"],
        tenon: ["tenon", "sans-serif"],
        space: ["var(--font-heading)", "SpaceWeb", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
