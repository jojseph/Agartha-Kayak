# Agartha Kayak

A blockchain-witnessed cooperative ledger for Filipino credit cooperatives. Agartha digitizes the trust layer of a community lending group — recording every contribution, loan agreement, approval vote, and repayment as a tamper-proof receipt on the Cardano blockchain.

The platform never holds funds. It is an **immutable witness, not a custodial vault**: members and elders move money in the real world, and Agartha permanently records that it happened. Multi-tenant by design — multiple cooperatives can run on a single deployment, each with its own treasury, governance, and membership.

---

## Project Status (May 2026)

**Working now (confirmed in code/docs)**
- Wallet-signed auth helpers and nonce flow are implemented in [frontend/src/lib/auth.ts](frontend/src/lib/auth.ts), [frontend/src/lib/walletAuthClient.ts](frontend/src/lib/walletAuthClient.ts), and [frontend/src/app/api/auth/nonce/route.ts](frontend/src/app/api/auth/nonce/route.ts).
- Auth/session scaffolding exists in [frontend/src/providers/AuthProvider.tsx](frontend/src/providers/AuthProvider.tsx) and [frontend/src/providers/index.tsx](frontend/src/providers/index.tsx), and the wallet registration flow is available at `/walletAuthTest`.
- The main dashboard route exists at `/dashboard` (see [frontend/src/app/dashboard/page.tsx](frontend/src/app/dashboard/page.tsx)), alongside the marketing pages under `/(marketing)`.
- Core API routes for members, loans, treasury, and community queue are under [frontend/src/app/api](frontend/src/app/api).

**In progress / not shipped yet (see [master_plan.md](master_plan.md) §11)**
- Public visibility schema (`is_public`, `penalty_amount`, `coop_applications`) and related APIs are pending (no `phase3_visibility.sql` in [frontend/migrations](frontend/migrations) yet).
- On-chain queue worker + cron scheduling, and overdue/defaulted background jobs are not present.
- SuperUser COOP application workflow (API + UI) and `/(superuser)` route group are not present.
- Role-based landing routes (`/dashboard/elder`, `/dashboard/owner`, `/superuser`) and `/pending-approval` page are not present.
- Public Record Board live data depends on the visibility schema and API.

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
│   │   ├── add_onchain_queue.sql
│   │   ├── phase2_security.sql
│   │   └── phase2_remove_trust_score.sql
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
│   │   │   ├── admin/            # Platform admin dashboard
│   │   │   ├── dashboard/        # Role-based dashboards (member/elder/owner)
│   │   │   ├── pool/             # Treasury pool views
│   │   │   ├── walletAuthTest/   # Wallet connect + registration flow
│   │   │   ├── layout.tsx        # Root layout (Mesh provider, fonts)
│   │   │   └── globals.css       # Global Tailwind + theme styles
│   │   ├── components/           # UI, layout, pool, and wallet components
│   │   ├── config/site.ts        # Site metadata
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # blockfrost, supabaseAdmin, enqueueReceipt, utils
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
bun install

# Then install the Next.js app's dependencies
cd frontend
bun install
```

### 2. Apply the Supabase schema
In your Supabase dashboard, open the SQL Editor and run, in order:
1. [`frontend/migrations/phase1_mvp_restructure.sql`](./frontend/migrations/phase1_mvp_restructure.sql)
2. [`frontend/migrations/add_onchain_queue.sql`](./frontend/migrations/add_onchain_queue.sql)
3. [`frontend/migrations/phase2_security.sql`](./frontend/migrations/phase2_security.sql)
4. [`frontend/migrations/phase2_remove_trust_score.sql`](./frontend/migrations/phase2_remove_trust_score.sql)

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
```

> **Security note:** Write routes use wallet-signed requests (see [frontend/docs/AUTH_CONTRACT.md](frontend/docs/AUTH_CONTRACT.md)). There is no shared browser-exposed API key in the current setup.

### 4. Start the dev server
```bash
cd frontend
bun run dev
```

The app runs on **http://localhost:3000**.

### 5. Useful entry points
| Page | Path | Purpose |
|---|---|---|
| Landing | `/` | Marketing site |
| Wallet auth test | `/walletAuthTest` | Connect Lace, register a new alias, simulate auth |
| Dashboard | `/dashboard` | Role-based dashboards (member / elder / owner) |
| Pool | `/pool` | Treasury & on-chain queue views |
| Admin | `/admin` | Platform administration (community creation, role management) |

### Other commands
```bash
bun run build      # Production build (from frontend/)
bun run start      # Run the production build
bun run lint       # ESLint
bun run test       # Vitest test run
bun run commit     # Commitizen-guided conventional commit (from repo root)
```
