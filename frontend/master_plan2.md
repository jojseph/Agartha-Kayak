# Agartha Kayak — Master Plan

**Status:** In progress — post-integration reconciliation (Module 1 shipped; see §11)
**Owner:** kuzu
**Target:** Ship a demo-ready MVP that fulfills the DOCS.md "Immutable Witness" philosophy and closes every item in TODO.md + the 5 🔴 blockers from the initial code-reviewer assessment.

---

## 1. Mission

Take the current state of the Agartha Kayak codebase — backend coverage of MVP Phases 1–4 mostly in place, with critical security gaps and incomplete UI — and bring it to **a state where it can be demonstrated end-to-end to a real cooperative**:

- Members can register, get approved, and see a real dashboard (not a test page).
- Elders can vote on treasury loans, sign reconciliations, and confirm repayments — with **no self-approval and no impersonation possible**.
- The Owner can manage their COOP and approve new members through a production UI.
- A SuperUser can vet and approve new COOP applications.
- Receipts in the on-chain queue are actually etched onto the Cardano `preprod` ledger.

The "Witness, not vault" core principle (see [`Agartha-Blockchain (1).md`](./Agartha-Blockchain%20%281%29.md)) is preserved throughout: no smart contracts, no custodial control, no autonomous fund movement — only signed, witnessed, and recorded events.

---

## 2. Definition of Done

Completeness is the union of two lists:

### A. TODO.md items (all)
1. Elder cannot approve their own treasury loan request
2. Elder's own treasury request is hidden from their approval dashboard
3. Reconciliation Dashboard with multi-sig (backend done, UI needed)
4. One active Treasury Loan per member
5. Public Record Board wired to live DB (currently mock data)
6. Automatic overdue detection + `defaulted` state
7. SuperUser approval workflow for COOP formation
8. Blockchain transaction submission after the Network Queue stage
9. Public/Private transaction visibility (default private, Elder/Owner can mark public)
10. Two-step repayment witness confirmation flow (backend done, UI needed)

