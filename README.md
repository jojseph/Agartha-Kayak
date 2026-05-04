# Agartha Kayak (Current Update)

# Current System Status

- Users can register using the Lace wallet.
- Wallet authentication successfully retrieves the user’s address automatically.
- Registered users are correctly stored in the Supabase database.
- Basic wallet authentication + registration flow is functional (test environment).

---

# Current Limitations / Gaps

- Login functionality is not yet implemented.
- No session handling or persistent authentication state.
- After registration, users cannot proceed to any main application page.

- No dedicated login/authentication page yet.
  - Authentication must strictly use the Lace wallet.
  - Manual wallet input must be prohibited.
  - Wallet address must always be derived programmatically from the wallet provider.

- Registration Flow Issue:
  - If a user is authenticated but not yet in the database:
    - The system correctly prompts: "Enter your alias"
  - However:
    - After successful registration, the user remains stuck on the same page.
    - No redirect or state transition occurs.

- Missing Core UI Pages:
  - No Member Dashboard
  - No Elder Dashboard
  - Current UI components are for testing/demo purposes only

---

# Testing Environment

- The authentication + registration flow is currently implemented as a test module.
- To run:
  - `npm run dev`
  - Navigate to: `http://localhost:3000/walletAuthTest`

- Purpose:
  - Validate wallet connection
  - Simulate registration flow
  - Test conditional rendering (new vs existing user)

---

# Backend API Routes

## frontend\src\app\api\loans\route.ts
- **Description:**
  - Verifies loan requests using transaction hashes (`txHash`).
  - Integrates with Blockfrost API to validate on-chain transactions.
  - Enforces minimum loan amount: 1,000,000 Lovelace (1 ADA).
  - Stores valid loan requests with an "active" status in the database.
- **Use Case:**
  - Ensures only legitimate blockchain-backed transactions are recorded before loan approval.

---

## frontend\src\app\api\members\route.ts
- **Description:**
  - Checks if a wallet address is already registered.
  - Secured using a secret key for validation.
  - Returns full member profile if found.
- **Use Case:**
  - Determines user flow after wallet connection:
    - Existing user → proceed to dashboard  
    - New user → redirect to registration  

---

## frontend\src\app\api\members\register\route.ts
- **Description:**
  - Registers new users by storing wallet address + alias.
  - Automatically assigns initial trust score: 25.00
- **Use Case:**
  - Finalizes onboarding after wallet authentication.

---

# Frontend Pages (Testing & Auth)

## frontend\src\app\vaultTest\page.tsx
- **Description:**
  - Displays a "Registration Confirmed" state.
- **Use Case:**
  - Used to verify successful routing after registration (test only).

---

## frontend\src\app\walletAuthTest\page.tsx
- **Description:**
  - Full test environment for wallet lifecycle:
    - Connect wallet
    - Check registration status
    - Prompt alias if needed
- **Use Case:**
  - Debugging and validating authentication + registration logic.

---

# UI Components

## frontend\src\components\ConnectionSuccess.tsx
- **Description:**
  - Displays a Digital ID Card with alias and trust score.
- **Use Case:**
  - Acts as a temporary post-login success screen.

---

## frontend\src\components\MeshProviderWrapper.tsx
- **Description:**
  - Initializes Mesh SDK across the app.
- **Use Case:**
  - Required for wallet hooks (e.g., `useWallet`) and wallet interactions.

---

# System Libraries

## frontend\src\lib\blockfrost.ts
- **Description:**
  - Configures Blockfrost client for Cardano preprod network.
- **Use Case:**
  - Handles blockchain verification (transactions, signatures).

---

## frontend\src\lib\supabaseAdmin.ts
- **Description:**
  - High-privilege Supabase client for backend operations.
- **Use Case:**
  - Secure database access (server-side only).

---

## frontend\src\lib\trustEngine.ts
- **Description:**
  - Calculates and updates user trust scores.
  - Max cap: 100
- **Use Case:**
  - Adjusts trust based on repayments and community actions.

# Key Issues to Resolve (Priority)

1. Implement login/session handling after wallet authentication  
2. Add redirect logic after successful registration  
3. Build core dashboards:
   - Member Dashboard  
   - Elder Dashboard  
4. Replace test pages with production-ready UI  
5. Centralize auth flow (single source of truth for user state)

---

# Suggested Next Step (Critical)

Implement a global auth state (context or hook):

- `walletConnected`
- `userExists`
- `userProfile`

Routing logic should be:
