"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, HeroTitleDot, BurgerIcon } from '@/components/pool/DashboardComponents';

export default function HomePage() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          <a href="#" aria-label="Home" className="relative z-50">
            <Logo isDark={isDark} />
          </a>

          {/* Desktop Nav */}
          <nav className={`hidden lg:flex items-center gap-8 text-[15px] font-medium tracking-wide ${isDark ? 'text-white' : 'text-[#681CFF]'}`}>
            <a href="#about" className="hover:text-[#FD3F83] transition-colors">About</a>
            <a href="#how-it-works" className="hover:text-[#FD3F83] transition-colors">How It Works</a>
            <a href="#documentation" className="hover:text-[#FD3F83] transition-colors">Documentation</a>
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

          <button onClick={() => router.push('/walletAuthTest')} className="group relative inline-flex items-center justify-center px-6 py-2.5 font-semibold text-white bg-gradient-to-r from-[#681CFF] to-[#FD3F83] rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_20px_rgba(253,63,131,0.3)]">
            <span className="relative z-10">Connect Your Wallet</span>
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
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>About</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>How It Works</a>
            <a href="#documentation" onClick={() => setMobileMenuOpen(false)} className={`border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>Documentation</a>
          </nav>

          <div className="mt-auto pt-12">
            <button onClick={() => router.push('/walletAuthTest')} className="block text-center w-full py-4 font-semibold text-white bg-gradient-to-r from-[#681CFF] to-[#FD3F83] rounded-full">
              Connect Your Wallet
            </button>
          </div>
        </div>
      </div>

      <main className="relative z-10 flex flex-col items-center">
        {/* HERO SECTION */}
        <section className="min-h-[90vh] flex items-center pt-24 pb-16 px-6 lg:px-12 w-full max-w-[1200px] mx-auto animate-in fade-in duration-500">
          <div className="w-full mt-12 lg:mt-24">
            <h1 className="text-[3.5rem] leading-[1.1] md:text-[5rem] lg:text-[6.5rem] font-bold tracking-tighter flex flex-col md:block flex-wrap">
              <span className="inline-block mr-4 md:mr-6 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">Collective</span>
              <span className="inline-block mr-4 md:mr-6 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">Funds.</span>
              <span className="inline-block mr-4 md:mr-6 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">Absolute</span>
              <span className="inline-flex items-center gap-2 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-[#681CFF] to-[#FD3F83] transition-colors duration-300 cursor-default">
                Transparency.
                <HeroTitleDot />
              </span>
            </h1>
            
            <div className="mt-8 md:mt-16 flex flex-col md:flex-row items-start md:items-center justify-start gap-8">
              <p className={`text-xl md:text-2xl font-light max-w-xl leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Empowering barangay cooperatives with a secure, multi-signature digital vault.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <a href="#how-it-works" className={`group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-lg border rounded-full overflow-hidden transition-all hover:border-transparent hover:scale-105 shadow-lg backdrop-blur-sm ${isDark ? 'text-white bg-white/5 border-white/20' : 'text-[#681CFF] bg-[#681CFF]/5 border-[#681CFF]/20'}`}>
                  <span className={`relative z-10 transition-colors ${isDark ? 'group-hover:text-white' : 'group-hover:text-white'}`}>See How It Works</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#681CFF] to-[#FD3F83] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out"></div>
                </a>
                
                <button onClick={() => router.push('/walletAuthTest')} className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-lg text-white bg-gradient-to-r from-[#681CFF] to-[#FD3F83] rounded-full overflow-hidden transition-all hover:scale-105 shadow-lg shadow-[#FD3F83]/20">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="w-full max-w-[1200px] mx-auto px-6 lg:px-12 py-24">
          <div className="mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">About the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Project</span></h2>
            <div className={`h-1 w-24 rounded bg-gradient-to-r from-[#681CFF] to-[#FD3F83]`}></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className={`p-8 rounded-3xl backdrop-blur-md border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-gray-200 hover:bg-white shadow-xl'}`}>
              <h3 className="text-xl font-bold mb-4 text-[#FD3F83]">Project Vision</h3>
              <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Agartha Kayak: The Digital Bayanihan Ledger</strong> is a digital community piggy bank and record book.
              </p>
            </div>
            
            <div className={`p-8 rounded-3xl backdrop-blur-md border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-gray-200 hover:bg-white shadow-xl'}`}>
              <h3 className="text-xl font-bold mb-4 text-[#681CFF]">Target Audience</h3>
              <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                It is designed specifically to empower local neighborhood groups, such as Barangay Cooperatives.
              </p>
            </div>

            <div className={`p-8 rounded-3xl backdrop-blur-md border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-gray-200 hover:bg-white shadow-xl'}`}>
              <h3 className="text-xl font-bold mb-4 text-[#FD3F83]">The Problem It Solves</h3>
              <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Traditional cooperatives rely on paper record books that are easily damaged, lost in fires or floods, or subject to human error.
              </p>
            </div>

            <div className={`p-8 rounded-3xl backdrop-blur-md border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-gray-200 hover:bg-white shadow-xl'}`}>
              <h3 className="text-xl font-bold mb-4 text-[#681CFF]">The Solution</h3>
              <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Agartha Kayak replaces these vulnerable physical records with a highly secure, digital system where neighbors can safely pool their money together. It ensures that no single person has the power to run away with the funds or hand out biased loans.
              </p>
            </div>

            <div className={`md:col-span-2 p-8 rounded-3xl backdrop-blur-md border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/60 border-gray-200 hover:bg-white shadow-xl'}`}>
              <h3 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">The Team</h3>
              <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                This project is developed by Group Agartha, consisting of Tabada, John Winston; Escolano, Ben Joseph; Novabos, Joseph Victor; Tio, Raymond Gerard; and Ledon, Jhon Ryan.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className={`w-full border-y py-24 backdrop-blur-sm ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-[#681CFF]/5'}`}>
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
            <div className="mb-16 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Works</span></h2>
              <p className={`max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>A seamless, secure, and transparent workflow for community members.</p>
            </div>

            <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#681CFF] before:to-[#FD3F83]">
              
              {/* Step 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isDark ? 'bg-[#05050A] border-[#681CFF]' : 'bg-white border-[#681CFF]'}`}>
                  <span className="text-sm font-bold text-[#681CFF]">1</span>
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-1 shadow-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-xl font-bold mb-2">Secure Access & Registration</h3>
                  <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                    <li>Users access the platform through a clean, modern website by connecting a digital Web3 wallet, specifically the Lace Wallet.</li>
                    <li>User passwords and private keys are never sent to our servers; they remain safely on the user's own device.</li>
                    <li>If a user is connecting for the first time, they will be prompted to register by creating a unique alias.</li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isDark ? 'bg-[#05050A] border-[#FD3F83]' : 'bg-white border-[#FD3F83]'}`}>
                  <span className="text-sm font-bold text-[#FD3F83]">2</span>
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-1 shadow-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-xl font-bold mb-2">The Community Dashboard</h3>
                  <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                    <li>Once logged in, users land on the Community Pool dashboard, which acts as a live, easy-to-read Public Record Board.</li>
                    <li>This transparent interface displays exactly how the cooperative's money is doing, showing active loans, the total pooled money, pending requests, and user trust scores.</li>
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isDark ? 'bg-[#05050A] border-[#681CFF]' : 'bg-white border-[#681CFF]'}`}>
                  <span className="text-sm font-bold text-[#681CFF]">3</span>
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-1 shadow-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-xl font-bold mb-2">Requesting Vault Loans (Community Fund)</h3>
                  <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                    <li>Members can submit digital loan requests for the community's pooled money, stating the real-world currency amount (PHP) and the purpose, such as buying fertilizer or funding a small business.</li>
                    <li>Borrowers can strengthen their applications by attaching "proof," like photos or digital endorsements from supporting neighbors.</li>
                    <li>Funds are only released when a specific quorum of trusted community elders (e.g., 3 out of 5) digitally review and approve the request on their dedicated Elder Approval Page.</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isDark ? 'bg-[#05050A] border-[#FD3F83]' : 'bg-white border-[#FD3F83]'}`}>
                  <span className="text-sm font-bold text-[#FD3F83]">4</span>
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-1 shadow-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-xl font-bold mb-2">Requesting Peer Loans (Member-to-Member)</h3>
                  <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                    <li>Users can bypass the community treasury to request a loan directly from another specific member.</li>
                    <li>The lender must explicitly approve the request.</li>
                    <li>Once both parties agree and the real-world transaction occurs, a digital agreement is signed by both via wallet authentication.</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isDark ? 'bg-[#05050A] border-[#681CFF]' : 'bg-white border-[#681CFF]'}`}>
                  <span className="text-sm font-bold text-[#681CFF]">5</span>
                </div>
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-1 shadow-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                  <h3 className="text-xl font-bold mb-2">Building Trust Scores</h3>
                  <ul className={`space-y-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                    <li>The system automatically tracks user repayment behavior.</li>
                    <li>Members who pay their loans back on time automatically build high trust scores, allowing them to borrow larger amounts in the future with fewer background checks.</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* DOCUMENTATION SECTION */}
        <section id="documentation" className="w-full max-w-[1200px] mx-auto px-6 lg:px-12 py-24">
          <div className="mb-12 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Official <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Documentation</span></h2>
            <div className={`h-1 w-24 rounded mx-auto md:mx-0 bg-gradient-to-r from-[#681CFF] to-[#FD3F83]`}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`group p-8 rounded-3xl backdrop-blur-md border transition-all hover:-translate-y-2 ${isDark ? 'bg-[#10072E]/40 border-white/10 hover:border-[#681CFF]/50' : 'bg-white/80 border-gray-200 hover:border-[#681CFF]/50 shadow-xl'}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#681CFF] to-[#FD3F83] flex items-center justify-center mb-6 shadow-lg shadow-[#681CFF]/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">System Architecture</h3>
              <ul className={`space-y-4 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                <li><strong className={isDark ? 'text-white' : 'text-gray-900'}>The Brains (Server & Database):</strong> A secure backend database handles the mathematics for automated trust scores, manages basic user profiles (aliases), and maintains off-chain loan histories.</li>
                <li><strong className={isDark ? 'text-white' : 'text-gray-900'}>The Unhackable Record Book (Blockchain):</strong> Agartha Kayak utilizes the Cardano testnet (Preprod) to lock community funds safely and maintain a permanent, unchangeable log of every transaction.</li>
              </ul>
            </div>

            <div className={`group p-8 rounded-3xl backdrop-blur-md border transition-all hover:-translate-y-2 ${isDark ? 'bg-[#10072E]/40 border-white/10 hover:border-[#FD3F83]/50' : 'bg-white/80 border-gray-200 hover:border-[#FD3F83]/50 shadow-xl'}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FD3F83] to-[#681CFF] flex items-center justify-center mb-6 shadow-lg shadow-[#FD3F83]/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Blockchain Data & Immutable Receipts</h3>
              <ul className={`space-y-4 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                <li>Every time a loan agreement is finalized—whether a Vault Loan or a Peer Loan—the system generates a cryptographic hash of that agreement.</li>
                <li>This hash is submitted to the Cardano blockchain, creating a permanent digital receipt.</li>
                <li>The on-chain record includes the loan ID, the borrower's wallet address, the loan hash, a timestamp, and all necessary approval signatures.</li>
                <li>This provides immutable proof that the loan existed, was approved, and that the terms can never be edited or deleted.</li>
              </ul>
            </div>

            <div className={`group p-8 rounded-3xl backdrop-blur-md border transition-all hover:-translate-y-2 ${isDark ? 'bg-[#10072E]/40 border-white/10 hover:border-[#681CFF]/50' : 'bg-white/80 border-gray-200 hover:border-[#681CFF]/50 shadow-xl'}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#681CFF] to-[#FD3F83] flex items-center justify-center mb-6 shadow-lg shadow-[#681CFF]/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Gas Fees and User Experience</h3>
              <ul className={`space-y-4 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                <li>To ensure a smooth experience for non-technical users, members do not need to hold, manage, or understand ADA (the Cardano cryptocurrency).</li>
                <li>All blockchain transaction fees are abstracted away from the user and paid automatically by a dedicated dApp System Wallet (Treasury Wallet).</li>
                <li>This developer-controlled wallet is pre-funded with test ADA from the Cardano faucet and handles all on-chain submissions, ensuring accessibility while maintaining the integrity of Web3 infrastructure.</li>
              </ul>
            </div>

            <div className={`group p-8 rounded-3xl backdrop-blur-md border transition-all hover:-translate-y-2 ${isDark ? 'bg-[#10072E]/40 border-white/10 hover:border-[#FD3F83]/50' : 'bg-white/80 border-gray-200 hover:border-[#FD3F83]/50 shadow-xl'}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FD3F83] to-[#681CFF] flex items-center justify-center mb-6 shadow-lg shadow-[#FD3F83]/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Application Flow</h3>
              <ul className={`space-y-4 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} list-disc list-inside`}>
                <li>The user journey is structured to move seamlessly from the Landing Page to Wallet Authentication.</li>
                <li>After authentication or Alias Registration, the user is redirected to the core application loop, featuring navigation tabs for the Community Pool, Vault Loan requests, Peer Loan requests, and a view of Your Transactions.</li>
              </ul>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
