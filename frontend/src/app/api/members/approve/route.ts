import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';
import { adjustTreasuryBalance } from '@/lib/balanceOps';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { elderAddress, memberAddress, action } = await request.json();

        if (!elderAddress || !memberAddress || !action) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        if (elderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'elderAddress must match the signing wallet' }, { status: 403 });
        }

        if (action !== 'approved' && action !== 'rejected') {
            return NextResponse.json({ error: 'Invalid action. Must be "approved" or "rejected".' }, { status: 400 });
        }

        // Verify that the requester is an elder or owner
        const { data: elderData, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elderData) {
            return NextResponse.json({ error: 'Could not verify elder status' }, { status: 500 });
        }

        if (!['elder', 'owner'].includes(elderData.role)) {
            return NextResponse.json({ error: 'Forbidden. Only elders and owners can approve members.' }, { status: 403 });
        }

        // Update the member's status
        const { error: updateError } = await supabaseAdmin
            .from('members')
            .update({ status: action })
            .eq('wallet_address', memberAddress)
            .eq('community_id', elderData.community_id);

        if (updateError) {
            console.error('Update member status error:', updateError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // --- Share Capital Integration (only on approval) ---
        if (action === 'approved') {
            // Get the community's required share capital
            const { data: community, error: communityError } = await supabaseAdmin
                .from('communities')
                .select('community_id, share_capital_required')
                .eq('community_id', elderData.community_id)
                .single();

            if (!communityError && community) {
                const shareCapital = community.share_capital_required ?? 0;

                if (shareCapital > 0) {
                    // Log the share capital contribution as a community transaction
                    await supabaseAdmin
                        .from('community_transactions')
                        .insert([{
                            community_id: community.community_id,
                            member_address: memberAddress,
                            transaction_type: 'share_capital',
                            amount: shareCapital,
                            description: `Initial share capital contribution from new member`,
                        }]);

                    // Atomically credit the treasury with the share capital
                    await adjustTreasuryBalance(community.community_id, shareCapital);

                    // Enqueue share capital receipt for on-chain etching
                    await enqueueReceipt({
                        communityId: community.community_id,
                        recordType: 'share_capital',
                        referenceId: community.community_id,
                        memberAddress: memberAddress,
                        amount: shareCapital,
                        currency: 'PHP',
                        approvedBy: [elderAddress],
                        role: elderData.role,
                        action: 'approved',
                    });
                }
            }
        }

        return NextResponse.json({ success: true, action });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

