'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@meshsdk/react';
import { MeshTxBuilder, BlockfrostProvider, BrowserWallet } from '@meshsdk/core';
import { useRouter } from 'next/navigation';
import { resolveWalletAddress, walletAuthFetch } from '@/lib/walletAuthClient';
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

interface WorkerStatus {
  available: boolean;
  isRunning?: boolean;
  nextRunAt?: string | null;
  lastStatus?: 'starting' | 'running' | 'ok' | 'failed' | string;
  lastRunStartedAt?: string | null;
  lastRunFinishedAt?: string | null;
  intervalMs?: number;
  error?: string;
}

type Frequency = 'weekly' | 'biweekly' | 'monthly';
type PeerMode = 'money' | 'things';
type RecordTab = 'all' | 'loans' | 'members' | 'votes' | 'reconciliation' | 'gas';

const RECORD_TABS: { id: RecordTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'loans', label: 'Loans' },
  { id: 'members', label: 'Members' },
  { id: 'votes', label: 'Votes' },
  { id: 'reconciliation', label: 'Recon' },
  { id: 'gas', label: 'Gas' },
];

type ActivityTab = 'all' | 'peer_loans' | 'treasury_loans' | 'votes' | 'repayments';

const ACTIVITY_TABS: { id: ActivityTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'peer_loans', label: 'P2P Loans' },
  { id: 'treasury_loans', label: 'Treasury Loans' },
  { id: 'votes', label: 'Votes' },
  { id: 'repayments', label: 'Repayments' },
];

interface Neighbor {
  wallet_address: string;
  alias: string;
  barangay: string;
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
  gasBalance: number;
  activeLoanCount: number;
  treasuryLoanCount: number;
  peerLoanCount: number;
}

const POOL_BALANCE = 125000;


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
  const first = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const end = new Date(first.getTime() + ((numPayments - 1) * (30 / ppm) * 24 * 60 * 60 * 1000));

  return { numPayments, perPayment, first, end, total: principal };
};

