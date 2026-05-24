'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@meshsdk/react';
import { ShieldCheck, ChevronLeft } from 'lucide-react';
import { walletAuthFetch } from '@/lib/walletAuthClient';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminPage() {
    const router = useRouter();
    const { wallet } = useWallet();
    const { status, member } = useAuth();
    const [accessStatus, setAccessStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

    const [applications, setApplications] = useState<any[]>([]);
    const [decisionLoading, setDecisionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'loading') {
            setAccessStatus('checking');
            return;
        }

        if (status === 'unauthenticated') {
            router.push('/walletAuth?redirect=/admin');
            return;
        }

        if (status === 'unregistered') {
            setAccessStatus('denied');
            return;
        }

        if (status === 'authenticated') {
            if (member?.role === 'superuser') {
                setAccessStatus('allowed');
            } else {
                setAccessStatus('denied');
            }
        }
    }, [status, member, router]);

    useEffect(() => {
        if (accessStatus !== 'allowed') return;
        fetchApplications();

    }, [accessStatus]);

    const fetchApplications = async () => {
        try {

            const res = await walletAuthFetch(wallet, '/api/admin/coop-applications', { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                setApplications(data.applications || []);
            } else {
                console.error('Unauthorized admin access attempt detected:', res.status);
                setAccessStatus('denied');
            }
        } catch (error) {
            console.error('Failed to fetch community requests', error);
            setAccessStatus('denied');
        }
    };

    const handleDecision = async (applicationId: string, action: 'approved' | 'rejected') => {
        let rejectionReason: string | undefined;
        if (action === 'rejected') {
            rejectionReason = window.prompt('Reason for rejecting this community request? (optional)') ?? '';
        }
        setDecisionLoading(applicationId);
        try {
            const res = await walletAuthFetch(wallet, '/api/admin/coop-applications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_id: applicationId, action, rejection_reason: rejectionReason })
            });
            const data = await res.json();
            if (res.ok) {
                alert(action === 'approved'
                    ? 'Community request approved — community created and owner added.'
                    : 'Community request rejected.');
                fetchApplications();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch {
            alert('Failed to process the request');
        } finally {
            setDecisionLoading(null);
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
                    <code className="font-mono">/api/admin/*</code> are also gated server-side
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

            <video
                className="fixed inset-0 z-0 w-full h-full object-cover opacity-90"
                src="/videos/hero_background.mp4"
                autoPlay
                loop
                muted
                playsInline
            />

            <div className="relative z-10 w-full h-full overflow-y-auto pb-24">

                <nav className="absolute top-6 left-0 right-0 z-20 px-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="max-w-7xl mx-auto py-4 px-2 flex items-center justify-between bg-transparent">

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
                        <p className="text-[#0A0A0A]/70 text-[16px] max-w-xl mx-auto">Review and approve requests to create new communities.</p>
                    </div>

                    <div className="space-y-8 text-[#0a0a0a]">

                        <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-3xl p-7 md:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700 shadow-inner">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Community Requests</h2>
                                    <p className="text-sm text-black/60">Review wallet-submitted requests to create a new community</p>
                                </div>
                            </div>

                            {applications.length === 0 ? (
                                <p className="text-sm text-black/50 py-4">No pending community requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {applications.map(app => (
                                        <div key={app.application_id} className="border border-black/10 rounded-2xl p-5 bg-white shadow-sm">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="text-[16px] font-bold">{app.proposed_name}</h3>
                                                    <p className="text-xs text-black/50 mt-0.5">by {app.applicant_alias || 'Unknown'} · {app.applicant_email || '—'}</p>
                                                </div>
                                                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">Pending</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] text-black/70 mb-4">
                                                <div><span className="text-black/40">Applicant wallet</span><br/><span className="font-mono break-all">{app.applicant_address}</span></div>
                                                <div><span className="text-black/40">Treasury wallet</span><br/><span className="font-mono break-all">{app.treasury_wallet_address}</span></div>
                                                <div><span className="text-black/40">Initial funds:</span> ₱{Number(app.initial_funds || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleDecision(app.application_id, 'approved')}
                                                    disabled={decisionLoading === app.application_id}
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[14px] py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {decisionLoading === app.application_id ? 'Processing…' : 'Accept'}
                                                </button>
                                                <button
                                                    onClick={() => handleDecision(app.application_id, 'rejected')}
                                                    disabled={decisionLoading === app.application_id}
                                                    className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-[14px] py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </main>
    );
}
