# Agartha Reef Frontend Folder Structure

This document outlines the organization of the Next.js frontend application.

## Core Structure

```text
frontend/
├── public/                 # Static assets (images, icons, videos)
├── src/                    # Source code
│   ├── app/                # Next.js App Router (Routing & Pages)
│   ├── components/         # React Components
│   ├── config/             # Site & App configurations
│   ├── hooks/              # Custom React Hooks
│   ├── lib/                # Utility functions & constants
│   ├── providers/          # React Context Providers
│   ├── services/           # External API & Data services
│   ├── styles/             # Theme & Global CSS logic
│   └── types/              # TypeScript definitions
├── tailwind.config.ts      # Tailwind CSS configuration
└── next.config.mjs         # Next.js configuration
```

## Detailed Breakdown

### `src/app/`
Contains the application's routes and global layouts.
- **`(marketing)/`**: A Route Group for all public-facing pages.
  - `layout.tsx`: Defines the header/footer shared across the landing page and marketing content.
  - `page.tsx`: The primary landing page (homepage).
  - `about/page.tsx`: The About Us page.
- **`api/`**: Backend-less API routes.
  - `health/route.ts`: A simple health check endpoint.
- **`layout.tsx`**: The root layout that wraps the entire application (HTML/Body tags).
- **`globals.css`**: Main CSS file importing Tailwind and defining global styles.

### `src/components/`
Organized by component responsibility.
- **`layout/`**: Structural components like `Header.tsx` and `Footer.tsx`.
- **`ui/`**: Atomic, reusable UI elements like `Button.tsx`.

### `src/hooks/`
Shared React logic.
- `useMediaQuery.ts`: Used for detecting screen sizes in JavaScript.

### `src/lib/`
- `utils.ts`: Includes `cn()` for merging Tailwind classes cleanly.
- `constants.ts`: Stores hardcoded strings, navigation links, and SEO metadata.

### `src/services/`
- `api.ts`: Centralized logic for fetching data from external APIs.

---

*Last Updated: April 25, 2026*
