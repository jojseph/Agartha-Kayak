import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }
    
    try {
        const { elderAddress, memberAddress, action } = await request.json();

        if (!elderAddress || !memberAddress || !action) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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
                .select('community_id, share_capital_required, treasury_balance')
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

                    // Increment the treasury balance
                    const newBalance = (community.treasury_balance ?? 0) + shareCapital;
                    await supabaseAdmin
                        .from('communities')
                        .update({ treasury_balance: newBalance })
                        .eq('community_id', community.community_id);
                }
            }
        }

        return NextResponse.json({ success: true, action });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

