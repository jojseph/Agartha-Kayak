**AGARTHA**

Blockchain-Witnessed Cooperative Ledger

*System Concept & Workflow Documentation*

# **Core Principle**

Agartha operates as an Immutable Witness, not a custodial vault. The platform leverages Cardano Native Scripts for multi-signature logic and Transaction Metadata for record-keeping — deliberately avoiding the complexity and risk surface of Smart Contracts.

The foundational philosophy is simple:

**“Agartha doesn’t eliminate corruption —** *it eliminates the ability to hide it.”*

The dApp never moves ADA or physical assets autonomously. It records the intent and the result. Every loan agreement, approval vote, and treasury update is permanently etched into the Cardano blockchain as a digital receipt — tamper-proof, timestamped, and publicly verifiable by the community.

Think of it as a notary, not a bank. Money and assets move in the real world. Agartha simply witnesses it.

# **What is Agartha?**

Agartha is a decentralized application (dApp) designed to digitize the trust layer of a Filipino Credit Cooperative — bringing the transparency of blockchain technology to informal community lending groups without the bureaucratic overhead of CDA registration.

It is modeled after the real-world structure of Philippine Credit Cooperatives governed under RA 9520, translating familiar cooperative mechanics into an on-chain, auditable system:

* Member contributions build the community treasury (share capital)

* Members can borrow from each other (Peer-to-Peer Loans) or from the collective pool (Treasury Loans)

* Treasury Loans are assessed by Elders using the Four C’s of Credit as a judgment guide: Character, Capacity, Circumstances, and Collateral — this evaluation is human-driven, not enforced by the system

* Elders and Owners govern approvals through a majority voting mechanism

* Every transaction — loan, repayment, vote, or deposit — is recorded on-chain as an immutable receipt

The platform is multi-tenant, meaning multiple independent cooperatives can operate on the same infrastructure simultaneously, each with their own governance, treasury, and membership.

# **Who Are the Actors?**

## **SuperUser (Global Auditor)**

A platform-level administrator who oversees the entire ecosystem. SuperUsers approve or reject Organization Applications but cannot participate as members of any COOP. They act as the gatekeepers of the platform, ensuring only legitimate cooperatives are initialized.

## **Owner (1 per COOP)**

The founding member of a cooperative. The Owner holds the highest authority within their Organization — participating in Elder votes, managing the treasury, and overseeing the community. There is strictly one Owner per COOP.

## **Elder**

Trusted senior members of the COOP who serve as auditors and decision-makers. Elders review and vote on Treasury Loan applications, can view all transactions within the Organization, and share responsibility for treasury management with the Owner.

## **Member**

Regular members of the COOP. Members can initiate and receive Peer-to-Peer Loans, apply for Treasury Loans, view their own transaction history, and contribute to the community treasury. A member belongs to only one COOP at a time — preventing cross-COOP debt exploitation.

# **The Community Treasury**

The Treasury is the financial heart of the cooperative — the “Pooled Truth” that reflects the collective wealth of the community. It grows from two sources:

* **Member Share Capital** — every new member pays a minimum share capital contribution upon joining. This is recorded as a Contribution transaction on-chain and automatically adds to the treasury balance.

* **Loan Interest** — every Treasury Loan carries a maximum interest rate of 1% with repayment terms of up to 5 years. When a member repays their loan, the interest portion stays in the pool, growing the treasury over time.

Any existing member of the COOP may also deposit additional funds into the community treasury at any time, further growing the collective pool.

The treasury balance is visible to all members of the Organization, ensuring full financial transparency and accountability. However, to preserve the accuracy of the “Witness,” the Owner or Elders must manually reconcile the on-chain balance with real-world bank accounts or physical cash on hand.

**MVP Feature:** Design a high-stakes “Reconciliation Dashboard” for Elders. When they input a manual balance update, require multi-signature approval from other Elders before it officially updates the “Pooled Truth” on-chain. This enforces security and trust even in the manual process.

# **Types of Loans**

## **Peer-to-Peer (P2P) Loans**

A direct lending agreement between two members. The dApp acts as the notarizing witness — recording who lent what, to whom, for what purpose, and by when it should be returned. No community funds are involved.

The loan lifecycle follows these states:

* Pending — the Loanee has submitted a request, awaiting the Loaner’s response

* Rejected — the Loaner declined the request

* Ongoing — the Loaner approved; the Witness record is now active on-chain

* Valid — manually confirmed by the Loaner once the item or debt has been returned

* Invalid — marked by the Loaner in cases of default; can be reverted to Valid if the debt is later settled

## **Treasury Loans**

A member borrows from the collective COOP pool. Because community funds are involved, this requires democratic approval from the governance layer.

Treasury Loan applications are assessed by the Elders using the Four C’s of Credit as a personal judgment guide. This is not a system-enforced checklist — it is a community governance standard that Elders apply at their own discretion when casting their vote:

* Character — the member’s reputation and loan history within the COOP, based on the Elder’s personal knowledge of the member

* Capacity — the member’s financial ability to repay (income vs. existing debts)

* Circumstances — the context and urgency of the loan purpose

* Collateral — the member must declare a specific real-world asset as collateral during the loan application (e.g. a phone, appliance, or property). This declaration is included in the transaction metadata and permanently recorded on-chain upon approval — serving as a tamper-proof digital contract that cannot be denied or altered


Key terms and protections:

* Interest is capped at 1% with repayment terms of up to 5 years, depending on COOP policy

* A member may only hold one active Treasury Loan at a time — preventing debt stacking


The extended loan lifecycle for Treasury Loans:

**Status Flow:** *Pending → Approved → Ongoing → Fully Paid  OR  Overdue  OR  Defaulted*

