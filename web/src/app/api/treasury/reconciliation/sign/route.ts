import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';
import { setTreasuryBalance } from '@/lib/balanceOps';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
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

        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elder || !['elder', 'owner'].includes(elder.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can sign reconciliations' }, { status: 403 });
        }

        const { data: recon, error: reconError } = await supabaseAdmin
            .from('treasury_reconciliations')
            .select('*')
            .eq('reconciliation_id', reconciliationId)
            .single();

        if (reconError || !recon) {
            return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
        }

        if (recon.proposed_by === elderAddress) {
            return NextResponse.json({ error: 'You cannot sign your own reconciliation proposal' }, { status: 403 });
        }

        if (recon.community_id !== elder.community_id) {
            return NextResponse.json({ error: 'You are not in the same community as this reconciliation' }, { status: 403 });
        }

        const signatureSummary = async () => {
            const { data: signatures, error: signaturesError } = await supabaseAdmin
                .from('reconciliation_signatures')
                .select('elder_address, decision')
                .eq('reconciliation_id', reconciliationId);

            if (signaturesError) {
                throw signaturesError;
            }

            const approveCount = (signatures ?? []).filter((s: any) => s.decision === 'approve').length;
            const rejectCount = (signatures ?? []).filter((s: any) => s.decision === 'reject').length;

            return {
                approveCount,
                rejectCount,
                signatures: signatures ?? [],
            };
        };

        const { data: existingSig, error: existingSigError } = await supabaseAdmin
            .from('reconciliation_signatures')
            .select('decision')
            .eq('reconciliation_id', reconciliationId)
            .eq('elder_address', elderAddress)
            .maybeSingle();

        if (existingSigError) {
            console.error('Fetch existing signature error:', existingSigError);
            return NextResponse.json({ error: 'Failed to check existing signature' }, { status: 500 });
        }

        if (existingSig) {
            const summary = await signatureSummary();
            if (existingSig.decision === decision) {
                return NextResponse.json({
                    success: true,
                    decision,
                    alreadySigned: true,
                    resolved: recon.status !== 'pending',
                    outcome: recon.status,
                    approveCount: summary.approveCount,
                    rejectCount: summary.rejectCount,
                    sigsRequired: recon.sigs_required,
                });
            }

            return NextResponse.json({
                error: `You have already ${existingSig.decision === 'approve' ? 'approved' : 'rejected'} this reconciliation`,
                alreadySigned: true,
                existingDecision: existingSig.decision,
                outcome: recon.status,
                approveCount: summary.approveCount,
                rejectCount: summary.rejectCount,
                sigsRequired: recon.sigs_required,
            }, { status: 409 });
        }

        if (recon.status !== 'pending') {
            return NextResponse.json({
                error: 'This reconciliation is no longer pending',
                outcome: recon.status,
            }, { status: 400 });
        }

        const { error: sigError } = await supabaseAdmin
            .from('reconciliation_signatures')
            .insert([{
                reconciliation_id: reconciliationId,
                elder_address: elderAddress,
                decision,
            }]);

        if (sigError) {
            if (sigError.code === '23505') {
                const { data: racedSig } = await supabaseAdmin
                    .from('reconciliation_signatures')
                    .select('decision')
                    .eq('reconciliation_id', reconciliationId)
                    .eq('elder_address', elderAddress)
                    .maybeSingle();
                const summary = await signatureSummary();

                if (racedSig?.decision === decision) {
                    return NextResponse.json({
                        success: true,
                        decision,
                        alreadySigned: true,
                        resolved: recon.status !== 'pending',
                        outcome: recon.status,
                        approveCount: summary.approveCount,
                        rejectCount: summary.rejectCount,
                        sigsRequired: recon.sigs_required,
                    });
                }

                return NextResponse.json({
                    error: 'You have already signed this reconciliation',
                    alreadySigned: true,
                    existingDecision: racedSig?.decision,
                    outcome: recon.status,
                    approveCount: summary.approveCount,
                    rejectCount: summary.rejectCount,
                    sigsRequired: recon.sigs_required,
                }, { status: 409 });
            }
            console.error('Insert signature error:', sigError);
            return NextResponse.json({ error: 'Failed to record signature', detail: sigError.message }, { status: 500 });
        }

        const { data: approvedSigs, error: sigsFetchError } = await supabaseAdmin
            .from('reconciliation_signatures')
            .select('elder_address')
            .eq('reconciliation_id', reconciliationId)
            .eq('decision', 'approve');

        if (sigsFetchError) {
            console.error('Fetch signatures error:', sigsFetchError);
            return NextResponse.json({ error: 'Failed to retrieve approval signatures' }, { status: 500 });
        }

        const approves = approvedSigs?.length ?? 0;
        let resolved = false;

        await enqueueReceipt({
            communityId: recon.community_id,
            recordType: 'reconciliation_signature',
            referenceId: reconciliationId,
            memberAddress: elderAddress,
            amount: Math.abs(recon.proposed_balance - recon.previous_balance),
            currency: 'PHP',
            purpose: recon.reason,
            role: elder.role,
            action: decision,
            approvedBy: decision === 'approve' ? [elderAddress] : undefined,
            rejectedBy: decision === 'reject' ? [elderAddress] : undefined,
        });

        if (approves >= recon.sigs_required) {

            const { error: updateReconError } = await supabaseAdmin
                .from('treasury_reconciliations')
                .update({ status: 'approved', resolved_at: new Date().toISOString() })
                .eq('reconciliation_id', reconciliationId);

            if (updateReconError) {
                console.error('Update reconciliation status error:', updateReconError);
                return NextResponse.json({ error: 'Failed to finalize reconciliation' }, { status: 500 });
            }

            try {
                await setTreasuryBalance(recon.community_id, recon.proposed_balance);
            } catch (treasuryError: any) {
                console.error('Update treasury balance error:', treasuryError);
                return NextResponse.json({ error: 'Failed to update treasury balance' }, { status: 500 });
            }

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

            await enqueueReceipt({
                communityId: recon.community_id,
                recordType: 'reconciliation_approved',
                referenceId: reconciliationId,
                memberAddress: recon.proposed_by,
                amount: Math.abs(recon.proposed_balance - recon.previous_balance),
                currency: 'PHP',
                purpose: recon.reason,
                approvedBy: (approvedSigs || []).map((s: any) => s.elder_address),
                role: 'elder',
                action: 'approve',
            });
        }

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

            const { data: rejectedSigs } = await supabaseAdmin
                .from('reconciliation_signatures')
                .select('elder_address')
                .eq('reconciliation_id', reconciliationId)
                .eq('decision', 'reject');

            await enqueueReceipt({
                communityId: recon.community_id,
                recordType: 'reconciliation_rejected',
                referenceId: reconciliationId,
                memberAddress: recon.proposed_by,
                amount: Math.abs(recon.proposed_balance - recon.previous_balance),
                currency: 'PHP',
                purpose: recon.reason,
                rejectedBy: (rejectedSigs || []).map((s: any) => s.elder_address),
                role: 'elder',
                action: 'reject',
            });

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
