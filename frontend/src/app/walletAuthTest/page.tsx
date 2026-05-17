'use client';

import React, { useState, useEffect } from 'react';
import ConnectionSuccess from '@/components/ConnectionSuccess';
import { useWallet } from '@meshsdk/react';
import { useRouter } from 'next/navigation';

export default function WalletAuthTestPage() {
  const { connected, wallet, connect, disconnect } = useWallet();
  const router = useRouter();
  
  const [appState, setAppState] = useState<'disconnected' | 'checking' | 'needs_alias' | 'pending_approval' | 'rejected' | 'authenticated'>('disconnected');
  
  const [address, setAddress] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [session, setSession] = useState('');

  // Form states for the new onboarding UI
  const [formState, setFormState] = useState<'idle' | 'animating' | 'success'>('idle');
  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    setSession(`agartha-kayak-${Date.now().toString(36)}`);
    
    fetch('/api/communities')
      .then(res => res.json())
      .then(data => {
        if (data.communities) setCommunities(data.communities);
      })
      .catch(err => console.error('Failed to fetch communities', err));
  }, []);

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
      setAppState('disconnected');
      setAddress(null);
      setMemberData(null);
      setErrorMessage('');
      setFormState('idle');
    }
  }, [connected, wallet]);

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
        if (data.member.status === 'pending') {
          setAppState('pending_approval');
        } else if (data.member.status === 'rejected') {
          setAppState('rejected');
        } else {
          setAppState('authenticated'); 
          router.push('/dashboard');
        }
      } else {
        setAppState('needs_alias'); 
      }
    } catch (err) {
      setErrorMessage("Failed to check the Bayanihan Ledger.");
      disconnect();
    }
  };

  const registerMember = async (alias: string, email: string, communityId: string, barangay: string) => {
    setErrorMessage('');

    try {
      const res = await fetch('/api/members/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '',
        },
        body: JSON.stringify({ walletAddress: address, alias, email, communityId, barangay }),
      });

      if (res.ok) {
        // Success
        setFormState('animating');
        setTimeout(() => {
          setFormState('success');
          // Wait a bit, then check ledger again or redirect directly
          setTimeout(() => {
            checkLedger(address!);
          }, 1500);
        }, 250);
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.details || "Failed to register. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error during registration.");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const fullName = formData.get('full-name') as string;
    const emailAddress = formData.get('email-address') as string;
    const communityId = formData.get('barangay') as string;
    const selectEl = form.elements.namedItem('barangay') as HTMLSelectElement;
    const barangayName = selectEl.options[selectEl.selectedIndex].text;
    
    registerMember(fullName, emailAddress, communityId, barangayName);
  };

  const handleBack = () => {
    disconnect();
    router.push('/');
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

  // ==========================================
  // RENDER: Needs Alias (New Onboarding UI)
  // ==========================================
  if (appState === 'needs_alias') {
    return (
      <div className="min-h-screen lg:h-screen w-full grid grid-cols-1 lg:grid-cols-2 p-3 sm:p-6 gap-3 sm:gap-6 bg-white text-[#0A0A0A] font-sans lg:overflow-hidden">
        
        {/* LEFT: Hero Image Column */}
        <aside className="relative flex flex-col justify-between p-4 sm:p-[18px] lg:p-6 rounded-[16px] lg:rounded-[24px] bg-[#F4F4F2] overflow-hidden min-h-[220px] max-h-[36vh] lg:max-h-none lg:min-h-0">
          <img 
            className="absolute inset-0 w-full h-full object-cover z-0" 
            src="https://pub.hyperagent.com/api/published/pbf01KR6J230J_VVEMNMX509EY6PSF/registration_hero.jpg" 
            alt="River landscape" 
          />

          <div className="relative z-10 flex items-center gap-2 self-start flex-wrap">
            <button 
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-[6px] pl-2.5 pr-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-xs font-semibold text-[#0A0A0A] cursor-pointer transition-all duration-150 hover:bg-white hover:-translate-x-0.5 active:scale-95"
              aria-label="Go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-[#0A0A0A] tracking-[0.02em]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 shadow-[0_0_0_4px_rgba(22,163,74,0.15)]"></span>
              <span>Onboarding</span>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap gap-y-[10px] gap-x-[22px] lg:gap-y-[18px] lg:gap-x-8 bg-black/45 backdrop-blur-md p-3 lg:py-3.5 lg:px-[18px] rounded-xl lg:rounded-2xl self-start text-white">
            <div>
              <div className="text-[9px] lg:text-[10px] font-medium tracking-[0.18em] uppercase text-white/70 mb-1">Step</div>
              <div className="text-xs lg:text-[13px] font-medium">1 of 1 · Identity</div>
            </div>
            <div>
              <div className="text-[9px] lg:text-[10px] font-medium tracking-[0.18em] uppercase text-white/70 mb-1">Cooperative</div>
              <div className="text-xs lg:text-[13px] font-medium">Bayanihan Ledger</div>
            </div>
          </div>
        </aside>

        {/* RIGHT: Form Column */}
        <main className="flex flex-col justify-center w-full max-w-none lg:max-w-[640px] mx-auto px-5 pt-7 pb-6 lg:px-[6vw] lg:py-8 lg:overflow-y-auto">
          
          {/* Form Section */}
          {formState !== 'success' && (
            <section 
              className={`transition-all duration-200 ease-out ${formState === 'animating' ? 'opacity-0 pointer-events-none' : 'opacity-100 translate-y-0 animate-[fadeInUp_0.5s_ease-out]'}`}
            >
              <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-gray-500 mb-2.5">First-time onboarding</div>
              <h1 className="text-[26px] lg:text-[30px] font-bold tracking-tight text-[#0A0A0A] leading-[1.1] mb-2.5">Welcome to Agartha Kayak</h1>
              <p className="text-[14px] lg:text-[14.5px] text-gray-500 leading-[1.55] mb-[18px] lg:mb-[22px] max-w-[38ch]">
                Please link your community identity to your secure wallet.
              </p>

              {errorMessage && (
                <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-3 lg:space-y-3.5">
                
                {/* Full Legal Name */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-800 mb-[5px]" htmlFor="full-name">Full Legal Name</label>
                  <input 
                    className="w-full h-11 lg:h-[42px] px-3.5 bg-white border border-gray-200 rounded-xl text-[14px] lg:text-[14px] text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/10 transition-all" 
                    id="full-name" 
                    type="text" 
                    name="full-name" 
                    placeholder="Juan Dela Cruz" 
                    required 
                  />
                </div>
                
                {/* Email Address */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-800 mb-[5px]" htmlFor="email-address">Email Address</label>
                  <input 
                    className="w-full h-11 lg:h-[42px] px-3.5 bg-white border border-gray-200 rounded-xl text-[14px] lg:text-[14px] text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/10 transition-all" 
                    id="email-address" 
                    type="email" 
                    name="email-address" 
                    placeholder="juan@example.com" 
                    required 
                  />
                </div>

                {/* Barangay */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-800 mb-[5px]" htmlFor="barangay">Barangay / Cooperative Name</label>
                  <select 
                    className="w-full h-11 lg:h-[42px] pl-3.5 pr-10 bg-white border border-gray-200 rounded-xl text-[14px] lg:text-[14px] text-[#0A0A0A] focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/10 transition-all appearance-none" 
                    id="barangay" 
                    name="barangay" 
                    defaultValue="" 
                    required
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                    }}
                  >
                    <option value="" disabled>Select your barangay…</option>
                    {communities.map((c) => (
                      <option key={c.community_id} value={c.community_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Government ID Number */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-800 mb-[5px]" htmlFor="gov-id">Government ID Number</label>
                  <input 
                    className="w-full h-11 lg:h-[42px] px-3.5 bg-white border border-gray-200 rounded-xl text-[14px] lg:text-[14px] text-[#0A0A0A] placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/10 transition-all" 
                    id="gov-id" 
                    type="text" 
                    name="gov-id" 
                    placeholder="e.g. PhilSys ID, SSS, TIN, or Passport number" 
                    required 
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Required for identity verification. This will be stored securely and never shared publicly.</p>
                </div>

                {/* Submit */}
                <button 
                  className="inline-flex items-center justify-center gap-2.5 w-full h-12 lg:h-[46px] mt-1 bg-[#0A0A0A] text-white rounded-full text-[14.5px] font-semibold hover:bg-gray-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  type="submit"
                  disabled={formState === 'animating'}
                >
                  Join Cooperative & Enter Vault
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M5 12h14" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </form>

              <p className="mt-4 pt-3.5 border-t border-[#F0F0EE] text-[11.5px] leading-[1.55] text-gray-500">
                Your financial records are secured by the Cardano blockchain. Your personal data is stored safely in our private database and never shared publicly.
              </p>
            </section>
          )}

          {/* Confirmation Card */}
          {formState === 'success' && (
            <section className="flex flex-col items-center text-center px-6 py-[60px] animate-[scaleIn_0.45s_ease-out_both]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center mb-6 shadow-[0_12px_24px_-8px_rgba(22,163,74,0.45)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-[26px] font-bold tracking-[-0.5px] mb-2.5">Welcome to the community</h2>
              <p className="text-[14.5px] text-gray-500 leading-[1.6] max-w-[36ch] mx-auto mb-7">
                Your community identity is now linked to your wallet. The cooperative vault is open to you — your transactions are now part of the Bayanihan Ledger.
              </p>
              <span className="inline-flex items-center gap-2 bg-[#F4F4F2] border border-[#E5E5E2] rounded-full px-4 py-2 text-[12.5px] font-semibold text-[#0A0A0A]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 shadow-[0_0_0_4px_rgba(22,163,74,0.18)]"></span>
                On-chain · Verified
              </span>
            </section>
          )}

        </main>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.96); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}} />
      </div>
    );
  }

  // ==========================================
  // RENDER: Pending Approval State
  // ==========================================
  if (appState === 'pending_approval') {
    return (
      <div className="min-h-screen w-full bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white rounded-[24px] px-9 pt-10 pb-8 relative shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-16px_rgba(16,24,40,0.10)] text-center">
          <button onClick={handleBack} className="absolute top-[18px] right-[18px] w-8 h-8 rounded-full bg-[#F3F3F1] text-[#6B7280] flex items-center justify-center transition-colors hover:bg-[#E5E5E2] hover:text-[#0A0A0A]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-yellow-600"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 className="text-[22px] font-bold tracking-tight mb-2.5">Waiting for Approval</h2>
          <p className="text-[14.5px] text-gray-500 leading-[1.6] mb-6">
            Your registration is currently under review by the community elders. You will receive an email notification once your account has been approved.
          </p>
          <button onClick={handleBack} className="inline-flex items-center justify-center w-full h-12 bg-[#F4F4F2] text-[#0A0A0A] rounded-full text-[14.5px] font-semibold hover:bg-[#E5E5E2] transition-colors">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Rejected State
  // ==========================================
  if (appState === 'rejected') {
    return (
      <div className="min-h-screen w-full bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white rounded-[24px] px-9 pt-10 pb-8 relative shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-16px_rgba(16,24,40,0.10)] text-center">
          <button onClick={handleBack} className="absolute top-[18px] right-[18px] w-8 h-8 rounded-full bg-[#F3F3F1] text-[#6B7280] flex items-center justify-center transition-colors hover:bg-[#E5E5E2] hover:text-[#0A0A0A]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-red-600"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-[22px] font-bold tracking-tight mb-2.5">Application Rejected</h2>
          <p className="text-[14.5px] text-gray-500 leading-[1.6] mb-6">
            Unfortunately, your request to join the cooperative was declined by the community elders. Please contact an elder directly if you believe this was a mistake.
          </p>
          <button onClick={handleBack} className="inline-flex items-center justify-center w-full h-12 bg-[#F4F4F2] text-[#0A0A0A] rounded-full text-[14.5px] font-semibold hover:bg-[#E5E5E2] transition-colors">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Normal Connect Wallet UI
  // ==========================================
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
                Don&apos;t have Lace?{' '}
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

        {appState === 'authenticated' && memberData && (
          <div className="animate-in fade-in duration-500">
            <ConnectionSuccess />
          </div>
        )}

      </div>
    </div>
  );
}