// ============================================================
// DEVELOPMENT STUB — DELETE BEFORE MERGING MODULE 1 TO MAIN
// ============================================================
// This stub lets Modules 2 (Frontend) and 3 (Workers) run end-to-end
// flows before Module 1's real verifyWalletAuth is wired in.
//
// It reads DEV_WALLET from the environment, looks up the member, and
// returns an AuthContext WITHOUT verifying any signature or nonce.
//
// Definition-of-done for Module 1 requires:
//   grep -r "auth.dev" frontend/src/   →   no hits
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabaseAdmin';
import type { AuthContext, AuthRequirement, Role, WalletContext } from './auth';

function fail(status: number, reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status });
}

export async function verifyWalletSignature(
  _request: Request
): Promise<WalletContext | NextResponse> {
  const devWallet = process.env.DEV_WALLET;
  if (!devWallet) {
    return fail(500, 'auth.dev.ts: DEV_WALLET env var is not set');
  }
  return { walletAddress: devWallet };
}

export async function verifyWalletAuth(
  _request: Request,
  requirement?: AuthRequirement
): Promise<AuthContext | NextResponse> {
  const devWallet = process.env.DEV_WALLET;
  if (!devWallet) {
    return fail(500, 'auth.dev.ts: DEV_WALLET env var is not set');
  }

  const { data: member, error } = await supabaseAdmin
    .from('members')
    .select('wallet_address, role, community_id, alias, status')
    .eq('wallet_address', devWallet)
    .maybeSingle();

  if (error) {
    console.error('auth.dev.ts: member lookup error', error);
    return fail(500, 'auth.dev.ts: member lookup failed');
  }
  if (!member) {
    return fail(500, `auth.dev.ts: DEV_WALLET ${devWallet} is not a registered member`);
  }

  const role = member.role as Role;
  if (member.status !== 'approved' && role !== 'superuser') {
    return fail(403, `auth.dev.ts: DEV_WALLET status is "${member.status}"`);
  }

  if (requirement?.role && !requirement.role.includes(role)) {
    return fail(403, `auth.dev.ts: DEV_WALLET role "${role}" is not in [${requirement.role.join(', ')}]`);
  }
  if (requirement?.communityId && member.community_id !== requirement.communityId) {
    return fail(403, 'auth.dev.ts: DEV_WALLET is not in the required community');
  }

  return {
    walletAddress: member.wallet_address,
    role,
    communityId: member.community_id,
    alias: member.alias,
  };
}
