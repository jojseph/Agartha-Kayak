'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@meshsdk/react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Landmark,
  Users,
  ChevronRight,
  ChevronLeft,
  Search,
  Banknote,
  Package,
  X,
  Handshake,
  Copy,
  ExternalLink,
  HandCoins,
  ArrowUpRight,
  Shield,
  Clock,
  Layers,
  Activity,
  Database
} from 'lucide-react';

// --- Queue Types ---
interface QueueItem {
  queue_id: string;
  record_type: string;
  summary: string;
  estimated_bytes: number;
  status: 'queued' | 'batched' | 'etched' | 'failed';
  member_alias: string;
  tx_hash?: string;
  block_number?: string;
  created_at: string;
}

interface BatchStats {
  queuedCount: number;
  totalBytes: number;
  maxBytes: number;
  percentFull: number;
  batchCount: number;
  willOverflow: boolean;
}

// --- Types ---
type Frequency = 'weekly' | 'biweekly' | 'monthly';
type PeerMode = 'money' | 'things';

interface Neighbor {
  wallet_address: string;
  alias: string;
  barangay: string;
  trust_score: number;
}

interface ElderRequest {
  loan_id: string;
  borrower_address: string;
  mode: 'money' | 'things';
  amount?: number;
  item_name?: string;
  needed_by_date: string;
  needed_by_time: string;
  purpose: string;
  created_at: string;
  status: 'pending' | 'rejecting' | 'rejected' | 'approved';
  rejectionReason?: string;
  borrower?: { alias: string; barangay: string };
}

interface TreasuryElderRequest {
  loan_id: string;
  borrower_address: string;
  amount: number;
  purpose: string;
  term_months?: number;
  repayment_frequency?: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'rejecting';
  borrower?: { alias: string; barangay: string };
  approve_count: number;
  reject_count: number;
  my_vote?: 'approve' | 'reject' | null;
  rejectionReason?: string;
}

interface PendingMember {
  wallet_address: string;
  alias: string;
  email: string;
  barangay: string;
  created_at: string;
}

interface CommunityStats {
  treasuryBalance: number;
  activeLoanCount: number;
  treasuryLoanCount: number;
  peerLoanCount: number;
}

interface Transaction {
  fullHash: string;
  type: 'treasury' | 'member';
  purpose: string;
  amount: number;
  from: { kind: string; name: string; meta: string; addr: string };
  to: { kind: string; name: string; meta: string; addr: string };
  timestamp: string;
  block: string;
  slot: string;
  feeAda: number;
  feePhp: number;
  confirmations: number;
  confirmsTotal: number;
}

// --- Constants & Mock Data ---
const POOL_BALANCE = 125000;

// Mock data removed — neighbors and elder requests are now fetched from the API

const TX_DATA: Record<string, Transaction> = {
  'tx1q8w': {
    fullHash: 'tx1q8w7nx5kr4j2vh9p3m6q8d2sjh4y6kr5z9p2m4n6q8d2s1jh3k5m7q9p2v4n6r8t0w2x4y6z8d2j4',
    type: 'treasury',
    purpose: 'Medical',
    amount: 8500,
    from: { kind: 'treasury', name: 'Cooperative Treasury', meta: 'Multi-sig elder vault', addr: 'addr1q9k4xv2nptr8...m4w5kqz3vt7s' },
    to: { kind: 'person', name: 'Joselito Mendoza', meta: 'Barangay San Roque · 94/100 trust', addr: 'addr1q4f7tn2pn8j...8m9k2zlfkm8t' },
    timestamp: 'May 6, 2026 — 14:14:32 UTC+8',
    block: '9,847,321',
    slot: '142,837,564',
    feeAda: 0.85,
    feePhp: 0.17,
    confirmations: 26,
    confirmsTotal: 30,
  },
  'tx1m5k': {
    fullHash: 'tx1m5k9nf3jr8w2v6h7p1m3q9d4sjy2y8kr3z5p1m6n9q4d8s7jh1k4m6q3p5v9n2r6t4w8x1y3z9d6j8',
    type: 'member',
    purpose: 'Education',
    amount: 3200,
    from: { kind: 'person', name: 'Cristina Bautista', meta: 'Barangay Bagong Silang · 88/100 trust', addr: 'addr1q3m8nv7pt5j...4w7kqz2lfvt8m' },
    to: { kind: 'person', name: 'Aldous Domingo', meta: 'Barangay Santa Cruz · 87/100 trust', addr: 'addr1q5j7nx3pn2t...9w4kvz6mfln3p' },
    timestamp: 'May 6, 2026 — 11:02:08 UTC+8',
    block: '9,846,892',
    slot: '142,824,123',
    feeAda: 0.62,
    feePhp: 0.13,
    confirmations: 30,
    confirmsTotal: 30,
  },
  'tx1f9j': {
    fullHash: 'tx1f9j2pn8w5k4r7v3h1m9q6d2sjr8y5kr2z4p9m1n3q7d6s4jh2k8m1q5p7v3n9r4t2w6x8y1z4d2j7',
    type: 'treasury',
    purpose: 'Home Repair',
    amount: 12000,
    from: { kind: 'treasury', name: 'Cooperative Treasury', meta: 'Multi-sig elder vault', addr: 'addr1q9k4xv2nptr8...m4w5kqz3vt7s' },
    to: { kind: 'person', name: 'Aurelio Salazar', meta: 'Barangay Mabuhay · 91/100 trust', addr: 'addr1q7n3kxv5pn8j...m2w4kqz6lftk9p' },
    timestamp: 'May 5, 2026 — 16:48:51 UTC+8',
    block: '9,841,073',
    slot: '142,656,892',
    feeAda: 0.91,
    feePhp: 0.18,
    confirmations: 30,
    confirmsTotal: 30,
  },
  'tx1d2x': {
    fullHash: 'tx1d2x6nv8w4k2r9v7h5m1q3d8sjy4y2kr8z6p3m9n5q1d4s8jh6k2m9q7p1v5n3r7t9w4x2y6z8d4j2',
    type: 'member',
    purpose: 'Livelihood',
    amount: 2500,
    from: { kind: 'person', name: 'Lorna Pascual', meta: 'Barangay Pag-asa · 85/100 trust', addr: 'addr1q4j8nx5pn3w...m2w7kqz4lfpv6p' },
    to: { kind: 'person', name: 'Benigno Ocampo', meta: 'Barangay Magsaysay · 82/100 trust', addr: 'addr1q8m3kv6pn7j...m9w2kqz1lfvr3p' },
    timestamp: 'May 4, 2026 — 09:23:14 UTC+8',
    block: '9,832,415',
    slot: '142,396,331',
    feeAda: 0.58,
    feePhp: 0.12,
    confirmations: 30,
    confirmsTotal: 30,
  },
  'tx1c8h': {
    fullHash: 'tx1c8h4mv2pn7w3k9r6v1h5m8q2d4sjr1y8kr5z3p7m4n2q9d1s7jh3k6m8q2p4v1n7r9t5w3x6y2z8d1j5',
    type: 'treasury',
    purpose: 'Emergency',
    amount: 15000,
    from: { kind: 'treasury', name: 'Cooperative Treasury', meta: 'Multi-sig elder vault', addr: 'addr1q9k4xv2nptr8...m4w5kqz3vt7s' },
    to: { kind: 'person', name: 'Estrella Villanueva', meta: 'Barangay Maligaya · 96/100 trust', addr: 'addr1q2k8nx9pn4j...m7w3kqz5lfmt2p' },
    timestamp: 'May 3, 2026 — 19:07:42 UTC+8',
    block: '9,823,107',
    slot: '142,116,884',
    feeAda: 1.04,
    feePhp: 0.21,
    confirmations: 30,
    confirmsTotal: 30,
  },
  'tx1k6n': {
    fullHash: 'tx1k6n3mv7pn2w8k4r5v9h3m1q6d8sjy7y4kr2z9p1m6n4q3d8s5jh1k9m3q7p2v4n6r1t8w5x3y9z2d6j4',
    type: 'member',
    purpose: 'Other',
    amount: 1800,
    from: { kind: 'person', name: 'Felipe Aquino', meta: 'Barangay Bayanihan · 79/100 trust', addr: 'addr1q1n5kxv3pn9w...m4w8kqz7lfvk5p' },
    to: { kind: 'person', name: 'Rosario Lazaro', meta: 'Barangay Maligaya · 81/100 trust', addr: 'addr1q6m2kv8pn1j...m3w9kqz4lfvb7p' },
    timestamp: 'May 1, 2026 — 13:55:09 UTC+8',
    block: '9,805,624',
    slot: '141,592,247',
    feeAda: 0.49,
    feePhp: 0.10,
    confirmations: 30,
    confirmsTotal: 30,
  },
  'tx1p3v': {
    fullHash: 'tx1p3v9mv4pn5w8k2r7v1h3m6q9d4sjr3y6kr1z5p4m9n2q7d8s3jh5k1m9q4p7v3n8r2t6w9x4y1z7d3j6',
    type: 'treasury',
    purpose: 'Medical',
    amount: 6000,
    from: { kind: 'treasury', name: 'Cooperative Treasury', meta: 'Multi-sig elder vault', addr: 'addr1q9k4xv2nptr8...m4w5kqz3vt7s' },
    to: { kind: 'person', name: 'Ricardo Limbo', meta: 'Barangay Magsaysay · 90/100 trust', addr: 'addr1q5n7kxv4pn8w...m1w6kqz9lfvr3p' },
    timestamp: 'Apr 29, 2026 — 10:34:18 UTC+8',
    block: '9,790,238',
    slot: '141,131,569',
    feeAda: 0.73,
    feePhp: 0.15,
    confirmations: 30,
    confirmsTotal: 30,
  },
};

