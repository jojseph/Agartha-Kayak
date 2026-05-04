'use client';

import { MeshProvider } from "@meshsdk/react";

export default function MeshProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <MeshProvider>
        {children}
        </MeshProvider>
    );
}