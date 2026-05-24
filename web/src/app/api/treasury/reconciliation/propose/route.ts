import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { elderAddress, proposedBalance, reason } = await request.json();
        const proposedBalanceValue = Number(proposedBalance);

        if (!elderAddress || proposedBalance === undefined || proposedBalance === null || proposedBalance === '' || !reason) {
            return NextResponse.json({ error: 'elderAddress, proposedBalance, and reason are required' }, { status: 400 });
        }

        if (!Number.isFinite(proposedBalanceValue) || proposedBalanceValue < 0) {
            return NextResponse.json({ error: 'proposedBalance must be a valid non-negative number' }, { status: 400 });
        }

        if (elderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'elderAddress must match the signing wallet' }, { status: 403 });
        }

        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elder || !['elder', 'owner'].includes(elder.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can propose reconciliations' }, { status: 403 });
        }

        const { data: community, error: communityError } = await supabaseAdmin
            .from('communities')
            .select('treasury_balance')
            .eq('community_id', elder.community_id)
            .single();

        if (communityError || !community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        const { count: totalSigners } = await supabaseAdmin
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', elder.community_id)
            .in('role', ['elder', 'owner'])
            .eq('status', 'approved')
            .neq('wallet_address', elderAddress);

        const sigsRequired = Math.max(1, Math.min(2, totalSigners ?? 1));

        const { data: reconciliation, error: insertError } = await supabaseAdmin
            .from('treasury_reconciliations')
            .insert([{
                community_id: elder.community_id,
                proposed_by: elderAddress,
                previous_balance: community.treasury_balance ?? 0,
                proposed_balance: proposedBalanceValue,
                reason,
                sigs_required: sigsRequired,
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Insert reconciliation error:', insertError);
            return NextResponse.json({ error: 'Failed to create reconciliation proposal', detail: insertError.message }, { status: 500 });
        }

        await enqueueReceipt({
            communityId: elder.community_id,
            recordType: 'reconciliation_proposed',
            referenceId: reconciliation.reconciliation_id,
            memberAddress: elderAddress,
            amount: proposedBalanceValue,
            currency: 'PHP',
            purpose: reason,
            role: elder.role,
            action: 'propose',
        });

        return NextResponse.json({ success: true, reconciliation });
    } catch (err: any) {
        console.error('Server error creating reconciliation:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
