"use client";

import React, { useState, useEffect } from 'react';
import { 
  Logo, 
  HeroTitleDot, 
  BurgerIcon, 
  DashboardView, 
  LoanRequestView 
} from '@/components/pool/DashboardComponents';

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [view, setView] = useState('home');
  const [isDark, setIsDark] = useState(true);

  // Handle scroll to add backdrop blur to header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-300 ${isDark ? 'bg-[#05050A] text-white selection:bg-[#FD3F83] selection:text-white' : 'bg-[#FFFDFB] text-gray-900 selection:bg-[#681CFF] selection:text-white'}`}>
      
      {/* Background Animated Gradient (Fallback for local videos) */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none transition-opacity duration-500">
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
          <a href="#" aria-label="Home" className="relative z-50" onClick={(e) => { e.preventDefault(); setView('home'); }}>
            <Logo isDark={isDark} />
          </a>

          {/* Desktop Nav */}
          <nav className={`hidden lg:flex items-center gap-8 text-[15px] font-medium tracking-wide ${isDark ? 'text-white' : 'text-[#681CFF]'}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('home'); }} className="hover:text-[#FD3F83] transition-colors">How It Works</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('dashboard'); }} className="hover:text-[#FD3F83] transition-colors">Pool</a>
            <a href="#" className="hover:text-[#FD3F83] transition-colors">Support / FAQ</a>
          </nav>
        </div>

        {/* Right Section Desktop */}
        <div className="hidden lg:flex items-center gap-6">
          
          {/* Theme Toggle Button */}
          <button 
            onClick={() => setIsDark(!isDark)} 
            className={`p-2 rounded-full transition-colors mr-4 ${isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            )}
          </button>

          <button onClick={() => setView('loan')} className="group relative inline-flex items-center justify-center px-6 py-2.5 font-semibold text-white bg-gradient-to-r from-[#681CFF] to-[#FD3F83] rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_20px_rgba(253,63,131,0.3)]">
            <span className="relative z-10">Request Loan</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </button>
        </div>

        {/* Mobile Menu Toggle & Theme Toggle for Mobile */}
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
          <nav className={`flex flex-col gap-6 text-2xl font-medium ${isDark ? 'text-white' : 'text-[#681CFF]'}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('home'); setMobileMenuOpen(false); }} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>How It Works</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setView('dashboard'); setMobileMenuOpen(false); }} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>Pool</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); }} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>Support / FAQ</a>
          </nav>

          <div className="mt-auto pt-12">
            <button onClick={() => { setView('loan'); setMobileMenuOpen(false); }} className="block text-center w-full py-4 font-semibold text-white bg-gradient-to-r from-[#681CFF] to-[#FD3F83] rounded-full">
              Request Loan
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area Routing */}
      {view === 'home' && (
        <main className="relative min-h-screen flex items-center pt-24 pb-16 px-6 lg:px-12 animate-in fade-in duration-500">
          <div className="relative z-10 max-w-[1200px] mx-auto w-full mt-12 lg:mt-24">
            <h1 className="text-[3.5rem] leading-[1.1] md:text-[5rem] lg:text-[6.5rem] font-bold tracking-tighter flex flex-col md:block flex-wrap">
              <span className="inline-block mr-4 md:mr-6 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">Collective</span>
              <span className="inline-block mr-4 md:mr-6 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">Funds.</span>
              <span className="inline-block mr-4 md:mr-6 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">Absolute</span>
              <span className="inline-flex items-center gap-2 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">
                Transparency.
                <HeroTitleDot />
              </span>
            </h1>
            
            <div className="mt-8 md:mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <p className={`text-xl md:text-2xl font-light max-w-xl leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Empowering barangay cooperatives with a secure, multi-signature digital vault.
              </p>
              
              <button onClick={() => setView('dashboard')} className={`group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-lg border rounded-full overflow-hidden transition-all hover:border-transparent hover:scale-105 shadow-lg backdrop-blur-sm ${isDark ? 'text-white bg-white/5 border-white/20' : 'text-[#681CFF] bg-[#681CFF]/5 border-[#681CFF]/20'}`}>
                <span className={`relative z-10 transition-colors ${isDark ? 'group-hover:text-white' : 'group-hover:text-white'}`}>See How It Works</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#681CFF] to-[#FD3F83] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></div>
              </button>
            </div>

            {/* Quick Links / Anchors */}
            <div className={`hidden lg:flex items-center gap-12 mt-24 border-t pt-8 text-sm font-medium tracking-wide uppercase ${isDark ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
              <a href="#integrations" className={`transition-all hover:-translate-y-1 ${isDark ? 'hover:text-white' : 'hover:text-[#681CFF]'}`}>Reef chain</a>
              <a href="#platform" className={`transition-all hover:-translate-y-1 ${isDark ? 'hover:text-white' : 'hover:text-[#681CFF]'}`}>Platform</a>
              <a href="#token" className={`transition-all hover:-translate-y-1 ${isDark ? 'hover:text-white' : 'hover:text-[#681CFF]'}`}>Governance</a>
              <a href="#investors" className={`transition-all hover:-translate-y-1 ${isDark ? 'hover:text-white' : 'hover:text-[#681CFF]'}`}>Investors</a>
            </div>
          </div>
        </main>
      )}

      {view === 'dashboard' && <DashboardView isDark={isDark} />}
      
      {view === 'loan' && <LoanRequestView isDark={isDark} />}

    </div>
  );
}
