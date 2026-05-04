'use client';
import ConnectionSuccess from '@/components/ConnectionSuccess';
import { useWallet } from '@meshsdk/react';
import { useState, useEffect } from 'react';

export default function WalletAuthTestPage() {
    const { connected, wallet, connect, disconnect } = useWallet();
    
    // State Machine: controls what the user sees
    const [appState, setAppState] = useState<'disconnected' | 'checking' | 'needs_alias' | 'authenticated'>('disconnected');
    
    const [address, setAddress] = useState<string | null>(null);
    const [alias, setAlias] = useState('');
    const [memberData, setMemberData] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState('');

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

    // 4. Trigger Connection manually
    const handleConnect = async () => {
        setErrorMessage('');
        try {
        await connect('lace'); // lowercase 'lace' is required by MeshJS
        } catch (error) {
        setErrorMessage("Connection failed. Is Lace installed and unlocked?");
        }
    };

    return (
        <main className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden transition-all duration-300">
            
            {/* Header */}
            <div className="p-8 pb-6 text-center border-b border-slate-800">
            <h1 className="text-2xl font-bold text-blue-400">Agartha Kayak Vault</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Internal Auth Test</p>
            </div>

            <div className="p-8">
            {/* Global Error Message */}
            {errorMessage && (
                <div className="mb-6 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg text-center animate-pulse">
                {errorMessage}
                </div>
            )}

            {/* STATE: Disconnected */}
            {appState === 'disconnected' && (
                <div className="space-y-6 text-center animate-in fade-in">
                <p className="text-sm text-slate-400">
                    Welcome to the Digital Bayanihan Ledger. Connect to access the vault.
                </p>
                <button 
                    onClick={handleConnect}
                    className="w-full py-4 bg-[#2563EB] hover:bg-blue-500 text-white rounded-xl font-bold transition-all transform active:scale-95"
                >
                    Connect Lace Wallet
                </button>
                <div className="pt-4 text-xs text-slate-500">
                    No wallet? <a href="https://lace.io" target="_blank" className="text-blue-400 hover:underline">Get Lace here</a>
                </div>
                </div>
            )}

            {/* STATE: Checking/Loading */}
            {appState === 'checking' && (
                <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="text-sm text-slate-400 animate-pulse">Syncing with ledger...</p>
                </div>
            )}

            {/* STATE: Needs Alias (Registration Prompt) */}
            {appState === 'needs_alias' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <p className="text-sm text-yellow-500 font-medium">
                    We noticed you're new here! 
                    </p>
                    <p className="text-xs text-yellow-500/70 mt-1">
                    Your wallet is connected, but we need an alias to identify you in the community.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Your Community Alias</label>
                    <input 
                    type="text"
                    placeholder="e.g., Lando"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && registerMember()}
                    />
                </div>

                <button 
                    onClick={registerMember}
                    className="w-full py-4 bg-[#059669] hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                >
                    Complete Registration
                </button>
                
                <button 
                    onClick={() => disconnect()}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                    Cancel & Disconnect
                </button>
                </div>
            )}

            {/* STATE: Authenticated (Dashboard) */}
            {appState === 'authenticated' && memberData && (
            <ConnectionSuccess 
                memberData={memberData} 
                address={address} 
                onDisconnect={disconnect} 
            />
            )}
            </div>
        </div>
        </main>
    );
}