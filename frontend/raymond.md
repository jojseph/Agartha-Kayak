# Module 3 — Blockchain Submission & Background Workers

**Owner:** raymond
**Charter:** [master_plan.md](./master_plan.md)
**Concern:** The witness layer. Turn queued receipts into permanent on-chain truth, and run the background jobs that keep loan lifecycles honest.

---

## Why this module exists

The DOCS.md core principle says *"The Witness records. The community governs. The blockchain remembers."* Right now, the platform only does the first half. When an Elder approves a treasury loan or a Member's repayment is confirmed, the code dutifully calls `enqueueReceipt()` and inserts a row into `onchain_queue` with `status = 'queued'`. **No row ever moves past `queued`.** There is no worker that picks those rows up, builds a Cardano transaction, and submits them.

This module is what completes the "Witness" promise.

It also owns the other "background" responsibilities the system needs but currently lacks:
- The overdue check is implemented as an endpoint (`/api/loans/check-overdue`) but nobody calls it on a schedule.
- The `defaulted` state transition exists in the schema but no code path produces it.
- The SuperUser COOP-application workflow is described in DOCS.md but has no backend.
- The `is_public` column needed for the Public Record Board doesn't exist yet.

---

## Goals

1. Every row that lands in `onchain_queue` with `status = 'queued'` is eventually `etched` with a real Cardano `preprod` `tx_hash` — handling the 16KB metadata limit by splitting into multiple transactions when needed.
2. Overdue loans are flagged automatically (not manually), and loans that stay overdue long enough become `defaulted`.
3. The SuperUser workflow for COOP formation has a real backend: applications submitted, queued, approved (creating the COOP and Owner), or rejected.
4. The schema gains the two columns that other modules need: `is_public` (visibility) and `penalty_amount` (clean penalty accounting).
5. The toggle endpoint that lets Elders/Owners mark a transaction public is exposed.

---

## Scope (Tasks)

Each task lists files, what to do, acceptance criteria, and the TODO.md / assessment item it closes.

### Task 3.1 — Schema additions (Week 1)

**Closes:** TODO.md #5 (visibility), Assessment 🟡 (penalty accounting), enables Module 2's Public Record Board

**File:** create [frontend/migrations/phase3_visibility.sql](./frontend/migrations/phase3_visibility.sql)

**What to add:**

```sql
BEGIN;

-- Public/Private visibility on loans
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Public/Private visibility on community_transactions
ALTER TABLE public.community_transactions
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Clean penalty accounting (don't mutate loans.amount anymore)
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS penalty_amount numeric NOT NULL DEFAULT 0;

-- COOP applications (SuperUser approval queue)
CREATE TABLE IF NOT EXISTS public.coop_applications (
  application_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_address text NOT NULL,
  proposed_name text NOT NULL,
  treasury_wallet_address text NOT NULL,
  initial_funds numeric DEFAULT 0,
  id_document_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

COMMIT;
```

**Acceptance:** Ben can read `is_public` on his `/public-records` page. Kuzu's `verifyWalletAuth` can require `role: 'superuser'` on the application-review endpoint.

---

### Task 3.2 — Public-visibility toggle endpoint

**Closes:** TODO.md #5 (API side)

**File:** create [frontend/src/app/api/transactions/visibility/route.ts](./frontend/src/app/api/transactions/visibility/route.ts)

**What to do:**
- `PATCH` handler that uses Module 1's `verifyWalletAuth(request, { role: ['elder', 'owner'] })`
- Body: `{ targetType: 'loan' | 'community_transaction', targetId: string, isPublic: boolean }`
- Verify the target is in the auth context's community
- Update the row

**Acceptance:** Ben's `PublicVisibilityToggle` component flips the flag and reads it back.

---

### Task 3.3 — On-chain submission worker (the witness)

**Closes:** TODO.md #4 (Blockchain submission)

**Files:**
- create [frontend/src/lib/cardano/txBuilder.ts](./frontend/src/lib/cardano/txBuilder.ts) — Mesh SDK wrapper to build a tx with metadata
- create [frontend/src/lib/cardano/submitBatch.ts](./frontend/src/lib/cardano/submitBatch.ts) — orchestrator
- create [frontend/src/app/api/workers/etch-queue/route.ts](./frontend/src/app/api/workers/etch-queue/route.ts) — the worker endpoint (POST-only, auth-gated)

