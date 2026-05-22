import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type RecordType =
    | 'loan_approved'
    | 'loan_rejected'
    | 'vote_cast'
    | 'repayment_confirmed'
    | 'share_capital'
    | 'reconciliation_approved'
    | 'peer_loan_approved'
    | 'peer_loan_settled'
    | 'loan_defaulted'
    | 'member_approved'
    | 'member_rejected'
    | 'peer_loan_rejected'
    | 'reconciliation_proposed'
    | 'reconciliation_signature'
    | 'reconciliation_rejected'
    | 'gas_topup_proposed'
    | 'gas_topup_approved'
    | 'gas_topup_executed';

export const RECORD_TYPE_CODE: Record<RecordType, string> = {
    loan_approved:           'TL_APR',
    loan_rejected:           'TL_REJ',
    vote_cast:               'VOTE',
    repayment_confirmed:     'REPAY',
    share_capital:           'SC',
    reconciliation_approved: 'RECON_APR',
    peer_loan_approved:      'P2P_APR',
    peer_loan_settled:       'P2P_SET',
    loan_defaulted:          'TL_DEF',
    member_approved:         'MBR_APR',
    member_rejected:         'MBR_REJ',
    peer_loan_rejected:      'P2P_REJ',
    reconciliation_proposed:  'RECON_PROP',
    reconciliation_signature: 'RECON_SIG',
    reconciliation_rejected:  'RECON_REJ',
    gas_topup_proposed:      'GAS_PROP',
    gas_topup_approved:      'GAS_APR',
    gas_topup_executed:      'GAS_EXEC',
};

export async function enqueueReceipt(params: {
    communityId: string;
    recordType: RecordType;
    referenceId: string;
    memberAddress: string;
    summary?: string;
    estimatedBytes?: number;

    loanType?: 'TRS' | 'P2P';
    mode?: 'M' | 'T';
    amount?: number;
    currency?: string;
    itemName?: string;
    purpose?: string;
    collateral?: string;
    termMonths?: number;
    lenderAddress?: string;
    approvedBy?: string[];
    rejectedBy?: string[];
    role?: string;
    action?: string;
    dueDate?: string;
}) {
    try {

        const onchainPayload: Record<string, unknown> = {
            t:   RECORD_TYPE_CODE[params.recordType] ?? params.recordType,
            ref: params.referenceId,
            ts:  new Date().toISOString(),
        };

        if (params.memberAddress)  onchainPayload.borrower = params.memberAddress;
        if (params.lenderAddress)  onchainPayload.lender   = params.lenderAddress;
        if (params.loanType)       onchainPayload.lt        = params.loanType;
        if (params.mode)           onchainPayload.md        = params.mode;
        if (params.amount != null) onchainPayload.amt       = params.amount;
        if (params.currency)       onchainPayload.cur       = params.currency;
        if (params.purpose)        onchainPayload.purp      = params.purpose;
        if (params.collateral)     onchainPayload.col       = params.collateral;
        if (params.termMonths)     onchainPayload.term      = params.termMonths;
        if (params.itemName)       onchainPayload.item      = params.itemName;
        if (params.approvedBy?.length)  onchainPayload.appr = params.approvedBy;
        if (params.rejectedBy?.length)  onchainPayload.rejt = params.rejectedBy;
        if (params.role)           onchainPayload.role      = params.role;
        if (params.action)         onchainPayload.act       = params.action;
        if (params.dueDate)        onchainPayload.due       = params.dueDate;

        const summary = params.summary ?? buildAutoSummary(params);

        const estimatedBytes = params.estimatedBytes
            ?? Buffer.byteLength(JSON.stringify(onchainPayload), 'utf8') + 64;

        const { error } = await supabaseAdmin
            .from('onchain_queue')
            .insert([{
                community_id:    params.communityId,
                record_type:     params.recordType,
                reference_id:    params.referenceId,
                member_address:  params.memberAddress,
                summary,
                onchain_payload: onchainPayload,
                estimated_bytes: estimatedBytes,
                status: 'queued',
            }]);

        if (error) {

            console.error('Failed to enqueue receipt:', error.message);
        }
    } catch (err) {
        console.error('enqueueReceipt error:', err);
    }
}

function buildAutoSummary(params: Parameters<typeof enqueueReceipt>[0]): string {
    const code = RECORD_TYPE_CODE[params.recordType] ?? params.recordType;
    const amtStr = params.amount != null
        ? `${params.currency ?? 'PHP'} ${Number(params.amount).toLocaleString()}`
        : params.itemName ?? '';

    switch (params.recordType) {
        case 'loan_approved':
            return `[${code}] ${params.loanType ?? 'TRS'} ${amtStr} — ${params.purpose ?? ''} | appr: ${(params.approvedBy ?? []).length} voters`;
        case 'loan_rejected':
            return `[${code}] ${params.loanType ?? 'TRS'} ${amtStr} — ${params.purpose ?? ''} | rejt: ${(params.rejectedBy ?? []).length} voters`;
        case 'peer_loan_approved':
            return `[${code}] P2P ${params.mode === 'T' ? 'Things' : 'Money'} ${amtStr} — ${params.purpose ?? ''} | lender: ${params.lenderAddress ?? ''}`;
        case 'peer_loan_rejected':
            return `[${code}] P2P rejected ${amtStr} — ${params.purpose ?? ''} | lender: ${params.lenderAddress ?? ''}`;
        case 'peer_loan_settled':
            return `[${code}] P2P settled ${amtStr}`;
        case 'vote_cast':
            return `[${code}] ${params.action ?? ''} by ${params.memberAddress}`;
        case 'repayment_confirmed':
            return `[${code}] ${amtStr} repaid`;
        case 'share_capital':
            return `[${code}] ${amtStr} — new member | appr: ${params.approvedBy?.[0] ?? ''}`;
        case 'reconciliation_approved':
            return `[${code}] ${amtStr} adjustment — ${params.purpose ?? ''} | appr: ${(params.approvedBy ?? []).length} signers`;
        case 'reconciliation_proposed':
            return `[${code}] proposed ${amtStr} adjustment — ${params.purpose ?? ''}`;
        case 'reconciliation_signature':
            return `[${code}] ${params.action ?? ''} by ${params.memberAddress} — ${params.purpose ?? ''}`;
        case 'reconciliation_rejected':
            return `[${code}] rejected adjustment — ${params.purpose ?? ''} | rejt: ${(params.rejectedBy ?? []).length} signers`;
        case 'loan_defaulted':
            return `[${code}] borrower: ${params.memberAddress} due: ${params.dueDate ?? ''}`;
        case 'member_approved':
            return `[${code}] member: ${params.memberAddress} | appr: ${params.approvedBy?.[0] ?? ''}`;
        case 'member_rejected':
            return `[${code}] member: ${params.memberAddress} | rejt: ${params.rejectedBy?.[0] ?? ''}`;
        case 'gas_topup_proposed':
            return `[${code}] ${amtStr} gas top-up proposed — ${params.purpose ?? ''}`;
        case 'gas_topup_approved':
            return `[${code}] ${amtStr} gas top-up approved — ${params.purpose ?? ''} | appr: ${(params.approvedBy ?? []).length} signers`;
        case 'gas_topup_executed':
            return `[${code}] ${amtStr} gas top-up executed — ${params.purpose ?? ''}`;
        default:
            return `[${code}] ref: ${params.referenceId}`;
    }
}
