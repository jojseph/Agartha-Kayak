'use client';
import { MeshProvider } from "@meshsdk/react";
import { AuthProvider } from "./AuthProvider";
import WalletSession from "@/components/WalletSession";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MeshProvider>
      {/* WalletSession + AuthProvider must be INSIDE MeshProvider (useWallet) */}
      <WalletSession />
      <AuthProvider>
        {children}
      </AuthProvider>
    </MeshProvider>
  );
}