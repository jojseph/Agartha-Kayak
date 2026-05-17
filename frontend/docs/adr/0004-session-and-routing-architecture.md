ADR-004: Distributed Wallet-Authenticated Routing & Status Gating
Status
Accepted (May 18, 2026)

Context
The platform requires a definitive boundary between public marketing pages, registration states, and privileged administrative contexts (Members, Elders, Owners, and SuperUsers).

Initially, a monolithic, centralized global layout guard was proposed to intercept routing requests. However, due to asynchronous wallet connection states managed by the Mesh SDK and the asynchronous nature of on-chain data retrieval, a strict top-level middleware wrapper introduced severe layout flickering and lifecycle hydration race conditions.

Decision
We choose to implement a Lightweight, Distributed Gating Pattern that shifts routing validation responsibilities to target workspace layouts and profile-fetching lifecycles:

Wallet Persistence & Session Ground-Truth: Sessions are tied directly to the live Cardano wallet status exposed by the Mesh SDK (useWallet()). If a wallet disconnects, local state variables purge instantly, dropping the user back to the public landing page.

On-Mount Dashboard Gating: The main workspace route (/dashboard) extracts the canonical bech32 address and immediately invokes /api/members. If the backend flags the member profile status as pending, a high-priority router.push('/pending-approval') intercept fires before the layout reveals active interface tools.

Registration Flow Perimeter: Upon successful registration form submission inside walletAuthTest/page.tsx, users are immediately routed to /pending-approval rather than the active workspace, enforcing the perimeter by default.

Isolated Admin Space: Administrative tools are grouped cleanly under an independent route structure (/(superuser)/admin/*), leveraging distinct layout wrappers to prevent structural leakage into standard user dashboards.

Consequences
Pros
Zero Hydration Flickering: Eliminates arbitrary layout blocking, allowing public components to render instantly while the wallet initializes asynchronously.

Reduced State Complexity: Avoids a bloated global state context provider, relying instead on local, explicit response checks during standard page mounting.

High Maintainability: Clear separation of concerns; changes to standard member, elder, or owner views don't risk breaking unauthenticated marketing entry points.

Cons
Distributed Guarding: Security checkpoints are implemented across page components rather than a single edge-level file. Any future developers must remember to explicitly include the memberData.status === 'pending' redirect block when spinning up new protected dashboards.