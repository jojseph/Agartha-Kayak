# Agartha Kayak

A blockchain-witnessed cooperative ledger for Filipino credit cooperatives. Agartha digitizes the trust layer of a community lending group — recording every contribution, loan agreement, approval vote, and repayment as a tamper-proof receipt on the Cardano blockchain.

The platform never holds funds. It is an **immutable witness, not a custodial vault**: members and elders move money in the real world, and Agartha permanently records that it happened. Multi-tenant by design — multiple cooperatives can run on a single deployment, each with its own treasury, governance, and membership.

For the full philosophy, governance model, and workflow, see [`Agartha-Blockchain (1).md`](./Agartha-Blockchain%20%281%29.md). For the phased delivery plan, see [`MVP_Implementation_Plan.md`](./MVP_Implementation_Plan.md). For current limitations and known gaps, see [`PatchNotes.md`](./PatchNotes.md). Architecture and outstanding-work documents (`ARCHI.md`, `TODO.md`) are maintained outside the repo by the project owner.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 18, [Tailwind CSS](https://tailwindcss.com/) 3.4, [Framer Motion](https://motion.dev/), [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/) |
| Wallet | [Mesh SDK](https://meshjs.dev/) (`@meshsdk/core`, `@meshsdk/react`) — Cardano wallet integration (Lace) |
| Blockchain | [Blockfrost](https://blockfrost.io/) on Cardano `preprod` for on-chain reads/verification |
| Database | [Supabase](https://supabase.com/) (Postgres + Service Role client for server routes) |
| Tooling | ESLint, Husky, Commitlint (conventional commits), Commitizen, PostCSS |

---

## Project Structure

```text
Agartha-Kayak/
├── .husky/                       # Git hooks (commit-msg, pre-commit)
├── frontend/                     # Next.js application (UI + API routes)
│   ├── migrations/               # Supabase SQL migrations
│   │   ├── phase1_mvp_restructure.sql
│   │   └── add_onchain_queue.sql
│   ├── public/                   # Static assets (videos, images, icons)
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── (marketing)/      # Public pages: landing, about, faq, how-it-works
│   │   │   ├── api/              # API route handlers
│   │   │   │   ├── admin/        # SuperUser endpoints (communities, members)
│   │   │   │   ├── community/    # queue, stats
│   │   │   │   ├── dashboard/    # pending-counts
│   │   │   │   ├── loans/        # peer, treasury, repayment, requests, check-overdue
│   │   │   │   ├── members/      # register, approve, pending, search
│   │   │   │   └── treasury/     # reconciliation propose/sign/pending
│   │   │   ├── Admin/            # Platform admin dashboard
│   │   │   ├── dashboardTest/    # Role-based dashboards (member/elder/owner)
│   │   │   ├── pool/             # Treasury pool views
│   │   │   ├── vaultTest/        # Post-registration confirmation page
│   │   │   ├── walletAuthTest/   # Wallet connect + registration flow
│   │   │   ├── layout.tsx        # Root layout (Mesh provider, fonts)
│   │   │   └── globals.css       # Global Tailwind + theme styles
│   │   ├── components/           # UI, layout, pool, and wallet components
│   │   ├── config/site.ts        # Site metadata
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # blockfrost, supabaseAdmin, trustEngine, enqueueReceipt, utils
│   │   ├── providers/            # React context providers
│   │   ├── services/api.ts       # Centralized fetch helpers
│   │   ├── styles/fonts.ts       # Font loaders (Tenon, SpaceWeb)
│   │   ├── types/                # Shared TypeScript types
│   │   └── middleware.ts         # Next.js middleware (pass-through; auth guard TBD)
│   ├── supabase_schema           # Reference SQL schema (read-only, do not execute)
│   ├── FOLDER_STRUCTURE.md       # Frontend folder map
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json              # Frontend deps (Next, Mesh, Supabase, Blockfrost, Tailwind)
├── Agartha-Blockchain (1).md     # DOCS.md — system concept & workflow
├── ARCHI.md                      # Database schema & entity design
├── TODO.md                       # Required fixes & pending features
├── MVP_Implementation_Plan.md    # 4-phase MVP roadmap
├── PatchNotes.md                 # Current system status & limitations
├── .commitlintrc.json            # Conventional commit config
└── package.json                  # Root: Husky + Commitizen tooling only
```

---

## Running the Project

### Prerequisites
- **Node.js 18+** and **npm**
- A **Supabase project** (free tier works)
- A **Blockfrost** project ID for the Cardano `preprod` network ([blockfrost.io](https://blockfrost.io/))
- The **[Lace wallet](https://www.lace.io/)** browser extension, configured for `preprod`, with some test ADA from a Cardano faucet

### 1. Install dependencies
```bash
# From the repository root — installs Husky + Commitizen
npm install

# Then install the Next.js app's dependencies
cd frontend
npm install
```

### 2. Apply the Supabase schema
In your Supabase dashboard, open the SQL Editor and run, in order:
1. [`frontend/migrations/phase1_mvp_restructure.sql`](./frontend/migrations/phase1_mvp_restructure.sql)
2. [`frontend/migrations/add_onchain_queue.sql`](./frontend/migrations/add_onchain_queue.sql)

The full reference schema is in [`frontend/supabase_schema`](./frontend/supabase_schema) (context only — do not execute as-is).

### 3. Configure environment variables
Create `frontend/.env.local` (see [`frontend/.env.example`](./frontend/.env.example)):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Cardano (preprod network)
BLOCKFROST_PROJECT_ID=<your-preprod-blockfrost-id>

# API gate (used by server-to-server route auth)
NEXT_PUBLIC_API_KAYAK_KEY=<a-shared-secret>
```

> **Security note:** `NEXT_PUBLIC_API_KAYAK_KEY` is currently exposed to the browser bundle because of its prefix. This is a known issue tracked in the project's security backlog — do not use a production secret here until the auth model is migrated to wallet-signed requests.

### 4. Start the dev server
```bash
cd frontend
npm run dev
```

The app runs on **http://localhost:3000**.

### 5. Useful entry points
| Page | Path | Purpose |
|---|---|---|
| Landing | `/` | Marketing site |
| Wallet auth test | `/walletAuthTest` | Connect Lace, register a new alias, simulate auth |
| Dashboard test | `/dashboardTest` | Role-based dashboards (member / elder / owner) |
| Pool | `/pool` | Treasury & on-chain queue views |
| Admin | `/Admin` | Platform administration (community creation, role management) |

### Other commands
```bash
npm run build      # Production build (from frontend/)
npm run start      # Run the production build
npm run lint       # ESLint
npm run commit     # Commitizen-guided conventional commit (from repo root)
```
