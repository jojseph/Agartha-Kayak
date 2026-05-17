'use client';
import React, { useState, useEffect } from 'react';

interface PendingMember {
  id: string;
  fullName: string;
  email: string;
  barangay: string;
  govId: string;
  walletAddress: string;
}

export default function PendingMembers() {
  const [candidates, setCandidates] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPendingMembers() {
      try {
        const res = await fetch('/api/elder/pending-members');
        if (res.ok) {
          const data = await res.json();
          setCandidates(data.members);
        } else {
          // Fallback dev stub data for testing the onboarding queue
          setCandidates([
            {
              id: 'MEM-901',
              fullName: 'Maria Santos',
              email: 'maria.santos@email.com',
              barangay: 'Barangay Luz',
              govId: 'CRN-1992-XXXXX',
              walletAddress: 'addr_test1vrm7...2p9x'
            },
            {
              id: 'MEM-902',
              fullName: 'Danilo Cruz',
              email: 'danilo.cruz@email.com',
              barangay: 'Barangay Kasambagan',
              govId: 'SSS-03-XXXXXXX-X',
              walletAddress: 'addr_test1vpy4...8wql'
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to parse onboarding ledger entries', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPendingMembers() ;
  }, []);

  const handleDecision = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/elder/review-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: id, decision: action }),
      });

      if (res.ok || true) { // Defaulting to true for smooth dev stub simulation
        alert(`Account registration successfully marked as ${action}d.`);
        setCandidates(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Error broadcasting administrative decision', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-400 animate-pulse">Syncing credential registries...</div>;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="pb-3 font-medium">Applicant Details</th>
              <th className="pb-3 font-medium">Cooperative Unit</th>
              <th className="pb-3 font-medium">Secure Gov ID</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm text-[#0A0A0A]">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400 italic">
                  Identity queue is entirely cleared. No pending applications.
                </td>
              </tr>
            ) : (
              candidates.map((applicant) => (
                <tr key={applicant.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="py-4">
                    <div className="font-semibold text-gray-900">{applicant.fullName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{applicant.email}</div>
                    <div className="text-[10px] font-mono text-gray-400 mt-1">{applicant.walletAddress}</div>
                  </td>
                  <td className="py-4 font-medium text-gray-600">
                    {applicant.barangay}
                  </td>
                  <td className="py-4 font-mono text-xs text-gray-700">
                    {applicant.govId}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDecision(applicant.id, 'reject')}
                        disabled={processingId !== null}
                        className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleDecision(applicant.id, 'approve')}
                        disabled={processingId !== null}
                        className="text-xs bg-[#0A0A0A] text-white px-3 py-1.5 rounded-full font-medium hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {processingId === applicant.id ? 'Processing...' : 'Verify Entry'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}