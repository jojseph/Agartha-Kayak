type PublicRecordKind = 'treasury' | 'member';
type LedgerCategory = 'loans' | 'members' | 'votes' | 'reconciliation' | 'gas' | 'ledger';

type QueueRecord = {
  queue_id: string;
  record_type: string;
  reference_id: string;
  member_address: string;
  summary: string | null;
  status: string | null;
  batch_id?: string | null;
  tx_hash: string | null;
  block_number?: string | null;
  created_at: string;
  etched_at?: string | null;
  onchain_payload?: Record<string, unknown> | null;
  communities?: { name?: string | null } | null;
};

type AliasMap = Record<string, string>;
type VisibilityMap = Record<string, boolean>;

const TREASURY_RECORD_TYPES = new Set([
  'loan_approved',
  'loan_rejected',
  'vote_cast',
  'reconciliation_proposed',
  'reconciliation_signature',
  'reconciliation_approved',
  'reconciliation_rejected',
  'gas_topup_proposed',
  'gas_topup_approved',
  'gas_topup_executed',
]);

const LOAN_RECORD_TYPES = new Set([
  'loan_approved',
  'loan_rejected',
  'peer_loan_approved',
  'peer_loan_rejected',
  'peer_loan_settled',
  'loan_defaulted',
]);

export function collectPublicRecordWallets(records: QueueRecord[]) {
  const addresses = new Set<string>();

  records.forEach((record) => {
    addAddress(addresses, record.member_address);
    const payload = normalizePayload(record.onchain_payload);
    addAddress(addresses, asString(payload.borrower));
    addAddress(addresses, asString(payload.lender));
    addAddressList(addresses, payload.appr);
    addAddressList(addresses, payload.rejt);
  });

  return Array.from(addresses);
}

export function formatQueueRecordForPublicBoard(record: QueueRecord, aliasMap: AliasMap = {}, visibilityMap: VisibilityMap = {}) {
  const payload = normalizePayload(record.onchain_payload);
  const type = getRecordKind(record.record_type);
  const amount = getAmount(record, payload);
  const currency = getCurrency(record, payload);
  const purpose = getPurpose(record, payload);
  const createdAt = new Date(record.created_at);
  const targetType = LOAN_RECORD_TYPES.has(record.record_type) ? 'loan' : null;
  const targetId = targetType ? record.reference_id : null;
  const fullHash = record.tx_hash || record.queue_id;
  const borrowerAddress = asString(payload.borrower) || record.member_address;
  const lenderAddress = asString(payload.lender);
  const actorName = getAlias(aliasMap, record.member_address);
  const borrowerName = getAlias(aliasMap, borrowerAddress);
  const lenderName = lenderAddress ? getAlias(aliasMap, lenderAddress) : '';
  const parties = getParties(record.record_type, type, actorName, borrowerName, lenderName);

  return {
    id: record.queue_id,
    queueId: record.queue_id,
    referenceId: record.reference_id,
    recordType: record.record_type,
    ledgerCategory: getLedgerCategory(record.record_type),
    ledgerLabel: getLedgerLabel(record.record_type),
    type,
    coop: record.communities?.name || 'Unknown Cooperative',
    purpose,
    amount,
    currency,
    fromName: parties.fromName,
    toName: parties.toName,
    timestamp: createdAt.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    timestampStr: createdAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' - ' + createdAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    shortDate: createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
    fullHash,
    txHash: record.tx_hash || null,
    displayHash: formatShortHash(fullHash),
    hash: record.tx_hash || `Queue ${formatShortHash(record.queue_id)}`,
    status: record.status || 'queued',
    batchId: record.batch_id || null,
    blockNumber: record.block_number || null,
    etchedAt: record.etched_at || null,
    targetType,
    targetId,
    visibilityKey: targetId || record.queue_id,
    canToggleVisibility: Boolean(targetType && targetId && Object.prototype.hasOwnProperty.call(visibilityMap, targetId)),
    isPublic: targetId && Object.prototype.hasOwnProperty.call(visibilityMap, targetId)
      ? visibilityMap[targetId]
      : true,
  };
}

function normalizePayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
}

function getRecordKind(recordType: string): PublicRecordKind {
  return TREASURY_RECORD_TYPES.has(recordType) ? 'treasury' : 'member';
}

