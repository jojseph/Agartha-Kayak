'use client';

import React, { useState, useEffect } from 'react';
import ConnectionSuccess from '@/components/ConnectionSuccess';
import { useWallet } from '@meshsdk/react';
import { useRouter } from 'next/navigation';

export default function WalletAuthTestPage() {
  const { connected, wallet, connect, disconnect } = useWallet();
  const router = useRouter();
  
  // State Machine: controls what the user sees
  const [appState, setAppState] = useState<'disconnected' | 'checking' | 'needs_alias' | 'authenticated'>('disconnected');
  
  const [address, setAddress] = useState<string | null>(null);
  const [alias, setAlias] = useState('');
  const [memberData, setMemberData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [session, setSession] = useState('');

  useEffect(() => {
    setSession(`agartha-kayak-${Date.now().toString(36)}`);
  }, []);

  // 1. Listen for Wallet Connection
  useEffect(() => {
    if (connected) {
      wallet.getUsedAddresses().then((addrs) => {
        const currentAddress = addrs[0];
        setAddress(currentAddress);
        checkLedger(currentAddress);
      }).catch((err) => {
        setErrorMessage("Failed to read wallet address.");
      });
    } else {
      // Reset everything if disconnected
      setAppState('disconnected');
      setAddress(null);
      setMemberData(null);
      setAlias('');
      setErrorMessage('');
    }
  }, [connected, wallet]);

  // 2. Check Database (The "Login" part)
  const checkLedger = async (walletAddr: string) => {
    setAppState('checking');
    setErrorMessage('');
    
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '',
        },
        body: JSON.stringify({ walletAddress: walletAddr }),
      });
      const data = await res.json();
      
      if (data.exists) {
        setMemberData(data.member);
        setAppState('authenticated'); // Found them! Show dashboard.
        router.push(`/dashboardTest?alias=${encodeURIComponent(data.member.alias)}`);
      } else {
        setAppState('needs_alias'); // Not found. Prompt for alias.
      }
    } catch (err) {
      setErrorMessage("Failed to check the Bayanihan Ledger.");
      disconnect();
    }
  };

  // 3. Register New Member
  const registerMember = async () => {
    if (!alias.trim()) {
      setErrorMessage("Paki-butang og alias, bai!");
      return;
    }

    setAppState('checking'); // Show loading state
    setErrorMessage('');

    try {
      const res = await fetch('/api/members/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '',
        },
        body: JSON.stringify({ walletAddress: address, alias }),
      });

      if (res.ok) {
        // Automatically check ledger again to fetch their new 50 Trust Score
        checkLedger(address!); 
      } else {
        setErrorMessage("Failed to register. Please try again.");
        setAppState('needs_alias');
      }
    } catch (err) {
      setErrorMessage("Network error during registration.");
      setAppState('needs_alias');
    }
  };

  const handleConnectLace = async () => {
    setErrorMessage('');
    try {
      await connect('lace');
    } catch (error) {
      setErrorMessage("Connection failed. Is Lace installed and unlocked?");
    }
  };

  const handleClose = () => {
    router.push('/');
  };

  const qrData = `lace://connect?session=${session}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrData)}&ecc=H`;

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center p-4 sm:p-8 font-sans antialiased">
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        .animate-card-in {
          animation: cardIn 0.45s ease-out both;
        }
      `}</style>

      <div className="w-full max-w-[440px] bg-white rounded-[24px] px-9 pt-10 pb-8 relative shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-16px_rgba(16,24,40,0.10)] animate-card-in">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          aria-label="Close"
          className="absolute top-[18px] right-[18px] w-8 h-8 rounded-full bg-[#F3F3F1] text-[#6B7280] flex items-center justify-center transition-colors duration-150 ease-in hover:bg-[#E5E5E2] hover:text-[#0A0A0A]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {errorMessage && (
          <div className="mb-6 p-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl text-center">
            {errorMessage}
          </div>
        )}

        {appState === 'disconnected' && (
          <>
            <h1 className="text-[22px] font-bold tracking-tight text-center text-[#0A0A0A]">
              Connect Wallet
            </h1>
            <p className="mt-2.5 text-[13px] leading-[1.55] text-[#6B7280] text-center">
              By connecting your wallet, you agree to our{' '}
              <a href="#" className="text-blue-600 font-medium no-underline hover:underline">
                Terms of Service
              </a>{' '}
              and our{' '}
              <a href="#" className="text-blue-600 font-medium no-underline hover:underline">
                Privacy Policy
              </a>.
            </p>

            {/* Wallets List */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={handleConnectLace}
                type="button"
                className="group relative flex items-center gap-3.5 w-full py-3.5 px-5 bg-[#F5F5F4] border border-transparent rounded-[14px] cursor-pointer transition-all duration-150 ease-in text-left overflow-hidden hover:bg-[#EFEFEC] hover:border-[#E5E5E2] active:scale-[0.995]"
              >
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-sm bg-blue-600 opacity-0 -translate-x-[3px] transition-all duration-150 ease-in group-hover:opacity-100 group-hover:translate-x-0" />
                
                <img
                  src="https://cardano.org/img/app-icons/lace.jpg"
                  alt="Lace wallet logo"
                  className="w-9 h-9 rounded-lg object-cover shrink-0 bg-gradient-to-br from-[#FF8A4C] via-[#E73C7E] to-[#4F8DFF]"
                  onError={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FF8A4C 0%, #E73C7E 50%, #4F8DFF 100%)';
                    e.currentTarget.src = ''; 
                  }}
                />
                <span className="text-[15px] font-semibold flex-1 text-[#0A0A0A]">
                  Lace
                </span>
                <span className="text-[14px] font-semibold text-blue-600 opacity-0 translate-x-1 transition-all duration-150 ease-in pointer-events-none group-hover:opacity-100 group-hover:translate-x-0">
                  Connect
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-7 text-[#9CA3AF] text-xs font-medium uppercase tracking-[0.08em] before:flex-1 before:h-[1px] before:bg-[#E5E5E2] after:flex-1 after:h-[1px] after:bg-[#E5E5E2]">
              or scan with mobile
            </div>

            {/* QR Code Section */}
            <div className="flex justify-center">
              <div className="relative w-[200px] h-[200px] p-3 bg-white rounded-2xl border border-[#EFEFED] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-full h-full block"
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42px] h-[42px] rounded-lg bg-white p-1 shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-center">
                  <img
                    src="https://cardano.org/img/app-icons/lace.jpg"
                    alt="Lace"
                    className="w-full h-full object-cover rounded-[5px] bg-gradient-to-br from-[#FF8A4C] via-[#E73C7E] to-[#4F8DFF]"
                    onError={(e) => e.currentTarget.removeAttribute('src')}
                  />
                </div>
              </div>
            </div>
            <p className="mt-3.5 text-center text-[13px] text-[#6B7280] leading-[1.5]">
              Scan with Lace mobile wallet
            </p>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-[#F0F0EE] text-center">
              <p className="text-[13px] font-medium text-[#6B7280]">
                Don't have Lace?{' '}
                <a
                  href="https://www.lace.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-semibold no-underline hover:underline"
                >
                  Get it &rarr;
                </a>
              </p>
            </div>
          </>
        )}

        {appState === 'checking' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-6">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[15px] font-medium text-[#6B7280]">Syncing with ledger...</p>
          </div>
        )}

        {appState === 'needs_alias' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
              <h1 className="text-[22px] font-bold tracking-tight text-[#0A0A0A]">
                Welcome!
              </h1>
              <p className="mt-2.5 text-[13px] leading-[1.55] text-[#6B7280]">
                Your wallet is connected, but we need an alias to identify you securely in the community.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[13px] font-bold uppercase tracking-wider text-[#6B7280]">Your Community Alias</label>
              <input 
                type="text"
                placeholder="e.g., Lando"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                className="w-full p-3.5 rounded-[14px] border border-[#E5E5E2] bg-[#F5F5F4] text-[#0A0A0A] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && registerMember()}
              />
            </div>

            <div className="space-y-3 pt-2">
              <button 
                onClick={registerMember}
                className="w-full py-3.5 bg-blue-600 text-white rounded-[14px] font-semibold transition-all hover:bg-blue-700 active:scale-[0.995]"
              >
                Complete Registration
              </button>
              
              <button 
                onClick={() => disconnect()}
                className="w-full py-3.5 text-[#6B7280] bg-transparent font-medium transition-colors rounded-[14px] hover:text-[#0A0A0A] hover:bg-[#F5F5F4]"
              >
                Cancel & Disconnect
              </button>
            </div>
          </div>
        )}

        {appState === 'authenticated' && memberData && (
          <div className="animate-in fade-in duration-500">
            <ConnectionSuccess />
          </div>
        )}

      </div>
    </div>
  );
}