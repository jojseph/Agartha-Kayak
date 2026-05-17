"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Lock, LayoutDashboard } from 'lucide-react';
import { useAuth } from "@/providers/AuthProvider";

export default function AgarthaLanding() {
  const router = useRouter();
  const { status, member } = useAuth();

  return (
    
    <main className="relative min-h-screen w-full overflow-hidden isolate bg-black text-white font-sans">
      {/* Custom Animations injected via styled block for plug-and-play ease */}
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

      <div>Current Status: {status}</div>

      {/* Background Video */}
      <video
        className="absolute inset-0 z-0 w-full h-full object-cover"
        src="/videos/hero_background.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Content Layer */}
      <div className="relative z-10">

        {/* Navigation */}
        <nav className="absolute top-6 left-0 right-0 z-20 px-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="max-w-7xl mx-auto py-4 px-2 flex items-center justify-between bg-transparent">

            {/* Brand */}
            <a href="#" className="flex items-center gap-2 text-[#0A0A0A] transition-opacity hover:opacity-80">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-[#0A0A0A]" aria-hidden="true">
                <path d="M2.5 15.5c3-3 6-3 9 0s6 3 9 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M19 4L5 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M20 5l-3 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M7 16l-3 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="text-lg font-bold tracking-tight text-[#0A0A0A]">
                Agartha Kayak
              </span>
            </a>

            {/* Links (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { name: 'How It Works', path: '/how-it-works' },
                { name: 'Public Records', path: '/public-records' },
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

            {/* CTA Button */}
            <button
              type="button"
              onClick={() => router.push('/walletAuthTest')}
              className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-[100px] pb-[280px] max-w-7xl mx-auto text-center">

          {/* Trust Badge */}
          <div
            className="inline-flex items-center gap-2 mb-8 bg-white px-4 py-1.5 rounded-full border border-gray-200 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <Lock className="w-4 h-4 text-[#0A0A0A]" />
            <span className="text-sm font-medium text-[#0A0A0A]">
              Secured by Cardano Blockchain
            </span>
          </div>

          {/* Heading */}
          <h1
            className="mb-5 leading-[1.1] text-[40px] md:text-[48px] lg:text-[56px] animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            <span className="block font-sans font-bold tracking-[-1.5px] text-[#B5B5B5]">
              The Digital Bayanihan Ledger
            </span>
            <span className="block font-sans font-bold tracking-[-1.5px] text-[#0A0A0A]">
              Secure & Transparent Community Funds
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="text-[15px] md:text-base text-gray-500 mb-10 max-w-2xl mx-auto font-normal leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            A highly secure, digital community piggy bank replacing easily damaged paper records for local neighborhood cooperatives.
          </p>

          {/* Primary CTA */}
          <button
            type="button"
            // onClick={() => router.push('/pool')}
            className="inline-flex items-center gap-2 bg-white text-black py-3.5 px-8 rounded-full text-base font-semibold hover:bg-gray-100 transition-colors animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            <LayoutDashboard className="w-5 h-5" />
            View Transparency Dashboard
          </button>

        </div>
      </div>
    </main>
  );
}
