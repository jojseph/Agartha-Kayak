'use client';

// ============================================================
// WalletSession — the single owner of "is a wallet session active?"
// ============================================================
// The app has no server session (the wallet IS the session, per
// AUTH_CONTRACT). Mesh's useWallet() is in-memory only, so a refresh
// drops it and a fake disconnect lets it silently re-attach. This
// component reconciles Mesh's live connection with an explicit,
// localStorage-backed session intent:
//
//   mesh-wallet-persist  → the wallet id to auto-restore on cold load
//   agartha-signed-out   → user explicitly signed out; do NOT auto-attach
//
// Mounted once in providers/index.tsx (inside MeshProvider).
// ============================================================

import { useEffect } from 'react';
import { useWallet } from '@meshsdk/react';

export const PERSIST_KEY = 'mesh-wallet-persist';
export const SIGNED_OUT_KEY = 'agartha-signed-out';

export default function WalletSession() {
  const { connected, name, connect, disconnect } = useWallet();

  // Cold load: restore the previous wallet unless the user signed out.
  // Lace keeps the dApp authorized, so this reconnects without a popup.
  useEffect(() => {
    if (connected) return;
    if (localStorage.getItem(SIGNED_OUT_KEY) === '1') return;
    const prev = localStorage.getItem(PERSIST_KEY);
    if (prev) {
      connect(prev).catch(() => localStorage.removeItem(PERSIST_KEY));
    }
    // run once on mount — connect()/connected are intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile a live Mesh connection with our session intent.
  useEffect(() => {
    if (!connected) return;
    if (localStorage.getItem(SIGNED_OUT_KEY) === '1') {
      // Stale Mesh connection after an explicit sign-out (Mesh state can
      // survive SPA navigation). Force it off so sign-out actually sticks.
      disconnect();
      return;
    }
    if (name) localStorage.setItem(PERSIST_KEY, name);
  }, [connected, name, disconnect]);

  return null;
}
