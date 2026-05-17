'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { resolveWalletAddress } from '@/lib/walletAuthClient';

// The shape of our Auth Context as defined in the charter (AUTH_CONTRACT.md)
type AuthStatus = 'loading' | 'unauthenticated' | 'unregistered' | 'authenticated';

export interface Member {
  wallet_address: string;
  alias: string;
  role: 'member' | 'elder' | 'owner' | 'superuser';
  community_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  trust_score?: number;
}

interface AuthContextType {
  wallet: ReturnType<typeof useWallet>['wallet'];
  member: Member | null;
  status: AuthStatus;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { wallet, connected, disconnect } = useWallet();
  const [member, setMember] = useState<Member | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function checkMemberStatus() {
      if (!connected || !wallet) {
        if (!cancelled) {
          setMember(null);
          setStatus('unauthenticated');
        }
        return;
      }

      try {
        // Profile read is NOT signature-gated (AUTH_CONTRACT "Out of scope"):
        // a plain POST with the canonical bech32 address is sufficient.
        const walletAddress = await resolveWalletAddress(wallet);
        const res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        });

        if (cancelled) return;

        if (!res.ok) {
          setMember(null);
          setStatus('unauthenticated');
          return;
        }

        const data = (await res.json()) as { exists: boolean; member: Member | null };
        if (!data.exists || !data.member) {
          setMember(null);
          setStatus('unregistered');
          return;
        }

        // Keep the member object even when pending — AppLayout reads
        // member.status to route to /pending-approval.
        setMember(data.member);
        setStatus('authenticated');
      } catch (error) {
        if (!cancelled) {
          console.error('AuthProvider member lookup failed:', error);
          setMember(null);
          setStatus('unauthenticated');
        }
      }
    }

    setStatus('loading');
    checkMemberStatus();
    return () => {
      cancelled = true;
    };
  }, [connected, wallet]);

  const signOut = () => {
    disconnect();
    setMember(null);
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ wallet, member, status, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use this context easily in other components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
