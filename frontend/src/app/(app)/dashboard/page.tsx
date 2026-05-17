'use client';
import React from 'react';
import { useAuth } from "@/providers/AuthProvider";
import MyLoans from "@/components/dashboard/MyLoans";
import RequestLoanCard from "@/components/dashboard/RequestLoanCard";
import TreasuryStat from "@/components/dashboard/TreasuryStat";

// This 'export default' line is what Next.js was missing!
export default function MemberDashboard() {
  const { member, status } = useAuth();

  // Guard clause to handle loading states smoothly
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-sm text-gray-400 animate-pulse">Loading your vault assets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Profile Section */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">{member?.alias || 'Anonymous Member'}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                {member?.role || 'Member'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">{member?.wallet_address}</p>
          </div>
          
          {/* Trust Score Display */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-4">
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">Trust Score</div>
              <div className="text-xl font-bold text-gray-900">{member?.trust_score ?? 100}</div>
            </div>
          </div>
        </header>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Panel: Active Loans & Repayments (Takes up 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[200px]">
              <h2 className="text-lg font-bold mb-4">My Active Loans</h2>
              
              {/* Render the core loan lifecycle tracker table */}
              <MyLoans />
              
            </div>
          </div>

          {/* Sidebar: Actions & Stats (Takes up 1 column) */}
          <div className="space-y-6">
            
            {/* Render the pool capital metrics visual */}
            <TreasuryStat />

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Actions</h2>
              
              {/* Render the action submission triggers */}
              <RequestLoanCard />
              
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}