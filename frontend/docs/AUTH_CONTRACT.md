# Auth Contract — Wallet-Signed Requests

**Owner:** Module 1 ([kuzu.md](../../kuzu.md))
**Status:** v1 — frozen until end of week 3
**Consumers:** Module 2 (Frontend), Module 3 (Workers)

This document specifies how every write request to the Agartha Kayak API is authenticated. It replaces the deprecated `Authorization: NEXT_PUBLIC_API_KAYAK_KEY` header (which was leaking to the browser).

## Why wallet-signed?

The platform's identity model is the Cardano wallet — there are no usernames or passwords. The only credential we can fully trust came from a specific wallet is a **CIP-30 signature produced by that wallet's private key**. Bearer tokens, JWTs, and API keys either have to be stored client-side (and can leak) or have to be re-issued (and then we're back to passwords). A fresh per-request signature avoids both problems.

## Wire format

Every authenticated write request carries:

```
Authorization: WalletSig <walletAddress>:<nonce>:<key>:<signature>
```

Four colon-separated parts:

| Part | Format | Description |
|---|---|---|
| `walletAddress` | bech32 (`addr...` / `addr_test...`) | The wallet's payment address. No colons in bech32. |
| `nonce` | 48-char hex | A nonce previously issued by `POST /api/auth/nonce`. |
| `key` | hex CBOR | The CIP-30 `signData` result's `key` field (the COSE_Key). |
| `signature` | hex CBOR | The CIP-30 `signData` result's `signature` field (COSE_Sign1). |

## Canonical signed message

The wallet signs **exactly** this UTF-8 string (no surrounding quotes):

```
{METHOD} {pathname} {nonce} {sha256(body)}
```

Examples:

```
POST /api/loans/treasury/vote 4b2af6…ef1 d2c8a3…41
PATCH /api/admin/communities f937c1…001 ab1bc0…cc
GET /api/auth/me   9d04…00b  e3b0c4…855       ← empty body still hashes to e3b0c4…
```

Where:
- `METHOD` is the HTTP method, **uppercase**
- `pathname` is the URL pathname only (no query string, no host, no fragment)
- `nonce` is the same nonce as in the header
- `sha256(body)` is the lowercase hex SHA-256 of the raw request body bytes. For requests with no body, this is the SHA-256 of the empty string: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

The client must sign these bytes exactly. Any mismatch produces a 401.

## Nonce policy

- Issued by `POST /api/auth/nonce` with body `{ "walletAddress": "addr..." }`
- Single-use: once verified, a nonce is marked `used_at` and rejected on replay
- Expires **5 minutes** from `issued_at`
- Stored in `auth_nonces (nonce PK, wallet_address, issued_at, used_at NULL)`
- Each wallet can hold multiple unexpired nonces concurrently (useful for batch operations)

The nonce endpoint is the **only write endpoint that is intentionally unauthenticated**. Possession of a nonce alone proves nothing; it only matters when paired with a valid signature for the canonical message.

## Server-side helper

All protected routes use:

```ts
import { NextResponse } from 'next/server';
import { verifyWalletAuth } from '@/lib/auth';

export async function POST(request: Request) {
  const auth = await verifyWalletAuth(request, { role: ['elder', 'owner'] });
  if (auth instanceof NextResponse) return auth; // 401/403 already formatted

  // auth is now narrowed to AuthContext
  // auth.walletAddress, auth.role, auth.communityId, auth.alias
  // ...
}
```

### `AuthContext`

```ts
export type Role = 'member' | 'elder' | 'owner' | 'superuser';

export type AuthContext = {
  walletAddress: string;
  role: Role;
  communityId: string | null; // null for superusers, who are not in a COOP
  alias: string;
};
```

### `AuthRequirement`

```ts
export type AuthRequirement = {
  role?: Role[];        // any of these roles passes; if omitted, any authenticated member passes
  communityId?: string; // must match auth.communityId
};
```

## Error responses

| Status | Cause |
|---|---|
| 401 | Missing/malformed `Authorization` header, unknown nonce, expired nonce, replayed nonce, wallet/nonce mismatch, invalid signature |
| 403 | Wallet not a registered member, member status is not `approved`, role requirement not met, community requirement not met |
| 500 | Internal error during verification (server bug) |

All error responses are JSON: `{ "error": "<reason>" }`.

## Client-side flow

```text
1. Client → POST /api/auth/nonce  { walletAddress }
2. Server → 200 { nonce, expiresIn: 300 }
3. Client builds canonical message:
     const body = JSON.stringify(payload);
     const bodyHash = sha256_hex(body);
     const message = `POST /api/loans/treasury/vote ${nonce} ${bodyHash}`;
4. Client signs via Mesh SDK:
     const { signature, key } = await wallet.signData(walletAddress, hexEncode(message));
5. Client → POST /api/loans/treasury/vote
     Authorization: WalletSig <walletAddress>:<nonce>:<key>:<signature>
     Content-Type: application/json
     Body: <body>
6. Server verifies + executes
```

## Dev stub

The dev stub is **removed** in the current codebase. Use the real helper from `frontend/src/lib/auth.ts` for all routes. Any references to `auth.dev.ts` are obsolete.

## Out of scope

- Read-only `GET` routes are not required to authenticate (handled by frontend gating + future RLS)
- Public marketing pages: no auth
- Public Record Board reads: no auth (data is public by design)
- Replay protection beyond the 5-minute nonce window: not in MVP scope; revisit if abuse is observed
- Long-lived session tokens: deliberately omitted — the wallet IS the session

## Change control

Any change to this contract requires sign-off from all three module owners. Updates bump the version at the top of this file. The dev stub remains in lockstep with the production helper's signature.
