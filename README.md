<div align="center">
  <img src="web/src/app/icon.svg" alt="Agartha Kayak logo" width="96" />

  <h1>Agartha Kayak</h1>

  <p>
    <strong>A blockchain-witnessed cooperative ledger for community credit groups.</strong>
  </p>

  <p>
    Record member activity, loan approvals, treasury movement, repayments, and public audit events without taking custody of community funds.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs" alt="Next.js 14" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=0B1720" alt="React 18" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Cardano-Preprod-0033AD?style=for-the-badge&logo=cardano&logoColor=white" alt="Cardano Preprod" />
    <img src="https://img.shields.io/badge/License-ISC-blue?style=for-the-badge" alt="ISC License" />
  </p>
</div>

## Overview

Agartha Kayak is a full-stack Next.js application for cooperatives that need transparent records around community credit. It supports member registration, role-aware dashboards, peer and treasury loan flows, elder approvals, repayment tracking, public records, and optional Cardano metadata receipts.

The platform is intentionally non-custodial. Money still moves through the cooperative's existing real-world process; Agartha Kayak records what happened, who approved it, and what should be visible to the community.

## Why It Exists

Small cooperatives often rely on trust, notebooks, spreadsheets, and verbal approvals. Agartha Kayak gives those groups a shared digital record with clear permissions and audit trails.

| Problem | Agartha Kayak approach |
| --- | --- |
| Loan decisions are hard to audit | Elder approvals and rejections are recorded with wallet-authenticated actions |
| Treasury activity can become unclear | Treasury requests, balances, gas proposals, and reconciliations are tracked |
| Members need visibility | Public records expose cooperative activity without revealing unnecessary private data |
| Blockchain records are expensive to write one by one | Worker queues batch compact metadata receipts to Cardano preprod |

## Features

- Wallet-based onboarding and authentication with Lace and Mesh SDK
- Role-aware dashboards for members, elders, owners, and platform administrators
- Peer-to-peer and treasury-backed loan request flows
- Elder approval workflows for loans, membership, treasury changes, and gas top-ups
- Public cooperative record board with privacy-aware visibility controls
- Supabase-backed API routes for members, communities, treasury, loans, and worker queues
- Cardano preprod metadata receipts through Blockfrost
- Local worker for queue processing and on-chain batch submission
- Vitest coverage for auth and balance operation behavior

## Tech Stack

| Layer | Tools |
| --- | --- |
| Framework | Next.js 14 App Router |
| Frontend | React 18, TypeScript |
| Styling | Tailwind CSS 3.4, PostCSS, clsx, tailwind-merge |
| UI and Data Visualization | Framer Motion, Lucide React, Recharts |
| Database | Supabase Postgres |
| Wallet | Lace, Mesh SDK |
| Blockchain | Cardano preprod, Blockfrost |
| Worker Runtime | Node.js, dotenv-cli, concurrently |
| Testing | Vitest |
| Tooling | ESLint, Husky, Commitlint, Commitizen |

## Repository Structure

```text
Agartha-Kayak/
|-- web/                       # Full-stack Next.js application
|   |-- public/                # Static media and image assets
|   |-- scripts/               # Local worker scripts
|   |-- src/
|   |   |-- app/               # App Router pages, layouts, and API routes
|   |   |-- components/        # Reusable React components
|   |   |-- config/            # Site configuration
|   |   |-- hooks/             # Shared React hooks
|   |   |-- lib/               # Auth, Supabase, Cardano, and utility logic
|   |   |-- providers/         # React context providers
|   |   |-- services/          # API client helpers
|   |   |-- styles/            # Font and style helpers
|   |   `-- types/             # Shared TypeScript types
|   |-- tests/                 # Vitest test suite
|   `-- package.json           # App scripts and dependencies
|-- package.json               # Root Git tooling
`-- README.md
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Supabase project
- Blockfrost project ID for Cardano preprod
- Lace wallet configured for Cardano preprod

### Installation

Install root tooling:

```bash
npm install
```

Install the application dependencies:

```bash
cd web
npm install
```

### Environment

Create `web/.env.local` from `web/.env.example`, then fill in the required values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BLOCKFROST_PROJECT_ID=your-preprod-blockfrost-project-id
CARDANO_SUBMITTER_SKEY=your-preprod-signing-key
CARDANO_SUBMITTER_ADDRESS=addr_test1...
WORKER_TRIGGER_SECRET=your-worker-secret
```

The live Supabase project is the database source of truth. Schema inspection and updates are handled through Supabase and the configured MCP server.

### Development

Run the Next.js app and local worker together:

```bash
cd web
npm run dev
```

Run only the web app:

```bash
cd web
npm run dev:next
```

Run only the local Cardano worker:

```bash
cd web
npm run dev:worker
```

The application runs at:

```text
http://localhost:3000
```

## Scripts

From `web/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js and the local worker |
| `npm run dev:next` | Start only the Next.js development server |
| `npm run dev:worker` | Start only the local Cardano sync worker |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run Next.js lint checks |
| `npm run test` | Run the Vitest suite |
| `npm run test:watch` | Run Vitest in watch mode |

From the repository root:

| Command | Description |
| --- | --- |
| `npm run commit` | Create a conventional commit with Commitizen |

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/about` | Project overview |
| `/faq` | Frequently asked questions |
| `/how-it-works` | Product walkthrough |
| `/public-records` | Public cooperative ledger view |
| `/walletAuth` | Wallet connection and registration |
| `/dashboard` | Main role-aware user dashboard |
| `/admin` | Platform administration |
| `/admin/applications` | SuperUser application review |

## Quality Checks

Run tests:

```bash
cd web
npm run test
```

Create a production build:

```bash
cd web
npm run build
```

## Security Model

- Server-side Supabase operations use `SUPABASE_SERVICE_ROLE_KEY`; never expose it in client code.
- Wallet-signed write requests prove wallet ownership before protected mutations.
- The application records cooperative activity but does not custody funds.
- Local environment files such as `.env.local` are intentionally ignored by Git.
- Cardano metadata submissions should use a funded preprod wallet with limited operational scope.

## Contributing

Contributions should use conventional commit messages. The repository includes Commitizen, Commitlint, and Husky to keep commit history readable.

```bash
npm run commit
```

Before opening or merging changes, run:

```bash
cd web
npm run test
npm run build
```

## License

This project is licensed under the ISC license.
