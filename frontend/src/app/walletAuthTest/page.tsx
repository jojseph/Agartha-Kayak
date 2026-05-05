'use client';

import React, { useState, useEffect } from 'react';
import ConnectionSuccess from '@/components/ConnectionSuccess';
import NetworkSelectModal from '@/components/NetworkSelectModal';
import { useWallet } from '@meshsdk/react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/pool/DashboardComponents';

export default function WalletAuthTestPage() {
    const { connected, wallet, connect, disconnect } = useWallet();
    const router = useRouter();
    
    // State Machine: controls what the user sees
    const [appState, setAppState] = useState<'disconnected' | 'checking' | 'needs_alias' | 'authenticated'>('disconnected');
    
    const [address, setAddress] = useState<string | null>(null);
    const [alias, setAlias] = useState('');
    const [memberData, setMemberData] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isDark, setIsDark] = useState(true);
    const [showNetworkModal, setShowNetworkModal] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<{ blockchain: string; environment: string } | null>(null);

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

    // 4. Open network selector, then connect
    const handleConnectClick = () => {
        setErrorMessage('');
        setShowNetworkModal(true);
    };

    const handleNetworkConfirm = async (selection: { blockchain: string; environment: string }) => {
        setShowNetworkModal(false);
        setSelectedNetwork(selection);
        setErrorMessage('');
        try {
            await connect('lace'); // lowercase 'lace' is required by MeshJS
        } catch (error) {
            setErrorMessage("Connection failed. Is Lace installed and unlocked?");
        }
    };

    return (
        <main className={`min-h-screen font-sans overflow-hidden transition-colors duration-300 flex items-center justify-center relative ${isDark ? 'bg-[#05050A] text-white selection:bg-[#FD3F83] selection:text-white' : 'bg-[#FFFDFB] text-gray-900 selection:bg-[#681CFF] selection:text-white'}`}>
            {/* Network Select Modal */}
            {showNetworkModal && (
                <NetworkSelectModal
                    isDark={isDark}
                    onConfirm={handleNetworkConfirm}
                    onClose={() => setShowNetworkModal(false)}
                />
            )}
            
            {/* Background Animated Gradient */}
            <div className="absolute inset-0 z-[0] overflow-hidden pointer-events-none transition-opacity duration-500">
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

            {/* Header / Nav */}
            <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 lg:px-12">
                <button onClick={() => router.push('/')} className="hover:opacity-80 transition-opacity">
                    <Logo isDark={isDark} />
                </button>
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
            </header>

            {/* Auth Container */}
            <div className={`relative z-10 w-full max-w-md p-8 md:p-10 rounded-3xl backdrop-blur-xl border shadow-2xl transition-all duration-300 ${isDark ? 'bg-[#10072E]/40 border-white/10 shadow-[#681CFF]/10' : 'bg-white/80 border-gray-200 shadow-[#681CFF]/5'}`}>
                
                {/* Header inside Card */}
                <div className={`text-center mb-8 pb-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#681CFF] to-[#FD3F83]">Agartha Kayak Vault</h1>
                    <p className={`text-xs uppercase tracking-widest mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Secure Authentication</p>
                </div>

                {/* Global Error Message */}
                {errorMessage && (
                    <div className="mb-6 p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-center animate-pulse">
                        {errorMessage}
                    </div>
                )}

                {/* STATE: Disconnected */}
                {appState === 'disconnected' && (
                    <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Welcome to the Digital Bayanihan Ledger. Connect your Web3 wallet to safely access the community vault.
                        </p>

                        {/* Selected network badge */}
                        {selectedNetwork && (
                            <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border ${isDark ? 'bg-[#681CFF]/10 border-[#681CFF]/30 text-[#A78BFF]' : 'bg-[#681CFF]/5 border-[#681CFF]/20 text-[#681CFF]'}`}>
                                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#681CFF] to-[#FD3F83] inline-block"></span>
                                {selectedNetwork.blockchain} · {selectedNetwork.environment}
                            </div>
                        )}

                        <button 
                            onClick={handleConnectClick}
                            className="w-full py-4 bg-gradient-to-r from-[#681CFF] to-[#FD3F83] text-white rounded-full font-bold transition-all hover:scale-105 shadow-lg shadow-[#FD3F83]/20"
                        >
                            {selectedNetwork ? 'Retry Connection' : 'Connect Lace Wallet'}
                        </button>
                        <div className={`pt-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            No wallet? <a href="https://lace.io" target="_blank" rel="noopener noreferrer" className="text-[#FD3F83] hover:underline font-medium">Get Lace here</a>
                        </div>
                    </div>
                )}

                {/* STATE: Checking/Loading */}
                {appState === 'checking' && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
                        <div className="w-12 h-12 border-4 border-[#681CFF] border-t-[#FD3F83] rounded-full animate-spin"></div>
                        <p className={`text-sm animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Syncing with secure ledger...</p>
                    </div>
                )}

                {/* STATE: Needs Alias (Registration Prompt) */}
                {appState === 'needs_alias' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
                        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#681CFF]/10 border-[#681CFF]/20' : 'bg-[#681CFF]/5 border-[#681CFF]/20'}`}>
                            <p className="text-sm font-semibold text-[#681CFF] mb-1">
                                We noticed you're new here! 
                            </p>
                            <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                Your wallet is connected, but we need an alias to identify you securely in the community.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <label className={`text-xs font-bold uppercase ml-1 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your Community Alias</label>
                            <input 
                                type="text"
                                placeholder="e.g., Lando"
                                value={alias}
                                onChange={(e) => setAlias(e.target.value)}
                                className={`w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#681CFF]/50 transition-all ${isDark ? 'bg-[#05050A]/50 border-white/10 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                                onKeyDown={(e) => e.key === 'Enter' && registerMember()}
                            />
                        </div>

                        <div className="space-y-3 pt-2">
                            <button 
                                onClick={registerMember}
                                className="w-full py-4 bg-gradient-to-r from-[#681CFF] to-[#FD3F83] text-white rounded-full font-bold transition-all hover:scale-105 shadow-lg shadow-[#FD3F83]/20"
                            >
                                Complete Registration
                            </button>
                            
                            <button 
                                onClick={() => disconnect()}
                                className={`w-full py-3 text-xs font-medium transition-colors rounded-full ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                Cancel & Disconnect
                            </button>
                        </div>
                    </div>
                )}

                {/* STATE: Authenticated (Dashboard) */}
                {appState === 'authenticated' && memberData && (
                    <div className="animate-in fade-in duration-500">
                        <ConnectionSuccess 
                            memberData={memberData} 
                            address={address} 
                            onDisconnect={disconnect} 
                        />
                    </div>
                )}
            </div>
        </main>
    );
}