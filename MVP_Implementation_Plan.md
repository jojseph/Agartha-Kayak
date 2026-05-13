# Agartha MVP Implementation Plan

This plan breaks down the missing MVP features into 4 manageable phases. As requested, **execution will pause at the end of each phase** for your review and approval before proceeding to the next.

## Open Questions
1. **Government ID Storage**: Should we assume uploaded IDs will be stored in Supabase Storage buckets?
2. **SuperUser Admin Code**: Should the 'Admin Code' be an environment variable (`NEXT_PUBLIC_ADMIN_CODE`) or stored securely in the database?

---

## Proposed Changes

### Phase 1: Database Restructuring & Foundational Roles - DONE
*Goal: Establish the correct data structure to support all upcoming features.*
*   **Update `supabase_schema`**:
    *   **Members Table**: Expand `role` check constraint to include `owner` and `superuser`. Add an `id_document_url` field for KYC.
    *   **Communities Table**: Add an `owner_address` foreign key.
    *   **Loans Table**: Add `collateral` (text), `interest_rate` (numeric, default 0.01 for 1%), and update `status` constraints to explicitly include `fully_paid`, `overdue`, and `defaulted`.
    *   **New Table (`treasury_reconciliations`)**: A table to hold manual balance update requests and track which Elders have signed off on them (multi-sig).
*   **Deliverable**: Updated `supabase_schema` file and SQL scripts ready to run in your Supabase dashboard.

***PAUSE FOR OWNER SIGNAL***

---

### Phase 2: Governance & Treasury Security (Backend)-Done
*Goal: Secure the community funds and enforce the cooperative's democratic rules.*
*   **Voting Threshold Logic**: Update the `api/loans/treasury/vote` endpoint to check if `approve` votes > 50% of total (Elders + Owner). If yes, automatically move loan to `approved`.
*   **Reconciliation API**: Create endpoints for Elders to propose a manual treasury balance update and for other Elders to sign/approve it.
*   **Share Capital Integration**: Update the member approval workflow (`api/members/approve`) to automatically log their initial share capital into `community_transactions` and increment the treasury pool.
*   **Deliverable**: Fully functioning backend APIs for governance and treasury security.

***PAUSE FOR OWNER SIGNAL***

---

### Phase 3: The "Witness" Mechanics (Backend + Integration)-Done
*Goal: Implement the core "Trustless Witness" features.*
*   **Two-Step Repayment API**: Update repayment endpoints so a member logs an intent to pay, but it remains "pending" until an Elder/Owner hits an endpoint confirming real-world receipt.
*   **Penalty & Overdue Cron/Logic**: Create a utility to check for overdue loans and apply penalty interest if the due date has passed without a confirmed payment.
*   **Deliverable**: Repayment and lifecycle backend flows that match the "digital receipt" philosophy.

***PAUSE FOR OWNER SIGNAL***

---

### Phase 4: UI/UX & Dashboards-Done
*Goal: Bring the backend mechanics to life in the frontend.*
*   **Network Queue Component**: Build the visual "MVP" component that shows pending on-chain receipts grouping together.
*   **Reconciliation Dashboard**: Build the Elder UI for proposing and signing manual treasury updates.
*   **Onboarding & Loan Forms**: Update the frontend registration form to include ID uploads, and the Treasury Loan form to require a `collateral` declaration.
*   **Deliverable**: A fully wired, responsive UI demonstrating all MVP features.

***PAUSE FOR OWNER SIGNAL***

---

## Verification Plan

### Manual Verification
- After **Phase 1**, I will ask you to apply the SQL changes to your Supabase project.
- For **Phases 2 & 3**, we will use Postman or simple frontend test scripts to ensure data mutates correctly under the right constraints.
- For **Phase 4**, you will navigate the local dev server (`npm run dev`) to test the new dashboards and visual components.