### B. 🔴 Blockers from the initial assessment
1. Replace `NEXT_PUBLIC_API_KAYAK_KEY` (currently shipped to browser) with server-only auth
2. Add wallet-signature verification on every write endpoint (no impersonation)
3. Add SuperUser role gate on `/api/admin/*` and the `/Admin` page
4. Block self-voting on treasury loans (overlaps with TODO #1 — same fix)
5. Make treasury balance updates atomic (fix read-then-write race)

A demo passes **only if all 15 items above are green**.

---

## 3. The Three Modules

| # | Module | Owner | Concern | Independence |
|---|---|---|---|---|
| 1 | **Security & Auth** | [kuzu.md](./kuzu.md) | Trust enforcement — who can do what | Foundational; depends on no one |
| 2 | **Frontend & UX** | [ben.md](./ben.md) | User-visible surface — what humans see | Consumes Module 1's auth contract via stub |
| 3 | **Blockchain & Workers** | [raymond.md](./raymond.md) | Witness layer — on-chain + background | Consumes Module 1's auth contract via stub |

The boundaries follow the natural seams of the system:

```
           ┌──────────────────────────────┐
           │  Module 2 — Frontend & UX    │
           │  (the surface)               │
           └──────────────────────────────┘
                       │ HTTP + Auth contract
                       ▼
           ┌──────────────────────────────┐
           │  Module 1 — Security & Auth  │
           │  (the rules)                 │
           └──────────────────────────────┘
                       │ DB writes / events
                       ▼
           ┌──────────────────────────────┐
           │  Module 3 — Blockchain &     │
           │  Background Workers          │
           │  (the witness)               │
           └──────────────────────────────┘
```

Module 1 sits between UI and storage as the gatekeeper. Module 3 reads what Module 1 lets through and propagates it to the chain. Module 2 talks to Module 1's hardened endpoints.

---

## 4. Module Summaries

### Module 1 — Security & Auth (kuzu)
Owns the platform's trust model. Replaces the leaky `NEXT_PUBLIC_API_KAYAK_KEY` with wallet-signed requests. Adds the missing role checks (SuperUser, self-vote, one-active-loan). Makes treasury balance updates atomic. **Publishes the auth contract that the other two modules code against.**

### Module 2 — Frontend & UX (ben)
Owns everything a human sees. Builds the global auth state, production Member/Elder/Owner dashboards (replacing the `*Test` pages), Reconciliation UI, Public Record Board, SuperUser admin UI, two-step repayment UI, and the Network Queue visualization polish. **Consumes the auth contract via a dev stub until Module 1 ships.**

### Module 3 — Blockchain & Workers (raymond)
Owns the witness layer. Builds the on-chain submission worker that turns queued receipts into real Cardano `preprod` transactions (handling the 16KB metadata limit). Builds the overdue cron, the `defaulted` state transition, the SuperUser COOP-application API, and the schema additions for visibility (`is_public`) and penalty accounting (`penalty_amount`).

Full task lists, file paths, and acceptance criteria are in each owner's file.

---

## 5. Shared Contracts

These are the **frozen interfaces** between modules. They are designed once, published by their owner, and consumed by everyone else. Changing one requires consensus from all three owners.

### 5.1 Auth Contract (owned by Module 1, consumed by 2 & 3)

**Published by:** kuzu, day 1, as `frontend/docs/AUTH_CONTRACT.md`.

> **⚠️ Revision (post-integration):** The format below was corrected to match
> what Module 1 actually shipped. The original 3-part format here was never
> built — CIP-30 verification requires the COSE key, so the wire format is
> **4-part**, `signData`'s payload must be **hex-encoded**, and the helper
> **returns a union** (it does not throw). **`frontend/docs/AUTH_CONTRACT.md`
> is the single source of truth**; this section is a summary that must track it.

**Wire format:** Every authenticated write request carries four colon-separated parts:

```
Authorization: WalletSig <walletAddress>:<nonce>:<key>:<signature>
```

- `walletAddress` — **bech32** (`addr_test1…` on preprod). Resolved by the shared `resolveWalletAddress()` so every surface agrees on identity.
- `nonce` — 48-hex from `POST /api/auth/nonce` (single-use, 5-min TTL, `auth_nonces` table).
- `key` / `signature` — the CIP-30 `signData` result fields (COSE_Key / COSE_Sign1, hex).

Canonical signed message: `${METHOD} ${pathname} ${nonce} ${sha256(body)}` (uppercase method; empty body → sha256 of empty string). The **client signs `toHex(message)`**; the server passes the same hex to Mesh `checkSignature` (which does `Buffer.from(data,"hex")` internally — passing the raw string fails).

**Server helper signature (actual):**

```ts
// frontend/src/lib/auth.ts
export type Role = 'member' | 'elder' | 'owner' | 'superuser';
export type AuthContext = {
  walletAddress: string;
  role: Role;
  communityId: string | null;
  alias: string;                    // present in the real impl
};

// Returns the context OR a NextResponse — the caller checks and returns it.
// Does NOT throw. Use the `if (auth instanceof NextResponse) return auth;` pattern.
export async function verifyWalletAuth(
  request: Request,
  requirement?: { role?: Role[]; communityId?: string }
): Promise<AuthContext | NextResponse>;

// For pre-membership routes (e.g. /api/members/register) — signature only:
export async function verifyWalletSignature(
  request: Request
): Promise<{ walletAddress: string } | NextResponse>;
```

**Client helper (shipped under Module 1, not Module 2):** `frontend/src/lib/walletAuthClient.ts` exports `resolveWalletAddress(wallet)` and `walletAuthFetch(wallet, url, opts)` (the nonce→sign→fetch dance). See §11.

**Dev stub:** ❌ **Removed.** `auth.dev.ts` and the `DEV_WALLET` bypass were deleted when Module 1 shipped (DoD: `grep auth.dev` / `grep DEV_WALLET` → 0). Modules 2 & 3 code against the **real** `verifyWalletAuth` directly — there is no stub to import.

### 5.2 Migration Ownership

Each module owns disjoint migration files; no module edits another's file.

| File | Owner | Purpose |
|---|---|---|
| `frontend/migrations/phase2_security.sql` | Module 1 | Nonce tracking table, atomic-balance RPC functions |
| `frontend/migrations/phase3_visibility.sql` | Module 3 | `is_public` on loans + community_transactions, `penalty_amount` on loans, `coop_applications` table |

Both ship in week 1 so Modules 2 and 3 can read the columns immediately.

### 5.3 Frontend Routing Convention

> **⚠️ Revision (post-integration):** The `(app)` route-group plan was
> **abandoned**. Joseph's pre-existing dashboard (the real Member dashboard —
> see §11 and ben.md Task 2.3) is self-gating and lives directly at
> `/dashboard`, not under a route group with a guard layout.

