'use client';
import React, { useState, useEffect } from 'react';

// Loan structures and their states as defined by the lifecycle documentation
interface Loan {
  id: string;
  type: 'P2P' | 'Treasury';
  amount: number;
  status: 'Pending' | 'Ongoing' | 'Valid' | 'Invalid' | 'Approved' | 'Active' | 'Fully Paid';
  dueDate: string;
}

export default function MyLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Repayment Modal States (Task 2.9)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('ADA');
  const [repayRef, setRepayRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchLoans() {
      try {
        const res = await fetch('/api/loans/my-loans');
        if (res.ok) {
          const data = await res.json();
          setLoans(data.loans);
        } else {
          // Fallback Dev Stub Data until Raymond's schema/API migration completely lands
          setLoans([
            { id: 'LN-001', type: 'Treasury', amount: 500, status: 'Active', dueDate: '2026-06-15' },
            { id: 'LN-002', type: 'P2P', amount: 150, status: 'Pending', dueDate: '2026-07-01' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load loans', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLoans();
  }, []);

  const handleOpenRepayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsModalOpen(true);
  };

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/loans/repayment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          amount: parseFloat(repayAmount),
          method: repayMethod,
          reference: repayRef,
        }),
      });

      if (res.ok) {
        alert('Repayment logged! Awaiting Elder verification.');
        setIsModalOpen(false);
        setRepayAmount('');
        setRepayRef('');
      }
    } catch (err) {
      console.error('Repayment submission network error', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper styling function to isolate component rendering rules for statuses
  const getStatusBadge = (status: Loan['status']) => {
    const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide";
    switch (status) {
      case 'Pending':
        return `${base} bg-yellow-50 text-yellow-700 border border-yellow-200`;
      case 'Ongoing':
      case 'Active':
        return `${base} bg-blue-50 text-blue-700 border border-blue-200`;
      case 'Valid':
      case 'Fully Paid':
        return `${base} bg-green-50 text-green-700 border border-green-200`;
      case 'Approved':
        return `${base} bg-purple-50 text-purple-700 border border-purple-200`;
      case 'Invalid':
      default:
        return `${base} bg-red-50 text-red-700 border border-red-200`;
    }
  };

  if (loading) return <div className="text-sm text-gray-400 animate-pulse">Syncing ledger records...</div>;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="pb-3 font-medium">Loan ID</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Due Date</th>
              <th className="pb-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm text-[#0A0A0A]">
            {loans.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400 italic">No historical transactions detected.</td>
              </tr>
            ) : (
              loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 font-mono text-xs">{loan.id}</td>
                  <td className="py-3.5 font-medium">{loan.type}</td>
                  <td className="py-3.5 font-semibold">{loan.amount} ADA</td>
                  <td className="py-3.5">{getStatusBadge(loan.status)}</td>
                  <td className="py-3.5 text-gray-500">{loan.dueDate}</td>
                  <td className="py-3.5 text-right">
                    {['Active', 'Ongoing', 'Approved'].includes(loan.status) && (
                      <button
                        onClick={() => handleOpenRepayment(loan)}
                        className="text-xs bg-[#0A0A0A] text-white px-3 py-1.5 rounded-full font-medium hover:bg-gray-800 transition-all active:scale-95"
                      >
                        Log Repayment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Two-Step Repayment Modal Setup (Task 2.9) */}
      {isModalOpen && selectedLoan && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold mb-1">Log Asset Repayment</h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">Targeting Obligation: {selectedLoan.id}</p>
            
            <form onSubmit={handleRepaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Repayment Amount (ADA)</label>
                <input
                  type="number"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Settlement Channel</label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                >
                  <option value="ADA">Direct Blockchain Transfer (ADA)</option>
                  <option value="Cash">Over-the-Counter Cash (To Elder)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction Hash / Reference Code (Optional)</label>
                <input
                  type="text"
                  value={repayRef}
                  onChange={(e) => setRepayRef(e.target.value)}
                  placeholder="Paste Cardano TX hash or reference code"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 border border-gray-200 rounded-full text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-10 bg-[#0A0A0A] text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}