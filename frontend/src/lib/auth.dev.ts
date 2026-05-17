// Dev stub — safe for local development only. DELETE before merging.
export type AuthContext = {
  walletAddress: string;
  role: 'member' | 'elder' | 'owner' | 'superuser';
  communityId: string | null;
};

export async function verifyWalletAuth(
  _request?: Request,
  _required?: { role?: AuthContext['role'][]; communityId?: string }
): Promise<AuthContext> {
  return {
    walletAddress: process.env.DEV_WALLET ?? 'dev-wallet-address',
    role: (process.env.DEV_ROLE as AuthContext['role']) ?? 'owner',
    communityId: process.env.DEV_COMM ?? null,
  };
}