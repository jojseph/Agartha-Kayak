// Replace with actual auth once completed, this is just temporary

// Production auth skeleton — implement signature verification according to AUTH_CONTRACT.md
import { supabaseAdmin } from './supabaseAdmin';

export type AuthContext = {
  walletAddress: string;
  role: 'member' | 'elder' | 'owner' | 'superuser';
  communityId: string | null;
};

/**
 * verifyWalletAuth:
 * - Verifies the caller (wallet address + signature or bearer token)
 * - Loads role and community from DB (members table)
 * - Enforces optional `required` constraints (role/communityId)
 *
 * NOTE: implement `verifySignature` according to your wallet/auth contract.
 */
async function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<boolean> {
  // TODO: verify the signature with your wallet library (e.g. cardano signature verification)
  // Return true if the signature is valid for `message` by `walletAddress`.
  throw new Error('verifySignature not implemented');
}

export async function verifyWalletAuth(
  request: Request,
  required?: { role?: AuthContext['role'][]; communityId?: string }
): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization') || '';
  // Example: Authorization: Wallet <address>:<signature>:<message>
  // Adjust parsing to match your AUTH_CONTRACT.md
  if (!authHeader) {
    throw new Error('Unauthenticated');
  }

  // Simple parsing example (replace with your actual scheme)
  if (!authHeader.startsWith('Wallet ')) {
    throw new Error('Invalid auth scheme');
  }
  const payload = authHeader.slice('Wallet '.length);
  const [walletAddress, signature, message] = payload.split(':');
  if (!walletAddress || !signature || !message) throw new Error('Malformed auth header');

  const ok = await verifySignature(walletAddress, message, signature);
  if (!ok) throw new Error('Invalid signature');

  // Lookup role/community from members table
  const { data: member, error } = await supabaseAdmin
    .from('members')
    .select('role,community_id')
    .eq('wallet_address', walletAddress)
    .maybeSingle();

  if (error) {
    console.error('Auth DB lookup failed', error);
    throw new Error('Auth lookup failed');
  }

  if (!member) {
    throw new Error('Member not found');
  }

  const ctx: AuthContext = {
    walletAddress,
    role: member.role,
    communityId: member.community_id ?? null,
  };

  // Enforce required role
  if (required?.role && !required.role.includes(ctx.role)) {
    throw new Error('Forbidden: missing required role');
  }
  // Enforce required communityId
  if (required?.communityId && ctx.communityId !== required.communityId) {
    throw new Error('Forbidden: wrong community');
  }

  return ctx;
}