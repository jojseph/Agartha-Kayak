import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWalletAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';
import { setTreasuryBalance } from '@/lib/balanceOps';

// POST: An Elder signs (approves/rejects) a pending reconciliation
export async function POST(request: Request) {
    const auth = await verifyWalletAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { elderAddress, reconciliationId, decision } = await request.json();

        if (!elderAddress || !reconciliationId || !decision) {
            return NextResponse.json({ error: 'elderAddress, reconciliationId, and decision are required' }, { status: 400 });
        }

        if (elderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'elderAddress must match the signing wallet' }, { status: 403 });
        }

        if (!['approve', 'reject'].includes(decision)) {
            return NextResponse.json({ error: 'decision must be "approve" or "reject"' }, { status: 400 });
        }

        // Verify caller is an elder or owner
        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elder || !['elder', 'owner'].includes(elder.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can sign reconciliations' }, { status: 403 });
        }

        // Get the reconciliation proposal
        const { data: recon, error: reconError } = await supabaseAdmin
            .from('treasury_reconciliations')
            .select('*')
            .eq('reconciliation_id', reconciliationId)
            .single();

        if (reconError || !recon) {
            return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
        }

        if (recon.status !== 'pending') {
            return NextResponse.json({ error: 'This reconciliation is no longer pending' }, { status: 400 });
        }

        // Proposer cannot sign their own proposal
        if (recon.proposed_by === elderAddress) {
            return NextResponse.json({ error: 'You cannot sign your own reconciliation proposal' }, { status: 403 });
        }

        // Verify elder is in the same community
        if (recon.community_id !== elder.community_id) {
            return NextResponse.json({ error: 'You are not in the same community as this reconciliation' }, { status: 403 });
        }

        // Record the signature (unique constraint will prevent duplicates)
        const { error: sigError } = await supabaseAdmin
            .from('reconciliation_signatures')
            .insert([{
                reconciliation_id: reconciliationId,
                elder_address: elderAddress,
                decision,
            }]);

        if (sigError) {
            if (sigError.code === '23505') { // unique violation
                return NextResponse.json({ error: 'You have already signed this reconciliation' }, { status: 409 });
            }
            console.error('Insert signature error:', sigError);
            return NextResponse.json({ error: 'Failed to record signature', detail: sigError.message }, { status: 500 });
        }

        // Check if enough approvals have been collected
        const { count: approveCount } = await supabaseAdmin
            .from('reconciliation_signatures')
            .select('*', { count: 'exact', head: true })
            .eq('reconciliation_id', reconciliationId)
            .eq('decision', 'approve');

        const approves = approveCount ?? 0;
        let resolved = false;

        if (approves >= recon.sigs_required) {
            // Update the reconciliation status
            const { error: updateReconError } = await supabaseAdmin
                .from('treasury_reconciliations')
                .update({ status: 'approved', resolved_at: new Date().toISOString() })
                .eq('reconciliation_id', reconciliationId);

            if (updateReconError) {
                console.error('Update reconciliation status error:', updateReconError);
                return NextResponse.json({ error: 'Failed to finalize reconciliation' }, { status: 500 });
            }

            // Apply the balance update to the community treasury (atomic SET — the
            // Elder's hand-counted figure is the new source of truth, intentionally
            // overwriting any concurrent adjustments).
            try {
                await setTreasuryBalance(recon.community_id, recon.proposed_balance);
            } catch (treasuryError: any) {
                console.error('Update treasury balance error:', treasuryError);
                return NextResponse.json({ error: 'Failed to update treasury balance' }, { status: 500 });
            }

            // Log the reconciliation as a community transaction
            await supabaseAdmin
                .from('community_transactions')
                .insert([{
                    community_id: recon.community_id,
                    member_address: recon.proposed_by,
                    transaction_type: 'reconciliation',
                    amount: recon.proposed_balance - recon.previous_balance,
                    description: `Reconciliation: ${recon.reason}`,
                }]);

            resolved = true;

            // Enqueue the reconciliation receipt for on-chain etching
            await enqueueReceipt({
                communityId: recon.community_id,
                recordType: 'reconciliation_approved',
                referenceId: reconciliationId,
                memberAddress: recon.proposed_by,
                summary: `Reconciliation \u2014 ${recon.reason} (\u20b1${Math.abs(recon.proposed_balance - recon.previous_balance).toLocaleString()} adjustment)`,
                estimatedBytes: 300,
            });
        }

        // Check if a single rejection should kill the proposal
        const { count: rejectCount } = await supabaseAdmin
            .from('reconciliation_signatures')
            .select('*', { count: 'exact', head: true })
            .eq('reconciliation_id', reconciliationId)
            .eq('decision', 'reject');

        if ((rejectCount ?? 0) > 0 && !resolved) {
            await supabaseAdmin
                .from('treasury_reconciliations')
                .update({ status: 'rejected', resolved_at: new Date().toISOString() })
                .eq('reconciliation_id', reconciliationId);

            return NextResponse.json({
                success: true,
                decision,
                resolved: true,
                outcome: 'rejected',
                approveCount: approves,
                sigsRequired: recon.sigs_required,
            });
        }

        return NextResponse.json({
            success: true,
            decision,
            resolved,
            outcome: resolved ? 'approved' : 'pending',
            approveCount: approves,
            sigsRequired: recon.sigs_required,
        });
    } catch (err: any) {
        console.error('Server error processing reconciliation signature:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
