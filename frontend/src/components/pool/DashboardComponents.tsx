"use client";

import React, { useState } from 'react';

// --- SVGs & Icons ---
export const Logo = ({ className, isDark }: { className?: string; isDark: boolean }) => (
  <div className={`flex items-center gap-2 ${className || ''}`}>
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 w-8 h-8 md:w-10 md:h-10">
      <defs>
        <linearGradient x1="0%" y1="0%" x2="100%" y2="100%" id="logograd">
          <stop stopColor="#681CFF" offset="0%"></stop>
          <stop stopColor="#FD3F83" offset="100%"></stop>
        </linearGradient>
      </defs>
      <path d="M2.5 15.5c3-3 6-3 9 0s6 3 9 0" stroke="url(#logograd)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 4L5 20" stroke="url(#logograd)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 5l-3 3" stroke="url(#logograd)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16l-3 3" stroke="url(#logograd)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className={`text-2xl md:text-3xl font-black tracking-tighter whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-900'}`}>
      Agartha<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Kayak</span>
    </span>
  </div>
);

export const HeroTitleDot = () => (
  <svg viewBox="0 0 27 28" version="1.1" xmlns="http://www.w3.org/2000/svg" className="w-[1em] h-[1em] translate-y-2">
    <defs>
      <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="dotgrad">
        <stop stopColor="#681CFF" offset="0%"></stop>
        <stop stopColor="#FD3F83" offset="100%"></stop>
      </linearGradient>
    </defs>
    <g fill="url(#dotgrad)">
      <path d="M15.488 0C13.325 0 11.302.448 9.419 1.347c-1.883.83-3.524 1.972-4.921 3.423-1.395 1.453-2.51 3.146-3.347 5.08-.768 1.868-1.151 3.838-1.151 5.913 0 1.66.313 3.25 1.942 4.77C2.569 21.986 3.407 23.263 4.454 24.37c1.115 1.107 2.407 1.97 3.871 2.591 1.464.692 3.036 1.038 4.708 1.038 2.024 0 3.94-.448 5.758-1.349 1.816-.83 3.385-1.97 4.71-3.423 1.393-1.52 2.474-3.248 3.242-5.183.837-1.937 1.256-3.975 1.256-6.118 0-3.388-1.081-6.223-3.244-8.504C22.663 1.14 19.907 0 16.488 0h-1z"></path>
    </g>
  </svg>
);

export const BurgerIcon = ({ isOpen, isDark }: { isOpen: boolean; isDark: boolean }) => (
  <svg viewBox="0 0 26 23" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
    <g transform="translate(0 1)" stroke={isDark ? "#FFF" : "#681CFF"} strokeWidth="2" fill="none" fillRule="evenodd" strokeLinecap="square">
      <line x1="1" y1=".5" x2="25" y2=".5" className={`transition-all duration-300 origin-center ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></line>
      <line x1="1" y1="10.5" x2="25" y2="10.5" className={`transition-all duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></line>
      <line x1="1" y1="20.5" x2="25" y2="20.5" className={`transition-all duration-300 origin-center ${isOpen ? '-rotate-45 -translate-y-[8px]' : ''}`}></line>
    </g>
  </svg>
);

export const DashboardView = ({ isDark }: { isDark: boolean }) => {
  const mockTxs = [
    { hash: '0x3f9a...8b21', amount: '5,000 ADA', type: 'Loan Disbursed', status: 'Confirmed', time: '2 mins ago' },
    { hash: '0x1a4b...9c33', amount: '250 ADA', type: 'Repayment', status: 'Confirmed', time: '15 mins ago' },
    { hash: '0x8c2e...1a44', amount: '10,000 ADA', type: 'Pool Deposit', status: 'Confirmed', time: '1 hr ago' },
    { hash: '0x9d3f...2b55', amount: '1,200 ADA', type: 'Loan Disbursed', status: 'Confirmed', time: '3 hrs ago' },
    { hash: '0x5e4a...6c77', amount: '50 ADA', type: 'Interest Payment', status: 'Confirmed', time: '5 hrs ago' },
  ];

  return (
    <div className="relative min-h-screen pt-32 pb-16 px-6 lg:px-12 max-w-[1200px] mx-auto z-10 animate-in fade-in duration-500">
      <h2 className={`text-3xl md:text-5xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Dashboard</span></h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className={`border rounded-2xl p-6 backdrop-blur-md transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}`}>
          <p className={`text-sm font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Pooled Funds</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>24,500,000 <span className="text-[#FD3F83] text-xl">ADA</span></p>
        </div>
        <div className={`border rounded-2xl p-6 backdrop-blur-md transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}`}>
          <p className={`text-sm font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active Loans</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>1,204</p>
        </div>
        <div className={`border rounded-2xl p-6 backdrop-blur-md transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}`}>
          <p className={`text-sm font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>24h Volume</p>
          <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>142,000 <span className="text-[#681CFF] text-xl">ADA</span></p>
        </div>
      </div>

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
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      {tx.status}
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

export const LoanRequestView = ({ isDark }: { isDark: boolean }) => {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{ hash: string; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTxResult(null);
    
    // Simulate wallet popup and blockchain transaction
    setTimeout(() => {
      setIsSubmitting(false);
      setTxResult({
        hash: '0x' + Math.random().toString(16).substr(2, 10) + '...' + Math.random().toString(16).substr(2, 4),
        message: 'Transaction successfully submitted to the test network!'
      });
      setAmount('');
      setPurpose('');
    }, 2500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-6 z-10 animate-in fade-in zoom-in-95 duration-500">
      <div className={`w-full max-w-lg backdrop-blur-xl border rounded-3xl p-8 shadow-2xl ${isDark ? 'bg-[#13111C]/80 border-white/10' : 'bg-white/90 border-gray-200'}`}>
        <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Request a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Loan</span></h2>
        <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Submit your loan request to the decentralized pool.</p>

        {txResult ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Request Approved!</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{txResult.message}</p>
            <div className={`rounded-lg p-3 text-xs font-mono text-[#FD3F83] break-all ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
              TxHash: {txResult.hash}
            </div>
            <button onClick={() => setTxResult(null)} className={`mt-6 text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loan Amount (Test-ADA)</label>
              <div className="relative">
                <input 
                  type="number" 
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors focus:border-[#681CFF] ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                  placeholder="e.g. 5000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">ADA</span>
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

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full relative flex items-center justify-center px-6 py-4 font-semibold text-white bg-gradient-to-r from-[#681CFF] to-[#FD3F83] rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-70 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Simulating Transaction...
                </span>
              ) : (
                "Submit Request & Sign"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
