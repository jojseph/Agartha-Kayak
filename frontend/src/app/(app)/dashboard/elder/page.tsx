'use client';
import React, { useState } from 'react';
import { useAuth } from "@/providers/AuthProvider";
import PendingMembers from "@/components/dashboard/PendingMembers";
import LoanProposals from "@/components/dashboard/LoanProposals";
import VerifyRepayments from "@/components/dashboard/VerifyRepayments";

export default function ElderDashboard() {
  const { member, status } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'loans' | 'repayments'>('members');

  // Hard perimeter check while the session is resolving
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-sm text-gray-400 animate-pulse">Decrypting administrative keys...</p>
      </div>
    );
  }

  // Security fallback if a regular member tries to guess this URL path
  if (member?.role !== 'elder') {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="bg-white border border-red-100 rounded-2xl p-6 max-w-sm text-center shadow-sm">
          <h1 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-2">Access Violation</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your credentials do not contain the required cryptographic signatures to access the Elder Governance Council.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Elder Governance Header */}
        <header className="pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Elder Council Governance</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 uppercase tracking-wider border border-purple-200">
              {member.alias} · Admin
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Review ledger registrations, oversee active treasury lines, and verify collateral claims.
          </p>
        </header>

        {/* Navigation Tabs for Queue Management */}
        <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 transition-colors relative ${activeTab === 'members' ? 'text-black font-semibold border-b-2 border-black' : 'text-gray-400 hover:text-black'}`}
          >
            Pending Onboarding
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`pb-3 transition-colors relative ${activeTab === 'loans' ? 'text-black font-semibold border-b-2 border-black' : 'text-gray-400 hover:text-black'}`}
          >
            Treasury Proposals
          </button>
          <button
            onClick={() => setActiveTab('repayments')}
            className={`pb-3 transition-colors relative ${activeTab === 'repayments' ? 'text-black font-semibold border-b-2 border-black' : 'text-gray-400 hover:text-black'}`}
          >
            Verify Claims
          </button>
        </div>

        {/* Dynamic Queue Canvas Content */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[300px]">
          
          {activeTab === 'members' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Identity Verification Queue</h3>
              {/* Inserted Onboarding Queue Component */}
              <PendingMembers />
            </div>
          )}

          {activeTab === 'loans' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Multi-Sig Proposal Voting</h3>
              <LoanProposals />
            </div>
          )}

          {activeTab === 'repayments' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Repayment Settlement Claims</h3>
              <VerifyRepayments />
            </div>
          )}
          
        </div>

      </div>
    </div>
  );
}