**What to do:**
1. Worker handler:
   - Pull all `queued` rows for a community, oldest first
   - Pack them into batches up to 16384 bytes of estimated metadata (use the `estimated_bytes` column already on `onchain_queue`)
   - For each batch:
     1. Assign a new `batch_id` (UUID) to the rows, set their `status = 'batched'`
     2. Build a Cardano tx using Mesh SDK with the batched receipts as CIP-25/CIP-68-style metadata under a project-defined label (e.g. `674` for arbitrary JSON)
     3. Submit via Blockfrost
     4. On success: update rows to `status = 'etched'`, set `tx_hash` and `block_number`, set `etched_at = now()`
     5. On failure: update rows to `status = 'failed'`, leave `batch_id` set so a retry can find them
2. The signing key needs to come from a server-side env var (`CARDANO_SUBMITTER_SKEY` — Cardano signing key in hex/cbor). **Coordinate with kuzu on key handling** — must not leak to the browser.

**Worker auth:** Since this is server-to-server, gate it on `verifyWalletAuth(request, { role: ['superuser'] })` OR a separate worker secret (`WORKER_TRIGGER_SECRET`). Document the choice in ADR-003.

**Acceptance:**
- A POST to `/api/workers/etch-queue` picks up all `queued` rows for the community and either etches them or marks them `failed`.
- After etching, querying `/api/community/queue` shows the rows as `etched` with real `tx_hash` values that resolve on [cardanoscan.io/preprod](https://preprod.cardanoscan.io/).
- A queue that's >16KB splits across two transactions cleanly, each with its own `batch_id`.

---

### Task 3.4 — Worker scheduler

**Closes:** TODO.md #4 (Blockchain submission), DOCS.md "batch scheduling"

**Files:**
- update [frontend/vercel.json](./frontend/vercel.json) if hosting on Vercel, OR
- create a Supabase Edge Function in `supabase/functions/etch-queue/index.ts`

**What to do:**
- Run the `/api/workers/etch-queue` route every 5 minutes (Vercel Cron) **per active community**.
- For local dev, document how to trigger manually with `curl`.

**Acceptance:** Without anyone clicking anything, queued receipts land on the chain within 5 minutes of being enqueued.

---

### Task 3.5 — Overdue cron + `defaulted` state

**Closes:** TODO.md #2 (Overdue Payment Logic), DOCS.md Treasury Loan lifecycle

**Files:**
- update [frontend/src/app/api/loans/check-overdue/route.ts](./frontend/src/app/api/loans/check-overdue/route.ts)
- create [frontend/src/app/api/workers/check-defaulted/route.ts](./frontend/src/app/api/workers/check-defaulted/route.ts)
- schedule both alongside Task 3.4

**What to change in `check-overdue`:**
- Stop mutating `loans.amount`. Penalty should accumulate into the new `penalty_amount` column.
- After computing penalty, also `enqueueReceipt({ recordType: 'loan_overdue', ... })` so the overdue flag becomes part of the on-chain witness.

**New `check-defaulted` logic:**
- Find loans that are `overdue` for more than N days (N = 60 by policy; configurable per community via a `default_grace_days` column if you want to add it, otherwise hardcode)
- Update those loans to `status = 'defaulted'`
- `enqueueReceipt({ recordType: 'loan_defaulted', ... })` so the default is also witnessed

**Acceptance:**
- Run check-overdue against a test loan with past due-date → it flips to `overdue`, gets a `penalty_amount`, original `amount` is unchanged
- After 60 simulated days, check-defaulted flips it to `defaulted` and enqueues the receipt

---

### Task 3.6 — SuperUser COOP application API

**Closes:** TODO.md #3 (COOP Formation Workflow)

**Files:**
- create [frontend/src/app/api/coop-applications/submit/route.ts](./frontend/src/app/api/coop-applications/submit/route.ts) — applicants POST here
- create [frontend/src/app/api/admin/coop-applications/route.ts](./frontend/src/app/api/admin/coop-applications/route.ts) — SuperUser GET (list) and PATCH (approve/reject)

**What to do:**

`submit` route:
- Authenticated wallet POSTs with `{ proposedName, treasuryWalletAddress, initialFunds, idDocumentUrl }`
- Insert into `coop_applications` with `status = 'pending'`
- Reject if applicant already has a community_id (DOCS.md: one COOP per user)

`/api/admin/coop-applications`:
- `GET` — `verifyWalletAuth(req, { role: ['superuser'] })` — return all pending applications
- `PATCH` — body `{ applicationId, action: 'approve' | 'reject', rejectionReason? }`
  - If approve:
    1. Create the `communities` row from the application
    2. Update the applicant's `members` row to set `role: 'owner'`, `community_id: <new>`, `status: 'approved'`
    3. Use `adjustTreasuryBalance` (kuzu's helper) to set the initial balance
    4. `enqueueReceipt({ recordType: 'community_formed', ... })`
    5. Mark application `approved`
  - If reject: mark application `rejected`, store reason

**Acceptance:** Ben's SuperUser page lists pending applications and can approve one → the applicant becomes Owner of a new COOP, visible from the Owner Dashboard after refresh.

---

### Task 3.7 — Replace mutating `amount` with `penalty_amount` everywhere

**Closes:** Assessment 🟡 — destructive penalty accounting

**Files to update:**
- [frontend/src/app/api/loans/check-overdue/route.ts](./frontend/src/app/api/loans/check-overdue/route.ts) — already done in Task 3.5
- [frontend/src/app/api/loans/repayment/submit/route.ts](./frontend/src/app/api/loans/repayment/submit/route.ts) — repayment remaining-balance math must use `amount + penalty_amount - totalRepaid` (currently uses raw `amount`)
- [frontend/src/app/api/loans/repayment/confirm/route.ts](./frontend/src/app/api/loans/repayment/confirm/route.ts) — same fix

**Acceptance:** A loan that goes overdue, accrues penalty, then gets repaid in full settles correctly — the borrower pays back principal + penalty, the treasury receives both.

---

### Task 3.8 — Failed-queue retry path

**Files:**
- update [frontend/src/lib/cardano/submitBatch.ts](./frontend/src/lib/cardano/submitBatch.ts) — on failure, decide whether to retry or escalate

**What to do:**
- If `failed` count for a single record exceeds 3, mark it `failed_permanent` (add to the status check) and emit a console.error / log to whatever monitoring you wire up
- Otherwise, the next worker run picks it up again

**Acceptance:** Manually break Blockfrost (bad project id) → run worker → rows go to `failed`. Restore Blockfrost → run worker → rows recover to `etched`.

---

### Task 3.9 — Worker-only `enqueueReceipt` extensions

**Files:**
- update [frontend/src/lib/enqueueReceipt.ts](./frontend/src/lib/enqueueReceipt.ts) — add new record_types: `'loan_overdue'`, `'loan_defaulted'`, `'community_formed'`
- update the `onchain_queue.record_type` CHECK constraint via the same `phase3_visibility.sql` migration

**Acceptance:** All three new record types are valid and round-trip through the worker.

---

## Contracts you publish

| Contract | Consumers | Location |
|---|---|---|
| `phase3_visibility.sql` migration | Everyone (run once in shared dev) | `frontend/migrations/phase3_visibility.sql` |
| `is_public` column behavior | Ben (Public Record Board reads it) | implicit |
| `/api/transactions/visibility` PATCH endpoint | Ben (Elder/Owner toggle UI) | route file |
| `/api/admin/coop-applications/*` endpoints | Ben (SuperUser page) | route files |
| `tx_hash` populated on `onchain_queue` rows | Ben (Network Queue viz, Public Record Board) | implicit |
| Worker trigger semantics (cron schedule) | All (operationally) | document in ADR-003 |

## Contracts you consume

| From | What | Until ready, use |
|---|---|---|
| kuzu (Module 1) | `verifyWalletAuth()` helper, `AuthContext` shape | `auth.dev.ts` stub returning a SuperUser context for worker routes |
| kuzu (Module 1) | `adjustTreasuryBalance()` for COOP creation and overdue penalty credit | the existing read-then-write pattern as a temporary placeholder, but mark it with `// TODO(M1): replace` |

## Out of scope for this module

- Any frontend rendering (Ben owns)
- Wallet-side signing (Ben's `walletAuthClient` does this)
- The `verifyWalletAuth` helper itself (Kuzu owns)
- The nonce store (Kuzu owns)
- Email/SMS notifications
- Mainnet — `preprod` only

## Definition of Done

- [ ] `phase3_visibility.sql` is merged and run in shared dev
- [ ] `is_public` columns exist on `loans` and `community_transactions`
- [ ] `penalty_amount` exists on `loans`; no code mutates `loans.amount` anymore
- [ ] `coop_applications` table exists
- [ ] On-chain submission worker etches queued receipts to Cardano `preprod` with valid `tx_hash`
- [ ] >16KB batches split correctly across multiple transactions
- [ ] Worker runs on a 5-minute schedule (or documented manual trigger for dev)
- [ ] Overdue cron flips overdue loans and accrues `penalty_amount`
- [ ] Defaulted cron transitions long-overdue loans to `defaulted`
- [ ] SuperUser application submit/list/approve/reject endpoints work
- [ ] Visibility toggle endpoint works
- [ ] Failed-queue retry logic handles transient Blockfrost failures
- [ ] ADR-003 (worker scheduling choice) is written

---

**You are the "the blockchain remembers" half of the system. Everything everyone else builds is theatre until your worker turns it into a hash on the Cardano ledger.**
