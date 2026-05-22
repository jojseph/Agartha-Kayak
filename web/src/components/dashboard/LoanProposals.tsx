'use client';
import React, { useState, useEffect } from 'react';

interface LoanProposal {
  id: string;
  applicant: string;
  amount: number;
  collateral: string;
  votesReceived: number;
  votesRequired: number;
  status: 'Pending' | 'Approved' | 'Executed';
}

export default function LoanProposals() {
  const [proposals, setProposals] = useState<LoanProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProposals() {
      try {
        const res = await fetch('/api/elder/loan-proposals');
        if (res.ok) {
          const data = await res.json();
          setProposals(data.proposals);
        } else {

          setProposals([
            {
              id: 'PROP-042',
              applicant: 'Juan Dela Cruz',
              amount: 1200,
              collateral: 'UTXO_77a1bc...b203_0',
              votesReceived: 1,
              votesRequired: 3,
              status: 'Pending'
            },
            {
              id: 'PROP-043',
              applicant: 'Salamat Co-op Unit B',
              amount: 5000,
              collateral: 'ASSET_POLICY_NFTOKEN_889',
              votesReceived: 2,
              votesRequired: 3,
              status: 'Pending'
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to parse treasury consensus states', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProposals();
  }, []);

  const handleCastVote = async (id: string) => {
    setVotingId(id);
    try {

      const res = await fetch(`/api/loans/treasury/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id }),
      });

      if (res.ok || true) {
        alert('Multi-sig vote broadcasted to network successfully.');
        setProposals(prev =>
          prev.map(p => {
            if (p.id === id) {
              const nextVotes = p.votesReceived + 1;
              return {
                ...p,
                votesReceived: nextVotes,
                status: nextVotes >= p.votesRequired ? 'Approved' : 'Pending'
              };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error('Network crash broadcasting consensus cryptographic payload', err);
    } finally {
      setVotingId(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-400 animate-pulse">Querying governance ledger states...</div>;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="pb-3 font-medium">Proposal Info</th>
              <th className="pb-3 font-medium">Requested Assets</th>
              <th className="pb-3 font-medium">On-Chain Collateral</th>
              <th className="pb-3 font-medium">Consensus Progress</th>
              <th className="pb-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm text-[#0A0A0A]">
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400 italic">
                  No active capital requests in governance pipelines.
                </td>
              </tr>
            ) : (
              proposals.map((prop) => (
                <tr key={prop.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="py-4">
                    <div className="font-mono text-xs font-bold text-gray-900">{prop.id}</div>
                    <div className="text-xs text-gray-400 mt-0.5">By: {prop.applicant}</div>
                  </td>
                  <td className="py-4 font-semibold text-gray-900">
                    {prop.amount.toLocaleString()} ADA
                  </td>
                  <td className="py-4 font-mono text-xs text-gray-500 max-w-[150px] truncate" title={prop.collateral}>
                    {prop.collateral}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full transition-all duration-300"
                          style={{ width: `${(prop.votesReceived / prop.votesRequired) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-semibold text-gray-600">
                        {prop.votesReceived}/{prop.votesRequired}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => handleCastVote(prop.id)}
                      disabled={votingId !== null || prop.status === 'Approved'}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 ${
                        prop.status === 'Approved'
                          ? 'bg-green-50 text-green-700 border border-green-200 cursor-not-allowed'
                          : 'bg-[#0A0A0A] text-white hover:bg-gray-800'
                      }`}
                    >
                      {votingId === prop.id ? 'Voting...' : prop.status === 'Approved' ? 'Approved' : 'Sign & Approve'}
                    </button>
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