function getAmount(record: QueueRecord, payload: Record<string, unknown>) {
  const payloadAmount = Number(payload.amt);
  if (Number.isFinite(payloadAmount)) return payloadAmount;

  const match = (record.summary || '').match(/(?:PHP|ADA|\u20b1)\s*([\d,]+(?:\.\d+)?)/i);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

function getCurrency(record: QueueRecord, payload: Record<string, unknown>) {
  const payloadCurrency = asString(payload.cur);
  if (payloadCurrency) return payloadCurrency;
  if (record.record_type.startsWith('gas_topup_')) return 'ADA';
  return 'PHP';
}

function getLedgerCategory(recordType: string): LedgerCategory {
  if (recordType === 'vote_cast') return 'votes';
  if (recordType.startsWith('reconciliation_')) return 'reconciliation';
  if (recordType.startsWith('gas_topup_')) return 'gas';
  if (recordType === 'member_approved' || recordType === 'member_rejected' || recordType === 'share_capital') return 'members';
  if (recordType.includes('loan') || recordType === 'repayment_confirmed') return 'loans';
  return 'ledger';
}

function getLedgerLabel(recordType: string) {
  const labels: Record<string, string> = {
    loan_approved: 'Treasury Loan Approved',
    loan_rejected: 'Treasury Loan Rejected',
    vote_cast: 'Vote Cast',
    repayment_confirmed: 'Repayment Confirmed',
    share_capital: 'Share Capital',
    reconciliation_proposed: 'Recon Proposed',
    reconciliation_signature: 'Recon Signed',
    reconciliation_approved: 'Recon Approved',
    reconciliation_rejected: 'Recon Rejected',
    peer_loan_approved: 'Peer Loan Approved',
    peer_loan_rejected: 'Peer Loan Rejected',
    peer_loan_settled: 'Peer Loan Settled',
    loan_defaulted: 'Loan Defaulted',
    member_approved: 'Member Approved',
    member_rejected: 'Member Rejected',
    gas_topup_proposed: 'Gas Top-Up Proposed',
    gas_topup_approved: 'Gas Top-Up Approved',
    gas_topup_executed: 'Gas Top-Up Executed',
  };

  return labels[recordType] || recordType.replace(/_/g, ' ');
}

function getPurpose(record: QueueRecord, payload: Record<string, unknown>) {
  const payloadPurpose = asString(payload.purp);
  if (payloadPurpose) return payloadPurpose;

  const payloadItem = asString(payload.item);
  if (payloadItem) return payloadItem;

  const summary = record.summary || 'Network Transaction';
  const withoutCode = summary.replace(/^\[[^\]]+\]\s*/, '');
  const beforeMeta = withoutCode.split('|')[0].trim();
  const dashParts = beforeMeta.split(/\s*(?:\u2014|--|-)\s*/);
  return (dashParts.length > 1 ? dashParts.slice(1).join(' - ') : beforeMeta) || 'Network Transaction';
}

function getParties(recordType: string, type: PublicRecordKind, actorName: string, borrowerName: string, lenderName: string) {
  if (recordType === 'share_capital') {
    return { fromName: actorName, toName: 'Community Treasury' };
  }

  if (recordType === 'member_approved') {
    return { fromName: actorName, toName: 'Community Membership' };
  }

  if (recordType === 'member_rejected') {
    return { fromName: actorName, toName: 'Membership Review' };
  }

  if (recordType === 'gas_topup_proposed' || recordType === 'gas_topup_approved' || recordType === 'gas_topup_executed') {
    return { fromName: actorName, toName: 'Gas Tank' };
  }

  if (recordType === 'reconciliation_proposed' || recordType === 'reconciliation_signature' || recordType === 'reconciliation_rejected') {
    return { fromName: actorName, toName: 'Treasury Reconciliation' };
  }

  if (recordType === 'reconciliation_approved') {
    return { fromName: actorName, toName: 'Community Treasury' };
  }

  if (recordType === 'vote_cast') {
    return { fromName: actorName, toName: 'Elder Vote' };
  }

  if (recordType.startsWith('peer_')) {
    return { fromName: lenderName || 'Member Network', toName: borrowerName || actorName };
  }

  if (type === 'treasury') {
    return { fromName: 'Cooperative Treasury', toName: borrowerName || actorName };
  }

  return { fromName: actorName, toName: borrowerName || 'Community Ledger' };
}

function formatShortHash(value: string) {
  if (!value) return 'Pending';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getAlias(aliasMap: AliasMap, address: string) {
  return aliasMap[address] || shortAddress(address) || 'Unknown Member';
}

function shortAddress(address?: string | null) {
  if (!address) return '';
  return address.length > 14 ? `${address.slice(0, 10)}...` : address;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function addAddress(addresses: Set<string>, value?: string | null) {
  if (value) addresses.add(value);
}

function addAddressList(addresses: Set<string>, value: unknown) {
  if (!Array.isArray(value)) return;
  value.forEach((item) => addAddress(addresses, asString(item)));
}
