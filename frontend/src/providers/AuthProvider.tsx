'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from '@meshsdk/react';

// The shape of our Auth Context as defined in the charter
type AuthStatus = 'loading' | 'unauthenticated' | 'unregistered' | 'authenticated';

interface AuthContextType {
  wallet: any;
  member: any | null;
  status: AuthStatus;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { wallet, connected, name, disconnect } = useWallet();
  const [member, setMember] = useState(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    async function checkMemberStatus() {
      if (connected) {
        try {
          // Fetch member profile by wallet address
          const response = await fetch('/api/members'); 
          if (response.ok) {
            const data = await response.json();
            setMember(data);
            setStatus('authenticated');
          } else {
            // Connected but not in the database
            setStatus('unregistered');
          }
        } catch (error) {
          setStatus('unauthenticated');
        }
      } else {
        setStatus('unauthenticated');
      }
    }

    checkMemberStatus();
  }, [connected]);

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