When a payment is missed past the due date, a penalty interest is applied on top of the regular rate, causing the outstanding balance to grow. This — combined with the permanent on-chain record of the default — serves as a strong deterrent against non-payment.

Email and dashboard notifications are sent to the borrower when a repayment is due, overdue, or when the loan status changes.

# **Governance & Voting**

Treasury Loans require democratic approval from the COOP’s leadership before any funds are committed. This mirrors the Credit Committee structure of real Philippine cooperatives.

The approval process works as follows:

* A member submits a Treasury Loan application with the amount, purpose, and supporting details

* The request enters the Organization’s Approval Ledger, visible to all Elders and the Owner

* Each Elder and the Owner casts a vote — approve or reject

* Once more than 50% of the total Elder and Owner count approves, the threshold is met

* The final verdict, all signatures, and loan details are permanently recorded on the Cardano blockchain

* The loan status transitions from Pending to either Approved or Rejected

This ensures no single individual can unilaterally approve access to community funds — power is distributed across the governance layer.

# **Blockchain Mechanics**

## **How Records Get On-Chain**

Agartha uses a batch scheduling mechanism to minimize transaction gas fees. Rather than submitting each loan event individually, the system aggregates pending records at designated intervals and submits them together in a single blockchain transaction.

Because Cardano’s transaction metadata is capped at 16KB, the system dynamically handles overflow by creating subsequent transactions when needed — ensuring no data is lost regardless of volume.

**MVP Feature:** Build a “Network Queue” component that visually demonstrates pending receipts grouping together before being “etched” onto the blockchain. This proves the system is efficient, handles the 16KB limit gracefully, and makes the blockchain mechanics tangible for users.

## **The Transaction Hash**

Every on-chain record produces a blockchain\_tx\_hash — a unique receipt number that links the database record to the permanent Cardano ledger entry. This hash is the ultimate proof of any transaction.

If a dispute ever arises — a member denying a loan existed, an Elder claiming they never voted, a borrower disputing a default — the parties refer to the Cardano Ledger. It is the Unalterable Witness.

# **Privacy & Visibility**

Agartha maintains a balance between community transparency and individual privacy by implementing role-based visibility protocols:

* Standard Members: Restricted to viewing only those transactions in which they are a direct participant as either the Loanee or Loaner.

* Elders & Owners: Assigned Auditor status, granting comprehensive visibility into all transactions within their respective Organization.

* Public Records: Elders or Owners may designate any transaction as "Public," extending visibility to the entire COOP membership. While transactions default to private (visible only to involved parties), this feature is utilized for community projects or mandated transparency reporting.

# **System Workflow**

## **Step 1: Authentication**

Access to Agartha is exclusively managed through Cardano Wallets — no traditional username or password. When a wallet connects, the system checks whether the wallet address is recognized:

* Existing User — immediately redirected to their Organization Dashboard

* New User — prompted to choose a path: apply to form a new COOP, or register to join an existing one

* SuperUser — enters a predetermined Admin Code to gain global auditor access

## **Step 2: COOP Formation**

A new user who wishes to establish a cooperative submits an Organization Application:

* Name of the COOP

* Community wallet address

* Initial community funds

The application is reviewed and vetted by a SuperUser. Upon approval, the Organization is initialized, a Treasury record is created, and the applicant is automatically granted the Owner role. Members, Elders, and Owners may only belong to one COOP at a time.

## **Step 3: Member Onboarding**

A new user who wishes to join an existing COOP submits a registration application:

* Full legal name

* Selecting the target COOP from a list

* Submitting a valid government ID

* Paying the minimum share capital contribution to the community treasury

The application enters a Pending state visible only to the Elders and Owner of that COOP. Once approved, the member receives an email notification and gains access to the community ledger.

## **Step 4: Initiating a Peer Loan**

A Member initiates a P2P Loan request by selecting the Loaner, specifying the asset or amount, setting the loan and repayment dates, and describing the purpose. The Loaner receives a notification and either approves or rejects. Upon approval, the Witness record goes active and is queued for on-chain registration.

## **Step 5: Applying for a Treasury Loan**

A Member submits a Treasury Loan application with the requested amount, purpose, and a declared collateral asset. The request enters the Approval Ledger where Elders and the Owner vote. Once the majority threshold is met, the loan is approved and all details — including the collateral declaration — are permanently recorded on the Cardano blockchain as a digital contract. Repayment then follows a two-step witness process: the member logs each installment payment in the dApp, and an Elder or Owner confirms the payment was received in real life. The system then records the repayment on-chain and automatically updates the remaining balance. If a due date passes without a logged payment, the loan is automatically flagged as Overdue and penalty interest begins accumulating. If the Elder manually marks the loan as Defaulted, the on-chain collateral declaration becomes the community’s evidence for real-world enforcement.

## **Step 6: Treasury Management**

Elders and the Owner periodically reconcile the on-chain treasury balance with real-world funds. Any manual update to the Pooled Truth requires multi-signature approval from multiple Elders — ensuring no single actor can manipulate the recorded balance. All treasury actions generate immutable audit log entries.

# **Finality**

Agartha does not replace the cooperative. It does not govern its members. It does not enforce its rules by code.

What it does is remove the ability to lie about what happened.

A traditional cooperative runs on paper records, verbal agreements, and human memory — all of which can be lost, altered, or disputed. Agartha replaces that uncertainty with an unalterable, permanent, community-visible ledger on the Cardano blockchain.

The cooperative is still only as good as the people running it. But with Agartha, those people can no longer rewrite history.

**Core Consistency:** *No Smart Contracts. No custodial control. Statuses are user-driven, not code-driven. The Witness records. The community governs. The blockchain remembers.*

