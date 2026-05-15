import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST /api/auth/nonce
// Issues a fresh single-use nonce bound to a wallet address.
// This endpoint is intentionally unauthenticated — possession of the nonce
// alone proves nothing; it only becomes useful when combined with a CIP-30
// signature over the canonical message (see frontend/docs/AUTH_CONTRACT.md).
export async function POST(request: Request) {
  let walletAddress: unknown;
  try {
    const body = await request.json();
    walletAddress = body?.walletAddress;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof walletAddress !== 'string' || walletAddress.length === 0) {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
  }

  // Sanity check: Cardano payment addresses are bech32-encoded and start with "addr".
  // preprod uses "addr_test1...", mainnet uses "addr1...".
  if (!walletAddress.startsWith('addr')) {
    return NextResponse.json({ error: 'walletAddress must be a bech32 Cardano address' }, { status: 400 });
  }

  const nonce = randomBytes(24).toString('hex'); // 48 hex characters

  const { error } = await supabaseAdmin
    .from('auth_nonces')
    .insert([{ nonce, wallet_address: walletAddress }]);

  if (error) {
    console.error('Failed to issue auth nonce:', error);
    return NextResponse.json({ error: 'Failed to issue nonce' }, { status: 500 });
  }

  return NextResponse.json({ nonce, expiresIn: 300 });
}
