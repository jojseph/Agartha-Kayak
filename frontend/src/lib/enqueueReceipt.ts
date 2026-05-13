import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Insert a record into the onchain_queue table.
 * Called by API routes after a key community action succeeds
 * (loan approval, vote, repayment confirmation, share capital, reconciliation).
 *
 * This entry represents a "receipt" that should eventually be etched on-chain.
 */
export async function enqueueReceipt(params: {
    communityId: string;
    recordType: 'loan_approved' | 'loan_rejected' | 'vote_cast' | 'repayment_confirmed' | 'share_capital' | 'reconciliation_approved' | 'peer_loan_approved' | 'peer_loan_settled';
    referenceId: string;
    memberAddress: string;
    summary: string;
    estimatedBytes?: number;
}) {
    try {
        const { error } = await supabaseAdmin
            .from('onchain_queue')
            .insert([{
                community_id: params.communityId,
                record_type: params.recordType,
                reference_id: params.referenceId,
                member_address: params.memberAddress,
                summary: params.summary,
                estimated_bytes: params.estimatedBytes || 200,
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
