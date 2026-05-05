'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@meshsdk/react';
import { 
  Logo, 
  CommunityPoolView, 
  TreasuryLoanView, 
  PeerLoanView, 
  YourTransactionsView 
} from './DashboardViews';

// Reusing BurgerIcon from marketing page
const BurgerIcon = ({ isOpen, isDark }: { isOpen: boolean; isDark: boolean }) => (
  <svg viewBox="0 0 26 23" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
    <g transform="translate(0 1)" stroke={isDark ? "#FFF" : "#681CFF"} strokeWidth="2" fill="none" fillRule="evenodd" strokeLinecap="square">
      <line x1="1" y1=".5" x2="25" y2=".5" className={`transition-all duration-300 origin-center ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></line>
      <line x1="1" y1="10.5" x2="25" y2="10.5" className={`transition-all duration-300 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></line>
      <line x1="1" y1="20.5" x2="25" y2="20.5" className={`transition-all duration-300 origin-center ${isOpen ? '-rotate-45 -translate-y-[8px]' : ''}`}></line>
    </g>
  </svg>
);

function DashboardTestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const aliasParam = searchParams.get('alias') || 'Guest';
  
  const { wallet, connected, disconnect } = useWallet();
  const [address, setAddress] = useState<string | null>(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [view, setView] = useState('pool'); // default view
  const [isDark, setIsDark] = useState(true);

  const handleLogout = () => {
    disconnect();
    router.push('/');
  };

  // Handle scroll to add backdrop blur to header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch connected address
  useEffect(() => {
    if (connected) {
      wallet.getUsedAddresses().then((addrs) => {
        if (addrs && addrs.length > 0) {
          setAddress(addrs[0]);
        }
      }).catch(() => {});
    }
  }, [connected, wallet]);

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-300 ${isDark ? 'bg-[#05050A] text-white selection:bg-[#FD3F83] selection:text-white' : 'bg-[#FFFDFB] text-gray-900 selection:bg-[#681CFF] selection:text-white'}`}>
      
      {/* Background Animated Gradient */}
      <div className="fixed inset-0 z-[0] overflow-hidden pointer-events-none transition-opacity duration-500">
        {isDark ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-[#10072E] via-[#05050A] to-[#1F0839] animate-[pulse_10s_ease-in-out_infinite]"></div>
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-[#681CFF] opacity-[0.15] blur-[100px] animate-[ping_8s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#FD3F83] opacity-[0.15] blur-[120px]"></div>
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-[#F3E8FF] via-[#FFFDFB] to-[#FCE7F3] animate-[pulse_10s_ease-in-out_infinite]"></div>
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-[#681CFF] opacity-[0.05] blur-[100px] animate-[ping_8s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#FD3F83] opacity-[0.05] blur-[120px]"></div>
          </>
        )}
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 lg:px-12 transition-all duration-300 ${isScrolled ? (isDark ? 'bg-[#05050A]/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-white/80 backdrop-blur-md border-b border-gray-200 py-4 shadow-sm') : 'bg-transparent py-6'}`}>
        
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <a href="#" aria-label="Home" className="relative z-50" onClick={(e) => { e.preventDefault(); setView('pool'); }}>
            <Logo isDark={isDark} />
          </a>

          {/* Desktop Nav */}
          <nav className={`hidden lg:flex items-center gap-8 text-[15px] font-medium tracking-wide ${isDark ? 'text-white' : 'text-[#681CFF]'}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('pool'); }} className={`transition-colors ${view === 'pool' ? 'text-[#FD3F83]' : 'hover:text-[#FD3F83]'}`}>Community Pool</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('treasury'); }} className={`transition-colors ${view === 'treasury' ? 'text-[#FD3F83]' : 'hover:text-[#FD3F83]'}`}>Treasury Loan</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('peer'); }} className={`transition-colors ${view === 'peer' ? 'text-[#FD3F83]' : 'hover:text-[#FD3F83]'}`}>Peer Loan</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('transactions'); }} className={`transition-colors ${view === 'transactions' ? 'text-[#FD3F83]' : 'hover:text-[#FD3F83]'}`}>Your Transactions</a>
          </nav>
        </div>

        {/* Right Section Desktop */}
        <div className="hidden lg:flex items-center gap-6 z-50">
          
          <div className="relative">
            <div 
              className={`font-medium cursor-pointer select-none flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Welcome <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83] font-bold">{aliasParam}</span>
              <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {dropdownOpen && (
              <div className={`absolute top-full right-0 mt-4 w-48 rounded-2xl border backdrop-blur-xl shadow-xl overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-[#10072E]/90 border-white/10' : 'bg-white/90 border-gray-200'}`}>
                <button 
                  onClick={handleLogout} 
                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${isDark ? 'text-red-400 hover:bg-white/5' : 'text-red-500 hover:bg-red-50'}`}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button 
            onClick={() => setIsDark(!isDark)} 
            className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="lg:hidden flex items-center gap-4">
          <button 
            onClick={() => setIsDark(!isDark)} 
            className={`p-2 rounded-full transition-colors z-50 relative ${isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            )}
          </button>
          <button 
            className="relative z-50 p-2 focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <BurgerIcon isOpen={mobileMenuOpen} isDark={isDark} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 transition-transform duration-500 ease-in-out lg:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} ${isDark ? 'bg-[#05050A]' : 'bg-[#FFFDFB]'}`}>
        <div className="flex flex-col h-full pt-24 px-8 pb-8 overflow-y-auto">
          <div className={`mb-8 font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <div>Welcome <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83] font-bold">{aliasParam}</span></div>
            <button onClick={handleLogout} className="mt-4 text-red-500 font-semibold">Log Out</button>
          </div>

          <nav className={`flex flex-col gap-6 text-2xl font-medium ${isDark ? 'text-white' : 'text-[#681CFF]'}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('pool'); setMobileMenuOpen(false); }} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'} ${view === 'pool' ? 'text-[#FD3F83]' : ''}`}>Community Pool</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('treasury'); setMobileMenuOpen(false); }} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'} ${view === 'treasury' ? 'text-[#FD3F83]' : ''}`}>Treasury Loan</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('peer'); setMobileMenuOpen(false); }} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'} ${view === 'peer' ? 'text-[#FD3F83]' : ''}`}>Peer Loan</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('transactions'); setMobileMenuOpen(false); }} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'} ${view === 'transactions' ? 'text-[#FD3F83]' : ''}`}>Your Transactions</a>
          </nav>
        </div>
      </div>

      {/* Main Views Routing */}
      {view === 'pool' && <CommunityPoolView isDark={isDark} />}
      {view === 'treasury' && <TreasuryLoanView isDark={isDark} />}
      {view === 'peer' && <PeerLoanView isDark={isDark} address={address} />}
      {view === 'transactions' && <YourTransactionsView isDark={isDark} address={address} />}

    </div>
  );
}

export default function DashboardTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#05050A] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 border-4 border-[#681CFF] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-400 text-sm font-medium animate-pulse">Loading Dashboard...</div>
      </div>
    }>
      <DashboardTestContent />
    </Suspense>
  );
}
