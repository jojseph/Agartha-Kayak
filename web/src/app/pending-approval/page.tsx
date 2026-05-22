'use client';

import React from 'react';
import { useWallet } from '@meshsdk/react';
import { useRouter } from 'next/navigation';
import { Clock, ShieldCheck, ArrowRight, LogOut } from 'lucide-react';

export default function PendingApprovalPage() {
  const { disconnect } = useWallet();
  const router = useRouter();

  const handleSignOut = () => {
    disconnect();
    localStorage.removeItem('mesh-wallet-persist');
    localStorage.setItem('agartha-signed-out', '1');
    router.push('/');
  };

  const checkStatus = () => {

    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-6">

      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 70%)'
      }}></div>

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-[24px] p-8 md:p-10 shadow-sm relative z-10 text-center">

        <div className="w-20 h-20 bg-amber-50 border-2 border-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
          <Clock size={36} strokeWidth={2.5} />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
          Application Pending
        </h1>

        <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
          Your cooperative registration has been received. You are currently waiting for a community Elder to verify your identity and approve your membership.
        </p>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-left">
          <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-gray-400" /> What happens next?
          </h3>
          <ul className="text-[13.5px] text-gray-600 space-y-3">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></div>
              <span>An Elder will review your submitted Barangay details.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></div>
              <span>Once verified, your account will be activated on-chain.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0"></div>
              <span>You will gain full access to the lending dashboard.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={checkStatus}
            className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-[14.5px] transition-colors flex items-center justify-center gap-2"
          >
            Check Status <ArrowRight size={16} />
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-[14.5px] transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Disconnect Wallet
          </button>
        </div>

      </div>
    </div>
  );
}