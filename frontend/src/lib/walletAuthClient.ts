'use client';

// ============================================================
// walletAuthClient — client-side WalletSig request signer
// ============================================================
// Implements the client-side flow from frontend/docs/AUTH_CONTRACT.md.
// Every authenticated write goes through walletAuthFetch():
//   1. resolve bech32 wallet address
//   2. POST /api/auth/nonce  → { nonce }
//   3. build canonical message  `${METHOD} ${pathname} ${nonce} ${sha256(body)}`
//   4. wallet.signData(addr, hex(message))  → { key, signature }
//   5. fetch(url) with  Authorization: WalletSig addr:nonce:key:signature
//
// The server (src/lib/auth.ts) reconstructs the SAME message and passes the
// raw UTF-8 string to checkSignature — so we only hex-encode for signData.
// ============================================================

const EMPTY_BODY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb924' + '27ae41e4649b934ca495991b7852b855';

/** A Mesh BrowserWallet (from useWallet()). Typed loosely to avoid SDK churn. */
// Matches MeshCardanoBrowserWallet from @meshsdk/react useWallet():
// signData is (addressBech32, data) — address FIRST, hex payload second.
export type SigningWallet = {
  getChangeAddress: () => Promise<string>;
  signData: (
    addressBech32: string,
    data: string
  ) => Promise<{ key: string; signature: string }>;
};

// --- CIP-19 bech32 (Cardano variant: plain bech32, NO 90-char limit) --------
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (let i = 0; i < values.length; i++) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[i];
    for (let j = 0; j < 5; j++) {
      if ((top >>> j) & 1) chk ^= BECH32_GEN[j];
    }
  }
  return chk >>> 0;
}

function bech32HrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >>> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

function bech32Checksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const out: number[] = [];
  for (let p = 0; p < 6; p++) out.push((mod >>> (5 * (5 - p))) & 31);
  return out;
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = data.concat(bech32Checksum(hrp, data));
  let out = hrp + '1';
  for (let i = 0; i < combined.length; i++) out += BECH32_CHARSET.charAt(combined[i]);
  return out;
}

function convert8to5(bytes: Uint8Array): number[] {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    acc = (acc << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.push((acc >>> bits) & 31);
    }
  }
  if (bits > 0) out.push((acc << (5 - bits)) & 31);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 ? '0' + hex : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Convert a raw CIP-19 hex address (what some wallets / Mesh betas return from
 * getChangeAddress()) into its bech32 form. HRP comes from the header byte's
 * network id: low nibble 1 → mainnet `addr`, else testnet `addr_test`.
 */
function hexAddressToBech32(hex: string): string {
  const bytes = hexToBytes(hex);
  const networkId = bytes[0] & 0x0f;
  const hrp = networkId === 1 ? 'addr' : 'addr_test';
  return bech32Encode(hrp, convert8to5(bytes));
}

/**
 * The single source of wallet identity across the app.
 * Returns the bech32 payment address (addr_test1… on preprod), which is the
 * format AUTH_CONTRACT.md and /api/auth/nonce require. Reused by AuthProvider,
 * the registration page, and the Admin page so every surface agrees on "who am I".
 *
 * Lace + this Mesh beta return getChangeAddress() as raw hex CBOR, so we
 * normalize hex → bech32 here. Already-bech32 values pass through unchanged.
 */
export async function resolveWalletAddress(
  wallet: SigningWallet
): Promise<string> {
  const addr = await wallet.getChangeAddress();
  if (!addr) {
    throw new Error('Wallet returned an empty address');
  }
  if (addr.startsWith('addr')) {
    return addr; // already bech32
  }
  if (/^[0-9a-fA-F]+$/.test(addr)) {
    return hexAddressToBech32(addr); // raw CIP-19 hex → bech32
  }
  throw new Error(
    `Unrecognized wallet address format: ${addr.slice(0, 16)}…`
  );
}

function toHex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function sha256Hex(body: string): Promise<string> {
  if (body.length === 0) return EMPTY_BODY_SHA256;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(body)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Drop-in replacement for fetch() on authenticated endpoints.
 *
 * Current mode: ADDRESS-ONLY — passes the bech32 wallet address in the
 * X-Wallet-Address header. The server (verifyAddressAuth) validates
 * membership and role without a CIP-30 signature pop-up.
 *
 * This is appropriate while all operations are database-only (no on-chain
 * settlement). When blocksync is enabled, uncomment the nonce+sign flow
 * below to restore full WalletSig authentication.
 *
 * Usage:
 *   const res = await walletAuthFetch(wallet, '/api/loans/treasury/request', {
 *     method: 'POST',
 *     body: JSON.stringify({ borrowerAddress: addr, amount }),
 *   });
 */
export async function walletAuthFetch(
  wallet: SigningWallet,
  url: string,
  opts: RequestInit = {}
): Promise<Response> {
  const walletAddress = await resolveWalletAddress(wallet);

  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      'X-Wallet-Address': walletAddress,
    },
  });
}

// ---------------------------------------------------------------------------
// ORIGINAL WalletSig signing flow (re-enable for on-chain / blocksync routes)
// ---------------------------------------------------------------------------
// export async function walletAuthFetch_signed(
//   wallet: SigningWallet,
//   url: string,
//   opts: RequestInit = {}
// ): Promise<Response> {
//   const walletAddress = await resolveWalletAddress(wallet);
//
//   const nonceRes = await fetch('/api/auth/nonce', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ walletAddress }),
//   });
//   if (!nonceRes.ok) {
//     const err = await nonceRes.json().catch(() => ({}));
//     throw new Error(`Failed to obtain auth nonce: ${err.error ?? nonceRes.status}`);
//   }
//   const { nonce } = (await nonceRes.json()) as { nonce: string };
//
//   const method = (opts.method ?? 'GET').toUpperCase();
//   const pathname = new URL(url, window.location.origin).pathname;
//   const body = typeof opts.body === 'string' ? opts.body : '';
//   const bodyHash = await sha256Hex(body);
//
//   const canonicalMessage = `${method} ${pathname} ${nonce} ${bodyHash}`;
//   const { key, signature } = await wallet.signData(
//     walletAddress,
//     toHex(canonicalMessage)
//   );
//
//   return fetch(url, {
//     ...opts,
//     headers: {
//       ...(opts.headers ?? {}),
//       Authorization: `WalletSig ${walletAddress}:${nonce}:${key}:${signature}`,
//     },
//   });
// }
