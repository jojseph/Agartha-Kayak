'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@meshsdk/react';

// --- SVGs & Icons ---
export const Logo = ({ className, isDark }: { className?: string; isDark: boolean }) => (
  <div className={`flex items-center gap-2 ${className || ''}`}>
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 w-8 h-8 md:w-10 md:h-10">
      <defs>
        <linearGradient x1="0%" y1="0%" x2="100%" y2="100%" id="logograd_test">
          <stop stopColor="#681CFF" offset="0%"></stop>
          <stop stopColor="#FD3F83" offset="100%"></stop>
        </linearGradient>
      </defs>
      <path d="M2.5 15.5c3-3 6-3 9 0s6 3 9 0" stroke="url(#logograd_test)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 4L5 20" stroke="url(#logograd_test)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 5l-3 3" stroke="url(#logograd_test)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16l-3 3" stroke="url(#logograd_test)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className={`text-2xl md:text-3xl font-black tracking-tighter whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>
      Agartha<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Kayak</span>
    </span>
  </div>
);

// --- Community Pool View ---
export const CommunityPoolView = ({ isDark }: { isDark: boolean }) => {
  const mockTxs = [
    { hash: '0x3f9a...8b21', amount: '5,000 Php', type: 'Treasury Loan', status: 'approved', time: '2 mins ago' },
    { hash: '0x1a4b...9c33', amount: '250 Php', type: 'Repayment', status: 'completed', time: '15 mins ago' },
    { hash: '0x8c2e...1a44', amount: '10,000 Php', type: 'Peer Loan', status: 'active', time: '1 hr ago' },
    { hash: '0x9d3f...2b55', amount: '1,200 Php', type: 'Treasury Loan', status: 'pending', time: '3 hrs ago' },
    { hash: '0x5e4a...6c77', amount: '50 Php', type: 'Peer Loan', status: 'rejected', time: '5 hrs ago' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-400';
      case 'approved': return 'bg-blue-500/10 text-blue-400';
      case 'active': return 'bg-green-500/10 text-green-400';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400';
      case 'rejected':
      case 'defaulted': return 'bg-red-500/10 text-red-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-400';
      case 'approved': return 'bg-blue-400';
      case 'active': return 'bg-green-400';
      case 'completed': return 'bg-emerald-400';
      case 'rejected':
      case 'defaulted': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="relative min-h-screen pt-32 pb-16 px-6 lg:px-12 max-w-[1200px] mx-auto z-10 animate-in fade-in duration-500">
      <h2 className={`text-3xl md:text-5xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Consolacion Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Pool</span></h2>

      {/* Public Record Board */}
      <div className={`border rounded-2xl backdrop-blur-md overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className={`px-6 py-5 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
          <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Public Record Board (Recent Transactions)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-sm uppercase tracking-wider ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <th className="px-6 py-4 font-medium">Tx Hash</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
              {mockTxs.map((tx, idx) => (
                <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-800'}`}>
                  <td className="px-6 py-4 font-mono text-[#FD3F83]">{tx.hash}</td>
                  <td className="px-6 py-4">{tx.type}</td>
                  <td className="px-6 py-4 font-semibold">{tx.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(tx.status)}`}></span>
                      <span className="capitalize">{tx.status}</span>
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Treasury Loan View ---
export const TreasuryLoanView = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className="relative min-h-screen pt-32 pb-16 px-6 lg:px-12 max-w-[1200px] mx-auto z-10 animate-in fade-in duration-500">
      <h2 className={`text-3xl md:text-5xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Treasury <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Loan</span></h2>
      <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>You can request a loan from the community cooperative here.</p>
    </div>
  );
};

// --- Peer Loan View ---
export const PeerLoanView = ({ isDark, address }: { isDark: boolean; address: string | null }) => {
  const { aliasQuery, setAliasQuery, searchResults, selectedLender, setSelectedLender, isSearching } = memberSearchHook(isDark);
  
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    if (!address) {
      setErrorMessage('Please connect your wallet first.');
      return;
    }
    if (!selectedLender) {
      setErrorMessage('Please select a valid lender from the dropdown.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/loans/peer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '',
        },
        body: JSON.stringify({
          borrowerAddress: address,
          lenderAddress: selectedLender.wallet_address,
          amount,
          currency: 'Php',
          purpose,
          proof_url: proofUrl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Peer loan request submitted successfully!');
        setAmount('');
        setPurpose('');
        setProofUrl('');
        setAliasQuery('');
        setSelectedLender(null);
      } else {
        setErrorMessage(data.error || 'Failed to submit loan request');
      }
    } catch (err) {
      setErrorMessage('Network error while submitting request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen pt-32 pb-16 px-6 lg:px-12 max-w-[1200px] mx-auto z-10 animate-in fade-in duration-500">
      <div className={`max-w-xl mx-auto backdrop-blur-xl border rounded-3xl p-8 shadow-2xl ${isDark ? 'bg-[#13111C]/80 border-white/10' : 'bg-white/90 border-gray-200'}`}>
        <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Peer <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Loan</span></h2>
        <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Request a peer-to-peer loan from a community member.</p>

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lender Search */}
          <div className="relative">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Lender's Alias</label>
            <input 
              type="text" 
              required
              value={aliasQuery}
              onChange={(e) => {
                setAliasQuery(e.target.value);
                setSelectedLender(null);
              }}
              className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors focus:border-[#681CFF] ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              placeholder="Search for an alias..."
            />
            {isSearching && <div className="absolute right-4 top-10 w-4 h-4 border-2 border-[#681CFF] border-t-transparent rounded-full animate-spin"></div>}
            
            {/* Dropdown */}
            {searchResults.length > 0 && !selectedLender && (
              <ul className={`absolute z-20 w-full mt-2 border rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-hidden ${isDark ? 'bg-[#13111C] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                {searchResults.map((user: any) => (
                  <li 
                    key={user.wallet_address}
                    onClick={() => {
                      setSelectedLender(user);
                      setAliasQuery(user.alias);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  >
                    <div className="font-medium">{user.alias}</div>
                    <div className="text-xs text-gray-500 font-mono truncate">{user.wallet_address}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loan Amount</label>
              <input 
                type="number" 
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors focus:border-[#681CFF] ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                placeholder="0.00"
              />
            </div>
            <div className="w-1/3">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Currency</label>
              <input 
                type="text" 
                value="Php"
                readOnly
                className={`w-full border rounded-xl px-4 py-3 cursor-not-allowed opacity-70 ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-200 border-gray-300 text-gray-900'}`}
              />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Purpose of Loan</label>
            <textarea 
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors h-24 resize-none focus:border-[#681CFF] ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              placeholder="Briefly describe what the funds will be used for..."
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Link for Proof</label>
            <input 
              type="url" 
              required
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors focus:border-[#681CFF] ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              placeholder="https://..."
            />
          </div>

          <p className="text-xs text-gray-500 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#FD3F83]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            The transaction fee will be shouldered by the dApp wallet.
          </p>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full relative flex items-center justify-center px-6 py-4 font-semibold text-white bg-gradient-to-r from-[#681CFF] to-[#FD3F83] rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-70 disabled:hover:scale-100"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Peer Loan Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Hook for debounced search
function memberSearchHook(isDark: boolean) {
  const [aliasQuery, setAliasQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLender, setSelectedLender] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!aliasQuery || selectedLender) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(aliasQuery)}`, {
          headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.members || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [aliasQuery, selectedLender]);

  return { aliasQuery, setAliasQuery, searchResults, selectedLender, setSelectedLender, isSearching };
}


// --- Your Transactions View ---
export const YourTransactionsView = ({ isDark, address }: { isDark: boolean; address: string | null }) => {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchLoans = async () => {
      try {
        const res = await fetch(`/api/loans/user?address=${encodeURIComponent(address)}`, {
          headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
        });
        if (res.ok) {
          const data = await res.json();
          setLoans(data.loans || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [address]);

  return (
    <div className="relative min-h-screen pt-32 pb-16 px-6 lg:px-12 max-w-[1200px] mx-auto z-10 animate-in fade-in duration-500">
      <h2 className={`text-3xl md:text-5xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Transactions</span></h2>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-[#681CFF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className={`border rounded-2xl backdrop-blur-md overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-sm uppercase tracking-wider ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No transactions found.</td>
                  </tr>
                ) : (
                  loans.map((loan, idx) => {
                    const isBorrower = loan.borrower_address === address;
                    return (
                      <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-800'}`}>
                        <td className="px-6 py-4">{loan.loan_type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isBorrower ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            {isBorrower ? 'Borrower' : 'Lender'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold">{loan.amount} {loan.currency}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            loan.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            loan.status === 'active' ? 'bg-green-500/10 text-green-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              loan.status === 'pending' ? 'bg-yellow-400' :
                              loan.status === 'active' ? 'bg-green-400' :
                              'bg-gray-400'
                            }`}></span>
                            {loan.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(loan.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
