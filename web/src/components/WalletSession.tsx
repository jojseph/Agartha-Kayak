'use client';

import { useEffect } from 'react';
import { useWallet } from '@meshsdk/react';

export const PERSIST_KEY = 'mesh-wallet-persist';
export const SIGNED_OUT_KEY = 'agartha-signed-out';

export default function WalletSession() {
  const { connected, name, connect, disconnect } = useWallet();

  useEffect(() => {
    if (connected) return;
    if (localStorage.getItem(SIGNED_OUT_KEY) === '1') return;
    const prev = localStorage.getItem(PERSIST_KEY);
    if (!prev) return;

    const api = (window as any).cardano?.[prev];
    if (!api?.isEnabled) {

      localStorage.removeItem(PERSIST_KEY);
      return;
    }

    api.isEnabled().then((enabled: boolean) => {
      if (enabled) {
        connect(prev).catch(() => localStorage.removeItem(PERSIST_KEY));
      } else {

        localStorage.removeItem(PERSIST_KEY);
      }
    }).catch(() => localStorage.removeItem(PERSIST_KEY));

  }, []);

  useEffect(() => {
    if (!connected) return;
    if (localStorage.getItem(SIGNED_OUT_KEY) === '1') {

      disconnect();
      return;
    }
    if (name) localStorage.setItem(PERSIST_KEY, name);
  }, [connected, name, disconnect]);

  return null;
}
