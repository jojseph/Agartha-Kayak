# Current System Status

- Wallet connection and registration flow are available via `/walletAuthTest`.
- Wallet-signed auth helpers and nonce flow exist (see `frontend/src/lib/auth.ts`, `frontend/src/lib/walletAuthClient.ts`, and `/api/auth/nonce`).
- The `/dashboard` route exists and serves the main role-aware dashboard UI.
- Trust score has been removed from the member model and UI surfaces.

---

# Current Limitations / Gaps

- Public visibility schema (`is_public`, `penalty_amount`, `coop_applications`) is not present yet (no `phase3_visibility.sql`).
- On-chain queue worker + scheduling are not implemented.
- Overdue/defaulted background jobs are not implemented.
- SuperUser COOP application workflow (API + UI) is not implemented.
- Role-based landing routes (`/dashboard/elder`, `/dashboard/owner`, `/superuser`) and `/pending-approval` page are not implemented.
- Public Record Board live data depends on the visibility schema and API.
- No dedicated login/authentication page yet; wallet authentication remains the entry point.

---

# Testing Environment

- The authentication + registration flow is currently implemented as a test module.
- To run:
  - `bun run dev`
  - Navigate to: `http://localhost:3000/walletAuthTest`

- Purpose:
  - Validate wallet connection
  - Simulate registration flow
  - Test conditional rendering (new vs existing user)

---

# Key Issues to Resolve (Priority)

1. Implement the visibility schema + public records API (Module 3).
2. Implement the on-chain worker + scheduler (Module 3).
3. Implement overdue/defaulted background jobs (Module 3).
4. Implement SuperUser COOP application workflow (API + UI).
5. Add role-based landing routes and `/pending-approval`.
