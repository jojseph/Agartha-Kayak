'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/providers/AuthProvider";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, member } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the provider is still figuring out if the user is logged in, do nothing yet
    if (status === 'loading') return;

    // Rule 1: No wallet? Kick them back to the landing page
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    // Rule 2: Connected but not registered? Send to registration
    if (status === 'unregistered') {
      router.push('/walletAuthTest');
      return;
    }

    // Rule 3: Registered but waiting for approval
    if (member && member.status === 'pending') {
      router.push('/pending-approval');
      return;
    }
  }, [status, member, router]);

  // Show a loading screen while the traffic cop does its job
  if (status === 'loading' || status === 'unauthenticated' || status === 'unregistered' || (member && member.status === 'pending')) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Verifying credentials...</p>
      </div>
    );
  }

  // If they pass all checks, safely render the requested dashboard!
  return <>{children}</>;
}