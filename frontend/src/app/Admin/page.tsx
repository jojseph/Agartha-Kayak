'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@meshsdk/react';
import { ShieldCheck, PlusCircle, UserCog, Landmark, ChevronLeft } from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();
    const { wallet, connected } = useWallet();
    const [accessStatus, setAccessStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

    const [communities, setCommunities] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    
    // Create Community State
    const [newCommName, setNewCommName] = useState('');
    const [newCommWallet, setNewCommWallet] = useState('');
    const [newCommBalance, setNewCommBalance] = useState('');
    const [commLoading, setCommLoading] = useState(false);
    
    // Change Role State
    const [selectedMember, setSelectedMember] = useState('');
    const [newRole, setNewRole] = useState('member');
    const [roleLoading, setRoleLoading] = useState(false);
    
    // Adjust Treasury State
    const [selectedComm, setSelectedComm] = useState('');
    const [adjustBalance, setAdjustBalance] = useState('');
    const [treasuryLoading, setTreasuryLoading] = useState(false);

    // SuperUser gate (Module 1 CP4 placeholder).
    // TODO(M2): replace this client-side wallet probe with Ben's AuthProvider
    // role check (Task 2.1) once the unified auth context lands. The real
    // security barrier is the API layer (verifyWalletAuth + role: ['superuser']
    // on every /api/admin/* route) — this is a UX-only redirect.
    useEffect(() => {
        async function verifySuperUser() {
            if (!connected || !wallet) {
                setAccessStatus('denied');
                return;
            }
            try {
                const address = await wallet.getChangeAddress();
                const res = await fetch('/api/members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress: address }),
                });
                if (!res.ok) {
                    setAccessStatus('denied');
                    return;
                }
                const data = await res.json();
                setAccessStatus(data.member?.role === 'superuser' ? 'allowed' : 'denied');
            } catch (e) {
                console.error('SuperUser role check failed:', e);
                setAccessStatus('denied');
            }
        }
        verifySuperUser();
    }, [connected, wallet]);

    useEffect(() => {
        if (accessStatus !== 'allowed') return;
        fetchCommunities();
        fetchMembers();
    }, [accessStatus]);

    const fetchCommunities = async () => {
        try {
            const res = await fetch('/api/communities');
            if (res.ok) {
                const data = await res.json();
                setCommunities(data.communities || []);
            }
        } catch (error) {
            console.error('Failed to fetch communities', error);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/members/search');
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
            }
        } catch (error) {
            console.error('Failed to fetch members', error);
        }
    };

    const handleCreateCommunity = async (e: React.FormEvent) => {
        e.preventDefault();
        setCommLoading(true);
        try {
            const res = await fetch('/api/admin/communities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCommName,
                    treasury_wallet_address: newCommWallet,
                    treasury_balance: newCommBalance ? Number(newCommBalance) : 0
                })
            });
            if (res.ok) {
                alert('Community created successfully!');
                setNewCommName('');
                setNewCommWallet('');
                setNewCommBalance('');
                fetchCommunities();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Failed to create community');
        } finally {
            setCommLoading(false);
        }
    };

    const handleChangeRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember) return alert('Please select a member');
        
        setRoleLoading(true);
        try {
            const res = await fetch('/api/admin/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_address: selectedMember,
                    role: newRole
                })
            });
            if (res.ok) {
                alert('Member role updated successfully!');
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Failed to update member role');
        } finally {
            setRoleLoading(false);
        }
    };

    const handleAdjustTreasury = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedComm) return alert('Please select a community');
        
        setTreasuryLoading(true);
        try {
            const res = await fetch('/api/admin/communities', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    community_id: selectedComm,
                    treasury_balance: Number(adjustBalance)
                })
            });
            if (res.ok) {
                alert('Treasury balance updated successfully!');
                setAdjustBalance('');
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Failed to update treasury balance');
        } finally {
            setTreasuryLoading(false);
        }
    };

    if (accessStatus === 'checking') {
        return (
            <main className="min-h-screen w-full bg-black text-white flex items-center justify-center">
                <p className="text-white/70">Verifying SuperUser access…</p>
            </main>
        );
    }
    if (accessStatus === 'denied') {
        return (
            <main className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
                <h1 className="text-2xl md:text-3xl font-bold">Access Denied</h1>
                <p className="text-white/70 max-w-md">
                    This page is restricted to platform SuperUsers. The API endpoints under{' '}
                    <code className="font-mono">/api/admin/*</code> are also gated server-side —
                    connect a SuperUser wallet to proceed.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="px-5 py-2.5 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                    Back to Home
                </button>
            </main>
        );
    }

    return (
        <main className="relative min-h-screen w-full overflow-hidden isolate bg-black text-white font-sans">
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
                `
            }} />

            {/* Background Video */}
            <video
                className="fixed inset-0 z-0 w-full h-full object-cover opacity-90"
                src="/videos/hero_background.mp4"
                autoPlay
                loop
                muted
                playsInline
            />

            {/* Content Layer */}
            <div className="relative z-10 w-full h-full overflow-y-auto pb-24">
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
                        
                        {/* CTA Button */}
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] px-5 py-2.5 rounded-full border border-gray-200 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back to Home
                        </button>
                    </div>
                </nav>

                <div className="max-w-3xl mx-auto pt-[140px] px-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="mb-12 text-center">
                        <h1 className="text-[36px] md:text-[44px] font-bold tracking-tight mb-3 text-[#0A0A0A]">Platform Administration</h1>
                        <p className="text-[#0A0A0A]/70 text-[16px] max-w-xl mx-auto">Manage communities, assign elder roles, and control treasury funds.</p>
                    </div>

                    <div className="space-y-8 text-[#0a0a0a]">
                        {/* Section 1: Create Community */}
                        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-3xl p-7 md:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-inner">
                                    <PlusCircle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Create New Community</h2>
                                    <p className="text-sm text-black/60">Register a new cooperative or barangay vault</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateCommunity} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Community Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newCommName}
                                        onChange={e => setNewCommName(e.target.value)}
                                        placeholder="e.g. San Roque Cooperative"
                                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-3.5 text-[15px] outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 placeholder:text-black/30 shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Treasury Wallet Address (Multi-sig)</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newCommWallet}
                                        onChange={e => setNewCommWallet(e.target.value)}
                                        placeholder="addr1q..."
                                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-3.5 text-[15px] font-mono outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 placeholder:text-black/30 placeholder:font-sans shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Initial Treasury Balance (PHP)</label>
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        value={newCommBalance}
                                        onChange={e => setNewCommBalance(e.target.value)}
                                        placeholder="100000"
                                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-3.5 text-[15px] outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 placeholder:text-black/30 shadow-sm"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={commLoading}
                                    className="w-full mt-4 bg-[#0A0A0A] hover:bg-black text-white font-semibold text-[15px] py-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {commLoading ? 'Creating...' : 'Create Community'}
                                </button>
                            </form>
                        </div>

                        {/* Section 2: Manage Member Roles */}
                        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-3xl p-7 md:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-inner">
                                    <UserCog size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Manage Member Roles</h2>
                                    <p className="text-sm text-black/60">Promote members to elders or vice versa</p>
                                </div>
                            </div>

                            <form onSubmit={handleChangeRole} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Select Member</label>
                                    <div className="relative">
                                        <select 
                                            required
                                            value={selectedMember}
                                            onChange={e => setSelectedMember(e.target.value)}
                                            className="w-full bg-white border border-black/10 rounded-xl px-4 py-3.5 pr-10 text-[15px] appearance-none outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                                        >
                                            <option value="" disabled>Select a member...</option>
                                            {members.map(m => (
                                                <option key={m.wallet_address} value={m.wallet_address}>
                                                    {m.alias} ({m.wallet_address.substring(0,8)}...)
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/40">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Assign Role</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className={`cursor-pointer border rounded-2xl p-5 flex items-center gap-4 transition-all ${newRole === 'member' ? 'border-blue-500 bg-blue-50/50 shadow-[0_2px_15px_rgba(59,130,246,0.15)]' : 'border-black/10 hover:border-black/20 bg-white shadow-sm'}`}>
                                            <input type="radio" name="role" value="member" checked={newRole === 'member'} onChange={() => setNewRole('member')} className="sr-only" />
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${newRole === 'member' ? 'border-blue-500' : 'border-black/20'}`}>
                                                {newRole === 'member' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                            </div>
                                            <span className={`text-[15px] font-semibold ${newRole === 'member' ? 'text-blue-700' : 'text-black/70'}`}>Member</span>
                                        </label>
                                        <label className={`cursor-pointer border rounded-2xl p-5 flex items-center gap-4 transition-all ${newRole === 'elder' ? 'border-amber-500 bg-amber-50/50 shadow-[0_2px_15px_rgba(245,158,11,0.15)]' : 'border-black/10 hover:border-black/20 bg-white shadow-sm'}`}>
                                            <input type="radio" name="role" value="elder" checked={newRole === 'elder'} onChange={() => setNewRole('elder')} className="sr-only" />
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${newRole === 'elder' ? 'border-amber-500' : 'border-black/20'}`}>
                                                {newRole === 'elder' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                                            </div>
                                            <span className={`text-[15px] font-semibold flex items-center gap-2 ${newRole === 'elder' ? 'text-amber-700' : 'text-black/70'}`}>
                                                Elder <ShieldCheck size={16} />
                                            </span>
                                        </label>
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={roleLoading}
                                    className="w-full mt-4 bg-[#0A0A0A] hover:bg-black text-white font-semibold text-[15px] py-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {roleLoading ? 'Updating...' : 'Update Role'}
                                </button>
                            </form>
                        </div>

                        {/* Section 3: Adjust Treasury Fund */}
                        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-3xl p-7 md:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-inner">
                                    <Landmark size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Adjust Treasury Fund</h2>
                                    <p className="text-sm text-black/60">Modify the available pool balance</p>
                                </div>
                            </div>

                            <form onSubmit={handleAdjustTreasury} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Select Community</label>
                                    <div className="relative">
                                        <select 
                                            required
                                            value={selectedComm}
                                            onChange={e => setSelectedComm(e.target.value)}
                                            className="w-full bg-white border border-black/10 rounded-xl px-4 py-3.5 pr-10 text-[15px] appearance-none outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                                        >
                                            <option value="" disabled>Select a community...</option>
                                            {communities.map(c => (
                                                <option key={c.community_id} value={c.community_id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/40">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">New Treasury Balance (PHP)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-black/40">₱</div>
                                        <input 
                                            type="number" 
                                            required
                                            min="0"
                                            value={adjustBalance}
                                            onChange={e => setAdjustBalance(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-white border border-black/10 rounded-xl pl-9 pr-4 py-3.5 text-[15px] outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 placeholder:text-black/30 shadow-sm"
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={treasuryLoading}
                                    className="w-full mt-4 bg-[#0A0A0A] hover:bg-black text-white font-semibold text-[15px] py-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {treasuryLoading ? 'Updating...' : 'Update Balance'}
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}
