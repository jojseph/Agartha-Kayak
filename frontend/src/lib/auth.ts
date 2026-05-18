import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { checkSignature } from '@meshsdk/core';
import { supabaseAdmin } from './supabaseAdmin';

export type Role = 'member' | 'elder' | 'owner' | 'superuser';

export type AuthContext = {
  walletAddress: string;
  role: Role;
  communityId: string | null;
  alias: string;
};

export type AuthRequirement = {
  role?: Role[];
  communityId?: string;
};

const NONCE_MAX_AGE_MS = 5 * 60 * 1000;
const EMPTY_BODY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb924' + '27ae41e4649b934ca495991b7852b855';

function fail(status: number, reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status });
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export type WalletContext = {
  walletAddress: string;
};

/**
 * Verifies that a request carries a valid WalletSig signature + fresh nonce.
 * Does NOT check membership or role — use this only when the caller may not
 * yet be a registered member (e.g. the /api/members/register endpoint).
 *
 * For protected routes, use verifyWalletAuth instead.
 */
export async function verifyWalletSignature(
  request: Request
): Promise<WalletContext | NextResponse> {
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('WalletSig ')) {
    return fail(401, 'Missing or malformed Authorization header');
  }

  const credentials = header.slice('WalletSig '.length).trim();
  const parts = credentials.split(':');
  if (parts.length !== 4) {
    return fail(401, 'Malformed WalletSig credentials (expected 4 colon-separated parts)');
  }
  const [walletAddress, nonce, key, signature] = parts;
  if (!walletAddress || !nonce || !key || !signature) {
    return fail(401, 'Empty credential component');
  }

  const { data: nonceRow, error: nonceLookupError } = await supabaseAdmin
    .from('auth_nonces')
    .select('nonce, wallet_address, issued_at, used_at')
    .eq('nonce', nonce)
    .maybeSingle();

  if (nonceLookupError) {
    console.error('Auth nonce lookup error:', nonceLookupError);
    return fail(500, 'Nonce lookup failed');
  }
  if (!nonceRow) {
    return fail(401, 'Unknown nonce');
  }
  if (nonceRow.used_at) {
    return fail(401, 'Nonce already used');
  }
  if (nonceRow.wallet_address !== walletAddress) {
    return fail(401, 'Nonce was not issued to this wallet');
  }
  const age = Date.now() - new Date(nonceRow.issued_at).getTime();
  if (age > NONCE_MAX_AGE_MS) {
    return fail(401, 'Nonce expired');
  }

  let bodyText: string;
  try {
    bodyText = await request.clone().text();
  } catch (err) {
    console.error('Failed to read request body for auth verification:', err);
    return fail(400, 'Failed to read request body');
  }

  const bodyHash = bodyText.length === 0 ? EMPTY_BODY_SHA256 : sha256Hex(bodyText);
  const url = new URL(request.url);
  const canonicalMessage = `${request.method.toUpperCase()} ${url.pathname} ${nonce} ${bodyHash}`;
  // Mesh checkSignature() does Buffer.from(data, "hex") internally, so `data`
  // MUST be the hex of the signed message — not the raw string. The client
  // signs toHex(canonicalMessage); the server compares the same hex.
  const canonicalMessageHex = Buffer.from(canonicalMessage, 'utf8').toString('hex');

  let signatureValid = false;
  try {
    signatureValid = await checkSignature(
      canonicalMessageHex,
      { signature, key },
      walletAddress
    );
  } catch (err) {
    console.error('Signature verification threw:', err);
    return fail(401, 'Signature verification failed');
  }
  if (!signatureValid) {
    console.error('[auth] Invalid signature', {
      walletAddress,
      canonicalMessage,
      bodyLen: bodyText.length,
    });
    return fail(401, 'Invalid signature');
  }

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('auth_nonces')
    .update({ used_at: new Date().toISOString() })
    .eq('nonce', nonce)
    .is('used_at', null)
    .select('nonce')
    .maybeSingle();

  if (claimError) {
    console.error('Failed to claim nonce:', claimError);
    return fail(500, 'Failed to claim nonce');
  }
  if (!claimed) {
    return fail(401, 'Nonce was claimed by a concurrent request');
  }

  return { walletAddress };
}

/**
 * Verifies a WalletSig-authenticated request AND looks up the registered member.
 * See frontend/docs/AUTH_CONTRACT.md.
 *
 * Returns either a populated AuthContext (success) or a NextResponse (failure)
 * that the calling route should return directly.
 *
 * Routes use the pattern:
 *   const auth = await verifyWalletAuth(request, { role: ['elder', 'owner'] });
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is narrowed to AuthContext from here on
 */
export async function verifyWalletAuth(
  request: Request,
  requirement?: AuthRequirement
): Promise<AuthContext | NextResponse> {
  const sigResult = await verifyWalletSignature(request);
  if (sigResult instanceof NextResponse) return sigResult;
  const { walletAddress } = sigResult;

  const { data: member, error: memberError } = await supabaseAdmin
    .from('members')
    .select('wallet_address, role, community_id, alias, status')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (memberError) {
    console.error('Member lookup error during auth:', memberError);
    return fail(500, 'Member lookup failed');
  }
  if (!member) {
    return fail(403, 'Wallet is not a registered member');
  }
  if (member.status !== 'approved' && member.role !== 'superuser') {
    return fail(403, `Member status is "${member.status}" — only approved members may act`);
  }

  const role = member.role as Role;

  if (requirement?.role && !requirement.role.includes(role)) {
    return fail(403, `Role "${role}" is not permitted for this action`);
  }
  if (requirement?.communityId && member.community_id !== requirement.communityId) {
    return fail(403, 'Wallet is not a member of the required community');
  }

  return {
    walletAddress,
    role,
    communityId: member.community_id,
    alias: member.alias,
  };
}

/**
 * Lightweight auth that reads the wallet address from the X-Wallet-Address
 * header and verifies membership + role — but does NOT require a cryptographic
 * wallet signature. Use this for database-only operations where the CIP-30
 * signing pop-up would be an unnecessary UX friction.
 *
 * The wallet address was already proven during the initial CIP-30 connection
 * (Lace/Nami connect handshake), so for off-chain DB writes this is sufficient.
 *
 * When the platform moves to on-chain settlement (blocksync), switch back to
 * verifyWalletAuth for those specific routes.
 */
export async function verifyAddressAuth(
  request: Request,
  requirement?: AuthRequirement
): Promise<AuthContext | NextResponse> {
  const walletAddress = request.headers.get('X-Wallet-Address');
  if (!walletAddress || !walletAddress.startsWith('addr')) {
    return fail(401, 'Missing or invalid X-Wallet-Address header');
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('members')
    .select('wallet_address, role, community_id, alias, status')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (memberError) {
    console.error('Member lookup error during address auth:', memberError);
    return fail(500, 'Member lookup failed');
  }
  if (!member) {
    return fail(403, 'Wallet is not a registered member');
  }
  if (member.status !== 'approved' && member.role !== 'superuser') {
    return fail(403, `Member status is "${member.status}" — only approved members may act`);
  }

  const role = member.role as Role;

  if (requirement?.role && !requirement.role.includes(role)) {
    return fail(403, `Role "${role}" is not permitted for this action`);
  }
  if (requirement?.communityId && member.community_id !== requirement.communityId) {
    return fail(403, 'Wallet is not a member of the required community');
  }

  return {
    walletAddress,
    role,
    communityId: member.community_id,
    alias: member.alias,
  };
}
