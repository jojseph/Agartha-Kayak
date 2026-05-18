import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * All possible on-chain record types.
 * Abbreviated codes used in the actual blockchain metadata:
 *   loan_approved           → TL_APR
 *   loan_rejected           → TL_REJ
 *   vote_cast               → VOTE
 *   repayment_confirmed     → REPAY
 *   share_capital           → SC
 *   reconciliation_approved → RECON_APR
 *   peer_loan_approved      → P2P_APR
 *   peer_loan_settled       → P2P_SET
 *   loan_defaulted          → TL_DEF
 *   member_approved         → MBR_APR
 */
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
    | 'member_approved';

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
};

/**
 * Insert a record into the onchain_queue table.
 * Called by API routes after a key community action succeeds
 * (loan approval/rejection, vote, repayment confirmation, share capital, reconciliation).
 *
 * The rich structured fields are stored alongside the queue row so that
 * buildMetadataForBatch() can assemble fully transparent, immutable on-chain receipts.
 *
 * On-chain field abbreviations (to satisfy Cardano's 64-byte string limit):
 *   t        → record type code (e.g. TL_APR, P2P_REJ)
 *   ref      → reference_id (loan_id, reconciliation_id, etc.)
 *   borrower → borrower wallet address
 *   lender   → lender wallet address (peer loans)
 *   lt       → loan_type: TRS (treasury) | P2P (peer)
 *   md       → mode: M (money) | T (things)
 *   amt      → amount (numeric)
 *   cur      → currency (PHP, ADA, etc.)
 *   purp     → purpose
 *   col      → collateral declaration (treasury loans)
 *   term     → term_months
 *   item     → item_name (things-mode loans)
 *   appr     → array of approving wallet addresses
 *   rejt     → array of rejecting wallet addresses
 *   role     → actor role: elder, owner, lender, member
 *   act      → action: approve, reject, settle, confirm
 *   ts       → ISO timestamp of the event
 */
export async function enqueueReceipt(params: {
    communityId: string;
    recordType: RecordType;
    referenceId: string;
    memberAddress: string;      // Primary actor (borrower, proposer, member being approved)
    summary?: string;           // Optional human-readable override; auto-generated if absent
    estimatedBytes?: number;
    // ── Rich transparency fields ────────────────────────────────────────────
    loanType?: 'TRS' | 'P2P';       // Treasury or Peer-to-Peer
    mode?: 'M' | 'T';               // Money or Things
    amount?: number;
    currency?: string;
    itemName?: string;               // For things-mode loans
    purpose?: string;
    collateral?: string;             // Treasury loan collateral declaration
    termMonths?: number;
    lenderAddress?: string;          // Peer loan lender wallet
    approvedBy?: string[];           // Wallets that voted/approved
    rejectedBy?: string[];           // Wallets that voted to reject
    role?: string;                   // Role of primary actor: elder, owner, lender, member
    action?: string;                 // approve, reject, settle, confirm, default
    dueDate?: string;                // ISO date string — used for defaulted loans
}) {
    try {
        // Build a compact on-chain metadata payload (all abbreviated keys)
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

        // Auto-generate a human-readable summary if one wasn't provided
        const summary = params.summary ?? buildAutoSummary(params);

        // Estimate bytes from the actual onchain payload if not provided
        const estimatedBytes = params.estimatedBytes
            ?? Buffer.byteLength(JSON.stringify(onchainPayload), 'utf8') + 64; // +64 for queue overhead

        const { error } = await supabaseAdmin
            .from('onchain_queue')
            .insert([{
                community_id:    params.communityId,
                record_type:     params.recordType,
                reference_id:    params.referenceId,
                member_address:  params.memberAddress,
                summary,
                onchain_payload: onchainPayload,  // rich structured data for buildMetadataForBatch
                estimated_bytes: estimatedBytes,
                status: 'queued',
            }]);

        if (error) {
            // Log but don't fail the parent operation — the queue is supplementary
            console.error('Failed to enqueue receipt:', error.message);
        }
    } catch (err) {
        console.error('enqueueReceipt error:', err);
    }
}

// ── Internal auto-summary builder ────────────────────────────────────────────

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
        case 'loan_defaulted':
            return `[${code}] borrower: ${params.memberAddress} due: ${params.dueDate ?? ''}`;
        case 'member_approved':
            return `[${code}] member: ${params.memberAddress} | appr: ${params.approvedBy?.[0] ?? ''}`;
        default:
            return `[${code}] ref: ${params.referenceId}`;
    }
}
