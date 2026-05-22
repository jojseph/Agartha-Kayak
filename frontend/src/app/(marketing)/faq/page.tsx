"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQ() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is Agartha Kayak?",
      answer: "Agartha Kayak is an immutable, blockchain-witnessed cooperative ledger designed for local neighborhood groups and Barangay Cooperatives. It replaces easily damaged or lost paper record books with a highly secure, digital system where neighbors can record their community transactions transparently."
    },
    {
      question: "How are the community funds kept secure?",
      answer: "No single person has the power to run away with the money or hand out biased loans. To release any funds, a specific number of trusted community elders (for example, 3 out of 5) must all digitally agree and approve the transaction using our secure blockchain technology."
    },
    {
      question: "Can records be deleted or lost?",
      answer: "No. Every time money is borrowed or paid back, a permanent digital receipt is created. Because these records are stored securely on a blockchain, they can never be deleted, altered, or lost in a fire or flood."
    },
    {
      question: "How do I know where the cooperative's money is going?",
      answer: "We provide a Public Record Board (Transparency Dashboard), which is a live, easy-to-read screen. It shows exactly who has active loans, how much money is currently in the pool, and what requests are waiting for approval, ensuring nothing is hidden from the community."
    },
    {
      question: "How do I apply for a loan?",
      answer: "Instead of filling out a paper form, you submit a digital application. Your request will include 'proof' of why you need the money—such as photos of your small business or digital vouchers from neighbors who support your request."
    }
  ];

  return (
    <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden isolate bg-[#f5f5f5] text-[#0A0A0A] font-sans">
      {/* Custom Animations */}
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

      {/* Background Video */}
      <div className="fixed inset-0 z-0 w-full h-full">
        <video
          className="w-full h-full object-cover opacity-80"
          src="/videos/hero_background.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        {/* Subtle overlay for better text readability on scroll */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Navigation */}
        <nav className="absolute top-6 left-0 right-0 z-20 px-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="max-w-7xl mx-auto py-4 px-2 flex items-center justify-between bg-transparent">
            {/* Brand */}
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

            {/* Links (Hidden on Mobile) */}
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

            {/* CTA Button */}
            <Link
              href="/walletAuth"
              className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="flex-grow flex flex-col items-center pt-[140px] pb-24 px-6 max-w-7xl mx-auto w-full text-center">
          
          <div className="mb-16 max-w-3xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="mb-6 leading-[1.1] text-[40px] md:text-[48px] lg:text-[56px]">
              <span className="block font-sans font-bold tracking-[-1.5px] text-[#555555]">
                Frequently Asked
              </span>
              <span className="block font-sans font-bold tracking-[-1.5px] text-[#0A0A0A]">
                Questions
              </span>
            </h1>
            <p className="text-[16px] md:text-lg text-gray-700 leading-relaxed font-medium">
              Everything you need to know about the Agartha Kayak platform, digital bayanihan, and how your cooperative's funds are secured.
            </p>
          </div>

          {/* FAQ Accordion */}
          <div className="w-full max-w-3xl mb-24 text-left animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-col gap-4">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[24px] shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-[#0A0A0A]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#0A0A0A] tracking-tight pr-4">{faq.question}</h3>
                    </div>
                    {openIndex === idx ? (
                      <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    )}
                  </button>
                  <div 
                    className={`px-6 pb-6 pt-2 transition-all duration-300 ease-in-out ${openIndex === idx ? 'block opacity-100' : 'hidden opacity-0'}`}
                  >
                    <div className="pl-14 text-gray-600 leading-relaxed text-[15px]">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Prompt */}
          <div className="w-full max-w-3xl bg-white/80 backdrop-blur-xl border border-white/50 rounded-[32px] p-8 text-center shadow-sm animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <h2 className="text-xl font-bold text-[#0A0A0A] mb-3 tracking-tight">Still have questions?</h2>
            <p className="text-gray-600 mb-6 text-[15px]">
              Reach out to your local barangay cooperative leader for specific details about your community's rules and application requirements.
            </p>
          </div>
          
        </div>
      </div>
    </main>
  );
}
