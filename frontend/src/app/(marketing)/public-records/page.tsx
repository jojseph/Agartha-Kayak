'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, Users, Eye, ShieldCheck, Activity } from 'lucide-react';

interface PublicRecord {
  id: string;
  type: string;
  ledgerCategory: string;
  ledgerLabel: string;
  coop: string;
  purpose: string;
  amount: number;
  currency: string;
  timestamp: string;
  hash: string;
  status: string;
}

type RecordTab = 'all' | 'loans' | 'members' | 'votes' | 'reconciliation' | 'gas';

const RECORD_TABS: { id: RecordTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'loans', label: 'Loans' },
  { id: 'members', label: 'Members' },
  { id: 'votes', label: 'Votes' },
  { id: 'reconciliation', label: 'Recon' },
  { id: 'gas', label: 'Gas' },
];

export default function PublicRecordBoardPage() {
  const [records, setRecords] = useState<PublicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordTab, setRecordTab] = useState<RecordTab>('all');

  const filteredRecords = useMemo(() => {
    if (recordTab === 'all') return records;
    return records.filter(record => record.ledgerCategory === recordTab);
  }, [records, recordTab]);

  useEffect(() => {
    async function fetchRecords() {
      try {
        const response = await fetch('/api/public-records');
        if (!response.ok) throw new Error('Failed to fetch records');
        const data = await response.json();
        setRecords(data.records);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecords();
    
    // Optional: Refresh every 30 seconds for a "live feed" feel
    const intervalId = setInterval(fetchRecords, 30000);
    return () => clearInterval(intervalId);
  }, []);

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
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs max-w-xs md:max-w-none">
            <Activity size={16} className="text-emerald-600 animate-pulse flex-shrink-0" />
            <div>
              <span className="font-bold">Sync Active:</span> Live stream of network transactions and loan records synchronized from the on-chain queue.
            </div>
          </div>
        </header>

        {/* Live Feed Container */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Verification Stream</h2>
            <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-green-500" /> Powered by Cardano Meta-Etch
            </span>
          </div>
          <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap gap-2" role="tablist" aria-label="Public record filters">
            {RECORD_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={recordTab === tab.id}
                onClick={() => setRecordTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                  recordTab === tab.id
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Activity className="animate-spin text-gray-300" size={24} />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500 text-sm">{error}</div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                {recordTab === 'all' ? 'No public records found.' : `No ${RECORD_TABS.find(tab => tab.id === recordTab)?.label.toLowerCase()} records found.`}
              </div>
            ) : filteredRecords.map((record) => (
              <div key={record.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 transition-colors">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      record.type === 'treasury' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}>
                      {record.type === 'treasury' ? <Landmark size={10} /> : <Users size={10} />}
                      {record.ledgerLabel || record.type.toUpperCase()}
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
                    {record.currency === 'ADA' ? 'ADA ' : 'PHP '}
                    {record.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
