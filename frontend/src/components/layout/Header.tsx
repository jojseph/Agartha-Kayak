"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <header className="h-[126px] px-[8.33%] md:px-10 flex items-center justify-between fixed w-full top-0 bg-background/95 z-[500]">
      {/* Logo */}
      <Link href="/" className="flex-shrink-0">
        <Image
          src="/logo.png"
          alt="Agartha Reef Logo"
          width={145}
          height={73}
          className="object-contain w-[145px] h-[73px]"
          priority
        />
      </Link>

      {/* Desktop Navigation & CTA */}
      <div className="hidden lg:flex items-center gap-20">
        <nav className="flex items-center gap-20 font-tenon font-light text-primary text-[16px] tracking-wide">
          <Link href="#" className="hover:opacity-70 transition-opacity">About</Link>
          <Link href="#" className="hover:opacity-70 transition-opacity">The Pool</Link>
          <Link href="#" className="hover:opacity-70 transition-opacity">How it works</Link>
          <Link href="#" className="hover:opacity-70 transition-opacity">Repay</Link>
        </nav>
        <Link
          href="#"
          className="bg-primary text-white font-tenon font-medium text-[16px] tracking-wide px-[45px] py-[25px] rounded-full hover:bg-opacity-90 transition-colors shadow-sm"
        >
          Get Started
        </Link>
      </div>

      {/* Mobile Menu Toggle Button (Visible < lg) */}
      <button
        onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
        className="lg:hidden fixed top-[24px] right-[24px] z-[700] w-[46px] h-[46px] cursor-pointer transition-all duration-300 outline-none border-none bg-transparent"
        aria-label="Toggle navigation"
      >
        {/* Background Shape */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-sm" viewBox="0 0 27 28" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="btngrad" x1="50%" x2="50%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#681CFF" />
              <stop offset="100%" stopColor="#FD3F83" />
            </linearGradient>
          </defs>
          <path d="M15.48808,-2.27373675e-13 C13.32539,-2.27373675e-13 11.30154,0.448217 9.41865,1.346735 C7.53576,2.176457 5.89481,3.318889 4.4979,4.769861 C3.10309,6.222917 1.98808,7.915717 1.15077,9.850346 C0.38289,11.718264 0,13.688333 0,15.762639 C0,17.422083 0.31346,19.012732 0.9425,20.532499 C1.56942,21.985556 2.40673,23.263495 3.45442,24.370486 C4.56942,25.477477 5.86115,26.340555 7.32539,26.961805 C8.78962,27.653935 10.36115,28 12.03366,28 C14.0575,28 15.97405,27.551783 17.79173,26.65118 C19.60729,25.821458 21.17672,24.681111 22.5021,23.228055 C23.89481,21.708287 24.97616,19.980046 25.74404,18.045417 C26.58135,16.108704 27,14.069838 27,11.926737 C27,8.539051 25.91865,5.70382 23.75596,3.423126 C21.66269,1.140347 18.90673,-2.27373675e-13 15.48808,-2.27373675e-13 L15.48808,-2.27373675e-13 Z" fill="url(#btngrad)" />
        </svg>
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <span className={`transition-all duration-300 absolute ${isMobileNavOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
            <svg width="18" height="16" viewBox="0 0 26 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 1.5H26M0 11.5H26M0 21.5H26" stroke="#FFF" strokeWidth="2" />
            </svg>
          </span>
          <span className={`transition-all duration-300 absolute ${isMobileNavOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}>
            <svg width="16" height="16" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2.5L18 18.5M18 2.5L2 18.5" stroke="#FFF" strokeWidth="2" />
            </svg>
          </span>
        </div>
      </button>
    </header>
  );
}
