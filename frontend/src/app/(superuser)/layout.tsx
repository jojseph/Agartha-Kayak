'use client';

import React from 'react';
import { ShieldAlert, LayoutDashboard, Inbox, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useWallet } from '@meshsdk/react';

export default function SuperUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { disconnect } = useWallet();

  const handleSignOut = () => {
    disconnect();
    localStorage.removeItem('mesh-wallet-persist');
    localStorage.setItem('agartha-signed-out', '1');
    router.push('/');
  };

  const navItems = [
  { name: 'Dashboard Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'COOP Applications', href: '/admin/applications', icon: Inbox },
];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans antialiased text-[#0A0A0A]">
      {/* SuperUser Warning Banner */}
      <div className="bg-red-950 text-red-200 px-6 py-2 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 justify-center border-b border-red-900">
        <ShieldAlert size={14} className="animate-pulse" />
        Secure Administrative Terminal — Authorized Personnel Only
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <span className="font-bold tracking-tight text-gray-900 text-base">Agartha Admin</span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={16} />
            Exit Terminal
          </button>
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 p-10 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}