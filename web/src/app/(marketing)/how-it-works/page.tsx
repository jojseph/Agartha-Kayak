"use client";

import React from 'react';
import Link from 'next/link';
import { Wallet, ShieldCheck, FileText, LayoutDashboard, Users, UsersRound } from 'lucide-react';

export default function HowItWorks() {
  const features = [
    {
      title: 'Digital Community Vault',
      description: 'A secure online fund where no single person has the power to run away with the money or hand out biased loans. To release any funds, a specific number of trusted community elders (for example, 3 out of 5) must all digitally agree and approve it.',
      icon: <ShieldCheck className="w-6 h-6 text-[#0A0A0A]" />
    },
    {
      title: 'Permanent Digital Receipts',
      description: 'Every time money is borrowed or paid back, a permanent digital receipt is created. This receipt records who borrowed the money, why they need it (like buying fertilizer), and the loan rules. Because it is stored on a blockchain, this record can never be deleted, altered, or lost in a fire or flood.',
      icon: <FileText className="w-6 h-6 text-[#0A0A0A]" />
    },
    {
      title: 'Public Record Board',
      description: 'A live, easy-to-read screen where members can see exactly how the cooperative\'s money is doing. It shows who has active loans, how much money is currently in the pool, and what requests are waiting for approval so nothing is hidden.',
      icon: <LayoutDashboard className="w-6 h-6 text-[#0A0A0A]" />
    },
    {
      title: 'Community-Backed Applications',
      description: 'Instead of just filling out a paper form, borrowers submit a digital request that includes "proof" of why they need the money, like photos of their small business or digital vouchers from neighbors who support them.',
      icon: <Users className="w-6 h-6 text-[#0A0A0A]" />
    }
  ];

  return (
    <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden isolate bg-[#f5f5f5] text-[#0A0A0A] font-sans">

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
      `}} />

      <div className="fixed inset-0 z-0 w-full h-full">
        <video
          className="w-full h-full object-cover opacity-80"
          src="/videos/hero_background.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">

        <nav className="absolute top-6 left-0 right-0 z-20 px-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="max-w-7xl mx-auto py-4 px-2 flex items-center justify-between bg-transparent">

            <Link href="/" className="flex items-center gap-2 text-[#0A0A0A] transition-opacity hover:opacity-80">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[#0A0A0A]" aria-hidden="true">
                <path d="M2.5 15.5c3-3 6-3 9 0s6 3 9 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M19 4L5 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M20 5l-3 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7 16l-3 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="text-lg font-bold tracking-tight text-[#0A0A0A]">
                Agartha Kayak
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {[
                { name: 'How It Works', path: '/how-it-works' },
                { name: 'FAQ', path: '/faq' }
              ].map((link) => (
                <Link
                  key={link.name}
                  href={link.path}
                  className="text-sm font-medium text-[#1F1F1F] hover:text-gray-500 transition-colors duration-150"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <Link
              href="/walletAuth"
              className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </Link>
          </div>
        </nav>

        <div className="flex-grow flex flex-col items-center pt-[140px] pb-24 px-6 max-w-7xl mx-auto w-full text-center">

          <div className="mb-16 max-w-3xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="mb-6 leading-[1.1] text-[40px] md:text-[48px] lg:text-[56px]">
              <span className="block font-sans font-bold tracking-[-1.5px] text-[#555555]">
                How It Works
              </span>
              <span className="block font-sans font-bold tracking-[-1.5px] text-[#0A0A0A]">
                The Digital Bayanihan Ledger
              </span>
            </h1>
            <p className="text-[16px] md:text-lg text-gray-700 leading-relaxed font-medium">
              An immutable, blockchain-witnessed cooperative ledger designed for local neighborhood groups (Barangay Cooperatives). It replaces easily damaged or lost paper record books with a highly secure, digital system where neighbors can record their community transactions transparently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mb-24 text-left">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all animate-fade-in-up group"
                style={{ animationDelay: `${0.3 + (idx * 0.1)}s` }}
              >
                <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[#0A0A0A] mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm md:text-[15px]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="w-full max-w-4xl bg-white/90 backdrop-blur-xl border border-white/60 rounded-[32px] p-8 md:p-12 text-center shadow-sm animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 mb-6">
              <UsersRound className="w-6 h-6 text-[#0A0A0A]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#0A0A0A] mb-4 tracking-tight">Project Agartha</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-[15px] md:text-base">
              Built with purpose by a dedicated team of developers to empower local barangay cooperatives with transparent and secure financial tools.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Tabada, John Winston', 'Escolano, Ben Joseph', 'Novabos, Joseph Victor', 'Tio, Raymond Gerard', 'Ledon, Jhon Ryan'].map((member) => (
                <span key={member} className="px-5 py-2.5 bg-white text-[13px] md:text-sm font-semibold rounded-full text-gray-800 shadow-sm border border-gray-100 hover:border-gray-300 transition-colors">
                  {member}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
