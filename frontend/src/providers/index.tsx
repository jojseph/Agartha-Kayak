'use client';
import { MeshProvider } from "@meshsdk/react";
import { AuthProvider } from "./AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MeshProvider>
      {/* AuthProvider must be INSIDE MeshProvider so it can use useWallet() */}
      <AuthProvider>
        {children}
      </AuthProvider>
    </MeshProvider>
  );
}