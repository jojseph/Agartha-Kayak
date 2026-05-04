"use client";

import React, { useState } from 'react';
import { DashboardView, Logo, BurgerIcon } from '@/components/pool/DashboardComponents';
import Link from 'next/link';

export default function PoolPage() {
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-300 ${isDark ? 'bg-[#05050A] text-white' : 'bg-[#FFFDFB] text-gray-900'}`}>
      
      {/* Background Animated Gradient */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none transition-opacity duration-500">
        {isDark ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-[#10072E] via-[#05050A] to-[#1F0839] animate-[pulse_10s_ease-in-out_infinite]"></div>
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-[#681CFF] opacity-[0.15] blur-[100px]"></div>
            <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#FD3F83] opacity-[0.15] blur-[120px]"></div>
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-[#F3E8FF] via-[#FFFDFB] to-[#FCE7F3] animate-[pulse_10s_ease-in-out_infinite]"></div>
            <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-[#681CFF] opacity-[0.05] blur-[100px]"></div>
            <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#FD3F83] opacity-[0.05] blur-[120px]"></div>
          </>
        )}
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 lg:px-12 bg-transparent`}>
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Home">
            <Logo isDark={isDark} />
          </Link>
          <nav className={`hidden lg:flex items-center gap-8 text-[15px] font-medium tracking-wide ${isDark ? 'text-white' : 'text-[#681CFF]'}`}>
            <Link href="/" className="hover:text-[#FD3F83] transition-colors">Home</Link>
            <Link href="/pool" className="text-[#FD3F83] transition-colors">Pool</Link>
          </nav>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <button 
            onClick={() => setIsDark(!isDark)} 
            className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            )}
          </button>
        </div>

        <div className="lg:hidden flex items-center gap-4">
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
            <Link href="/" className="border-b pb-4">Home</Link>
            <Link href="/pool" className="border-b pb-4">Pool</Link>
          </nav>
        </div>
      </div>

      <DashboardView isDark={isDark} />
    </div>
  );
}
