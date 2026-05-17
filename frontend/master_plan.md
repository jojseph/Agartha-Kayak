# Agartha Kayak — Master Plan

**Status:** Proposed
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

**Wire format:** Every authenticated write request carries

```
Authorization: WalletSig <wallet_address>:<nonce>:<signature_hex>
```

where the signature is a CIP-30 `signData` over the canonical message `${method} ${path} ${nonce} ${body_sha256}`. Nonces are single-use and expire after 5 minutes.

**Server helper signature:**

```ts
// frontend/src/lib/auth.ts
export type AuthContext = {
  walletAddress: string;
  role: 'member' | 'elder' | 'owner' | 'superuser';
  communityId: string | null;
};

export async function verifyWalletAuth(
  request: Request,
  required?: { role?: AuthContext['role'][]; communityId?: string }
): Promise<AuthContext>;  // throws 401/403 NextResponse on failure
```

**Dev stub (during weeks 1–2 before Module 1 ships):**

```ts
// frontend/src/lib/auth.dev.ts — DELETE before merge
export async function verifyWalletAuth() {
  return { walletAddress: process.env.DEV_WALLET!, role: 'owner', communityId: process.env.DEV_COMM! };
}
```

### 5.2 Migration Ownership

Each module owns disjoint migration files; no module edits another's file.

| File | Owner | Purpose |
|---|---|---|
| `frontend/migrations/phase2_security.sql` | Module 1 | Nonce tracking table, atomic-balance RPC functions |
| `frontend/migrations/phase3_visibility.sql` | Module 3 | `is_public` on loans + community_transactions, `penalty_amount` on loans, `coop_applications` table |

Both ship in week 1 so Modules 2 and 3 can read the columns immediately.

### 5.3 Frontend Routing Convention

The new production app lives under a `(app)` route group (owned by Module 2). The existing `*Test` routes (`/walletAuthTest`, `/dashboardTest`, `/vaultTest`) stay live as a fallback throughout the build but are deleted in week 3 before final merge.

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

Format follows the template in the persona file.

---

**Next step:** Each owner reads their module file ([kuzu.md](./kuzu.md), [ben.md](./ben.md), [raymond.md](./raymond.md)) and confirms scope before week 1 kickoff.
