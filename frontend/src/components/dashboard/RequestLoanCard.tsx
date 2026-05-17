'use client';
import React, { useState } from 'react';

export default function RequestLoanCard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loanType, setLoanType] = useState<'P2P' | 'Treasury'>('P2P');
  const [amount, setAmount] = useState('');
  const [collateral, setCollateral] = useState(''); // Mandatory per Module 1
  const [submitting, setSubmitting] = useState(false);

  const handleOpenModal = (type: 'P2P' | 'Treasury') => {
    setLoanType(type);
    setIsModalOpen(true);
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Direct endpoint setup to coordinate with Raymond's backend handlers
      const endpoint = loanType === 'Treasury' ? '/api/loans/treasury/request' : '/api/loans/p2p/request';
      
      const payload = loanType === 'Treasury' 
        ? { amount: parseFloat(amount), collateral } // Collateral mandatory for Treasury
        : { amount: parseFloat(amount) };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(`${loanType} Loan Request submitted successfully! Status is now pending.`);
        setIsModalOpen(false);
        setAmount('');
        setCollateral('');
      } else {
        alert('Failed to submit request. Please verify connection credentials.');
      }
    } catch (err) {
      console.error('Network failure during loan application submission', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-1 bg-[#FAFAFA] border border-gray-100 rounded-xl flex gap-2">
        <button
          type="button"
          onClick={() => handleOpenModal('P2P')}
          className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-[#0A0A0A] shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
        >
          Request P2P Loan
        </button>
        <button
          type="button"
          onClick={() => handleOpenModal('Treasury')}
          className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold bg-[#0A0A0A] text-white hover:bg-gray-800 transition-all active:scale-[0.98]"
        >
          Request Treasury Loan
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 p-4 bg-gray-50/50">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Operational Notice</h4>
        <p className="text-xs text-gray-400 leading-normal">
          Treasury requests require an Elder multi-signature vote threshold before capital release. Peer-to-Peer agreements rely entirely on direct counterparty trust scores.
        </p>
      </div>

      {/* Application Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold mb-1">Create New Loan Proposal</h3>
            <p className="text-xs text-gray-400 mb-4">Type: <span className="font-semibold text-blue-600 font-mono uppercase">{loanType} Pool</span></p>

            <form onSubmit={handleLoanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Requested Amount (ADA)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                />
              </div>

              {/* Conditional Rendering: Render collateral input only for Treasury requests */}
              {loanType === 'Treasury' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    On-Chain Collateral Reference <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required // Enforced by charter specs
                    value={collateral}
                    onChange={(e) => setCollateral(e.target.value)}
                    placeholder="Provide asset UTXO, token ID, or declaration hash"
                    className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    Collateral parameters are mandatory for treasury-backed requests.
                  </p>
                </div>
              )}

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
                  {submitting ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}