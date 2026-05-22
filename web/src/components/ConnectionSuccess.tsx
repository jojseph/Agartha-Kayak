import React from 'react';

export default function ConnectionSuccess() {
    return (
        <div className="w-full space-y-8 animate-in zoom-in-95 fade-in duration-500 py-8">

        <div className="flex justify-center">
            <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.15)] relative">
                <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400/20"></div>
                <svg className="w-12 h-12 text-emerald-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        </div>

        <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-[#0A0A0A]">Connection Successful</h2>
            <p className="text-[15px] font-medium text-[#6B7280]">Ledger verified and wallet synced.</p>
        </div>

        <div className="flex justify-center pt-2">
            <div className="w-8 h-8 border-[3px] border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>

        </div>
    );
}