- The production dashboard is **`src/app/dashboard/page.tsx`** (Joseph's work, restored from git, route renamed from `dashboardTest`, retrofitted to wallet-signed auth). It self-gates on wallet connection; there is **no `(app)/layout.tsx` guard** (it was removed).
- Session continuity across refresh is owned by a global `WalletSession` component in `providers/index.tsx` (persist + restore the connected wallet; an explicit sign-out flag blocks silent re-attach). Auth pages must not treat raw Mesh `connected` as "logged in" — check the sign-out intent.
- `*Test` routes: `dashboardTest` was **renamed** to `dashboard` (not deleted — it was Joseph's real page). `vaultTest` deleted. `walletAuthTest` remains the registration/connect surface until a `/login` replaces it.

---

## 6. Sequencing

A suggested 3-week cadence. Modules run in parallel; the rows are weeks.

| Week | kuzu (M1) | ben (M2) | raymond (M3) |
|---|---|---|---|
| 1 | Publish `AUTH_CONTRACT.md`, implement `verifyWalletAuth()`, atomic-balance RPCs | AuthProvider + Member Dashboard scaffold (using stub) | Ship `phase3_visibility.sql`, queue-worker shell, Blockfrost tx builder |
| 2 | Wire `verifyWalletAuth()` into all write routes; self-vote, one-active-loan, SuperUser gate | Elder + Owner dashboards; Reconciliation UI; Public Record Board | Queue → Mesh tx → submit → confirm flow; SuperUser COOP-application API |
| 3 | Hardening tests; remove `NEXT_PUBLIC_API_KAYAK_KEY` callsites | Network Queue UI polish; SuperUser page; two-step repayment UI | Overdue cron, `defaulted` transition, retry logic |

There is **one hard sequencing rule**: Module 1's auth contract must be published (not merged — just documented and stubbed) by end of week 1. Everything else flows from that.

---

## 7. Coordination Points

Brief, scheduled syncs — not standing meetings.

1. **End of Week 1 — Contract Review** (30 min, all three owners). Confirm the auth contract works for everyone's planned routes. After this, the contract is frozen.
2. **Mid Week 2 — Integration Smoke Test** (1 hour). All three owners run their dev branches against a shared Supabase dev instance. Surface mismatches early.
3. **End of Week 3 — Demo Rehearsal** (1 hour). End-to-end walkthrough on the demo wallet.

If any module slips, the freeze on the auth contract is the only thing that cannot move. Other work can shuffle within the 3-week window.

---

## 8. Out of Scope (Explicit Non-Goals)

To prevent scope creep — these are **not** part of MVP completeness:

- Mainnet deployment (we target Cardano `preprod` only)
- Mobile app
- Email/SMS notifications (the dashboard alerts in DOCS.md are nice-to-have; deferred)
- Multi-language i18n
- The `trustEngine.ts` scoring rules beyond what's already implemented
- Cleaning up the committed scratch files (`scratch.js`, `scratch2.js`, etc.) — cosmetic, not blocking
- Replacing the `lucide-react ^1.14.0` pin (assessment 🟡 nit) — defer unless icons actually break

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Auth contract changes mid-build | Medium | High | Lock contract at end of week 1; require all 3 owners' sign-off for changes |
| Cardano `preprod` instability | Low | Medium | Use queue retry logic (Module 3); demo can fall back to "etched_pending" state |
| Module 1 slips → Modules 2 & 3 can't merge | Medium | High | Stub stays in repo until Module 1 lands; allow short-lived `auth.dev.ts` import |
| Supabase migrations conflict | Low | Medium | Disjoint file ownership (see §5.2); no shared file edits |
| Self-vote block breaks existing test data | Low | Low | Add a one-off migration to mark legacy votes as `legacy=true` |

---

## 10. ADR References

Each module owner records significant decisions as a short ADR in `frontend/docs/adr/`. Required ADRs:

- **ADR-001** (Module 1): Wallet-signed auth over bearer token
- **ADR-002** (Module 1): Atomic balance updates via Postgres RPC vs. row-level locking
- **ADR-003** (Module 3): Synchronous submission worker vs. external scheduler (Vercel Cron vs. Supabase Edge Functions)
- **ADR-004** (Module 2): Auth state via React Context vs. SWR vs. Zustand
- **ADR-005** (Module 1): Canonical **bech32** wallet identity via a single `resolveWalletAddress()` — wallets/Mesh return raw hex; every surface (register, nonce, header, member lookup) must agree or lookups silently miss
- **ADR-006** (Module 1): Client auth helper (`walletAuthClient`) + session persistence (`WalletSession`) built under Module 1, not Module 2 — they are the consumer side of the auth contract and shipped with it

Format follows the template in the persona file.

---

## 11. Status Reconciliation (post-integration)

The §6 week-by-week sequencing is **superseded** by this snapshot — it reflects what actually shipped, not the original plan.

### Module 1 — Security & Auth: ✅ shipped (scope grew)
- `verifyWalletSignature` + `verifyWalletAuth`, `phase2_security.sql` (nonce table + `adjust_treasury_balance` RPC), `balanceOps.ts`, all write routes wallet-sig-gated, self-vote / one-active-loan / SuperUser gate done, tests green, `tsc` clean, **0** `NEXT_PUBLIC_API_KAYAK_KEY` / `auth.dev` / `DEV_WALLET` refs.
- **Scope absorbed from Module 2** (out of necessity — the contract's consumer side had to exist to test the producer): `walletAuthClient.ts` (`resolveWalletAddress` + `walletAuthFetch`), the `AuthProvider` fix, `WalletSession` (refresh-safe session + real sign-out). See ADR-005/006.
- **Outstanding:** ADR-001, ADR-002 (and ADR-005/006) not yet written.

### Module 2 — Frontend & UX: re-scoped (large parts already existed)
- **Joseph's restored `/dashboard` already implements** a role-aware dashboard: treasury/peer loan request, treasury vote, member approve, reconciliation propose/sign, Network Queue, Public Record Board, community stats — all retrofitted to `walletAuthFetch` + bech32. This **overlaps Tasks 2.3, 2.4, 2.6, 2.9, 2.10**.
- Ben's WIP branch (`origin/ben` `4897d8e`) is a destructive backup (deletes auth.ts/balanceOps.ts, reverts routes to the leaked key) — **do not merge**. Its only salvageable pieces are 3 Elder components that call **phantom `/api/elder/*` endpoints that exist nowhere** — they are largely **redundant** with Joseph's dashboard (which calls the real endpoints).
- Ben's real remaining job is now **audit Joseph's dashboard against the DoD and fill gaps**, not rebuild. See revised ben.md.

### Module 3 — Blockchain & Workers: unblocked, unchanged scope
- Module 1 shipped, so Raymond codes against the **real** `verifyWalletAuth` / `adjustTreasuryBalance` — **no `auth.dev.ts` stub** (deleted). `phase3_visibility.sql` still owned & pending. Do **not** build `/api/elder/*` (phantom). See revised raymond.md.

### Demo-readiness vs §2 Definition of Done
🔴 blockers 1–5: **all green** (Module 1). TODO.md #1,#2,#4(rule),#5(self-vote): green. Still open: #3 Reconciliation UI (exists in Joseph's dashboard — needs audit), #5 Public Record Board live data (needs `is_public` from Module 3), #6 overdue/`defaulted` (Module 3), #7 SuperUser COOP workflow (Module 3 API + Admin UI), #8 on-chain submission (Module 3), #9 visibility toggle (Module 3), #10 two-step repayment UI (audit Joseph's dashboard).

---

**Next step:** Each owner re-reads their module file ([kuzu.md](./kuzu.md), [ben.md](./ben.md), [raymond.md](./raymond.md)) **and §11 above** — the original sequencing no longer applies.