export default function DashboardTestPage() {
  const { disconnect, connected, wallet } = useWallet();
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [ownerMembers, setOwnerMembers] = useState<{ wallet_address: string; alias: string; role: string }[]>([]);
  const [ownerTarget, setOwnerTarget] = useState('');
  const [ownerRoleBusy, setOwnerRoleBusy] = useState(false);
  const [rowVisibility, setRowVisibility] = useState<Record<string, boolean>>({});
  const [dashboardRecords, setDashboardRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordTab, setRecordTab] = useState<RecordTab>('all');
  const [publicRecordsPage, setPublicRecordsPage] = useState(1);
  const [networkQueuePage, setNetworkQueuePage] = useState(1);
  const [myActivityPage, setMyActivityPage] = useState(1);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [loanStatusBusy, setLoanStatusBusy] = useState<Record<string, boolean>>({});

  const refreshActivities = (addr: string) => {
    setActivitiesLoading(true);
    fetch(`/api/activity?address=${addr}`)
      .then(r => r.json())
      .then(d => { if (d.activities) setActivities(d.activities); })
      .catch(console.error)
      .finally(() => setActivitiesLoading(false));
  };

  useEffect(() => {
    if (address) refreshActivities(address);
  }, [address]);

  const filteredActivities = useMemo(() => {
    if (activityTab === 'all') return activities;
    if (activityTab === 'peer_loans') return activities.filter(a => a.type === 'peer_loan' || a.type === 'peer_loan_lender');
    if (activityTab === 'treasury_loans') return activities.filter(a => a.type === 'treasury_loan');
    if (activityTab === 'votes') return activities.filter(a => a.type === 'treasury_loan_vote');
    if (activityTab === 'repayments') return activities.filter(a => a.type === 'repayment_submitted' || a.type === 'repayment_confirmed');
    return activities;
  }, [activities, activityTab]);

  const myActivityTotalPages = Math.ceil(filteredActivities.length / 10);
  const paginatedActivities = filteredActivities.slice((myActivityPage - 1) * 10, myActivityPage * 10);

  const handlePeerLoanStatusChange = async (loanId: string, newStatus: 'valid' | 'invalid') => {
    if (!address || !wallet) return;
    setLoanStatusBusy(prev => ({ ...prev, [loanId]: true }));
    try {
      const res = await walletAuthFetch(wallet, '/api/loans/peer/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, newStatus, lenderAddress: address }),
      });
      const data = await res.json();
      if (res.ok) {
        refreshActivities(address);
      } else {
        alert(data.error || 'Failed to update loan status.');
      }
    } catch (err) {
      console.error('Failed to update peer loan status:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoanStatusBusy(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const confirmTreasuryRepayment = async (loanId: string, amount: number) => {
    if (!address || !wallet) return;
    setLoanStatusBusy(prev => ({ ...prev, [loanId]: true }));
    try {
      const res = await walletAuthFetch(wallet, '/api/loans/treasury/repayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, amount, method: 'cash', elderAddress: address }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isFullyPaid) {
          alert(`✓ Repayment confirmed. Loan is now fully paid!`);
        } else {
          alert(`✓ Repayment of ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} confirmed. Remaining balance: ₱${data.remainingBalance?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
        }
        refreshActivities(address);
      } else {
        alert(data.error || 'Failed to confirm repayment.');
      }
    } catch (err) {
      console.error('Failed to confirm treasury repayment:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoanStatusBusy(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const manageTreasuryLoanStatus = async (loanId: string, newStatus: 'overdue' | 'defaulted' | 'approved', reason?: string) => {
    if (!address || !wallet) return;
    setLoanStatusBusy(prev => ({ ...prev, [loanId]: true }));
    try {
      const res = await walletAuthFetch(wallet, '/api/loans/treasury/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, newStatus, elderAddress: address, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        refreshActivities(address);
      } else {
        alert(data.error || 'Failed to update loan status.');
      }
    } catch (err) {
      console.error('Failed to manage treasury loan status:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoanStatusBusy(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const filteredDashboardRecords = useMemo(() => {
    if (recordTab === 'all') return dashboardRecords;
    return dashboardRecords.filter(record => record.ledgerCategory === recordTab);
  }, [dashboardRecords, recordTab]);

  const publicRecordsTotalPages = Math.ceil(filteredDashboardRecords.length / 10);
  const paginatedDashboardRecords = filteredDashboardRecords.slice((publicRecordsPage - 1) * 10, publicRecordsPage * 10);

  const toggleRowVisibility = async (record: any) => {
    if (!record.canToggleVisibility || !record.targetType || !record.targetId) return;
    const visibilityKey = record.visibilityKey || record.targetId;

    const previousState = rowVisibility[visibilityKey] ?? record.isPublic;

    setRowVisibility(prev => ({ ...prev, [visibilityKey]: !previousState }));

    try {

      const res = await walletAuthFetch(wallet, '/api/transactions/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: record.targetType, targetId: record.targetId, isPublic: !previousState })
      });

      if (!res.ok) {

        throw new Error('Server rejected visibility change authorization');
      }

      setDashboardRecords(prev => prev.map(item => (
        item.id === record.id ? { ...item, isPublic: !previousState } : item
      )));
    } catch (err) {
      console.warn('Optimistic UI update failed. Rolling back transaction state:', err);
      alert('Authorization failed: Only an elected Elder or Owner can modify ledger visibility.');

      setRowVisibility(prev => ({ ...prev, [visibilityKey]: previousState }));
    }
  };

  useEffect(() => {
    if (connected && wallet) {

      resolveWalletAddress(wallet).then(addr => {
        setAddress(addr);

        fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: addr })
        }).then(r => r.json()).then(d => {
          if (d.member) {
            setMemberData(d.member);
            if (d.member.status === 'pending') {
                router.push('/pending-approval');
              }
          }
        }).catch(console.error);

        fetch(`/api/members/search?exclude=${addr}`)
          .then(r => r.json()).then(d => setNeighbors(d.members || [])).catch(console.error);
      }).catch(console.error);
    }
  }, [connected, wallet]);

  const loadOwnerMembers = async () => {
    if (!wallet || memberData?.role !== 'owner') return;
    try {
      const res = await walletAuthFetch(wallet, '/api/owner/role', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setOwnerMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to load community members', err);
    }
  };

  useEffect(() => {
    if (connected && wallet && memberData?.role === 'owner') {
      loadOwnerMembers();
    }

  }, [connected, wallet, memberData?.role]);

  const handleOwnerRoleChange = async () => {
    const target = ownerMembers.find(m => m.wallet_address === ownerTarget);
    if (!target) return alert('Please select a member.');
    const nextRole = target.role === 'elder' ? 'member' : 'elder';
    setOwnerRoleBusy(true);
    try {
      const res = await walletAuthFetch(wallet, '/api/owner/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAddress: target.wallet_address, role: nextRole }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          nextRole === 'elder'
            ? `${target.alias} is now an Elder.`
            : `${target.alias} is now a Member.`
        );
        setOwnerTarget('');
        loadOwnerMembers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to change role');
    } finally {
      setOwnerRoleBusy(false);
    }
  };

  const [treasuryModal, setTreasuryModal] = useState({ isOpen: false, step: 1 as number | 'success' });
  const [peerModal, setPeerModal] = useState({ isOpen: false, step: 1 as number | 'success' });
  const [elderModalOpen, setElderModalOpen] = useState(false);
  const [treasuryElderModalOpen, setTreasuryElderModalOpen] = useState(false);
  const [pendingMemberModalOpen, setPendingMemberModalOpen] = useState(false);
  const [txModal, setTxModal] = useState<{ isOpen: boolean, txKey: string | null }>({ isOpen: false, txKey: null });
  const [activityDetailModal, setActivityDetailModal] = useState<{ isOpen: boolean, activity: any | null }>({ isOpen: false, activity: null });
  const [isCopied, setIsCopied] = useState(false);

  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    treasuryBalance: 0,
    gasBalance: 0,
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

  const [treasuryElderRequests, setTreasuryElderRequests] = useState<TreasuryElderRequest[]>([]);

  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);

  const [tLoanId, setTLoanId] = useState<string | null>(null);

  const [reconModalOpen, setReconModalOpen] = useState(false);
  const [reconList, setReconList] = useState<any[]>([]);
  const [reconProposing, setReconProposing] = useState(false);
  const [reconBalance, setReconBalance] = useState('');
  const [reconReason, setReconReason] = useState('');

  const [gasModalOpen, setGasModalOpen] = useState(false);
  const [gasList, setGasList] = useState<any[]>([]);
  const [gasProposing, setGasProposing] = useState(false);
  const [gasAmount, setGasAmount] = useState('');
  const [gasReason, setGasReason] = useState('');
  const [gasExecuting, setGasExecuting] = useState(false);
  const [ownerConsoleModalOpen, setOwnerConsoleModalOpen] = useState(false);

  const [tAmount, setTAmount] = useState(0);
  const [tPurpose, setTPurpose] = useState('');
  const [tCollateral, setTCollateral] = useState('');
  const [tTerm, setTTerm] = useState(6);
  const [tFreq, setTFreq] = useState<Frequency>('monthly');
  const [tAccepted, setTAccepted] = useState(false);

  const [pQuery, setPQuery] = useState('');
  const [pNeighborId, setPNeighborId] = useState<string | null>(null);
  const [pMode, setPMode] = useState<PeerMode>('money');
  const [pAmount, setPAmount] = useState(0);
  const [pThingName, setPThingName] = useState('');
  const [pDate, setPDate] = useState('');
  const [pTime, setPTime] = useState('');
  const [pPurpose, setPPurpose] = useState('');
  const [pAccepted, setPAccepted] = useState(false);

  const [elderRequests, setElderRequests] = useState<ElderRequest[]>([]);

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [batchStats, setBatchStats] = useState<BatchStats>({
    queuedCount: 0, totalBytes: 0, maxBytes: 16384, percentFull: 0, batchCount: 1, willOverflow: false,
  });
  const [queueLoading, setQueueLoading] = useState(true);

  const groupedQueue = useMemo(() => {
    if (!queueItems.length) return [];
    const groups = new Map<string, { status: string, type: string, count: number, bytes: number, label: string }>();

    queueItems.forEach(item => {
      const key = `${item.status}-${item.record_type}`;
      if (!groups.has(key)) {
        const typeLabel = item.record_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        groups.set(key, {
          status: item.status,
          type: item.record_type,
          count: 0,
          bytes: 0,
          label: typeLabel
        });
      }
      const g = groups.get(key)!;
      g.count += 1;
      g.bytes += (item.estimated_bytes || 0);
    });

    return Array.from(groups.values());
  }, [queueItems]);

  const networkQueueTotalPages = Math.ceil(groupedQueue.length / 10);
  const paginatedQueue = groupedQueue.slice((networkQueuePage - 1) * 10, networkQueuePage * 10);

  const [nextBatchIn, setNextBatchIn] = useState(0);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextBatchIn(() => {
        if (!workerStatus?.nextRunAt || workerStatus.isRunning) return 0;
        const nextRun = new Date(workerStatus.nextRunAt).getTime();
        if (Number.isNaN(nextRun)) return 0;
        return Math.max(0, Math.ceil((nextRun - Date.now()) / 1000));
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [workerStatus?.nextRunAt, workerStatus?.isRunning]);

  const fetchWorkerStatus = async () => {
    try {
      const res = await fetch('/api/workers/status', { cache: 'no-store' });
      const data = await res.json();
      setWorkerStatus(data);
      if (data.nextRunAt && !data.isRunning) {
        const nextRun = new Date(data.nextRunAt).getTime();
        setNextBatchIn(Number.isNaN(nextRun) ? 0 : Math.max(0, Math.ceil((nextRun - Date.now()) / 1000)));
      } else {
        setNextBatchIn(0);
      }
    } catch (err) {
      console.error('Failed to fetch worker status:', err);
      setWorkerStatus({ available: false, error: 'Worker status unavailable' });
      setNextBatchIn(0);
    }
  };

  useEffect(() => {
    fetchWorkerStatus();
    const interval = setInterval(fetchWorkerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs < 10 ? '0' : ''}${rs}`;
  };

  const workerTimerLabel = () => {
    if (!workerStatus) return 'Checking worker';
    if (workerStatus?.isRunning) return 'Batch running now';
    if (!workerStatus?.available) return 'Worker not running';
    if (!workerStatus.nextRunAt) return 'Worker schedule pending';
    if (nextBatchIn <= 0) return 'Batch due now';
    return `Next batch in ${fmtTime(nextBatchIn)}`;
  };

  const fetchQueue = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/community/queue?address=${address}`);
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

      const interval = setInterval(fetchQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetch(`/api/community/stats?address=${address}`)
        .then(r => r.json())
        .then(d => {
          if (d.treasuryBalance !== undefined) {
            setCommunityStats({
              treasuryBalance: d.treasuryBalance,
              gasBalance: d.gasBalance,
              activeLoanCount: d.activeLoanCount,
              treasuryLoanCount: d.treasuryLoanCount,
              peerLoanCount: d.peerLoanCount,
            });
          }
        })
        .catch(console.error);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetch(`/api/dashboard/pending-counts?address=${address}`)
        .then(r => r.json())
        .then(d => {
          if (d.counts) setPendingCounts(d.counts);
        })
        .catch(console.error);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetch(`/api/dashboard/records?address=${address}`)
        .then(r => r.json())
        .then(d => {
          if (d.records) {
            setDashboardRecords(d.records);
            const visibilityMap: Record<string, boolean> = {};
            d.records.forEach((r: any) => {
              visibilityMap[r.visibilityKey || r.id] = r.isPublic;
            });
            setRowVisibility(visibilityMap);
          }
        })
        .catch(console.error)
        .finally(() => setRecordsLoading(false));
    }
  }, [address]);

  const selectedNeighbor = neighbors.find(n => n.wallet_address === pNeighborId);
  const filteredNeighbors = neighbors.filter(n => (n.alias || '').toLowerCase().includes(pQuery.toLowerCase()));

  const submitTreasuryLoan = async () => {
    if (!address) return;
    try {
      const res = await walletAuthFetch(wallet, '/api/loans/treasury/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

        fetch(`/api/community/stats?address=${address}`)
          .then(r => r.json()).then(d => { if (d.treasuryBalance !== undefined) setCommunityStats(d); }).catch(console.error);
      } else {
        console.error('Failed to submit treasury loan:', data.error);
        alert(data.error || 'Failed to submit treasury loan request.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitPeerLoan = async () => {
    if (!address || !pNeighborId) return;
    try {
      const res = await walletAuthFetch(wallet, '/api/loans/peer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const respondToLoan = async (loanId: string, action: 'approved' | 'rejected', reason?: string) => {
    try {
      const res = await walletAuthFetch(wallet, '/api/loans/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, action, reason, lenderAddress: address })
      });
      if (res.ok) {
        setElderRequests(elderRequests.map(r => r.loan_id === loanId ? { ...r, status: action } : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openTreasuryModal = () => {
    setTAmount(0);
    setTPurpose('');
    setTCollateral('');
    setTTerm(6);
    setTFreq('monthly');
    setTAccepted(false);
    setTreasuryModal({ isOpen: true, step: 1 });
  };

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

  const openElderModal = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/loans/requests?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setElderRequests((data.requests || []).map((r: any) => ({ ...r, status: 'pending' })));
      }
    } catch (err) {
      console.error(err);
    }
    setElderModalOpen(true);
  };

  const openTreasuryElderModal = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/loans/treasury/pending?address=${address}`);
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

  const openPendingMemberModal = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/members/pending?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setPendingMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    }
    setPendingMemberModalOpen(true);
  };

  const voteOnTreasuryLoan = async (loanId: string, vote: 'approve' | 'reject', reason?: string) => {
    if (!address) return;
    try {
      const res = await walletAuthFetch(wallet, '/api/loans/treasury/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, elderAddress: address, vote })
      });
      const data = await res.json();
      if (res.ok) {
        setTreasuryElderRequests(prev => prev.map(r => {
          if (r.loan_id !== loanId) return r;
          const newApprove = typeof data.approveCount === 'number'
            ? data.approveCount
            : vote === 'approve' && !data.alreadyVoted
              ? r.approve_count + 1
              : r.approve_count;
          const newReject = typeof data.rejectCount === 'number'
            ? data.rejectCount
            : vote === 'reject' && !data.alreadyVoted
              ? r.reject_count + 1
              : r.reject_count;
          const newStatus = data.rejected ? 'rejected' : data.approved ? 'approved' : 'pending';
          return { ...r, my_vote: vote, approve_count: newApprove, reject_count: newReject, status: newStatus, rejectionReason: reason };
        }));
      } else {
        alert(data.error || 'Failed to cast vote.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const respondToMember = async (memberAddress: string, action: 'approved' | 'rejected') => {
    if (!address) return;
    try {
      const res = await walletAuthFetch(wallet, '/api/members/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elderAddress: address, memberAddress, action })
      });
      if (res.ok) {
        if (action === 'approved') {
          setPendingMembers(prev => prev.filter(m => m.wallet_address !== memberAddress));
        } else {
          setPendingMembers(prev => prev.map(m => m.wallet_address === memberAddress ? { ...m, status: 'rejected' } : m));
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update member.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const canManageRecordVisibility = memberData?.role === 'elder' || memberData?.role === 'owner';

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
            <button className="user-menu__disconnect" type="button" onClick={() => { disconnect(); localStorage.removeItem('mesh-wallet-persist'); localStorage.setItem('agartha-signed-out', '1'); router.push('/');  }}>Disconnect</button>
          </div>
        </div>
      </header>

      <section className="view view--dashboard is-active">
        <div className="container">

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
                    const res = await fetch(`/api/treasury/reconciliation/pending?address=${address}`);
                    if (res.ok) {
                      const data = await res.json();
                      setReconList(data.reconciliations || []);
                    }
                  } catch (err) { console.error(err); }
                  setReconModalOpen(true);
                }}>Review Now</button>
              </div>

              <div className="elder-panel" style={{ marginBottom: '12px', background: 'var(--text-2)' }}>
                <span className="elder-panel__icon" aria-hidden="true"><Database size={16} /></span>
                <div className="elder-panel__body">
                  <div className="elder-panel__head">Gas Tank & Sync Network</div>
                  <div className="elder-panel__msg">
                    Current balance: <strong>{communityStats.gasBalance} ADA</strong>. Propose top-ups to keep the background worker syncing.
                  </div>
                </div>
                <button className="elder-panel__cta" onClick={async () => {
                  if (!address) return;
                  try {
                    const res = await fetch(`/api/treasury/gas/pending?address=${address}`);
                    if (res.ok) {
                      const data = await res.json();
                      setGasList(data.proposals || []);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                  setGasModalOpen(true);
                }}>Manage Gas</button>
              </div>
            </>
          )}

          {memberData?.role === 'owner' && (
            <div className="elder-panel">
              <span className="elder-panel__icon" aria-hidden="true" style={{ color: '#dc2626', background: '#fee2e2' }}><Shield size={16} /></span>
              <div className="elder-panel__body">
                <div className="elder-panel__head">Owner Management Console</div>
                <div className="elder-panel__msg">Promote members to Elders or manage leadership roles within your community.</div>
              </div>
              <button className="elder-panel__cta" onClick={() => setOwnerConsoleModalOpen(true)}>Manage Roles</button>
            </div>
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

          <div className="network-queue">
            <div className="network-queue__head">
              <div>
                <h3 className="network-queue__title"><Layers size={16} /> Network Queue</h3>
                <div className="network-queue__sub">Pending receipts waiting to be batched and etched on-chain</div>
              </div>
              <span className="network-queue__badge"><Clock size={11} /> {workerTimerLabel()}</span>
            </div>

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
              ) : groupedQueue.length === 0 ? (
                <div className="nq-empty">
                  <Check size={16} style={{ color: 'var(--status-green)' }} />
                  <span style={{ marginLeft: 8, color: 'var(--text-2)', fontSize: 13 }}>All receipts have been etched — queue is clear</span>
                </div>
              ) : (
                paginatedQueue.map((group, idx) => (
                  <div key={idx} className={`nq-item nq-item--${group.status === 'batched' ? 'batched' : group.status === 'etched' ? 'done' : 'queued'}`}>
                    <div className="nq-item__dot" />
                    <div className="nq-item__body">
                      <span className="nq-item__label">{group.count} {group.label}{group.count !== 1 ? 's' : ''}</span>
                      <span className="nq-item__meta">
                        {group.bytes} bytes total\n                        {group.status === 'queued' ? ' · Awaiting batch' : ''}
                      </span>
                    </div>
                    {group.status === 'queued' && <span className="nq-item__status">Queued</span>}
                    {group.status === 'batched' && (
                      <span className="nq-item__status nq-item__status--active">
                        <span className="nq-spinner" /> Etching
                      </span>
                    )}
                    {group.status === 'etched' && (
                      <span className="nq-item__status nq-item__status--done">
                        <Check size={12} /> Etched
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {networkQueueTotalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-2 bg-white border-t border-gray-100" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-xs text-gray-500">
                  Showing {(networkQueuePage - 1) * 10 + 1} to {Math.min(networkQueuePage * 10, groupedQueue.length)} of {groupedQueue.length}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={networkQueuePage === 1}
                    onClick={() => setNetworkQueuePage(p => Math.max(1, p - 1))}
                    className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    disabled={networkQueuePage === networkQueueTotalPages}
                    onClick={() => setNetworkQueuePage(p => Math.min(networkQueueTotalPages, p + 1))}
                    className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

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

          <div className="records" style={{ marginBottom: '24px' }}>
            <div className="records__head">
              <div>
                <h2 className="records__title">My Activity</h2>
                <div className="records__sub">Your loan requests and governance actions</div>
              </div>
              <div className="records__filters" role="tablist" aria-label="Activity filters">
                {ACTIVITY_TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activityTab === tab.id}
                    className={activityTab === tab.id ? 'is-active' : ''}
                    onClick={() => {
                      setActivityTab(tab.id);
                      setMyActivityPage(1);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <table className="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center', width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activitiesLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <Activity className="animate-spin" style={{ color: 'var(--text-3)', margin: '0 auto' }} size={24} />
                    </td>
                  </tr>
                ) : filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
                      {activityTab === 'all' ? 'No activity yet.' : `No ${ACTIVITY_TABS.find(t => t.id === activityTab)?.label.toLowerCase()} activity yet.`}
                    </td>
                  </tr>
                ) : (
                  paginatedActivities.map(act => {

                    const isActionablePeerLoan =
                      act.isLender &&
                      act.loanType === 'peer' &&
                      ['approved', 'active', 'invalid'].includes(act.status);

                    const isElderManageable =
                      act.type === 'treasury_loan_manage' &&
                      act.isElderManaged &&
                      ['approved', 'active', 'overdue'].includes(act.status);

                    const isBusy = loanStatusBusy[act.loanId];

                    const amountCell = act.loanType === 'treasury' && act.remainingBalance !== undefined ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>
                          ₱ {Number(act.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </div>
                        {act.status !== 'pending' && act.status !== 'rejected' && (
                          <div style={{ fontSize: '11px', color: act.remainingBalance === 0 ? '#10b981' : 'var(--text-3)' }}>
                            {act.remainingBalance === 0 ? '✓ Fully paid' : `₱ ${Number(act.remainingBalance).toLocaleString('en-PH', { minimumFractionDigits: 2 })} left`}
                          </div>
                        )}
                      </div>
                    ) : act.mode === 'things' ? (
                      <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>Item loan</span>
                    ) : act.amount ? (
                      `₱ ${Number(act.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                    ) : '—';

                    return (
                      <tr
                        key={act.id}
                        onClick={() => setActivityDetailModal({ isOpen: true, activity: act })}
                        style={{ cursor: 'pointer' }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="cell-date">
                          {new Date(act.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{act.title}</span>
                          {act.collateral && (
                            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                              Collateral: {act.collateral}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-2)', fontSize: '13px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {act.mode === 'things' && act.itemName ? `Item: ${act.itemName}` : act.description}
                        </td>
                        <td className="cell-amount">
                          {amountCell}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                            act.statusBadge === 'Pending review' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                            act.statusBadge === 'Approved' || act.statusBadge === 'Active' || act.statusBadge === 'Fully paid' ? 'bg-green-50 border border-green-200 text-green-700' :
                            act.statusBadge === 'Overdue' ? 'bg-orange-50 border border-orange-300 text-orange-700' :
                            act.statusBadge === 'Rejected' || act.statusBadge === 'Defaulted' ? 'bg-red-50 border border-red-200 text-red-700' :
                            act.status === 'valid' ? 'bg-emerald-50 border border-emerald-300 text-emerald-700' :
                            act.status === 'invalid' ? 'bg-red-50 border border-red-200 text-red-700' :
                            act.status === 'fully_paid' ? 'bg-green-50 border border-green-200 text-green-700' :
                            'bg-gray-100 border border-gray-200 text-gray-600'
                          }`}>
                            {act.status === 'valid' ? '✓ Valid' :
                             act.status === 'invalid' ? '✗ Invalid' :
                             act.status === 'fully_paid' ? 'Fully Paid' :
                             act.statusBadge}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>

                          {isActionablePeerLoan ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {act.status !== 'valid' && (
                                <button
                                  id={`mark-valid-${act.loanId}`}
                                  disabled={isBusy}
                                  onClick={(e) => { e.stopPropagation(); handlePeerLoanStatusChange(act.loanId, 'valid'); }}
                                  style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid #10b981', background: isBusy ? '#d1fae5' : '#ecfdf5', color: '#065f46', cursor: isBusy ? 'not-allowed' : 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                                  title="Mark as Valid — confirm debt/item was returned"
                                >
                                  {isBusy ? '…' : '✓ Valid'}
                                </button>
                              )}
                              {act.status !== 'invalid' && (
                                <button
                                  id={`mark-invalid-${act.loanId}`}
                                  disabled={isBusy}
                                  onClick={(e) => { e.stopPropagation(); handlePeerLoanStatusChange(act.loanId, 'invalid'); }}
                                  style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: '1px solid #f87171', background: isBusy ? '#fee2e2' : '#fff5f5', color: '#991b1b', cursor: isBusy ? 'not-allowed' : 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                                  title="Mark as Invalid — borrower has defaulted"
                                >
                                  {isBusy ? '…' : '✗ Invalid'}
                                </button>
                              )}
                            </div>
                          ) : isElderManageable ? (

                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>

                              <button
                                id={`confirm-payment-${act.loanId}`}
                                disabled={isBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const input = window.prompt(`Confirm repayment for ${act.borrowerAlias || 'borrower'}\nRemaining balance: ₱${Number(act.remainingBalance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}\n\nEnter payment amount (PHP):`);
                                  if (!input) return;
                                  const amount = parseFloat(input.replace(/,/g, ''));
                                  if (isNaN(amount) || amount <= 0) { alert('Invalid amount.'); return; }
                                  confirmTreasuryRepayment(act.loanId, amount);
                                }}
                                style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: '1px solid #10b981', background: isBusy ? '#d1fae5' : '#ecfdf5', color: '#065f46', cursor: isBusy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                                title="Confirm an off-chain repayment installment"
                              >
                                {isBusy ? '…' : '₱ Payment'}
                              </button>

                              {act.status !== 'overdue' && (
                                <button
                                  id={`mark-overdue-${act.loanId}`}
                                  disabled={isBusy}
                                  onClick={(e) => { e.stopPropagation(); manageTreasuryLoanStatus(act.loanId, 'overdue'); }}
                                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: '1px solid #f59e0b', background: isBusy ? '#fef3c7' : '#fffbeb', color: '#92400e', cursor: isBusy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                                  title="Flag as overdue — missed payment deadline"
                                >
                                  {isBusy ? '…' : '⚠ Overdue'}
                                </button>
                              )}

                              {act.status === 'overdue' && (
                                <button
                                  id={`reinstate-${act.loanId}`}
                                  disabled={isBusy}
                                  onClick={(e) => { e.stopPropagation(); manageTreasuryLoanStatus(act.loanId, 'approved', 'Reinstated — borrower caught up'); }}
                                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: '1px solid #6366f1', background: isBusy ? '#e0e7ff' : '#eef2ff', color: '#3730a3', cursor: isBusy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                                  title="Reinstate — borrower has caught up on payments"
                                >
                                  {isBusy ? '…' : '↩ Reinstate'}
                                </button>
                              )}

                              <button
                                id={`mark-defaulted-${act.loanId}`}
                                disabled={isBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!window.confirm(`Mark this loan as DEFAULTED for ${act.borrowerAlias}?\n\nThis will activate the on-chain collateral record as evidence for enforcement.`)) return;
                                  manageTreasuryLoanStatus(act.loanId, 'defaulted');
                                }}
                                style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: '1px solid #ef4444', background: isBusy ? '#fee2e2' : '#fef2f2', color: '#991b1b', cursor: isBusy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                                title="Mark as defaulted — triggers on-chain collateral record"
                              >
                                {isBusy ? '…' : '✗ Default'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {myActivityTotalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <span className="text-xs text-gray-500">
                  Showing {(myActivityPage - 1) * 10 + 1} to {Math.min(myActivityPage * 10, filteredActivities.length)} of {filteredActivities.length} activities
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={myActivityPage === 1}
                    onClick={() => setMyActivityPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={myActivityPage === myActivityTotalPages}
                    onClick={() => setMyActivityPage(p => Math.min(myActivityTotalPages, p + 1))}
                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="records">
            <div className="records__head">
              <div>
                <h2 className="records__title">Public Record Board</h2>
                <div className="records__sub">All transactions verified on Cardano · Updated live</div>
              </div>
              <div className="records__filters" role="tablist" aria-label="Public record filters">
                {RECORD_TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={recordTab === tab.id}
                    className={recordTab === tab.id ? 'is-active' : ''}
                    onClick={() => {
                      setRecordTab(tab.id);
                      setPublicRecordsPage(1);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <table className="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Parties</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Receipt</th>
                  {canManageRecordVisibility && (
                    <th style={{ textAlign: 'center', width: '100px' }}>Privacy</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {recordsLoading ? (
                  <tr>
                    <td colSpan={canManageRecordVisibility ? 6 : 5} style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <Activity className="animate-spin" style={{ color: 'var(--text-3)', margin: '0 auto' }} size={24} />
                    </td>
                  </tr>
                ) : filteredDashboardRecords.length === 0 ? (
                  <tr>
                    <td colSpan={canManageRecordVisibility ? 6 : 5} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
                      {recordTab === 'all' ? 'No public records found.' : `No ${RECORD_TABS.find(tab => tab.id === recordTab)?.label.toLowerCase()} records found.`}
                    </td>
                  </tr>
                ) : (
                  paginatedDashboardRecords.map(record => {
                    const visibilityKey = record.visibilityKey || record.id;
                    const isPublicRecord = rowVisibility[visibilityKey] ?? record.isPublic;

                    return (
                    <tr key={record.id}>
                      <td className="cell-date">
                        {record.shortDate}
                      </td>
                      <td>
                        <span className={`type-badge type-badge--${record.type}`}>
                          {record.type === 'treasury' ? <Landmark size={11} /> : <Users size={11} />} {record.ledgerLabel || record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                        </span>
                      </td>
                      <td className="cell-borrower">
                        {record.type === 'treasury' ? (
                          record.toName
                        ) : (
                          <span className="cell-borrower-flow">{record.fromName} <ArrowRight size={12} /> {record.toName}</span>
                        )}
                      </td>
                      <td className="cell-amount">₱ {record.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="cell-receipt">
                        <button className="receipt-link" onClick={() => setTxModal({ isOpen: true, txKey: record.id })}>
                          {record.displayHash} <ChevronRight size={11} />
                        </button>
                      </td>
                      {canManageRecordVisibility && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleRowVisibility(record)}
                            disabled={!record.canToggleVisibility}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                              isPublicRecord
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-gray-100 border border-gray-200 text-gray-400'
                            } ${record.canToggleVisibility ? '' : 'cursor-default opacity-80'}`}
                          >
                            {record.canToggleVisibility ? (isPublicRecord ? 'Public' : 'Private') : 'Public'}
                          </button>
                        </td>
                      )}
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {publicRecordsTotalPages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <span className="text-xs text-gray-500">
                  Showing {(publicRecordsPage - 1) * 10 + 1} to {Math.min(publicRecordsPage * 10, filteredDashboardRecords.length)} of {filteredDashboardRecords.length} records
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={publicRecordsPage === 1}
                    onClick={() => setPublicRecordsPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={publicRecordsPage === publicRecordsTotalPages}
                    onClick={() => setPublicRecordsPage(p => Math.min(publicRecordsTotalPages, p + 1))}
                    className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="app-footer">
            Agartha Kayak — The Digital Bayanihan Ledger.<br />
            Treasury secured on Cardano.
          </div>
        </div>
      </section>

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

      {ownerConsoleModalOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => setOwnerConsoleModalOpen(false)}></div>
          <div className="loan-modal__dialog">
            <header className="loan-modal__header">
              <div className="elder-modal__title-block">
                <span className="elder-modal__title">Owner Management Console</span>
                <span className="elder-modal__sub">Change Member Roles</span>
              </div>
              <button className="loan-modal__close" onClick={() => setOwnerConsoleModalOpen(false)}><X size={14} /></button>
            </header>

            <div className="loan-modal__body" style={{ padding: '24px' }}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Select Member
              </label>
              <p className="text-xs text-gray-500 mb-4">
                Promote a member to Elder, or demote an Elder back to Member. Limited to your community.
              </p>

              <div className="flex flex-col gap-4">
                <select
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-900 appearance-none"
                  value={ownerTarget}
                  onChange={e => setOwnerTarget(e.target.value)}
                >
                  <option value="">Select a member...</option>
                  {ownerMembers.map(m => (
                    <option key={m.wallet_address} value={m.wallet_address}>
                      {m.alias} — {m.role === 'elder' ? 'Elder' : 'Member'}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    handleOwnerRoleChange();
                    setOwnerConsoleModalOpen(false);
                  }}
                  disabled={ownerRoleBusy || !ownerTarget}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {ownerRoleBusy
                    ? 'Working…'
                    : ownerMembers.find(m => m.wallet_address === ownerTarget)?.role === 'elder'
                      ? 'Demote to Member'
                      : 'Promote to Elder'}
                </button>

                {ownerMembers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2 text-center">No members or elders in your community yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

                        <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
                            <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px' }} />
                            Signatures: <strong style={{ color: 'var(--text)' }}>{req.approve_count} of 2</strong> required
                          </span>
                          {alreadyVoted && req.status === 'pending' && (
                            <span style={{ color: req.my_vote === 'approve' ? 'var(--status-green)' : '#b91c1c', fontWeight: 600 }}>
                              {req.my_vote === 'approve' ? '✓ You approved' : '✗ You rejected'}
                            </span>
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
                {pendingMembers
                  .filter((m: any) => (m.status || 'pending') === 'pending')
                  .map((member: any) => (
                    <div key={member.wallet_address} className="pending-card" style={{ marginBottom: '12px' }}>
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
                        <div><span className="pending-card__detail-label">Gov ID #</span><span className="pending-card__detail-value" style={{ fontFamily: 'monospace' }}>{'Verified via Form'}</span></div>
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

              {pendingMembers.filter((m: any) => (m.status || 'pending') === 'pending').length === 0 && (
                <div className="elder-empty is-visible">
                  <div className="elder-empty__icon">
                    <Check size={22} strokeWidth={2.5} />
                  </div>
                  <div className="elder-empty__title">
                    All Caught Up
                  </div>
                  <div className="elder-empty__sub">
                    There are no pending registrations for your community right now.
                  </div>
                  <button className="elder-empty__close" onClick={() => setPendingMemberModalOpen(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {txModal.isOpen && txModal.txKey && (() => {
        const txRecord = dashboardRecords.find(r => r.id === txModal.txKey);
        if (!txRecord) return null;

        const status = (txRecord.status || 'queued').toLowerCase();
        const isEtched = status === 'etched' && Boolean(txRecord.txHash);
        const isFailed = status === 'failed';
        const hasAmount = Number(txRecord.amount) > 0;
        const amountLabel = hasAmount
          ? `${txRecord.currency === 'ADA' ? 'ADA' : 'PHP'} ${Number(txRecord.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : 'No amount';
        const categoryLabel = RECORD_TABS.find(tab => tab.id === txRecord.ledgerCategory)?.label || 'Ledger';
        const statusLabel = status === 'batched'
          ? 'Batched'
          : status === 'etched'
            ? 'Etched'
            : status === 'failed'
              ? 'Failed'
              : 'Queued';
        const lifecycleMessage = status === 'batched'
          ? 'Included in batch, etching in progress'
          : status === 'etched'
            ? 'Etched on Cardano'
            : status === 'failed'
              ? 'Queue item failed, audit IDs retained'
              : 'Waiting for next blockchain batch';
        const proofValue = isEtched ? txRecord.txHash : txRecord.queueId;
        const proofLabel = isEtched ? 'Transaction hash' : 'Queue ID';
        const statusClass = `tx-status tx-status--${isFailed ? 'failed' : status === 'etched' ? 'etched' : status === 'batched' ? 'batched' : 'queued'}`;
        const copyValue = proofValue || txRecord.queueId || txRecord.id;
        const shortId = (value: string | null | undefined) => {
          if (!value) return 'Not available';
          return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
        };

        const handleCopy = () => {
          navigator.clipboard.writeText(copyValue).then(() => {
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
                  <div className="elder-modal__title">Ledger Receipt</div>
                  <div className="elder-modal__sub">Community action recorded for blockchain etching</div>
                </div>
                <button className="loan-modal__close" onClick={() => setTxModal({ isOpen: false, txKey: null })}><X size={14} /></button>
              </header>
              <div className="loan-modal__body">
                <span className={statusClass}>
                  <ShieldCheck size={12} strokeWidth={2.5} />
                  {statusLabel} - {lifecycleMessage}
                </span>

                <div className="tx-amount-block">
                  <div className={`tx-amount-block__value ${hasAmount ? '' : 'tx-amount-block__value--none'}`}>{amountLabel}</div>
                  <div className="tx-amount-block__type">
                    <span>{txRecord.ledgerLabel || txRecord.recordType}</span>
                    <span className="tx-amount-block__type-dot"></span>
                    <span>{txRecord.purpose}</span>
                  </div>
                </div>

                <div className="tx-parties">
                  <div className="tx-party">
                    <span className="tx-party__label">Actor</span>
                    <div className="tx-party__main">
                      {txRecord.type === 'treasury' ? (
                        <span className="tx-party__avatar tx-party__avatar--treasury"><Landmark size={14} /></span>
                      ) : (
                        <span className="tx-party__avatar">{initialsOf(txRecord.fromName)}</span>
                      )}
                      <div className="tx-party__info">
                        <div className="tx-party__name">{txRecord.fromName}</div>
                        <div className="tx-party__meta">{categoryLabel} action source</div>
                        <div className="tx-party__addr">{shortId(txRecord.referenceId)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="tx-arrow"><ArrowRight size={16} /></div>
                  <div className="tx-party">
                    <span className="tx-party__label">Subject</span>
                    <div className="tx-party__main">
                      <span className="tx-party__avatar">{initialsOf(txRecord.toName)}</span>
                      <div className="tx-party__info">
                        <div className="tx-party__name">{txRecord.toName}</div>
                        <div className="tx-party__meta">{txRecord.ledgerLabel || 'Ledger record'}</div>
                        <div className="tx-party__addr">{shortId(txRecord.queueId)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row tx-detail-row--section">
                    <span className="tx-detail-row__label">Audit details</span>
                    <span className="tx-detail-row__value">{txRecord.coop}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Action date</span>
                    <span className="tx-detail-row__value">{txRecord.timestampStr}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Ledger category</span>
                    <span className="tx-detail-row__value">{categoryLabel}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Record type</span>
                    <span className="tx-detail-row__value tx-detail-row__value--mono">{txRecord.recordType}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Queue status</span>
                    <span className="tx-detail-row__value">{statusLabel}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Reference ID</span>
                    <span className="tx-detail-row__value tx-detail-row__value--mono">{shortId(txRecord.referenceId)}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Queue ID</span>
                    <span className="tx-detail-row__value tx-detail-row__value--mono">{shortId(txRecord.queueId)}</span>
                  </div>
                </div>

                <div className="tx-details">
                  <div className="tx-detail-row tx-detail-row--section">
                    <span className="tx-detail-row__label">Blockchain proof</span>
                    <span className="tx-detail-row__value">{lifecycleMessage}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Batch</span>
                    <span className="tx-detail-row__value tx-detail-row__value--mono">{shortId(txRecord.batchId)}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Block</span>
                    <span className="tx-detail-row__value tx-detail-row__value--mono">{isEtched ? `#${txRecord.blockNumber || 'Pending'}` : 'Available after etching'}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Network fee</span>
                    <span className="tx-detail-row__value">Calculated after etching</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Confirmations</span>
                    <span className="tx-detail-row__value">
                      <span className="tx-detail-row__value-conf">
                        <span className="dot"></span>
                        {isEtched ? 'Etched transaction available' : 'Awaiting Cardano transaction'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="tx-hash">
                  <div className="tx-hash__head">
                    <span className="tx-hash__label">{proofLabel}</span>
                    <button className={`tx-hash__copy ${isCopied ? 'is-copied' : ''}`} onClick={handleCopy}>
                      {isCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div className="tx-hash__value">{proofValue}</div>
                </div>

                {isEtched && (
                  <a className="tx-cardanoscan" href={`https://preprod.cardanoscan.io/transaction/${txRecord.txHash}`} target="_blank" rel="noopener noreferrer">
                    View on Cardanoscan
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {activityDetailModal.isOpen && activityDetailModal.activity && (() => {
        const act = activityDetailModal.activity;
        return (
          <div className="loan-modal is-open">
            <div className="loan-modal__backdrop" onClick={() => setActivityDetailModal({ isOpen: false, activity: null })}></div>
            <div className="loan-modal__dialog">
              <header className="loan-modal__header">
                <div className="elder-modal__title-block">
                  <span className="elder-modal__title">Activity Details</span>
                  <span className="elder-modal__sub">{act.title}</span>
                </div>
                <button className="loan-modal__close" onClick={() => setActivityDetailModal({ isOpen: false, activity: null })}><X size={14} /></button>
              </header>

              <div className="loan-modal__body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: '24px' }}>
                <div className="tx-details">
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Type</span>
                    <span className="tx-detail-row__value" style={{ textTransform: 'capitalize' }}>{act.type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Date</span>
                    <span className="tx-detail-row__value">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="tx-detail-row">
                    <span className="tx-detail-row__label">Status</span>
                    <span className="tx-detail-row__value">{act.statusBadge || act.status}</span>
                  </div>
                  {(act.amount !== undefined && act.amount !== null) && (
                    <div className="tx-detail-row">
                      <span className="tx-detail-row__label">Amount</span>
                      <span className="tx-detail-row__value">₱ {Number(act.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {(act.remainingBalance !== undefined && act.remainingBalance !== null) && (
                    <div className="tx-detail-row">
                      <span className="tx-detail-row__label">Remaining Balance</span>
                      <span className="tx-detail-row__value">₱ {Number(act.remainingBalance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {act.collateral && (
                    <div className="tx-detail-row">
                      <span className="tx-detail-row__label">Collateral</span>
                      <span className="tx-detail-row__value">{act.collateral}</span>
                    </div>
                  )}
                  {(act.itemName || act.description) && (
                    <div className="tx-detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <span className="tx-detail-row__label">{act.mode === 'things' ? 'Item' : 'Purpose / Description'}</span>
                      <span className="tx-detail-row__value" style={{ textAlign: 'left', fontWeight: 500, color: 'var(--text-2)', lineHeight: 1.5 }}>{act.itemName || act.description}</span>
                    </div>
                  )}
                  {act.termMonths && (() => {
                    const freq = act.repaymentFrequency?.toLowerCase() || 'monthly';
                    const freqMultiplier = freq === 'weekly' ? 4 : (freq === 'semi_monthly' || freq === 'bimonthly') ? 2 : 1;
                    const totalPayments = act.termMonths * freqMultiplier;
                    const minPayment = (act.amount || 0) / totalPayments;

                    return (
                      <div className="tx-detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <span className="tx-detail-row__label">Repayment Plan</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="tx-detail-row__value" style={{ textTransform: 'capitalize' }}>
                            {act.termMonths} months / {freq.replace(/_/g, ' ')}
                          </span>
                          {act.amount > 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--status-amber)', fontWeight: 600 }}>
                              Minimum ₱ {minPayment.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per {freq === 'weekly' ? 'week' : freq === 'semi_monthly' ? 'half-month' : 'month'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {act.neededByDate && (
                    <div className="tx-detail-row">
                      <span className="tx-detail-row__label">When needed</span>
                      <span className="tx-detail-row__value">
                        {new Date(act.neededByDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                        {act.neededByTime && ` at ${new Date(`2026-01-01T${act.neededByTime}`).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                  {act.lenderAlias && act.lenderAlias !== memberData?.alias && (
                    <div className="tx-detail-row">
                      <span className="tx-detail-row__label">Lender</span>
                      <span className="tx-detail-row__value">{act.lenderAlias}</span>
                    </div>
                  )}
                  {act.borrowerAlias && act.borrowerAlias !== memberData?.alias && (
                    <div className="tx-detail-row">
                      <span className="tx-detail-row__label">Borrower</span>
                      <span className="tx-detail-row__value">{act.borrowerAlias}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

                  {reconList.map((r: any) => {
                    const mySignature = (r.signatures || []).find((s: any) => s.elder_address === address);
                    const approvalCount = (r.signatures || []).filter((s: any) => s.decision === 'approve').length;
                    const canSign = r.status === 'pending' && r.proposed_by !== address && !mySignature;

                    return (
                      <div key={r.reconciliation_id} className={`pending-card ${r.status === 'approved' ? 'is-approved' : r.status === 'rejected' ? 'is-rejected' : ''}`} style={{ marginBottom: '12px', ...(mySignature && r.status === 'pending' ? { opacity: 0.7 } : {}) }}>
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
                          <div><span className="pending-card__detail-label">Approvals</span><span className="pending-card__detail-value">{approvalCount}</span></div>
                          <div><span className="pending-card__detail-label">Created</span><span className="pending-card__detail-value">{new Date(r.created_at).toLocaleDateString()}</span></div>
                        </div>
                        {mySignature && r.status === 'pending' && (
                          <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', fontSize: '12.5px', color: mySignature.decision === 'approve' ? 'var(--status-green)' : '#b91c1c', fontWeight: 600 }}>
                            {mySignature.decision === 'approve' ? 'You approved this reconciliation' : 'You rejected this reconciliation'}
                          </div>
                        )}
                        {canSign && (
                          <div className="pending-card__actions">
                            <button className="btn-reject" onClick={async () => {
                              const res = await walletAuthFetch(wallet, '/api/treasury/reconciliation/sign', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ elderAddress: address, reconciliationId: r.reconciliation_id, decision: 'reject' })
                              });
                              const data = await res.json();
                              if (res.ok) {
                                setReconList(prev => prev.map(x => x.reconciliation_id === r.reconciliation_id ? {
                                  ...x,
                                  status: data.outcome || 'rejected',
                                  signatures: [...(x.signatures || []).filter((s: any) => s.elder_address !== address), { elder_address: address, decision: 'reject', signed_at: new Date().toISOString() }],
                                } : x));
                                setPendingCounts(prev => ({ ...prev, reconciliations: Math.max(0, prev.reconciliations - 1) }));
                              } else { alert(data.error || 'Failed to sign'); }
                            }}><X size={14} /> Reject</button>
                            <button className="btn-approve" onClick={async () => {
                              const res = await walletAuthFetch(wallet, '/api/treasury/reconciliation/sign', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ elderAddress: address, reconciliationId: r.reconciliation_id, decision: 'approve' })
                              });
                              const data = await res.json();
                              if (res.ok) {
                                setReconList(prev => prev.map(x => x.reconciliation_id === r.reconciliation_id ? {
                                  ...x,
                                  status: data.outcome || 'pending',
                                  signatures: [...(x.signatures || []).filter((s: any) => s.elder_address !== address), { elder_address: address, decision: 'approve', signed_at: new Date().toISOString() }],
                                } : x));
                                setPendingCounts(prev => ({ ...prev, reconciliations: Math.max(0, prev.reconciliations - 1) }));
                                if (data.resolved) {

                                  fetch(`/api/community/stats?address=${address}`)
                                    .then(r => r.json()).then(d => { if (d.treasuryBalance !== undefined) setCommunityStats(d); }).catch(console.error);
                                }
                              } else { alert(data.error || 'Failed to sign'); }
                            }}><Check size={14} /> Approve</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                      const res = await walletAuthFetch(wallet, '/api/treasury/reconciliation/propose', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ elderAddress: address, proposedBalance: Number(reconBalance), reason: reconReason })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setReconProposing(false);
                        setReconBalance('');
                        setReconReason('');

                        const listRes = await fetch(`/api/treasury/reconciliation/pending?address=${address}`);
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

      {gasModalOpen && (
        <div className="loan-modal is-open">
          <div className="loan-modal__backdrop" onClick={() => setGasModalOpen(false)} />
          <div className="loan-modal__dialog">
            <div className="loan-modal__header">
              <div className="loan-modal__stepper" style={{ color: 'var(--text)' }}>
                <Database size={16} /> <strong>Gas Tank & Sync Network</strong>
              </div>
              <button className="loan-modal__close" onClick={() => setGasModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="loan-modal__body">
              {!gasProposing ? (
                <>
                  <button className="btn btn-primary" style={{ width: '100%', marginBottom: '18px' }} onClick={() => setGasProposing(true)}>
                    <Database size={14} /> Propose Gas Top-Up
                  </button>

                  {gasList.length === 0 && (
                    <div className="elder-empty is-visible">
                      <div className="elder-empty__icon"><Check size={22} /></div>
                      <div className="elder-empty__title">Tank is Good</div>
                      <div className="elder-empty__sub">No pending gas top-ups required.</div>
                    </div>
                  )}

                  {gasList.map((g: any) => (
                    <div key={g.id} className={`pending-card ${g.status === 'approved' ? 'is-approved' : g.status === 'executed' ? 'is-executed' : ''}`} style={{ marginBottom: '12px' }}>
                      <div className="pending-card__top">
                        <div className="pending-card__requester">
                          <div>
                            <div className="pending-card__rname">Proposer: {g.proposed_by.slice(0, 8)}...</div>
                            <div className="pending-card__rmeta">
                              <span>{g.reason}</span>
                            </div>
                          </div>
                        </div>
                        <div className="pending-card__amount">
                          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Amount</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{g.amount} tADA</div>
                        </div>
                      </div>
                      <div className="pending-card__details">
                        <div><span className="pending-card__detail-label">Status</span><span className="pending-card__detail-value" style={{ textTransform: 'capitalize' }}>{g.status}</span></div>
                        <div><span className="pending-card__detail-label">Approvals</span><span className="pending-card__detail-value">{g.signature_count} / {g.sigs_required}</span></div>
                        <div><span className="pending-card__detail-label">Created</span><span className="pending-card__detail-value">{new Date(g.created_at).toLocaleDateString()}</span></div>
                      </div>

                      {g.status === 'pending' && !g.has_signed && memberData?.role === 'elder' && g.proposed_by !== address && (
                        <div className="pending-card__actions">
                          <button className="btn-approve" onClick={async () => {
                            const res = await walletAuthFetch(wallet, '/api/treasury/gas/approve', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ proposalId: g.id })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setGasList(prev => prev.map(x => x.id === g.id ? { ...x, status: data.status, signature_count: data.signatures, has_signed: true } : x));
                            } else { alert(data.error || 'Failed to sign'); }
                          }}><Check size={14} /> Approve</button>
                        </div>
                      )}

                      {g.status === 'approved' && memberData?.role === 'owner' && (
                        <div className="pending-card__actions">
                          <button className="btn-primary" disabled={gasExecuting} onClick={async () => {
                            if (gasExecuting) return;
                            setGasExecuting(true);
                            try {
                              const amountAda = Number(g.amount);
                              const amountLovelaceNumber = Math.floor(amountAda * 1000000);
                              const amountLovelace = amountLovelaceNumber.toString();
                              if (!Number.isFinite(amountAda) || amountLovelaceNumber <= 0) {
                                throw new Error("Invalid proposal amount");
                              }

                              const masterAddress = process.env.NEXT_PUBLIC_CARDANO_SUBMITTER_ADDRESS;
                              const blockfrostProjectId = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID;
                              if (!masterAddress) {
                                throw new Error("Missing NEXT_PUBLIC_CARDANO_SUBMITTER_ADDRESS. Add your preprod submitter address to the frontend environment.");
                              }
                              if (!blockfrostProjectId) {
                                throw new Error("Missing NEXT_PUBLIC_BLOCKFROST_PROJECT_ID. Add your preprod Blockfrost project ID to the frontend environment.");
                              }

                              const changeAddress = await resolveWalletAddress(wallet);

                              const provider = new BlockfrostProvider(blockfrostProjectId);
                              const utxos = await provider.fetchAddressUTxOs(changeAddress);
                              if (!utxos || utxos.length === 0) {
                                throw new Error("No UTXOs found for your wallet address. Ensure you have tADA in your Lace wallet.");
                              }

                              const builder = new MeshTxBuilder({ fetcher: provider, submitter: provider });
                              builder.setNetwork('preprod');

                              builder
                                .txOut(masterAddress, [{ unit: "lovelace", quantity: amountLovelace }])
                                .changeAddress(changeAddress)
                                .selectUtxosFrom(utxos);

                              const unsignedTx = await builder.complete();

                              const witnessSet = await wallet.signTx(unsignedTx, false);
                              const signedTx = BrowserWallet.addBrowserWitnesses(unsignedTx, witnessSet);

                              let txHash: string;
                              try {
                                txHash = await provider.submitTx(signedTx);
                              } catch (submitErr: any) {

                                const errMsg = JSON.stringify(submitErr?.data || submitErr?.response?.data || submitErr);
                                if (errMsg.includes('already been included') || errMsg.includes('All inputs are spent')) {

                                  alert('This transaction appears to have already been submitted. Please check your wallet balance on Cardanoscan.');
                                  return;
                                }
                                throw submitErr;
                              }

                              if (!txHash) return;

                              const res = await walletAuthFetch(wallet, '/api/treasury/gas/execute', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ proposalId: g.id, txHash })
                              });

                              const data = await res.json();
                              if (res.ok) {
                                setGasList(prev => prev.map(x => x.id === g.id ? { ...x, status: 'executed' } : x));

                                fetch(`/api/community/stats?address=${address}`)
                                  .then(r => r.json()).then(d => { if (d.treasuryBalance !== undefined) setCommunityStats(d); }).catch(console.error);
                                alert('Gas top-up executed! Transaction submitted to the blockchain. The worker will resume shortly.');
                              } else { alert(data.error || 'Execution failed on server'); }
                            } catch (err: any) {
                              console.error('Lace transaction failed:', err);
                              const errDetail = err?.message || err?.data?.message || JSON.stringify(err?.data || err);
                              alert('Transaction failed or was canceled: ' + errDetail);
                            } finally {
                              setGasExecuting(false);
                            }
                          }}>{gasExecuting ? 'Submitting…' : <><ArrowUpRight size={14} /> Execute & Send tADA</>}</button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <section className="loan-step is-active">
                  <h2 className="loan-step__title">Propose Gas Top-Up</h2>
                  <p className="loan-step__sub">Request to send tADA from the Treasury to the Master Worker Wallet to pay for sync fees.</p>

                  <div className="field" style={{ marginBottom: '14px' }}>
                    <label className="field__label">Amount (tADA)</label>
                    <input className="input" type="number" min="1" step="1" placeholder="e.g. 5" value={gasAmount} onChange={e => setGasAmount(e.target.value)} />
                  </div>

                  <div className="field" style={{ marginBottom: '14px' }}>
                    <label className="field__label">Reason</label>
                    <textarea className="input input--purpose" placeholder="Why are we topping up?" value={gasReason} onChange={e => setGasReason(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-reject" style={{ flex: 1 }} onClick={() => setGasProposing(false)}>
                      Cancel
                    </button>
                    <button className="btn-approve" style={{ flex: 1 }} disabled={!gasAmount || !gasReason.trim()} onClick={async () => {
                      const res = await walletAuthFetch(wallet, '/api/treasury/gas/propose', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: Number(gasAmount), reason: gasReason })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setGasProposing(false);
                        setGasAmount('');
                        setGasReason('');

                        const listRes = await fetch(`/api/treasury/gas/pending?address=${address}`);
                        if (listRes.ok) { const d = await listRes.json(); setGasList(d.proposals || []); }
                      } else { alert(data.error || 'Failed to propose'); }
                    }}>
                      <Database size={14} /> Submit Proposal
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

  .view--dashboard .container {
    max-width: 1120px;
    margin: 0 auto;
    padding: 28px 32px 64px;
    position: relative;
    z-index: 1;
  }

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
    flex-wrap: wrap;
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
    flex-wrap: wrap;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 3px;
    gap: 2px;
    justify-content: flex-end;
  }
  .records__filters button {
    background: transparent;
    border: 0;
    color: var(--text-2);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 10px;
    border-radius: 10px;
    transition: background 160ms ease, color 160ms ease;
    white-space: nowrap;
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

  .loan-modal__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; border-top: 1px solid var(--border); background: var(--surface); border-radius: 0 0 22px 22px; }
  .loan-modal__back { background: transparent; border: 1px solid var(--border); border-radius: 999px; padding: 10px 18px 10px 14px; font-size: 13px; font-weight: 500; color: var(--text-2); display: inline-flex; align-items: center; gap: 6px; transition: border-color 160ms, color 160ms; }
  .loan-modal__back:hover:not([disabled]) { border-color: var(--border-strong); color: var(--text); }
  .loan-modal__back[disabled] { opacity: 0.4; cursor: not-allowed; }
  .loan-modal__continue { flex: 1; max-width: 240px; margin-left: auto; }

  .loan-success { display: none; flex-direction: column; align-items: center; text-align: center; padding: 40px 24px 32px; animation: fadeSlide 320ms ease both; }
  .loan-success.is-active { display: flex; }
  .loan-success__check { width: 64px; height: 64px; border-radius: 999px; background: rgba(22, 163, 74, 0.10); border: 1px solid rgba(22, 163, 74, 0.30); display: grid; place-items: center; color: var(--status-green); margin-bottom: 22px; }
  .loan-success__title { font-size: 24px; font-weight: 700; letter-spacing: -0.028em; line-height: 1.18; color: var(--text); margin-bottom: 6px; }
  .loan-success__sub { font-size: 13.5px; color: var(--text-2); line-height: 1.55; margin-bottom: 18px; max-width: 380px; }
  .loan-success__ref { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); margin-bottom: 26px; }
  .loan-success__ref-label { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-3); }

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

  .mode-tabs { display: grid; grid-template-columns: 1fr 1fr; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 4px; gap: 2px; margin-bottom: 22px; }
  .mode-tab { background: transparent; border: 0; color: var(--text-2); font-size: 13.5px; font-weight: 600; padding: 10px 0; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
  .mode-tab:hover { color: var(--text); }
  .mode-tab.is-active { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(10, 10, 10, 0.06); }
  .mode-panel { display: none; }
  .mode-panel.is-active { display: block; animation: fadeSlide 200ms ease both; }
  .peer-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); margin-bottom: 18px; font-size: 12.5px; color: var(--text-2); }
  .peer-chip__avatar { width: 22px; height: 22px; border-radius: 999px; background: var(--text); color: var(--text-inverse); display: grid; place-items: center; font-size: 10px; font-weight: 600; }
  .peer-chip__name { color: var(--text); font-weight: 600; }

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

  .tx-status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--status-green-bg); border: 1px solid var(--status-green-border); color: var(--status-green); font-size: 12px; font-weight: 500; margin-bottom: 22px; }
  .tx-status--queued { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.24); color: #b45309; }
  .tx-status--batched { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.24); color: #2563eb; }
  .tx-status--etched { background: var(--status-green-bg); border-color: var(--status-green-border); color: var(--status-green); }
  .tx-status--failed { background: rgba(220, 38, 38, 0.08); border-color: rgba(220, 38, 38, 0.22); color: #b91c1c; }
  .tx-amount-block { display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 24px; padding-bottom: 22px; border-bottom: 1px solid var(--border); }
  .tx-amount-block__value { font-size: 42px; font-weight: 800; line-height: 1; color: var(--text); letter-spacing: -0.04em; margin-bottom: 10px; }
  .tx-amount-block__value--none { font-size: 30px; letter-spacing: -0.02em; color: var(--text-2); }
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
  .tx-detail-row--section { padding-top: 9px; }
  .tx-detail-row--section .tx-detail-row__label { color: var(--text); font-weight: 700; }
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

  .nq-batch-bar { padding: 0 22px 14px; }
  .nq-batch-bar__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .nq-batch-bar__label { font-size: 11.5px; font-weight: 600; color: var(--text-2); display: inline-flex; align-items: center; gap: 5px; }
  .nq-batch-bar__value { font-size: 11.5px; font-weight: 600; color: var(--text); font-family: 'JetBrains Mono', monospace; }
  .nq-batch-bar__track { width: 100%; height: 6px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden; }
  .nq-batch-bar__fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, rgba(22, 163, 74, 0.6), rgba(22, 163, 74, 1)); transition: width 600ms ease; }
  .nq-batch-bar__overflow { margin-top: 6px; font-size: 11px; color: #f59e0b; font-weight: 600; display: flex; align-items: center; gap: 5px; }

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
