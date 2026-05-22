# Agartha Kayak

Agartha Kayak is a blockchain-witnessed cooperative ledger for community credit groups. It helps cooperatives record memberships, loan requests, approvals, repayments, treasury activity, and public ledger events while keeping funds fully off-platform.

The application does not custody money. Members and elders continue to move funds in the real world; Agartha records the activity as a transparent digital ledger and can publish compact receipts to Cardano for tamper-resistant auditability.

## Features

- Wallet-based onboarding and authentication with Lace and Mesh SDK
- Role-aware dashboards for members, elders, owners, and platform administrators
- Peer and treasury loan request flows
- Elder approval workflows for loans, member registration, treasury changes, and gas top-ups
- Public records view for cooperative activity
- Supabase-backed API routes for members, communities, treasury, loans, and worker queues
- Cardano preprod integration through Blockfrost

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| UI | React, Tailwind CSS, Framer Motion, Lucide React, Recharts |
| Database | Supabase Postgres |
| Wallet | Mesh SDK, Lace wallet |
| Blockchain | Cardano preprod, Blockfrost |
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

### Install

Install root tooling:

```bash
npm install
```

Install the Next.js app:

```bash
cd web
npm install
```

### Environment Variables

Create `web/.env.local` from `web/.env.example` and provide the required values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BLOCKFROST_PROJECT_ID=your-preprod-blockfrost-project-id
WORKER_TRIGGER_SECRET=your-worker-secret
```

The live Supabase project is the database source of truth for this repository. Schema inspection and updates are handled directly through Supabase and the configured MCP server.

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

Run only the local worker:

```bash
cd web
npm run dev:worker
```

The app runs at `http://localhost:3000`.

## Scripts

From `web/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js and the local worker |
| `npm run dev:next` | Start only the Next.js dev server |
| `npm run dev:worker` | Start only the local Cardano sync worker |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run Next.js lint checks |
| `npm run test` | Run Vitest tests |
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

## Verification

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

## Security Notes

- Server-side Supabase operations use `SUPABASE_SERVICE_ROLE_KEY`; never expose it in client code.
- Wallet-signed write requests prove wallet ownership before protected mutations.
- Local environment files such as `.env.local` are intentionally ignored by Git.

## License

This project is currently licensed under the ISC license.
