import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST: An Elder proposes a manual treasury balance update
export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { elderAddress, proposedBalance, reason } = await request.json();

        if (!elderAddress || proposedBalance === undefined || !reason) {
            return NextResponse.json({ error: 'elderAddress, proposedBalance, and reason are required' }, { status: 400 });
        }

        // Verify caller is an elder or owner
        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elder || !['elder', 'owner'].includes(elder.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can propose reconciliations' }, { status: 403 });
        }

        // Get current treasury balance
        const { data: community, error: communityError } = await supabaseAdmin
            .from('communities')
            .select('treasury_balance')
            .eq('community_id', elder.community_id)
            .single();

        if (communityError || !community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        // Count eligible signers (Elders + Owner minus the proposer)
        const { count: totalSigners } = await supabaseAdmin
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', elder.community_id)
            .in('role', ['elder', 'owner'])
            .eq('status', 'approved')
            .neq('wallet_address', elderAddress);

        // Need at least 1 other signer, default to 2 if enough elders
        const sigsRequired = Math.max(1, Math.min(2, totalSigners ?? 1));

        // Create the reconciliation proposal
        const { data: reconciliation, error: insertError } = await supabaseAdmin
            .from('treasury_reconciliations')
            .insert([{
                community_id: elder.community_id,
                proposed_by: elderAddress,
                previous_balance: community.treasury_balance ?? 0,
                proposed_balance: proposedBalance,
                reason,
                sigs_required: sigsRequired,
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Insert reconciliation error:', insertError);
            return NextResponse.json({ error: 'Failed to create reconciliation proposal', detail: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, reconciliation });
    } catch (err: any) {
        console.error('Server error creating reconciliation:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
