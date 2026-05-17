'use client';

import React from 'react';
import { Landmark, Users, Eye, ShieldCheck, ExternalLink, Activity } from 'lucide-react';

export default function PublicRecordBoardPage() {
  // Mock data representing public-flagged logs to simulate live integration
  const mockPublicRecords = [
    {
      id: 'tx_p1',
      type: 'treasury',
      coop: 'Mandaue Central Farmers COOP',
      purpose: 'Emergency Crop Rehabilitation',
      amount: 25000,
      timestamp: 'May 17, 2026 · 14:32 UTC+8',
      hash: 'addr1q9k4xv2nptr8...m4w5kqz3vt7s'
    },
    {
      id: 'tx_p2',
      type: 'member',
      coop: 'Pardo Livelihood Association',
      purpose: 'Sari-Sari Store Inventory Purchase',
      amount: 5000,
      timestamp: 'May 15, 2026 · 09:14 UTC+8',
      hash: 'addr1q4f7tn2pn8j...8m9k2zlfkm8t'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-sans selection:bg-gray-200">
      {/* Background Decorative Matrix */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 80%)'
      }}></div>

      <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        {/* Header Section */}
        <header className="mb-12 border-b border-gray-200 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 mb-4 shadow-sm">
              <Eye size={12} /> Global Public Record Board
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              On-Chain Cooperative Ledger
            </h1>
            <p className="text-[14.5px] text-gray-500 max-w-xl mt-2 leading-relaxed">
              Real-time cryptographic audit trail of audited loans, transactions, and balances settled across local community networks.
            </p>
          </div>

          {/* Raymond Integration Sync Banner */}
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs max-w-xs md:max-w-none">
            <Activity size={16} className="text-amber-600 animate-pulse flex-shrink-0" />
            <div>
              <span className="font-bold">Sync Advisory:</span> Live stream gating is awaiting backend schema optimizations. Discharging immutable staging preview.
            </div>
          </div>
        </header>

        {/* Live Feed Container */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Immature Verification Stream</h2>
            <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-green-500" /> Powered by Cardano Meta-Etch
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {mockPublicRecords.map((record) => (
              <div key={record.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      record.type === 'treasury' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}>
                      {record.type === 'treasury' ? <Landmark size={10} /> : <Users size={10} />}
                      {record.type.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-gray-400">·</span>
                    <span className="text-xs font-bold text-gray-900">{record.coop}</span>
                  </div>

                  <p className="text-sm font-semibold text-gray-800 tracking-tight">
                    {record.purpose}
                  </p>
                  
                  <div className="font-mono text-[11px] text-gray-400 tracking-tight truncate max-w-xs sm:max-w-sm">
                    Hash: {record.hash}
                  </div>
                </div>

                <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                  <span className="text-base font-bold text-gray-900">
                    ₱ {record.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    {record.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <footer className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 text-center text-xs text-gray-400">
            Public visibility permissions are controlled explicitly by elected community Elders.
          </footer>
        </div>
      </div>
    </div>
  );
}