// --- Helpers ---
const initialsOf = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const fmtPeso = (n: number) => `₱ ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPesoShort = (n: number) => `₱ ${Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const paymentsPerMonth = (freq: Frequency) => {
  if (freq === 'weekly') return 4;
  if (freq === 'biweekly') return 2;
  return 1;
};

const paymentUnitLabel = (freq: Frequency) => {
  if (freq === 'weekly') return 'week';
  if (freq === 'biweekly') return '2 weeks';
  return 'month';
};

const calcSchedule = (amount: number, term: number, freq: Frequency) => {
  const ppm = paymentsPerMonth(freq);
  const numPayments = term * ppm;
  const principal = amount || 0;
  const perPayment = numPayments > 0 ? principal / numPayments : 0;
  const today = new Date();
  const first = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from today
  const end = new Date(first.getTime() + ((numPayments - 1) * (30 / ppm) * 24 * 60 * 60 * 1000));
  
  return { numPayments, perPayment, first, end, total: principal };
};


// ==========================================
// MAIN COMPONENT
// ==========================================
export default function DashboardTestPage() {
  const { disconnect, connected, wallet } = useWallet();
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);

  // Fetch wallet address + member info on connect
  useEffect(() => {
    if (connected) {
      wallet.getUsedAddresses().then(addrs => {
        const addr = addrs[0];
        setAddress(addr);
        // Fetch member info
        fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
          body: JSON.stringify({ walletAddress: addr })
        }).then(r => r.json()).then(d => { if (d.member) setMemberData(d.member); }).catch(console.error);
        // Fetch neighbors (same community)
        fetch(`/api/members/search?exclude=${addr}`, {
          headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
        }).then(r => r.json()).then(d => setNeighbors(d.members || [])).catch(console.error);
      });
    }
  }, [connected, wallet]);

  // Modals States
  const [treasuryModal, setTreasuryModal] = useState({ isOpen: false, step: 1 as number | 'success' });
  const [peerModal, setPeerModal] = useState({ isOpen: false, step: 1 as number | 'success' });
  const [elderModalOpen, setElderModalOpen] = useState(false);
  const [treasuryElderModalOpen, setTreasuryElderModalOpen] = useState(false);
  const [pendingMemberModalOpen, setPendingMemberModalOpen] = useState(false);
  const [txModal, setTxModal] = useState<{ isOpen: boolean, txKey: string | null }>({ isOpen: false, txKey: null });
  const [isCopied, setIsCopied] = useState(false);

  // Community stats (dynamic)
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    treasuryBalance: 0,
    activeLoanCount: 0,
    treasuryLoanCount: 0,
    peerLoanCount: 0,
  });

  const [pendingCounts, setPendingCounts] = useState({
    treasuryLoans: 0,
    newMembers: 0,
    reconciliations: 0,
    memberRequests: 0,
  });

  // Treasury elder requests
  const [treasuryElderRequests, setTreasuryElderRequests] = useState<TreasuryElderRequest[]>([]);

  // Pending member requests
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);

  // Submitted treasury loan ID for success screen
  const [tLoanId, setTLoanId] = useState<string | null>(null);

  // Reconciliation state
  const [reconModalOpen, setReconModalOpen] = useState(false);
  const [reconList, setReconList] = useState<any[]>([]);
  const [reconProposing, setReconProposing] = useState(false);
  const [reconBalance, setReconBalance] = useState('');
  const [reconReason, setReconReason] = useState('');

  // Treasury Loan Form State
  const [tAmount, setTAmount] = useState(0);
  const [tPurpose, setTPurpose] = useState('');
  const [tCollateral, setTCollateral] = useState('');
  const [tTerm, setTTerm] = useState(6);
  const [tFreq, setTFreq] = useState<Frequency>('monthly');
  const [tAccepted, setTAccepted] = useState(false);

  // Peer Loan Form State
  const [pQuery, setPQuery] = useState('');
  const [pNeighborId, setPNeighborId] = useState<string | null>(null);
  const [pMode, setPMode] = useState<PeerMode>('money');
  const [pAmount, setPAmount] = useState(0);
  const [pThingName, setPThingName] = useState('');
  const [pDate, setPDate] = useState('');
  const [pTime, setPTime] = useState('');
  const [pPurpose, setPPurpose] = useState('');
  const [pAccepted, setPAccepted] = useState(false);

  // Elder Action State
  const [elderRequests, setElderRequests] = useState<ElderRequest[]>([]);

  // --- NETWORK QUEUE STATE (Real Data from Database) ---
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStats>({
    queuedCount: 0, totalBytes: 0, maxBytes: 16384, percentFull: 0, batchCount: 1, willOverflow: false,
  });
  const [queueLoading, setQueueLoading] = useState(true);

  // Countdown timer for next batch
  const [nextBatchIn, setNextBatchIn] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setNextBatchIn(prev => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs < 10 ? '0' : ''}${rs}`;
  };

  // Fetch queue data from API
  const fetchQueue = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/community/queue?address=${address}`, {
        headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setQueueItems(data.queue || []);
        if (data.batchStats) setBatchStats(data.batchStats);
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchQueue();
      // Refresh queue every 30 seconds
      const interval = setInterval(fetchQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [address]);

  // Fetch community stats when address is available
  useEffect(() => {
    if (address) {
      fetch(`/api/community/stats?address=${address}`, {
        headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
      })
        .then(r => r.json())
        .then(d => {
          if (d.treasuryBalance !== undefined) {
            setCommunityStats({
              treasuryBalance: d.treasuryBalance,
              activeLoanCount: d.activeLoanCount,
              treasuryLoanCount: d.treasuryLoanCount,
              peerLoanCount: d.peerLoanCount,
            });
          }
        })
        .catch(console.error);
    }
  }, [address]);

  // Fetch pending counts for elder/member alerts
  useEffect(() => {
    if (address) {
      fetch(`/api/dashboard/pending-counts?address=${address}`, {
        headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
      })
        .then(r => r.json())
        .then(d => {
          if (d.counts) setPendingCounts(d.counts);
        })
        .catch(console.error);
    }
  }, [address]);

  // Derived Peer Data
  const selectedNeighbor = neighbors.find(n => n.wallet_address === pNeighborId);
  const filteredNeighbors = neighbors.filter(n => (n.alias || '').toLowerCase().includes(pQuery.toLowerCase()));

  // Submit treasury loan to API
  const submitTreasuryLoan = async () => {
    if (!address) return;
    try {
      const res = await fetch('/api/loans/treasury/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
        body: JSON.stringify({
          borrowerAddress: address,
          amount: tAmount,
          purpose: tPurpose,
          collateral: tCollateral,
          termMonths: tTerm,
          repaymentFrequency: tFreq,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTLoanId(data.loan?.loan_id || null);
        setTreasuryModal({ ...treasuryModal, step: 'success' });
        // Refresh stats
        fetch(`/api/community/stats?address=${address}`, {
          headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
        }).then(r => r.json()).then(d => { if (d.treasuryBalance !== undefined) setCommunityStats(d); }).catch(console.error);
      } else {
        console.error('Failed to submit treasury loan:', data.error);
        alert(data.error || 'Failed to submit treasury loan request.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit peer loan request to API
  const submitPeerLoan = async () => {
    if (!address || !pNeighborId) return;
    try {
      const res = await fetch('/api/loans/peer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
        body: JSON.stringify({
          borrowerAddress: address,
          lenderAddress: pNeighborId,
          mode: pMode,
          amount: pAmount,
          itemName: pThingName,
          date: pDate,
          time: pTime,
          purpose: pPurpose
        })
      });
      if (res.ok) {
        setPeerModal({ ...peerModal, step: 'success' });
      } else {
        console.error('Failed to submit peer loan');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Respond to a loan request (approve/reject)
  const respondToLoan = async (loanId: string, action: 'approved' | 'rejected', reason?: string) => {
    try {
      const res = await fetch('/api/loans/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
        body: JSON.stringify({ loanId, action, reason, lenderAddress: address })
      });
      if (res.ok) {
        setElderRequests(elderRequests.map(r => r.loan_id === loanId ? { ...r, status: action } : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset Treasury Modal when opened
  const openTreasuryModal = () => {
    setTAmount(0);
    setTPurpose('');
    setTCollateral('');
    setTTerm(6);
    setTFreq('monthly');
    setTAccepted(false);
    setTreasuryModal({ isOpen: true, step: 1 });
  };

  // Reset Peer Modal when opened
  const openPeerModal = () => {
    setPQuery('');
    setPNeighborId(null);
    setPMode('money');
    setPAmount(0);
    setPThingName('');
    setPDate('');
    setPTime('');
    setPPurpose('');
    setPAccepted(false);
    setPeerModal({ isOpen: true, step: 1 });
  };

  // Open Elder Modal — fetch real pending requests
  const openElderModal = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/loans/requests?address=${address}`, {
        headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setElderRequests((data.requests || []).map((r: any) => ({ ...r, status: 'pending' })));
      }
    } catch (err) {
      console.error(err);
    }
    setElderModalOpen(true);
  };

  // Open Treasury Elder Modal — fetch treasury loan requests
  const openTreasuryElderModal = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/loans/treasury/pending?address=${address}`, {
        headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setTreasuryElderRequests((data.requests || []).map((r: any) => ({
          ...r,
          status: r.status === 'pending' ? 'pending' : r.status,
        })));
      }
    } catch (err) {
      console.error(err);
    }
    setTreasuryElderModalOpen(true);
  };

  // Open Pending Members Modal
  const openPendingMemberModal = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/members/pending?address=${address}`, {
        headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    }
    setPendingMemberModalOpen(true);
  };

  // Vote on a treasury loan (approve or reject)
  const voteOnTreasuryLoan = async (loanId: string, vote: 'approve' | 'reject', reason?: string) => {
    if (!address) return;
    try {
      const res = await fetch('/api/loans/treasury/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
        body: JSON.stringify({ loanId, elderAddress: address, vote })
      });
      const data = await res.json();
      if (res.ok) {
        setTreasuryElderRequests(prev => prev.map(r => {
          if (r.loan_id !== loanId) return r;
          const newApprove = vote === 'approve' ? r.approve_count + 1 : r.approve_count;
          const newStatus = data.rejected ? 'rejected' : data.approved ? 'approved' : 'pending';
          return { ...r, my_vote: vote, approve_count: newApprove, status: newStatus, rejectionReason: reason };
        }));
      } else {
        alert(data.error || 'Failed to cast vote.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Respond to member registration
  const respondToMember = async (memberAddress: string, action: 'approved' | 'rejected') => {
    if (!address) return;
    try {
      const res = await fetch('/api/members/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
        body: JSON.stringify({ elderAddress: address, memberAddress, action })
      });
      if (res.ok) {
        setPendingMembers(prev => prev.filter(m => m.wallet_address !== memberAddress));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update member.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CUSTOM_CSS }} />
      
      <header className="topbar">
        <a href="#" className="brand" aria-label="Agartha Kayak home">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px', flexShrink: 0, color: 'var(--text)' }} aria-hidden="true">
            <path d="M2.5 15.5c3-3 6-3 9 0s6 3 9 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M19 4L5 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M20 5l-3 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M7 16l-3 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
          <span className="brand-text">Agartha Kayak</span>
        </a>

        <div className="topbar__right">
          <div className="user-menu">
            <span className="user-menu__avatar">{memberData ? initialsOf(memberData.alias) : '??'}</span>
            <div className="user-menu__info">
              <span className="user-menu__name">{memberData?.alias || 'Guest'}</span>
              <span className="user-menu__addr">{address ? `${address.slice(0, 8)}…${address.slice(-4)}` : ''}</span>
            </div>
            <button className="user-menu__disconnect" type="button" onClick={() => { disconnect(); localStorage.removeItem('mesh-wallet-persist'); router.push('/'); }}>Disconnect</button>
          </div>
        </div>
      </header>

      {/* --- PATH B: DASHBOARD --- */}
      <section className="view view--dashboard is-active">
        <div className="container">
          {/* Elder / Owner Panels */}
          {(memberData?.role === 'elder' || memberData?.role === 'owner') && (
            <>
              <div className="elder-panel" style={{ marginBottom: '12px', background: 'var(--text-2)' }}>
                <span className="elder-panel__icon" aria-hidden="true"><Landmark size={16} /></span>
                <div className="elder-panel__body">
                  <div className="elder-panel__head">Treasury Requests</div>
                  <div className="elder-panel__msg">
                    {pendingCounts.treasuryLoans > 0 
                      ? <>You have <strong>{pendingCounts.treasuryLoans}</strong> pending treasury loan requests to review.</>
                      : <>Pending treasury loan requests in your community.</>
                    }
                  </div>
                </div>
                <button className="elder-panel__cta" onClick={openTreasuryElderModal}>Review Now</button>
              </div>

              <div className="elder-panel" style={{ marginBottom: '12px', background: 'var(--text-2)' }}>
                <span className="elder-panel__icon" aria-hidden="true"><Users size={16} /></span>
                <div className="elder-panel__body">
                  <div className="elder-panel__head">New Member Requests</div>
                  <div className="elder-panel__msg">
                    {pendingCounts.newMembers > 0
                      ? <>You have <strong>{pendingCounts.newMembers}</strong> new arrivals awaiting your approval.</>
                      : <>Approve or reject new arrivals to your cooperative.</>
                    }
                  </div>
                </div>
                <button className="elder-panel__cta" onClick={openPendingMemberModal}>Review Now</button>
              </div>
              <div className="elder-panel" style={{ marginBottom: '12px', background: 'var(--text-2)' }}>
                <span className="elder-panel__icon" aria-hidden="true"><Shield size={16} /></span>
                <div className="elder-panel__body">
                  <div className="elder-panel__head">Treasury Reconciliation</div>
                  <div className="elder-panel__msg">
                    {pendingCounts.reconciliations > 0
                      ? <>There are <strong>{pendingCounts.reconciliations}</strong> reconciliations needing signatures.</>
                      : <>Propose or approve manual balance updates with multi-sig security.</>
                    }
                  </div>
                </div>
                <button className="elder-panel__cta" onClick={async () => {
                  if (!address) return;
                  try {
                    const res = await fetch(`/api/treasury/reconciliation/pending?address=${address}`, {
                      headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setReconList(data.reconciliations || []);
                    }
                  } catch (err) { console.error(err); }
                  setReconModalOpen(true);
                }}>Review Now</button>
              </div>
            </>
          )}

          <div className="elder-panel">
            <span className="elder-panel__icon" aria-hidden="true"><HandCoins size={16} /></span>
            <div className="elder-panel__body">
              <div className="elder-panel__head">Member Requests</div>
              <div className="elder-panel__msg">You have <strong>{pendingCounts.memberRequests}</strong> neighbors requesting to borrow from you.</div>
            </div>
            <button className="elder-panel__cta" onClick={openElderModal}>Review Now</button>
          </div>

          <div className="vault-hero">
            <div className="stat-card">
              <div className="stat-card__label">
                <span className="dot-live" aria-hidden="true"></span>
                Total Treasury Funds
              </div>
              <div className="stat-card__value stat-card__value--xl">
                ₱&nbsp;{communityStats.treasuryBalance.toLocaleString('en-PH', { maximumFractionDigits: 0 })}<span style={{ color: 'var(--text-3)' }}>.00</span>
              </div>
              <div className="stat-card__sub">
                <span className="stat-trend"><TrendingUp size={11} /> +₱ 0</span>
                this week, across 0 contributions
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__label">Active Community Loans</div>
              <div className="stat-card__value stat-card__value--lg">{communityStats.activeLoanCount}</div>
              <div className="stat-card__sub">{communityStats.treasuryLoanCount} treasury · {communityStats.peerLoanCount} member-to-member</div>
            </div>
          </div>

          {/* --- NETWORK QUEUE --- */}
          <div className="network-queue">
            <div className="network-queue__head">
              <div>
                <h3 className="network-queue__title"><Layers size={16} /> Network Queue</h3>
                <div className="network-queue__sub">Pending receipts waiting to be batched and etched on-chain</div>
              </div>
              <span className="network-queue__badge"><Clock size={11} /> Next batch in ~{fmtTime(nextBatchIn)}</span>
            </div>

            {/* Batch Progress Bar */}
            {batchStats.queuedCount > 0 && (
              <div className="nq-batch-bar">
                <div className="nq-batch-bar__header">
                  <span className="nq-batch-bar__label"><Database size={12} /> Batch {batchStats.batchCount > 1 ? '1' : ''} Capacity</span>
                  <span className="nq-batch-bar__value">{(batchStats.totalBytes / 1024).toFixed(1)} KB / 16 KB</span>
                </div>
                <div className="nq-batch-bar__track">
                  <div className="nq-batch-bar__fill" style={{ width: `${Math.min(100, batchStats.percentFull)}%` }} />
                </div>
                {batchStats.willOverflow && (
                  <div className="nq-batch-bar__overflow">
                    <Activity size={11} /> Overflow detected — will split into {batchStats.batchCount} transactions
                  </div>
                )}
              </div>
            )}

            <div className="network-queue__items">
              {queueLoading ? (
                <div className="nq-empty">
                  <span className="nq-spinner" style={{ width: 16, height: 16 }} />
                  <span style={{ marginLeft: 8, color: 'var(--text-3)', fontSize: 13 }}>Loading queue…</span>
                </div>
              ) : queueItems.length === 0 ? (
                <div className="nq-empty">
                  <Check size={16} style={{ color: 'var(--status-green)' }} />
                  <span style={{ marginLeft: 8, color: 'var(--text-2)', fontSize: 13 }}>All receipts have been etched — queue is clear</span>
                </div>
              ) : (
                queueItems.slice(0, 8).map((item) => (
                  <div key={item.queue_id} className={`nq-item nq-item--${item.status === 'batched' ? 'batched' : item.status === 'etched' ? 'done' : 'queued'}`}>
                    <div className="nq-item__dot" />
                    <div className="nq-item__body">
                      <span className="nq-item__label">{item.summary}</span>
                      <span className="nq-item__meta">
                        {item.member_alias} · {item.estimated_bytes} bytes
                        {item.block_number ? ` · Block #${item.block_number}` : ''}
                        {item.status === 'queued' ? ' · Awaiting batch' : ''}
                      </span>
                    </div>
                    {item.status === 'queued' && <span className="nq-item__status">Queued</span>}
                    {item.status === 'batched' && (
                      <span className="nq-item__status nq-item__status--active">
                        <span className="nq-spinner" /> Etching
                      </span>
                    )}
                    {item.status === 'etched' && (
                      <span className="nq-item__status nq-item__status--done">
                        <Check size={12} /> Etched
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="network-queue__footer">
              <span>{batchStats.queuedCount} receipt{batchStats.queuedCount !== 1 ? 's' : ''} pending · Cardano batches minimize fees · 16KB overflow handled automatically</span>
            </div>
          </div>

          <div className="quick-actions">
            <button className="action-card" onClick={openTreasuryModal}>
              <span className="action-card__icon" aria-hidden="true"><Landmark size={20} /></span>
              <span className="action-card__body">
                <span className="action-card__head">Request Treasury Loan</span>
                <span className="action-card__sub">Borrow from the cooperative's main pool. Requires 2 elder signatures.</span>
              </span>
              <span className="action-card__arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
            </button>

            <button className="action-card" onClick={openPeerModal}>
              <span className="action-card__icon" aria-hidden="true"><Users size={20} /></span>
              <span className="action-card__body">
                <span className="action-card__head">New Member-to-Member Loan</span>
                <span className="action-card__sub">Borrow directly from a neighbor. Settled peer-to-peer on-chain.</span>
              </span>
              <span className="action-card__arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
            </button>
          </div>

          <div className="records">
            <div className="records__head">
              <div>
                <h2 className="records__title">Public Record Board</h2>
                <div className="records__sub">All transactions verified on Cardano · Updated live</div>
              </div>
              <div className="records__filters" role="tablist">
                <button className="is-active">All</button>
                <button>Treasury</button>
                <button>Member</button>
              </div>
            </div>

            <table className="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Borrower</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="cell-date">Today, 2:14 PM</td>
                  <td><span className="type-badge type-badge--treasury"><Landmark size={11} /> Treasury</span></td>
                  <td className="cell-borrower">Joselito Mendoza</td>
                  <td className="cell-amount">₱ 8,500.00</td>
                  <td className="cell-receipt">
                    <button className="receipt-link" onClick={() => setTxModal({ isOpen: true, txKey: 'tx1q8w' })}>
                      tx1q8w…rfg9 <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="cell-date">Today, 11:02 AM</td>
                  <td><span className="type-badge type-badge--member"><Users size={11} /> Member</span></td>
                  <td className="cell-borrower">
                    <span className="cell-borrower-flow">Cristina Bautista <ArrowRight size={12} /> Aldous Domingo</span>
                  </td>
                  <td className="cell-amount">₱ 3,200.00</td>
                  <td className="cell-receipt">
                    <button className="receipt-link" onClick={() => setTxModal({ isOpen: true, txKey: 'tx1m5k' })}>
                      tx1m5k…xz4t <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="cell-date">Yesterday</td>
                  <td><span className="type-badge type-badge--treasury"><Landmark size={11} /> Treasury</span></td>
                  <td className="cell-borrower">Aurelio Salazar</td>
                  <td className="cell-amount">₱ 12,000.00</td>
                  <td className="cell-receipt">
                    <button className="receipt-link" onClick={() => setTxModal({ isOpen: true, txKey: 'tx1f9j' })}>
                      tx1f9j…kqp7 <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="cell-date">2 days ago</td>
                  <td><span className="type-badge type-badge--member"><Users size={11} /> Member</span></td>
                  <td className="cell-borrower">
                    <span className="cell-borrower-flow">Lorna Pascual <ArrowRight size={12} /> Benigno Ocampo</span>
                  </td>
                  <td className="cell-amount">₱ 2,500.00</td>
                  <td className="cell-receipt">
                    <button className="receipt-link" onClick={() => setTxModal({ isOpen: true, txKey: 'tx1d2x' })}>
                      tx1d2x…nvw3 <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="cell-date">3 days ago</td>
                  <td><span className="type-badge type-badge--treasury"><Landmark size={11} /> Treasury</span></td>
                  <td className="cell-borrower">Estrella Villanueva</td>
                  <td className="cell-amount">₱ 15,000.00</td>
                  <td className="cell-receipt">
                    <button className="receipt-link" onClick={() => setTxModal({ isOpen: true, txKey: 'tx1c8h' })}>
                      tx1c8h…rmb5 <ChevronRight size={11} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="app-footer">
            Agartha Kayak — The Digital Bayanihan Ledger.<br />
            Treasury secured on Cardano · Disbursements settled in PHP via GCash &amp; Maya.
          </div>
        </div>
      </section>

      {/* --- TREASURY LOAN MODAL --- */}
      {treasuryModal.isOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => setTreasuryModal({ ...treasuryModal, isOpen: false })}></div>
          <div className="loan-modal__dialog">
            
            {treasuryModal.step !== 'success' && (
              <header className="loan-modal__header">
                <div className="loan-modal__stepper">
                  <span>{treasuryModal.step} of 3</span>
                  <span className="loan-modal__seg-bar">
                    <span className={`loan-modal__seg ${treasuryModal.step === 1 ? 'is-active' : 'is-done'}`}></span>
                    <span className={`loan-modal__seg ${treasuryModal.step === 2 ? 'is-active' : treasuryModal.step === 3 ? 'is-done' : ''}`}></span>
                    <span className={`loan-modal__seg ${treasuryModal.step === 3 ? 'is-active' : ''}`}></span>
                  </span>
                </div>
                <button className="loan-modal__close" onClick={() => setTreasuryModal({ ...treasuryModal, isOpen: false })}><X size={14} /></button>
              </header>
            )}

            <div className="loan-modal__body">
              {treasuryModal.step === 1 && (
                <section className="loan-step is-active">
                  <h2 className="loan-step__title">Request Treasury Loan</h2>
                  <p className="loan-step__sub">Borrow from the cooperative's main pool.</p>

                  <div className={`amount-display ${tAmount > 0 ? 'is-focused' : ''}`}>
                    <span className="amount-display__currency">₱</span>
                    <input 
                      className="amount-input" 
                      type="number" 
                      min="1" max={POOL_BALANCE} step="100" placeholder="0"
                      value={tAmount || ''} onChange={(e) => setTAmount(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="amount-meta">
                    <span className="amount-meta__pool">
                      <span className="dot"></span>
                      <span>Available pool: <strong style={{ color: 'var(--text)', fontWeight: 600 }}>₱ {communityStats.treasuryBalance.toLocaleString('en-PH')}</strong></span>
                    </span>
                    <span style={{ color: tAmount > communityStats.treasuryBalance ? '#b91c1c' : tAmount > 0 ? 'var(--status-green)' : 'var(--text-3)' }}>
                      {tAmount > communityStats.treasuryBalance ? 'Exceeds available pool' : tAmount > 0 ? '✓ Valid amount' : 'Enter amount'}
                    </span>
                  </div>
                  
                  <div className="quick-picks">
                    {[5000, 10000, 25000, 50000].map(v => (
                      <button key={v} className={`quick-pick ${tAmount === v ? 'is-selected' : ''}`} onClick={() => setTAmount(v)}>
                        ₱ {v.toLocaleString('en-PH')}
                      </button>
                    ))}
                  </div>

                  <div className="field" style={{ marginBottom: '4px' }}>
                    <label className="field__label">Purpose</label>
                    <textarea 
                      className="input input--purpose" 
                      placeholder="Briefly describe how the funds will be used..."
                      value={tPurpose} onChange={e => setTPurpose(e.target.value)}
                    />
                    <span className="field__hint">Elders read this when reviewing your request. Keep it clear and concise.</span>
                  </div>

                  <div className="field" style={{ marginBottom: '4px' }}>
                    <label className="field__label">Collateral Declaration</label>
                    <input 
                      className="input" 
                      type="text"
                      placeholder="e.g. Samsung Galaxy S24, Honda Click 125i, Laptop…"
                      value={tCollateral} onChange={e => setTCollateral(e.target.value)}
                    />
                    <span className="field__hint">Declare a real-world asset as collateral. This will be permanently recorded on the blockchain.</span>
                  </div>
                </section>
              )}

              {treasuryModal.step === 2 && (() => {
                const s = calcSchedule(tAmount, tTerm, tFreq);
                return (
                  <section className="loan-step is-active">
                    <h2 className="loan-step__title">Repayment Plan</h2>
                    <p className="loan-step__sub">Choose your term and payment frequency.</p>

                    <div className="section-label">Term</div>
                    <div className="terms-row">
                      {[3, 6, 12].map(m => (
                        <button key={m} className={`term-card ${tTerm === m ? 'is-selected' : ''}`} onClick={() => setTTerm(m)}>
                          <span className="term-card__num">{m}</span>
                          <span className="term-card__unit">Months</span>
                        </button>
                      ))}
                    </div>

                    <div className="section-label">Frequency</div>
                    <div className="freq-segmented">
                      {['weekly', 'biweekly', 'monthly'].map((f) => (
                        <button key={f} className={tFreq === f ? 'is-active' : ''} onClick={() => setTFreq(f as Frequency)}>
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>

                    <div className="schedule">
                      <div className="schedule__head">Estimated Schedule</div>
                      <div className="schedule__main">
                        <div className="schedule__per">
                          ₱ {s.perPayment > 0 ? s.perPayment.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          <small>/ {paymentUnitLabel(tFreq)}</small>
                        </div>
                        <div className="schedule__count"><strong>{s.numPayments}</strong><br/>payments</div>
                      </div>
                      <div className="schedule__rows">
                        <div className="schedule__row"><span>First payment</span><span>{s.numPayments > 0 ? fmtDate(s.first) : '—'}</span></div>
                        <div className="schedule__row"><span>Loan paid off</span><span>{s.numPayments > 0 ? fmtDate(s.end) : '—'}</span></div>
                        <div className="schedule__row"><span>Interest rate</span><span>1% — Community</span></div>
                        <div className="schedule__row"><span>Total to repay</span><span>{fmtPeso(s.total)}</span></div>
                      </div>
                    </div>
                  </section>
                )
              })()}

              {treasuryModal.step === 3 && (() => {
                const s = calcSchedule(tAmount, tTerm, tFreq);
                return (
                  <section className="loan-step is-active">
                    <h2 className="loan-step__title">Review your request</h2>
                    <p className="loan-step__sub">Confirm before sending to elders for approval.</p>
                    <div className="summary-list">
                      <div className="summary-row">
                        <span className="summary-row__label">Loan amount</span>
                        <span className="summary-row__value summary-row__value-amount">{fmtPesoShort(tAmount)}</span>
                      </div>
                      <div className="summary-row summary-row--multiline">
                        <span className="summary-row__label">Purpose</span>
                        <span className="summary-row__value">{tPurpose || '—'}</span>
                      </div>
                      <div className="summary-row summary-row--multiline">
                        <span className="summary-row__label">Collateral</span>
                        <span className="summary-row__value" style={{ color: 'var(--status-green)', fontWeight: 700 }}>{tCollateral || '—'}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-row__label">Term &amp; frequency</span>
                        <span className="summary-row__value">{tTerm} months · {tFreq}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-row__label">Per installment</span>
                        <span className="summary-row__value">{fmtPeso(s.perPayment)} / {paymentUnitLabel(tFreq)}</span>
                      </div>
                    </div>
                    <div className="approval-note">
                      <span className="approval-note__icon"><Users size={14} /></span>
                      <div>
                        <div className="approval-note__head">Requires 2 elder signatures</div>
                        <div className="approval-note__text">Your request will be reviewed by community elders. Funds disburse to GCash / Maya.</div>
                      </div>
                    </div>
                    <button type="button" className={`check-row ${tAccepted ? 'is-checked' : ''}`} onClick={() => setTAccepted(!tAccepted)}>
                      <span className="checkbox"><Check size={12} strokeWidth={2.6} /></span>
                      <span className="check-row__body">
                        <span className="check-row__label">I confirm the details are accurate</span>
                        <span className="check-row__hint">I understand this loan is recorded on the Cardano blockchain.</span>
                      </span>
                    </button>
                  </section>
                )
              })()}

              {treasuryModal.step === 'success' && (
                <div className="loan-success is-active">
                  <div className="loan-success__check"><Check size={28} strokeWidth={2.5} /></div>
                  <div className="loan-success__title">Request submitted</div>
                  <p className="loan-success__sub">Your loan request has been sent to the cooperative elders. You'll receive a notification when reviewed.</p>
                  <span className="loan-success__ref">
                    <span className="loan-success__ref-label">Ref</span>
                    <span>{tLoanId || 'REQ-2026-0042'}</span>
                  </span>
                  <button className="btn btn-primary" style={{ width: '100%', maxWidth: '320px' }} onClick={() => setTreasuryModal({ ...treasuryModal, isOpen: false })}>
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>

            {treasuryModal.step !== 'success' && (
              <footer className="loan-modal__footer">
                <button className="loan-modal__back" disabled={treasuryModal.step === 1} onClick={() => setTreasuryModal({ ...treasuryModal, step: (treasuryModal.step as number) - 1 })}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button 
                  className="btn btn-primary loan-modal__continue" 
                  disabled={
                    (treasuryModal.step === 1 && (tAmount <= 0 || tAmount > communityStats.treasuryBalance || tPurpose.trim().length < 5 || tCollateral.trim().length < 3)) ||
                    (treasuryModal.step === 2 && false) ||
                    (treasuryModal.step === 3 && !tAccepted)
                  }
                  onClick={() => {
                    if (treasuryModal.step === 3) submitTreasuryLoan();
                    else setTreasuryModal({ ...treasuryModal, step: (treasuryModal.step as number) + 1 });
                  }}
                >
                  {treasuryModal.step === 3 ? <><ShieldCheck size={16} /> Submit Request</> : <>Continue <ArrowRight size={16} /></>}
                </button>
              </footer>
            )}
          </div>
        </div>
      )}


      {/* --- PEER LOAN MODAL --- */}
      {peerModal.isOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => setPeerModal({ ...peerModal, isOpen: false })}></div>
          <div className="loan-modal__dialog">
            {peerModal.step !== 'success' && (
              <header className="loan-modal__header">
                <div className="loan-modal__stepper">
                  <span>{peerModal.step} of 3</span>
                  <span className="loan-modal__seg-bar">
                    <span className={`loan-modal__seg ${peerModal.step === 1 ? 'is-active' : 'is-done'}`}></span>
                    <span className={`loan-modal__seg ${peerModal.step === 2 ? 'is-active' : peerModal.step === 3 ? 'is-done' : ''}`}></span>
                    <span className={`loan-modal__seg ${peerModal.step === 3 ? 'is-active' : ''}`}></span>
                  </span>
                </div>
                <button className="loan-modal__close" onClick={() => setPeerModal({ ...peerModal, isOpen: false })}><X size={14} /></button>
              </header>
            )}

            <div className="loan-modal__body">
              {peerModal.step === 1 && (
                <section className="loan-step is-active">
                  <h2 className="loan-step__title">Choose a neighbor</h2>
                  <p className="loan-step__sub">Search a cooperative member to send your request to.</p>

                  <div className="peer-search">
                    <Search size={14} />
                    <input type="text" placeholder="Search by name…" value={pQuery} onChange={e => setPQuery(e.target.value)} />
                  </div>

                  <div className="peer-list">
                    {filteredNeighbors.length === 0 ? (
                      <div className="peer-empty">No members match your search.</div>
                    ) : (
                      filteredNeighbors.map(n => (
                        <button key={n.wallet_address} className={`peer-card peer-card--simple ${pNeighborId === n.wallet_address ? 'is-selected' : ''}`} onClick={() => setPNeighborId(n.wallet_address)}>
                          <span className="peer-card__avatar">{initialsOf(n.alias || '?')}</span>
                          <span className="peer-card__body"><span className="peer-card__name">{n.alias}</span> <span className="peer-card__sub">{n.barangay || 'Local'}</span></span>
                          <span className="peer-card__radio"></span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              )}

              {peerModal.step === 2 && selectedNeighbor && (
                <section className="loan-step is-active">
                  <span className="peer-chip">
                    <span className="peer-chip__avatar">{initialsOf(selectedNeighbor.alias || '?')}</span>
                    Request to <span className="peer-chip__name">{selectedNeighbor.alias}</span>
                  </span>

                  <h2 className="loan-step__title">What do you want to borrow?</h2>
                  <p className="loan-step__sub">You can borrow money or a personal item.</p>

                  <div className="mode-tabs">
                    <button className={`mode-tab ${pMode === 'money' ? 'is-active' : ''}`} onClick={() => setPMode('money')}>
                      <Banknote size={14} /> Money
                    </button>
                    <button className={`mode-tab ${pMode === 'things' ? 'is-active' : ''}`} onClick={() => setPMode('things')}>
                      <Package size={14} /> Things
                    </button>
                  </div>

                  {pMode === 'money' && (
                    <div className="mode-panel is-active">
                      <div className={`amount-display ${pAmount > 0 ? 'is-focused' : ''}`}>
                        <span className="amount-display__currency">₱</span>
                        <input className="amount-input" type="number" min="1" step="100" placeholder="0" value={pAmount || ''} onChange={e => setPAmount(Number(e.target.value) || 0)} />
                      </div>
                      <div className="amount-meta">
                        <span className="amount-meta__pool"><span className="dot"></span><span>Sent directly to <span>{(selectedNeighbor.alias || '').split(' ')[0]}</span></span></span>
                        <span style={{ color: pAmount > 0 ? 'var(--status-green)' : 'var(--text-3)' }}>{pAmount > 0 ? '✓ Valid amount' : 'Enter amount'}</span>
                      </div>
                      <div className="quick-picks">
                        {[2000, 5000, 10000, 20000].map(v => (
                          <button key={v} className={`quick-pick ${pAmount === v ? 'is-selected' : ''}`} onClick={() => setPAmount(v)}>₱ {v.toLocaleString('en-PH')}</button>
                        ))}
                      </div>
                      
                      <div className="datetime-row">
                        <div className="field">
                          <label className="field__label">When do you need it?</label>
                          <input className="input" type="date" value={pDate} onChange={e => setPDate(e.target.value)} />
                        </div>
                        <div className="field">
                          <label className="field__label">Preferred time</label>
                          <input className="input" type="time" value={pTime} onChange={e => setPTime(e.target.value)} />
                        </div>
                      </div>

                      <div className="field" style={{ marginBottom: '4px' }}>
                        <label className="field__label">Purpose</label>
                        <textarea className="input input--purpose" placeholder="Briefly describe how you'll use the funds." value={pPurpose} onChange={e => setPPurpose(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {pMode === 'things' && (
                    <div className="mode-panel is-active">
                      <div className="field">
                        <label className="field__label">What do you want to borrow?</label>
                        <input className="input" type="text" placeholder="e.g., Electric drill, ladder" value={pThingName} onChange={e => setPThingName(e.target.value)} />
                      </div>
                      <div className="datetime-row">
                        <div className="field">
                          <label className="field__label">When do you need it?</label>
                          <input className="input" type="date" value={pDate} onChange={e => setPDate(e.target.value)} />
                        </div>
                        <div className="field">
                          <label className="field__label">Preferred time</label>
                          <input className="input" type="time" value={pTime} onChange={e => setPTime(e.target.value)} />
                        </div>
                      </div>
                      <div className="field" style={{ marginBottom: '4px' }}>
                        <label className="field__label">Purpose</label>
                        <textarea className="input input--purpose" placeholder="Why do you need it?" value={pPurpose} onChange={e => setPPurpose(e.target.value)} />
                      </div>
                    </div>
                  )}
                </section>
              )}

              {peerModal.step === 3 && selectedNeighbor && (
                <section className="loan-step is-active">
                  <h2 className="loan-step__title">Review your request</h2>
                  <p className="loan-step__sub">We'll send this directly to your neighbor for approval.</p>

                  <div className="summary-list">
                    <div className="summary-row">
                      <span className="summary-row__label">Requesting from</span>
                      <span className="summary-row__value">{selectedNeighbor.alias}</span>
                    </div>
                    {pMode === 'money' ? (
                      <div className="summary-row">
                        <span className="summary-row__label">Loan amount</span>
                        <span className="summary-row__value summary-row__value-amount">{fmtPesoShort(pAmount)}</span>
                      </div>
                    ) : (
                      <div className="summary-row">
                        <span className="summary-row__label">Item</span>
                        <span className="summary-row__value">{pThingName || '—'}</span>
                      </div>
                    )}
                    {pDate && (
                      <div className="summary-row">
                        <span className="summary-row__label">When needed</span>
                        <span className="summary-row__value">
                          {new Date(pDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                          {pTime && ` at ${new Date(`2026-01-01T${pTime}`).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`}
                        </span>
                      </div>
                    )}
                    <div className="summary-row summary-row--multiline">
                      <span className="summary-row__label">Purpose</span>
                      <span className="summary-row__value">{pPurpose || '—'}</span>
                    </div>
                  </div>

                  <div className="approval-note">
                    <span className="approval-note__icon"><Handshake size={14} /></span>
                    <div>
                      <div className="approval-note__head">Direct peer-to-peer agreement</div>
                      <div className="approval-note__text">No elder approval required. Your neighbor reviews and can accept, counter, or decline.</div>
                    </div>
                  </div>

                  <button type="button" className={`check-row ${pAccepted ? 'is-checked' : ''}`} onClick={() => setPAccepted(!pAccepted)}>
                    <span className="checkbox"><Check size={12} strokeWidth={2.6} /></span>
                    <span className="check-row__body">
                      <span className="check-row__label">I confirm the details are accurate</span>
                      <span className="check-row__hint">I understand this loan is recorded on the Cardano blockchain.</span>
                    </span>
                  </button>
                </section>
              )}

              {peerModal.step === 'success' && (
                <div className="loan-success is-active">
                  <div className="loan-success__check"><Check size={28} strokeWidth={2.5} /></div>
                  <div className="loan-success__title">Request sent to {selectedNeighbor?.alias}</div>
                  <p className="loan-success__sub">They'll receive a notification and can accept, counter, or decline. You'll see the response on your dashboard.</p>
                  <span className="loan-success__ref">
                    <span className="loan-success__ref-label">Ref</span>
                    <span>P2P-2026-0042</span>
                  </span>
                  <button className="btn btn-primary" style={{ width: '100%', maxWidth: '320px' }} onClick={() => setPeerModal({ ...peerModal, isOpen: false })}>
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>

            {peerModal.step !== 'success' && (
              <footer className="loan-modal__footer">
                <button className="loan-modal__back" disabled={peerModal.step === 1} onClick={() => setPeerModal({ ...peerModal, step: (peerModal.step as number) - 1 })}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button 
                  className="btn btn-primary loan-modal__continue" 
                  disabled={
                    (peerModal.step === 1 && !pNeighborId) ||
                    (peerModal.step === 2 && (pMode === 'money' ? (pAmount <= 0 || pPurpose.length < 5) : (pThingName.length < 2 || pPurpose.length < 5))) ||
                    (peerModal.step === 3 && !pAccepted)
                  }
                  onClick={() => {
                    if (peerModal.step === 3) { submitPeerLoan(); }
                    else setPeerModal({ ...peerModal, step: (peerModal.step as number) + 1 });
                  }}
                >
                  {peerModal.step === 3 ? <>Send Request <ArrowRight size={16} /></> : <>Continue <ArrowRight size={16} /></>}
                </button>
              </footer>
            )}
          </div>
        </div>
      )}


      {/* --- TREASURY ELDER MODAL --- */}
      {treasuryElderModalOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => setTreasuryElderModalOpen(false)}></div>
          <div className="loan-modal__dialog">
            <header className="loan-modal__header">
              <div className="elder-modal__title-block">
                <div className="elder-modal__title">Treasury Requests</div>
                <div className="elder-modal__sub"><strong>{treasuryElderRequests.filter(r => r.status === 'pending' && !r.my_vote).length}</strong> awaiting your review in your community</div>
              </div>
              <button className="loan-modal__close" onClick={() => setTreasuryElderModalOpen(false)}><X size={14} /></button>
            </header>
            <div className="loan-modal__body">
              <div className="pending-list">
                {treasuryElderRequests.length === 0 ? (
                  <div className="elder-empty is-visible">
                    <div className="elder-empty__icon"><Landmark size={22} strokeWidth={2.5} /></div>
                    <div className="elder-empty__title">All caught up</div>
                    <div className="elder-empty__sub">No pending treasury requests in your community right now.</div>
                    <button className="elder-empty__close" onClick={() => setTreasuryElderModalOpen(false)}>Close</button>
                  </div>
                ) : (
                  treasuryElderRequests.map(req => {
                    // Check if current user already voted on this request
                    const alreadyVoted = !!req.my_vote;
                    const needsMyVote = req.status === 'pending' && !alreadyVoted;
                    
                    return (
                      <div key={req.loan_id} className={`pending-card ${req.status === 'approved' ? 'is-approved' : req.status === 'rejected' ? 'is-rejected' : req.status === 'rejecting' ? 'is-rejecting' : ''}`} style={alreadyVoted && req.status === 'pending' ? { opacity: 0.7 } : {}}>
                        <div className="pending-card__top">
                          <div className="pending-card__requester">
                            <span className="pending-card__avatar">{initialsOf(req.borrower?.alias || '?')}</span>
                            <div>
                              <div className="pending-card__rname">{req.borrower?.alias || 'Unknown'}</div>
                              <div className="pending-card__rmeta">
                                <span>{(req.borrower?.barangay || 'Local').replace('Barangay ', '')}</span>
                                <span className="pending-card__rmeta-divider"></span>
                                <span style={{ color: 'var(--text-3)' }}>{new Date(req.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="pending-card__amount">
                            <div className="pending-card__amount-value">₱ {req.amount?.toLocaleString('en-PH')}</div>
                            <div className="pending-card__amount-label">Treasury</div>
                          </div>
                        </div>

                        <div className="pending-card__details">
                          <div className="pending-card__detail-row">
                            <span className="pending-card__detail-label">Amount</span>
                            <span className="pending-card__detail-value">₱ {req.amount?.toLocaleString('en-PH')}</span>
                          </div>
                          {req.term_months && (
                            <div className="pending-card__detail-row">
                              <span className="pending-card__detail-label">Term</span>
                              <span className="pending-card__detail-value">{req.term_months} months / {req.repayment_frequency || 'monthly'}</span>
                            </div>
                          )}
                          <div className="pending-card__detail-row" style={{ alignItems: 'flex-start', gridColumn: '1 / -1' }}>
                            <span className="pending-card__detail-label">Purpose</span>
                            <span className="pending-card__detail-value" style={{ fontWeight: 500, color: 'var(--text-2)' }}>{req.purpose}</span>
                          </div>
                        </div>

                        {/* Status bar / Signatures count */}
                        <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
                            <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
                            Signatures: <strong style={{ color: 'var(--text)' }}>{req.approve_count} of 2</strong> required
                          </span>
                          {alreadyVoted && req.status === 'pending' && (
                            <span style={{ color: 'var(--status-green)', fontWeight: 600 }}>✓ You approved</span>
                          )}
                        </div>

                        {needsMyVote && (
                          <div className="pending-card__actions">
                            <button className="btn-reject" onClick={() => setTreasuryElderRequests(treasuryElderRequests.map(r => r.loan_id === req.loan_id ? { ...r, status: 'rejecting' } : r))}>
                              <X size={14} strokeWidth={2.2} /> Reject
                            </button>
                            <button className="btn-approve" onClick={() => voteOnTreasuryLoan(req.loan_id, 'approve')}>
                              <Check size={14} strokeWidth={2.2} /> Approve
                            </button>
                          </div>
                        )}

                        {req.status === 'rejecting' && (
                          <div className="reject-reason" style={{ display: 'block' }}>
                            <div className="reject-reason__head">Reason for rejecting</div>
                            <textarea className="reject-reason__input" placeholder="Add a brief note (optional)..." id={`t-reject-reason-${req.loan_id}`}></textarea>
                            <div className="reject-reason__actions">
                              <button className="btn-cancel" onClick={() => setTreasuryElderRequests(treasuryElderRequests.map(r => r.loan_id === req.loan_id ? { ...r, status: 'pending' } : r))}>Cancel</button>
                              <button className="btn-confirm-reject" onClick={() => {
                                const ta = document.getElementById(`t-reject-reason-${req.loan_id}`) as HTMLTextAreaElement;
                                voteOnTreasuryLoan(req.loan_id, 'reject', ta?.value || 'Rejected by elder');
                              }}>Confirm Reject</button>
                            </div>
                          </div>
                        )}

                        {req.status === 'approved' && (
                          <div className="pending-card__resolution pending-card__resolution--approved" style={{ display: 'flex' }}>
                            <span className="resolution__icon resolution__icon--approved"><Check size={14} /></span>
                            <div>
                              <div className="resolution__head">Treasury Request Approved</div>
                              <div className="resolution__sub">Funds will be disbursed to the member.</div>
                            </div>
                          </div>
                        )}

                        {req.status === 'rejected' && (
                          <div className="pending-card__resolution pending-card__resolution--rejected" style={{ display: 'flex' }}>
                            <span className="resolution__icon resolution__icon--rejected"><X size={14} /></span>
                            <div>
                              <div className="resolution__head">Request Rejected</div>
                              <div className="resolution__sub">{req.rejectionReason || 'An elder has rejected this request.'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* --- ELDER APPROVAL MODAL --- */}
      {elderModalOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => setElderModalOpen(false)}></div>
          <div className="loan-modal__dialog">
            <header className="loan-modal__header">
              <div className="elder-modal__title-block">
                <div className="elder-modal__title">Member Requests</div>
                <div className="elder-modal__sub"><strong>{elderRequests.filter(r => r.status === 'pending').length}</strong> awaiting your response</div>
              </div>
              <button className="loan-modal__close" onClick={() => setElderModalOpen(false)}><X size={14} /></button>
            </header>
            <div className="loan-modal__body">
              <div className="pending-list">
                {elderRequests.map(req => {
                  const isMoney = req.mode === 'money';
                  
                  return (
                    <div key={req.loan_id} className={`pending-card ${req.status === 'approved' ? 'is-approved' : req.status === 'rejected' ? 'is-rejected' : req.status === 'rejecting' ? 'is-rejecting' : ''}`}>
                      <div className="pending-card__top">
                        <div className="pending-card__requester">
                          <span className="pending-card__avatar">{initialsOf(req.borrower?.alias || '?')}</span>
                          <div>
                            <div className="pending-card__rname">{req.borrower?.alias || 'Unknown'}</div>
                            <div className="pending-card__rmeta">
                              <span>{(req.borrower?.barangay || 'Local').replace('Barangay ', '')}</span>
                              <span className="pending-card__rmeta-divider"></span>
                              <span style={{ color: 'var(--text-3)' }}>{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        {isMoney ? (
                          <div className="pending-card__amount">
                            <div className="pending-card__amount-value">₱ {req.amount?.toLocaleString('en-PH')}</div>
                            <div className="pending-card__amount-label">Money</div>
                          </div>
                        ) : (
                          <div className="pending-card__amount">
                            <div className="pending-card__amount-value" style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.018em' }}>{req.item_name}</div>
                            <div className="pending-card__amount-label">Item</div>
                          </div>
                        )}
                      </div>

                      <div className="pending-card__details">
                        <div className="pending-card__detail-row">
                          <span className="pending-card__detail-label">{isMoney ? 'Amount' : 'Item'}</span>
                          <span className="pending-card__detail-value">{isMoney ? `₱ ${req.amount?.toLocaleString('en-PH')}` : req.item_name}</span>
                        </div>
                        {req.needed_by_date && (
                          <div className="pending-card__detail-row">
                            <span className="pending-card__detail-label">When needed</span>
                            <span className="pending-card__detail-value">
                              {new Date(req.needed_by_date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                              {req.needed_by_time && ` at ${new Date(`2026-01-01T${req.needed_by_time}`).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`}
                            </span>
                          </div>
                        )}
                        <div className="pending-card__detail-row" style={{ alignItems: 'flex-start' }}>
                          <span className="pending-card__detail-label">Purpose</span>
                          <span className="pending-card__detail-value" style={{ fontWeight: 500, color: 'var(--text-2)' }}>{req.purpose}</span>
                        </div>
                      </div>

                      {req.status === 'pending' && (
                        <div className="pending-card__actions">
                          <button className="btn-reject" onClick={() => setElderRequests(elderRequests.map(r => r.loan_id === req.loan_id ? { ...r, status: 'rejecting' } : r))}>
                            <X size={14} strokeWidth={2.2} /> Decline
                          </button>
                          <button className="btn-approve" onClick={() => respondToLoan(req.loan_id, 'approved')}>
                            <Check size={14} strokeWidth={2.2} /> Accept
                          </button>
                        </div>
                      )}

                      {req.status === 'rejecting' && (
                        <div className="reject-reason" style={{ display: 'block' }}>
                          <div className="reject-reason__head">Reason for declining</div>
                          <div className="reject-reason__chips">
                            <button className="reason-chip" onClick={(e) => {
                              const textarea = e.currentTarget.parentElement?.nextSibling as HTMLTextAreaElement;
                              if (textarea) textarea.value = "Not available right now";
                            }}>Not available</button>
                            <button className="reason-chip" onClick={(e) => {
                              const textarea = e.currentTarget.parentElement?.nextSibling as HTMLTextAreaElement;
                              if (textarea) textarea.value = "Insufficient funds";
                            }}>Insufficient funds</button>
                          </div>
                          <textarea className="reject-reason__input" placeholder="Add a brief note (optional)..." id={`reject-reason-${req.loan_id}`}></textarea>
                          <div className="reject-reason__actions">
                            <button className="btn-cancel" onClick={() => setElderRequests(elderRequests.map(r => r.loan_id === req.loan_id ? { ...r, status: 'pending' } : r))}>Cancel</button>
                            <button className="btn-confirm-reject" onClick={() => {
                              const ta = document.getElementById(`reject-reason-${req.loan_id}`) as HTMLTextAreaElement;
                              respondToLoan(req.loan_id, 'rejected', ta?.value || 'No reason provided.');
                            }}>Confirm Decline</button>
                          </div>
                        </div>
                      )}

                      {req.status === 'approved' && (
                        <div className="pending-card__resolution pending-card__resolution--approved" style={{ display: 'flex' }}>
                          <span className="resolution__icon resolution__icon--approved"><Check size={14} /></span>
                          <div>
                            <div className="resolution__head">Accepted</div>
                            <div className="resolution__sub">{isMoney ? `₱ ${req.amount?.toLocaleString('en-PH')} will transfer.` : 'Pickup will be arranged.'}</div>
                          </div>
                        </div>
                      )}

                      {req.status === 'rejected' && (
                        <div className="pending-card__resolution pending-card__resolution--rejected" style={{ display: 'flex' }}>
                          <span className="resolution__icon resolution__icon--rejected"><X size={14} /></span>
                          <div>
                            <div className="resolution__head">Request declined</div>
                            <div className="resolution__sub">{req.rejectionReason}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {elderRequests.every(r => r.status === 'approved' || r.status === 'rejected') && (
                <div className="elder-empty is-visible">
                  <div className="elder-empty__icon"><Check size={22} strokeWidth={2.5} /></div>
                  <div className="elder-empty__title">All caught up</div>
                  <div className="elder-empty__sub">No pending requests from your neighbors right now.</div>
                  <button className="elder-empty__close" onClick={() => setElderModalOpen(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PENDING MEMBERS MODAL --- */}
      {pendingMemberModalOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => setPendingMemberModalOpen(false)}></div>
          <div className="loan-modal__dialog">
            <header className="loan-modal__header">
              <div className="elder-modal__title-block">
                <span className="elder-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} /> New Member Requests
                </span>
                <span className="elder-modal__sub">Review and approve new registrations to your community.</span>
              </div>
              <button className="loan-modal__close" onClick={() => setPendingMemberModalOpen(false)}><X size={14} /></button>
            </header>

            <div className="loan-modal__body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="pending-list">
                {pendingMembers.map((member: any) => (
                  <div key={member.wallet_address} className="pending-card">
                    <div className="pending-card__top">
                      <div className="pending-card__requester">
                        <div className="pending-card__avatar">{(member.alias || '??').slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="pending-card__rname">{member.alias}</div>
                          <div className="pending-card__rmeta">
                            <span>{member.wallet_address.slice(0, 10)}...{member.wallet_address.slice(-6)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pending-card__details">
                      <div><span className="pending-card__detail-label">Email</span><span className="pending-card__detail-value">{member.email || 'N/A'}</span></div>
                      <div><span className="pending-card__detail-label">Barangay</span><span className="pending-card__detail-value">{member.barangay || 'N/A'}</span></div>
                      <div><span className="pending-card__detail-label">Gov ID #</span><span className="pending-card__detail-value" style={{ fontFamily: 'monospace' }}>{/* For future ID rendering */ 'Verified via Form'}</span></div>
                      <div><span className="pending-card__detail-label">Date Joined</span><span className="pending-card__detail-value">{new Date(member.created_at).toLocaleDateString()}</span></div>
                    </div>

                    <div className="pending-card__actions">
                      <button className="btn-reject" onClick={() => respondToMember(member.wallet_address, 'rejected')}>
                        <X size={14} strokeWidth={2.2} /> Reject
                      </button>
                      <button className="btn-approve" onClick={() => respondToMember(member.wallet_address, 'approved')}>
                        <Check size={14} strokeWidth={2.2} /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pendingMembers.length === 0 && (
                <div className="elder-empty is-visible">
                  <div className="elder-empty__icon"><Check size={22} strokeWidth={2.5} /></div>
                  <div className="elder-empty__title">All Caught Up</div>
                  <div className="elder-empty__sub">There are no pending registrations for your community right now.</div>
                  <button className="elder-empty__close" onClick={() => setPendingMemberModalOpen(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TRANSACTION RECEIPT MODAL --- */}
      {txModal.isOpen && txModal.txKey && (() => {
        const tx = TX_DATA[txModal.txKey];
        const isFinalized = tx.confirmations >= tx.confirmsTotal;

        const handleCopy = () => {
          navigator.clipboard.writeText(tx.fullHash).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1800);
          });
        };

        return (
          <div className="loan-modal is-open">
            <div className="loan-modal__backdrop" onClick={() => setTxModal({ isOpen: false, txKey: null })}></div>
            <div className="loan-modal__dialog">
              <header className="loan-modal__header">
                <div className="elder-modal__title-block">
                  <div className="elder-modal__title">Transaction Receipt</div>
                  <div className="elder-modal__sub">Verified on the Cardano blockchain</div>
                </div>
                <button className="loan-modal__close" onClick={() => setTxModal({ isOpen: false, txKey: null })}><X size={14} /></button>
              </header>
              <div className="loan-modal__body">
                <span className="tx-status">
                  <ShieldCheck size={12} strokeWidth={2.5} />
                  {isFinalized ? 'Verified · Finalized' : 'Verified · ' + tx.confirmations + ' confirmations'}
                </span>

                <div className="tx-amount-block">
                  <div className="tx-amount-block__value">₱ {tx.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="tx-amount-block__type">
                    <span>{tx.type === 'treasury' ? 'Treasury Loan' : 'Member-to-Member Loan'}</span>
                    <span className="tx-amount-block__type-dot"></span>
                    <span>{tx.purpose}</span>
                  </div>
                </div>

                <div className="tx-parties">
                  <div className="tx-party">
                    <span className="tx-party__label">From</span>
                    <div className="tx-party__main">
                      {tx.from.kind === 'treasury' ? (
                        <span className="tx-party__avatar tx-party__avatar--treasury"><Landmark size={14} /></span>
                      ) : (
                        <span className="tx-party__avatar">{initialsOf(tx.from.name)}</span>
                      )}
                      <div className="tx-party__info">
                        <div className="tx-party__name">{tx.from.name}</div>
                        <div className="tx-party__meta">{tx.from.meta}</div>
                        <div className="tx-party__addr">{tx.from.addr}</div>
                      </div>
                    </div>
                  </div>
                  <div className="tx-arrow"><ArrowRight size={16} /></div>
                  <div className="tx-party">
                    <span className="tx-party__label">To</span>
                    <div className="tx-party__main">
                      <span className="tx-party__avatar">{initialsOf(tx.to.name)}</span>
                      <div className="tx-party__info">
                        <div className="tx-party__name">{tx.to.name}</div>
                        <div className="tx-party__meta">{tx.to.meta}</div>
                        <div className="tx-party__addr">{tx.to.addr}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Date</span>
                    <span className="tx-detail-row__value">{tx.timestamp}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Block</span>
                    <span className="tx-detail-row__value tx-detail-row__value--mono">#{tx.block}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Slot</span>
                    <span className="tx-detail-row__value tx-detail-row__value--mono">{tx.slot}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Network fee</span>
                    <span className="tx-detail-row__value">₱ {tx.feePhp.toFixed(2)} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({tx.feeAda} ADA)</span></span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Confirmations</span>
                    <span className="tx-detail-row__value">
                      <span className="tx-detail-row__value-conf">
                        <span className="dot"></span>
                        {tx.confirmations} of {tx.confirmsTotal}{isFinalized ? ' · Finalized' : ''}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="tx-hash">
                  <div className="tx-hash__head">
                    <span className="tx-hash__label">Transaction hash</span>
                    <button className={`tx-hash__copy ${isCopied ? 'is-copied' : ''}`} onClick={handleCopy}>
                      {isCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div className="tx-hash__value">{tx.fullHash}</div>
                </div>

                <a className="tx-cardanoscan" href={`https://cardanoscan.io/transaction/${tx.fullHash}`} target="_blank" rel="noopener noreferrer">
                  View on Cardanoscan
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- RECONCILIATION MODAL --- */}
      {reconModalOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => { setReconModalOpen(false); setReconProposing(false); }}></div>
          <div className="loan-modal__dialog">
            <header className="loan-modal__header">
              <div className="elder-modal__title-block">
                <span className="elder-modal__title"><Shield size={18} /> Treasury Reconciliation</span>
                <span className="elder-modal__sub">Propose or approve manual balance updates</span>
              </div>
              <button className="loan-modal__close" onClick={() => { setReconModalOpen(false); setReconProposing(false); }}><X size={14} /></button>
            </header>

            <div className="loan-modal__body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {!reconProposing ? (
                <>
                  <button className="btn btn-primary" style={{ width: '100%', marginBottom: '18px' }} onClick={() => setReconProposing(true)}>
                    <Shield size={14} /> Propose Balance Update
                  </button>

                  {reconList.length === 0 && (
                    <div className="elder-empty is-visible">
                      <div className="elder-empty__icon"><Check size={22} /></div>
                      <div className="elder-empty__title">All Clear</div>
                      <div className="elder-empty__sub">No pending reconciliations in your community.</div>
                    </div>
                  )}

                  {reconList.map((r: any) => (
                    <div key={r.reconciliation_id} className={`pending-card ${r.status === 'approved' ? 'is-approved' : r.status === 'rejected' ? 'is-rejected' : ''}`} style={{ marginBottom: '12px' }}>
                      <div className="pending-card__top">
                        <div className="pending-card__requester">
                          <div className="pending-card__avatar">{(r.proposer?.alias || '??').slice(0, 2).toUpperCase()}</div>
                          <div>
                            <div className="pending-card__rname">{r.proposer?.alias || 'Unknown'}</div>
                            <div className="pending-card__rmeta">
                              <span>{r.reason}</span>
                            </div>
                          </div>
                        </div>
                        <div className="pending-card__amount">
                          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Previous</div>
                          <div style={{ fontSize: '16px', fontWeight: 600 }}>{fmtPesoShort(r.previous_balance)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>Proposed</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-green)' }}>{fmtPesoShort(r.proposed_balance)}</div>
                        </div>
                      </div>
                      <div className="pending-card__details">
                        <div><span className="pending-card__detail-label">Status</span><span className="pending-card__detail-value" style={{ textTransform: 'capitalize' }}>{r.status}</span></div>
                        <div><span className="pending-card__detail-label">Sigs Required</span><span className="pending-card__detail-value">{r.sigs_required}</span></div>
                        <div><span className="pending-card__detail-label">Approvals</span><span className="pending-card__detail-value">{(r.signatures || []).filter((s: any) => s.decision === 'approve').length}</span></div>
                        <div><span className="pending-card__detail-label">Created</span><span className="pending-card__detail-value">{new Date(r.created_at).toLocaleDateString()}</span></div>
                      </div>
                      {r.status === 'pending' && r.proposed_by !== address && (
                        <div className="pending-card__actions">
                          <button className="btn-reject" onClick={async () => {
                            const res = await fetch('/api/treasury/reconciliation/sign', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
                              body: JSON.stringify({ elderAddress: address, reconciliationId: r.reconciliation_id, decision: 'reject' })
                            });
                            if (res.ok) { setReconList(prev => prev.map(x => x.reconciliation_id === r.reconciliation_id ? { ...x, status: 'rejected' } : x)); }
                          }}><X size={14} /> Reject</button>
                          <button className="btn-approve" onClick={async () => {
                            const res = await fetch('/api/treasury/reconciliation/sign', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
                              body: JSON.stringify({ elderAddress: address, reconciliationId: r.reconciliation_id, decision: 'approve' })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setReconList(prev => prev.map(x => x.reconciliation_id === r.reconciliation_id ? { ...x, status: data.outcome || 'pending' } : x));
                              if (data.resolved) {
                                // Refresh community stats
                                fetch(`/api/community/stats?address=${address}`, { headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' } })
                                  .then(r => r.json()).then(d => { if (d.treasuryBalance !== undefined) setCommunityStats(d); }).catch(console.error);
                              }
                            } else { alert(data.error || 'Failed to sign'); }
                          }}><Check size={14} /> Approve</button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <section className="loan-step is-active">
                  <h2 className="loan-step__title">Propose Balance Update</h2>
                  <p className="loan-step__sub">This will require approval from another Elder before the treasury balance is updated.</p>

                  <div className="field" style={{ marginBottom: '14px' }}>
                    <label className="field__label">Proposed Balance (₱)</label>
                    <input className="input" type="number" min="0" step="100" placeholder="Enter the real-world balance…" value={reconBalance} onChange={e => setReconBalance(e.target.value)} />
                  </div>

                  <div className="field" style={{ marginBottom: '14px' }}>
                    <label className="field__label">Reason</label>
                    <textarea className="input input--purpose" placeholder="Why does the balance need updating?" value={reconReason} onChange={e => setReconReason(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-reject" style={{ flex: 1 }} onClick={() => setReconProposing(false)}>
                      Cancel
                    </button>
                    <button className="btn-approve" style={{ flex: 1 }} disabled={!reconBalance || !reconReason.trim()} onClick={async () => {
                      const res = await fetch('/api/treasury/reconciliation/propose', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' },
                        body: JSON.stringify({ elderAddress: address, proposedBalance: Number(reconBalance), reason: reconReason })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setReconProposing(false);
                        setReconBalance('');
                        setReconReason('');
                        // Re-fetch reconciliations
                        const listRes = await fetch(`/api/treasury/reconciliation/pending?address=${address}`, {
                          headers: { 'Authorization': process.env.NEXT_PUBLIC_API_KAYAK_KEY || '' }
                        });
                        if (listRes.ok) { const d = await listRes.json(); setReconList(d.reconciliations || []); }
                      } else { alert(data.error || 'Failed to propose reconciliation'); }
                    }}>
                      <ShieldCheck size={14} /> Submit Proposal
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

// ==========================================
// CUSTOM STYLES (Injected for fidelity)
// ==========================================
const CUSTOM_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --bg: #ffffff;
    --bg-grid: rgba(0, 0, 0, 0);
    --surface: #ffffff;
    --surface-hover: #f5f5f5;
    --surface-2: #f5f5f5;
    --border: rgba(0, 0, 0, 0.08);
    --border-strong: rgba(0, 0, 0, 0.18);
    --border-selected: #0a0a0a;
    --text: #0a0a0a;
    --text-2: rgba(10, 10, 10, 0.62);
    --text-3: rgba(10, 10, 10, 0.42);
    --text-inverse: #ffffff;
    --accent: #0a0a0a;
    --status-green: #16a34a;
    --status-green-bg: rgba(22, 163, 74, 0.08);
    --status-green-border: rgba(22, 163, 74, 0.25);
    --warn-bg: rgba(0, 0, 0, 0.025);
    --warn-border: rgba(0, 0, 0, 0.10);
  }

  html, body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif;
    font-feature-settings: 'cv11', 'ss01', 'ss03';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(var(--bg-grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px);
    background-size: 64px 64px;
    pointer-events: none;
    z-index: 0;
    mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%);
  }

  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; cursor: pointer; }
  input, select, textarea { font-family: inherit; }

  /* ===== TOP BAR ===== */
  .topbar {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 32px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    gap: 24px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 18px;
    line-height: 1;
    color: var(--text);
    letter-spacing: -0.025em;
    flex-shrink: 0;
    transition: opacity 160ms ease;
  }
  .brand:hover { opacity: 0.8; }
  .brand-text { font-weight: 700; letter-spacing: -0.025em; }

  /* ===== USER MENU ===== */
  .user-menu {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .user-menu__avatar {
    width: 32px; height: 32px;
    border-radius: 999px;
    background: var(--text);
    color: var(--text-inverse);
    display: grid; place-items: center;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .user-menu__info {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .user-menu__name {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.005em;
  }
  .user-menu__addr {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--text-3);
  }
  .user-menu__disconnect {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-2);
    transition: border-color 160ms ease, color 160ms ease;
    margin-left: 4px;
  }
  .user-menu__disconnect:hover {
    border-color: var(--border-strong);
    color: var(--text);
  }

  /* ===== VIEWS ===== */
  .view {
    display: none;
    position: relative;
    z-index: 1;
    animation: fadeSlide 320ms ease both;
  }
  .view.is-active { display: block; }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ===== PATH A — REGISTRATION ===== */
  .view--register main {
    min-height: calc(100vh - 73px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
  }
  .card {
    width: 100%;
    max-width: 540px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px 40px 32px;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 1) inset,
      0 1px 2px rgba(0, 0, 0, 0.04),
      0 24px 56px rgba(10, 10, 10, 0.08);
  }
  .eyebrow {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-2);
    margin-bottom: 14px;
  }
  .title {
    font-weight: 700;
    font-size: 30px;
    line-height: 1.1;
    letter-spacing: -0.028em;
    color: var(--text);
    margin: 0 0 8px;
  }
  .subtitle {
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--text-2);
    margin: 0 0 28px;
  }

  /* ===== FORM ===== */
  .field {
    display: flex;
    flex-direction: column;
    margin-bottom: 18px;
  }
  .field__label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 6px;
    letter-spacing: -0.005em;
  }
  .field__hint {
    font-size: 12px;
    color: var(--text-3);
    margin-top: 6px;
    line-height: 1.5;
  }
  .input, .select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 14px;
    color: var(--text);
    transition: border-color 160ms ease, background 160ms ease;
    outline: none;
  }
  .input::placeholder { color: var(--text-3); }
  .input:hover, .select:hover { border-color: var(--border-strong); }
  .input:focus, .select:focus { border-color: var(--text); background: #fff; }
  .select-wrap { position: relative; }
  .select-wrap::after {
    content: '';
    position: absolute;
    right: 14px;
    top: 50%;
    width: 8px; height: 8px;
    border-right: 1.5px solid var(--text-2);
    border-bottom: 1.5px solid var(--text-2);
    transform: translateY(-70%) rotate(45deg);
    pointer-events: none;
  }

  /* Checkbox */
  .check-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease;
    text-align: left;
    background: transparent;
  }
  .check-row:hover {
    border-color: var(--border-strong);
    background: rgba(10, 10, 10, 0.015);
  }
  .check-row.is-checked {
    border-color: var(--text);
    background: rgba(10, 10, 10, 0.025);
  }
  .checkbox {
    width: 18px; height: 18px;
    border-radius: 5px;
    border: 1.5px solid rgba(10, 10, 10, 0.3);
    flex-shrink: 0;
    margin-top: 1px;
    display: grid;
    place-items: center;
    transition: border-color 160ms ease, background 160ms ease;
  }
  .check-row.is-checked .checkbox {
    border-color: var(--text);
    background: var(--text);
    color: var(--text-inverse);
  }
  .checkbox svg { opacity: 0; transition: opacity 120ms ease; }
  .check-row.is-checked .checkbox svg { opacity: 1; }
  .check-row__body { flex: 1; min-width: 0; }
  .check-row__label { font-size: 13.5px; font-weight: 600; color: var(--text); margin-bottom: 2px; display: block; }
  .check-row__hint { font-size: 12.5px; color: var(--text-2); line-height: 1.5; display: block; }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 22px;
    border-radius: 12px;
    font-family: inherit;
    font-size: 14.5px;
    font-weight: 600;
    letter-spacing: -0.005em;
    border: 1px solid transparent;
    transition: background 160ms ease, transform 160ms ease, opacity 160ms ease, border-color 160ms ease;
    width: 100%;
  }
  .btn-primary {
    background: var(--text);
    color: var(--text-inverse);
  }
  .btn-primary:hover {
    background: #1f1f22;
    transform: translateY(-1px);
  }
  .btn-primary[disabled] {
    background: rgba(10, 10, 10, 0.18);
    color: rgba(255, 255, 255, 0.85);
    cursor: not-allowed;
    transform: none;
  }

  .security-note {
    margin-top: 20px;
    padding: 12px 14px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .security-note__icon { color: var(--text-2); flex-shrink: 0; margin-top: 2px; }
  .security-note__text { font-size: 12px; color: var(--text-2); line-height: 1.55; }

  /* ===== PATH B — DASHBOARD ===== */
  .view--dashboard .container {
    max-width: 1120px;
    margin: 0 auto;
    padding: 28px 32px 64px;
    position: relative;
    z-index: 1;
  }

  /* Elder notification panel */
  .elder-panel {
    display: flex;
    align-items: center;
    gap: 16px;
    background: var(--text);
    color: var(--text-inverse);
    border-radius: 16px;
    padding: 16px 18px;
    margin-bottom: 24px;
  }
  .elder-panel__icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.10);
    border: 1px solid rgba(255, 255, 255, 0.16);
    display: grid; place-items: center;
    flex-shrink: 0;
  }
  .elder-panel__body { flex: 1; line-height: 1.4; }
  .elder-panel__head {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 2px;
  }
  .elder-panel__msg { font-size: 14px; font-weight: 500; color: var(--text-inverse); }
  .elder-panel__cta {
    background: var(--text-inverse);
    color: var(--text);
    border: 0;
    padding: 9px 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.005em;
    flex-shrink: 0;
    transition: background 160ms ease;
  }
  .elder-panel__cta:hover { background: #e9e9ea; }

  /* Vault status hero */
  .vault-hero {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 28px 32px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 1) inset, 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .stat-card__label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot-live {
    width: 6px; height: 6px;
    border-radius: 999px;
    background: var(--status-green);
    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.20);
  }
  .dot {
    width: 5px; height: 5px;
    border-radius: 999px;
    background: var(--status-green);
  }
  .stat-card__value {
    font-weight: 800;
    color: var(--text);
    line-height: 1;
    letter-spacing: -0.04em;
    font-feature-settings: 'cv11', 'tnum';
  }
  .stat-card__value--xl { font-size: 52px; }
  .stat-card__value--lg { font-size: 48px; }
  .stat-card__sub {
    margin-top: 14px;
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.5;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .stat-trend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--status-green-bg);
    color: var(--status-green);
    font-size: 11.5px;
    font-weight: 600;
  }

  /* Quick actions */
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 32px;
  }
  .action-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 22px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    cursor: pointer;
    text-align: left;
    transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }
  .action-card:hover {
    border-color: var(--text);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(10, 10, 10, 0.06);
  }
  .action-card__icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: var(--text);
    color: var(--text-inverse);
    display: grid; place-items: center;
    flex-shrink: 0;
  }
  .action-card__body { flex: 1; min-width: 0; }
  .action-card__head {
    display: block;
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.005em;
    margin-bottom: 3px;
  }
  .action-card__sub {
    display: block;
    font-size: 12.5px;
    color: var(--text-2);
    line-height: 1.45;
  }
  .action-card__arrow {
    color: var(--text-3);
    transition: transform 160ms ease, color 160ms ease;
  }
  .action-card:hover .action-card__arrow {
    color: var(--text);
    transform: translateX(2px);
  }

  /* Public Record Board */
  .records {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 1) inset, 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .records__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 26px 18px;
    border-bottom: 1px solid var(--border);
    gap: 16px;
  }
  .records__title {
    font-weight: 700;
    font-size: 19px;
    letter-spacing: -0.024em;
    color: var(--text);
    margin: 0;
  }
  .records__sub { font-size: 12px; color: var(--text-2); margin-top: 2px; }
  .records__filters {
    display: inline-flex;
    align-items: center;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px;
    gap: 2px;
  }
  .records__filters button {
    background: transparent;
    border: 0;
    color: var(--text-2);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: 999px;
    transition: background 160ms ease, color 160ms ease;
  }
  .records__filters button.is-active {
    background: var(--text);
    color: var(--text-inverse);
  }

  table.records-table {
    width: 100%;
    border-collapse: collapse;
  }
  .records-table thead th {
    text-align: left;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 14px 26px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
  }
  .records-table tbody td {
    padding: 18px 26px;
    border-bottom: 1px solid var(--border);
    font-size: 13.5px;
    color: var(--text);
    vertical-align: middle;
  }
  .records-table tbody tr:last-child td { border-bottom: 0; }
  .records-table tbody tr:hover { background: var(--surface-2); }

  .cell-date { color: var(--text-2); white-space: nowrap; }
  .type-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .type-badge--treasury { background: var(--text); color: var(--text-inverse); border-color: var(--text); }
  .type-badge--member { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
  .cell-borrower { font-weight: 500; }
  .cell-borrower-flow { color: var(--text-2); font-size: 13px; display: inline-flex; align-items: center; gap: 4px; }
  .cell-amount { font-weight: 600; text-align: right; white-space: nowrap; }
  .cell-receipt { text-align: right; white-space: nowrap; }
  .receipt-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    color: var(--text-2);
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
    background: var(--surface);
  }
  .receipt-link:hover { border-color: var(--text); color: var(--text); background: var(--surface); }

  .app-footer {
    text-align: center;
    margin-top: 40px;
    padding: 24px 0 0;
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.6;
  }

  /* ===== MODALS ===== */
  .loan-modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: none;
    overflow-y: auto;
  }
  .loan-modal.is-open { display: block; }
  .loan-modal__backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 17, 21, 0.45);
    animation: backdropFade 240ms ease;
  }
  @keyframes backdropFade { from { opacity: 0; } to { opacity: 1; } }
  .loan-modal__dialog {
    position: relative;
    width: calc(100% - 32px);
    max-width: 580px;
    margin: 56px auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 22px;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 1) inset, 0 30px 80px rgba(10, 10, 10, 0.18);
    animation: dialogIn 320ms cubic-bezier(.2,.8,.2,1) both;
  }
  @keyframes dialogIn {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .loan-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    gap: 16px;
  }
  .loan-modal__stepper {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--text-2);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .loan-modal__seg-bar { display: flex; gap: 4px; }
  .loan-modal__seg {
    width: 22px; height: 3px;
    border-radius: 999px;
    background: rgba(10, 10, 10, 0.10);
    transition: background 220ms ease;
  }
  .loan-modal__seg.is-active { background: var(--text); }
  .loan-modal__seg.is-done { background: rgba(10, 10, 10, 0.42); }
  .loan-modal__close {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 999px;
    width: 32px; height: 32px;
    display: grid; place-items: center;
    color: var(--text-2);
    transition: border-color 160ms, color 160ms, background 160ms;
  }
  .loan-modal__close:hover {
    border-color: var(--border-strong);
    color: var(--text);
    background: var(--surface-2);
  }

  .loan-modal__body { padding: 28px 32px 24px; }

  .loan-step { display: none; animation: fadeSlide 280ms ease both; }
  .loan-step.is-active { display: block; }
  .loan-step__title {
    font-weight: 700;
    font-size: 24px;
    line-height: 1.18;
    letter-spacing: -0.028em;
    color: var(--text);
    margin: 0 0 6px;
  }
  .loan-step__sub {
    font-size: 13.5px;
    color: var(--text-2);
    line-height: 1.55;
    margin: 0 0 22px;
  }

  /* Amount input */
  .amount-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
    padding: 24px 16px 18px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface-2);
    margin-bottom: 14px;
    transition: border-color 160ms ease;
  }
  .amount-display.is-focused { border-color: var(--text); background: var(--surface); }
  .amount-display__currency {
    font-size: 26px;
    font-weight: 600;
    color: var(--text-3);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .amount-input {
    background: transparent;
    border: 0;
    outline: 0;
    font-family: inherit;
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    color: var(--text);
    width: 240px;
    max-width: 60%;
    text-align: center;
    letter-spacing: -0.04em;
    font-feature-settings: 'cv11', 'tnum';
    -moz-appearance: textfield;
  }
  .amount-input::-webkit-outer-spin-button,
  .amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .amount-input::placeholder { color: var(--text-3); }

  .amount-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-2);
    margin-bottom: 14px;
  }
  .amount-meta__pool { display: inline-flex; align-items: center; gap: 6px; }

  .quick-picks {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 26px;
  }
  .quick-pick {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 9px 0;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-2);
    transition: border-color 160ms, color 160ms, background 160ms;
    cursor: pointer;
  }
  .quick-pick:hover { border-color: var(--border-strong); color: var(--text); }
  .quick-pick.is-selected { background: var(--text); border-color: var(--text); color: var(--text-inverse); }

  /* Section forms */
  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 10px;
    letter-spacing: -0.005em;
  }
  textarea.input { min-height: 70px; resize: vertical; line-height: 1.5; font-family: inherit; }
  textarea.input--purpose { min-height: 110px; }
  .datetime-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
  .datetime-row .field { margin-bottom: 0; }

  /* Term + Frequency */
  .terms-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 18px; }
  .term-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    cursor: pointer;
    transition: border-color 160ms, background 160ms;
  }
  .term-card:hover { border-color: var(--border-strong); }
  .term-card.is-selected { border-color: var(--text); background: rgba(10, 10, 10, 0.025); }
  .term-card__num { font-size: 26px; font-weight: 700; line-height: 1; letter-spacing: -0.032em; color: var(--text); }
  .term-card__unit { font-size: 11.5px; font-weight: 500; color: var(--text-2); letter-spacing: 0.04em; text-transform: uppercase; }

  .freq-segmented {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 3px;
    gap: 2px;
    margin-bottom: 22px;
  }
  .freq-segmented button {
    background: transparent;
    border: 0;
    color: var(--text-2);
    font-size: 13px;
    font-weight: 500;
    padding: 9px 0;
    border-radius: 9px;
    transition: background 160ms, color 160ms;
  }
  .freq-segmented button:hover { color: var(--text); }
  .freq-segmented button.is-active { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(10, 10, 10, 0.06); }

  /* Schedule */
  .schedule { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-bottom: 24px; }
  .schedule__head { font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-3); margin-bottom: 14px; }
  .schedule__main { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px dashed var(--border); }
  .schedule__per { font-size: 28px; font-weight: 700; line-height: 1; letter-spacing: -0.032em; color: var(--text); }
  .schedule__per small { font-size: 12px; color: var(--text-2); font-weight: 500; }
  .schedule__count { font-size: 12.5px; color: var(--text-2); text-align: right; line-height: 1.4; }
  .schedule__count strong { color: var(--text); font-weight: 600; font-size: 13px; }
  .schedule__rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
  .schedule__row { display: flex; justify-content: space-between; font-size: 12.5px; }
  .schedule__row span:first-child { color: var(--text-2); }
  .schedule__row span:last-child { color: var(--text); font-weight: 500; }

  /* Summary List */
  .summary-list { border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 16px; }
  .summary-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 18px; border-bottom: 1px solid var(--border); font-size: 13.5px; gap: 16px; }
  .summary-row:last-child { border-bottom: 0; }
  .summary-row__label { color: var(--text-2); font-weight: 500; flex-shrink: 0; }
  .summary-row__value { color: var(--text); font-weight: 600; text-align: right; word-break: break-word; line-height: 1.45; }
  .summary-row--multiline .summary-row__value { text-align: left; flex: 1; max-width: 65%; }
  .summary-row__value-amount { font-weight: 700; font-size: 19px; line-height: 1; letter-spacing: -0.024em; }

  .approval-note { display: flex; gap: 12px; padding: 14px 16px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 18px; }
  .approval-note__icon { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border-strong); display: grid; place-items: center; flex-shrink: 0; color: var(--text); }
  .approval-note__head { font-size: 12.5px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
  .approval-note__text { font-size: 12px; line-height: 1.5; color: var(--text-2); }

  /* Modal Footer */
  .loan-modal__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; border-top: 1px solid var(--border); background: var(--surface); border-radius: 0 0 22px 22px; }
  .loan-modal__back { background: transparent; border: 1px solid var(--border); border-radius: 999px; padding: 10px 18px 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-2); display: inline-flex; align-items: center; gap: 6px; transition: border-color 160ms, color 160ms; }
  .loan-modal__back:hover:not([disabled]) { border-color: var(--border-strong); color: var(--text); }
  .loan-modal__back[disabled] { opacity: 0.4; cursor: not-allowed; }
  .loan-modal__continue { flex: 1; max-width: 240px; margin-left: auto; }

  /* Success Screen */
  .loan-success { display: none; flex-direction: column; align-items: center; text-align: center; padding: 40px 24px 32px; animation: fadeSlide 320ms ease both; }
  .loan-success.is-active { display: flex; }
  .loan-success__check { width: 64px; height: 64px; border-radius: 999px; background: rgba(22, 163, 74, 0.10); border: 1px solid rgba(22, 163, 74, 0.30); display: grid; place-items: center; color: var(--status-green); margin-bottom: 22px; }
  .loan-success__title { font-size: 24px; font-weight: 700; letter-spacing: -0.028em; line-height: 1.18; color: var(--text); margin-bottom: 6px; }
  .loan-success__sub { font-size: 13.5px; color: var(--text-2); line-height: 1.55; margin-bottom: 18px; max-width: 380px; }
  .loan-success__ref { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); margin-bottom: 26px; }
  .loan-success__ref-label { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-3); }

  /* Peer Search */
  .peer-search { position: relative; margin-bottom: 12px; }
  .peer-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-3); }
  .peer-search input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px 10px 34px; font-size: 13.5px; color: var(--text); outline: none; }
  .peer-search input:focus { border-color: var(--text); }
  
  .peer-list { display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto; padding-right: 4px; margin-bottom: 4px; }
  .peer-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; text-align: left; width: 100%; transition: border-color 160ms, background 160ms; }
  .peer-card:hover { border-color: var(--border-strong); background: rgba(10, 10, 10, 0.015); }
  .peer-card.is-selected { border-color: var(--text); background: rgba(10, 10, 10, 0.025); }
  .peer-card__avatar { width: 36px; height: 36px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); display: grid; place-items: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
  .peer-card.is-selected .peer-card__avatar { background: var(--text); border-color: var(--text); color: var(--text-inverse); }
  .peer-card__body { flex: 1; min-width: 0; }
  .peer-card__name { display: block; font-size: 13.5px; font-weight: 600; color: var(--text); }
  .peer-card__radio { width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid rgba(10, 10, 10, 0.30); flex-shrink: 0; display: grid; place-items: center; }
  .peer-card__radio::after { content: ''; width: 8px; height: 8px; border-radius: 999px; background: var(--text); transform: scale(0); transition: transform 160ms; }
  .peer-card.is-selected .peer-card__radio { border-color: var(--text); }
  .peer-card.is-selected .peer-card__radio::after { transform: scale(1); }
  .peer-empty { text-align: center; padding: 28px 16px; font-size: 13px; color: var(--text-3); border: 1px dashed var(--border-strong); border-radius: 12px; }

  /* Mode Tabs */
  .mode-tabs { display: grid; grid-template-columns: 1fr 1fr; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 4px; gap: 2px; margin-bottom: 22px; }
  .mode-tab { background: transparent; border: 0; color: var(--text-2); font-size: 13.5px; font-weight: 600; padding: 10px 0; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
  .mode-tab:hover { color: var(--text); }
  .mode-tab.is-active { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(10, 10, 10, 0.06); }
  .mode-panel { display: none; }
  .mode-panel.is-active { display: block; animation: fadeSlide 200ms ease both; }
  .peer-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); margin-bottom: 18px; font-size: 12.5px; color: var(--text-2); }
  .peer-chip__avatar { width: 22px; height: 22px; border-radius: 999px; background: var(--text); color: var(--text-inverse); display: grid; place-items: center; font-size: 10px; font-weight: 600; }
  .peer-chip__name { color: var(--text); font-weight: 600; }

  /* Elder Modal */
  .elder-modal__title-block { display: flex; flex-direction: column; }
  .elder-modal__title { font-size: 19px; font-weight: 700; line-height: 1.1; color: var(--text); letter-spacing: -0.024em; }
  .elder-modal__sub { font-size: 12px; color: var(--text-2); margin-top: 2px; }
  .pending-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 8px; }
  .pending-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: border-color 220ms, background 220ms; }
  .pending-card.is-approved { border-color: rgba(22, 163, 74, 0.35); background: rgba(22, 163, 74, 0.025); }
  .pending-card.is-rejected { border-color: rgba(185, 28, 28, 0.30); background: rgba(185, 28, 28, 0.025); }
  .pending-card__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px 20px 8px; }
  .pending-card__requester { display: flex; align-items: center; gap: 12px; }
  .pending-card__avatar { width: 38px; height: 38px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); display: grid; place-items: center; font-size: 12.5px; font-weight: 600; }
  .pending-card__rname { font-size: 14px; font-weight: 600; color: var(--text); }
  .pending-card__rmeta { font-size: 12px; color: var(--text-2); display: flex; align-items: center; gap: 8px; }
  .pending-card__rmeta-divider { width: 2px; height: 2px; border-radius: 999px; background: var(--text-3); }
  .pending-card__amount { text-align: right; flex-shrink: 0; }
  .pending-card__amount-value { font-size: 22px; font-weight: 700; line-height: 1; color: var(--text); letter-spacing: -0.028em; font-feature-settings: 'cv11', 'tnum'; }
  .pending-card__amount-label { font-size: 10.5px; color: var(--text-3); letter-spacing: 0.10em; text-transform: uppercase; margin-top: 4px; font-weight: 500; }
  .pending-card__details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; padding: 4px 20px 14px; }
  .pending-card__detail-label { display: block; font-size: 10.5px; color: var(--text-3); letter-spacing: 0.10em; text-transform: uppercase; font-weight: 600; margin-bottom: 3px; }
  .pending-card__detail-value { display: block; font-size: 13px; color: var(--text); font-weight: 500; }
  
  .pending-card__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid var(--border); }
  .btn-reject, .btn-approve { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border-radius: 10px; font-family: inherit; font-size: 13.5px; font-weight: 600; border: 1px solid transparent; cursor: pointer; }
  .btn-reject { background: var(--surface); color: var(--text-2); border-color: var(--border); }
  .btn-reject:hover { color: #b91c1c; border-color: rgba(185, 28, 28, 0.45); background: rgba(185, 28, 28, 0.03); }
  .btn-approve { background: var(--text); color: var(--text-inverse); }
  .btn-approve:hover { background: #1f1f22; transform: translateY(-1px); }

  .reject-reason { display: none; padding: 0 20px 16px; border-top: 1px dashed var(--border); margin-top: 0; animation: fadeSlide 240ms ease both; }
  .reject-reason__head { font-size: 12.5px; font-weight: 600; color: var(--text); margin: 14px 0 8px; }
  .reject-reason__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .reason-chip { background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 5px 11px; font-size: 11.5px; font-weight: 500; color: var(--text-2); cursor: pointer; transition: border-color 160ms, background 160ms, color 160ms; }
  .reason-chip:hover, .reason-chip:focus { border-color: var(--border-strong); color: var(--text); }
  .reject-reason__input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 13px; outline: none; resize: vertical; min-height: 60px; line-height: 1.5; }
  .reject-reason__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .btn-cancel { background: var(--surface); color: var(--text-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
  .btn-confirm-reject { background: #b91c1c; color: #ffffff; border: 0; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }

  .pending-card__resolution { display: none; padding: 14px 20px 16px; border-top: 1px solid var(--border); align-items: center; gap: 12px; }
  .resolution__icon { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; flex-shrink: 0; }
  .resolution__icon--approved { background: rgba(22, 163, 74, 0.10); border: 1px solid rgba(22, 163, 74, 0.35); color: var(--status-green); }
  .resolution__icon--rejected { background: rgba(185, 28, 28, 0.08); border: 1px solid rgba(185, 28, 28, 0.30); color: #b91c1c; }
  .resolution__head { font-size: 13px; font-weight: 600; color: var(--text); }
  .resolution__sub { font-size: 12px; color: var(--text-2); }

  .elder-empty { display: none; flex-direction: column; align-items: center; text-align: center; padding: 36px 20px 28px; border: 1px dashed var(--border-strong); border-radius: 16px; background: var(--surface); }
  .elder-empty.is-visible { display: flex; }
  .elder-empty__icon { width: 48px; height: 48px; border-radius: 999px; background: rgba(22, 163, 74, 0.10); border: 1px solid rgba(22, 163, 74, 0.30); display: grid; place-items: center; color: var(--status-green); margin-bottom: 14px; }
  .elder-empty__title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .elder-empty__sub { font-size: 13px; color: var(--text-2); line-height: 1.5; }
  .elder-empty__close { margin-top: 18px; background: var(--text); color: var(--text-inverse); border: 0; border-radius: 999px; padding: 10px 22px; font-size: 13px; font-weight: 600; cursor: pointer; }

  /* TX Receipt */
  .tx-status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--status-green-bg); border: 1px solid var(--status-green-border); color: var(--status-green); font-size: 12px; font-weight: 500; margin-bottom: 22px; }
  .tx-amount-block { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 24px; padding-bottom: 22px; border-bottom: 1px solid var(--border); }
  .tx-amount-block__value { font-size: 42px; font-weight: 800; line-height: 1; color: var(--text); letter-spacing: -0.04em; margin-bottom: 10px; }
  .tx-amount-block__type { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-2); letter-spacing: 0.10em; text-transform: uppercase; font-weight: 600; }
  .tx-amount-block__type-dot { width: 4px; height: 4px; border-radius: 999px; background: var(--text-3); }
  .tx-parties { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin-bottom: 22px; padding: 16px 0; border-bottom: 1px solid var(--border); }
  .tx-party { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .tx-party__label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-3); }
  .tx-party__main { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .tx-party__avatar { width: 36px; height: 36px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); display: grid; place-items: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
  .tx-party__avatar--treasury { background: var(--text); color: var(--text-inverse); border-color: var(--text); }
  .tx-party__info { min-width: 0; flex: 1; }
  .tx-party__name { font-size: 13.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tx-party__meta { font-size: 11.5px; color: var(--text-2); margin-top: 2px; }
  .tx-party__addr { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--text-3); margin-top: 3px; }
  .tx-arrow { display: grid; place-items: center; color: var(--text-3); flex-shrink: 0; padding-top: 22px; }
  .tx-details { display: flex; flex-direction: column; gap: 0; margin-bottom: 22px; padding: 4px 18px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; }
  .tx-detail-row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; padding: 11px 0; border-bottom: 1px solid var(--border); gap: 12px; }
  .tx-detail-row:last-child { border-bottom: 0; }
  .tx-detail-row__label { color: var(--text-2); flex-shrink: 0; }
  .tx-detail-row__value { color: var(--text); font-weight: 500; text-align: right; }
  .tx-detail-row__value--mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  .tx-detail-row__value-conf { display: inline-flex; align-items: center; gap: 5px; }
  .tx-hash { margin-bottom: 20px; }
  .tx-hash__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .tx-hash__label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-3); }
  .tx-hash__copy { background: transparent; border: 0; color: var(--text-2); font-size: 11.5px; font-weight: 500; display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 7px; }
  .tx-hash__copy:hover { background: var(--surface-2); color: var(--text); }
  .tx-hash__copy.is-copied { color: var(--status-green); background: var(--status-green-bg); }
  .tx-hash__value { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; word-break: break-all; line-height: 1.55; }
  .tx-cardanoscan { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px 18px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; font-weight: 600; transition: border-color 160ms, transform 160ms; }
  .tx-cardanoscan:hover { border-color: var(--text); background: var(--surface-2); transform: translateY(-1px); }

  /* ===== NETWORK QUEUE ===== */
  .network-queue { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 20px; overflow: hidden; }
  .network-queue__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; gap: 12px; flex-wrap: wrap; }
  .network-queue__title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text); margin: 0; letter-spacing: -0.015em; }
  .network-queue__sub { font-size: 12px; color: var(--text-2); margin-top: 2px; }
  .network-queue__badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 999px; background: rgba(22, 163, 74, 0.08); border: 1px solid rgba(22, 163, 74, 0.20); color: var(--status-green); font-size: 11.5px; font-weight: 600; }
  .network-queue__items { padding: 0 22px 14px; display: flex; flex-direction: column; gap: 0; }
  .nq-item { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--border); }
  .nq-item:last-child { border-bottom: 0; }
  .nq-item__dot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
  .nq-item--queued .nq-item__dot { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
  .nq-item--pending .nq-item__dot { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
  .nq-item--batched .nq-item__dot { background: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); animation: pulse-dot 1.5s ease infinite; }
  .nq-item--done .nq-item__dot { background: var(--status-green); box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15); }
  @keyframes pulse-dot { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
  .nq-item__body { flex: 1; min-width: 0; }
  .nq-item__label { display: block; font-size: 13px; font-weight: 600; color: var(--text); }
  .nq-item__meta { display: block; font-size: 11.5px; color: var(--text-2); margin-top: 1px; }
  .nq-item__status { font-size: 11.5px; font-weight: 600; color: var(--text-3); flex-shrink: 0; padding: 4px 10px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); }
  .nq-item__status--active { color: #3b82f6; background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.25); display: inline-flex; align-items: center; gap: 6px; }
  .nq-item__status--done { color: var(--status-green); background: var(--status-green-bg); border-color: var(--status-green-border); display: inline-flex; align-items: center; gap: 4px; }
  .nq-spinner { width: 10px; height: 10px; border: 2px solid rgba(59, 130, 246, 0.25); border-top-color: #3b82f6; border-radius: 999px; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .network-queue__footer { padding: 10px 22px; background: var(--surface-2); border-top: 1px solid var(--border); font-size: 11px; color: var(--text-3); text-align: center; }

  /* Batch Progress Bar */
  .nq-batch-bar { padding: 0 22px 14px; }
  .nq-batch-bar__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .nq-batch-bar__label { font-size: 11.5px; font-weight: 600; color: var(--text-2); display: inline-flex; align-items: center; gap: 5px; }
  .nq-batch-bar__value { font-size: 11.5px; font-weight: 600; color: var(--text); font-family: 'JetBrains Mono', monospace; }
  .nq-batch-bar__track { width: 100%; height: 6px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden; }
  .nq-batch-bar__fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(22, 163, 74, 0.6), rgba(22, 163, 74, 1)); transition: width 600ms ease; }
  .nq-batch-bar__overflow { margin-top: 6px; font-size: 11px; color: #f59e0b; font-weight: 600; display: flex; align-items: center; gap: 5px; }

  /* Empty State */
  .nq-empty { display: flex; align-items: center; justify-content: center; padding: 28px 22px; }


  @media (max-width: 900px) {
    .topbar { padding: 14px 18px; gap: 12px; flex-wrap: wrap; }
    .vault-hero { grid-template-columns: 1fr; }
    .quick-actions { grid-template-columns: 1fr; }
    .records-table thead { display: none; }
    .records-table tbody td { display: block; padding: 8px 20px; border: 0; }
    .records-table tbody tr { display: block; padding: 18px 0 14px; border-bottom: 1px solid var(--border); }
    .cell-amount, .cell-receipt { text-align: left; }
    .view--dashboard .container { padding: 22px 18px 48px; }
  }

  @media (max-width: 600px) {
    .card { padding: 32px 22px 24px; border-radius: 18px; }
    .user-menu__info { display: none; }
    .elder-panel { flex-wrap: wrap; }
    .elder-panel__cta { width: 100%; }
    .loan-modal__dialog { margin: 16px auto; border-radius: 18px; }
    .loan-modal__body { padding: 22px 20px 18px; }
    .loan-modal__footer { padding: 14px 18px; flex-wrap: wrap; }
    .loan-modal__continue { max-width: none; width: 100%; margin-left: 0; }
    .terms-row { grid-template-columns: 1fr 1fr 1fr; }
    .schedule__rows { grid-template-columns: 1fr; }
    .amount-input { font-size: 40px; width: 200px; }
    .tx-parties { grid-template-columns: 1fr; gap: 16px; }
    .tx-arrow { padding-top: 0; transform: rotate(90deg); }
    .network-queue__head { flex-direction: column; align-items: flex-start; }
  }
`;