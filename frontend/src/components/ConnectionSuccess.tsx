import React from 'react';
import { useRouter } from 'next/navigation';

interface ConnectionSuccessProps {
    memberData: {
        alias: string;
        trust_score: number;
    };
    address: string | null;
    onDisconnect: () => void;
}

export default function ConnectionSuccess({ memberData, address, onDisconnect }: ConnectionSuccessProps) {
    const router = useRouter();

    return (
        <div className="w-full space-y-6 animate-in zoom-in-95 fade-in duration-500">
        
        {/* 1. Success Checkmark Icon */}
        <div className="flex justify-center">
            <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
            </div>
        </div>

        {/* 2. Header */}
        <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-white">Connection Successful</h2>
            <p className="text-sm text-slate-400">Ledger verified and wallet synced.</p>
        </div>

        {/* 3. The Digital ID Card */}
        <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl relative overflow-hidden group">
            {/* Decorative glowing background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 space-y-4">
            <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Community Alias</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                {memberData?.alias}
                </p>
            </div>

            <div className="pt-4 border-t border-slate-700/50 flex justify-between items-end">
                <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Trust Score</p>
                <p className="text-2xl font-bold text-white">{memberData?.trust_score}</p>
                </div>
                <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Wallet Identity</p>
                <p className="text-xs font-mono text-slate-400 truncate w-28">
                    {address?.slice(0, 8)}...{address?.slice(-6)}
                </p>
                </div>
            </div>
            </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="pt-2 space-y-3">
            <button 
            onClick={() => router.push('/vaultTest')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
            Enter Vault Dashboard
            </button>
            <button
            onClick={onDisconnect}
            className="w-full py-3 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-sm font-bold transition-all border border-slate-800 hover:border-slate-700"
            >
            Disconnect Wallet
            </button>
        </div>
        </div>
    );
}