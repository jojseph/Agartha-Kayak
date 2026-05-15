import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        // Get member's community_id
        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('community_id')
            .eq('wallet_address', address)
            .single();

        if (memberError || !member || !member.community_id) {
            return NextResponse.json({ error: 'Member or community not found' }, { status: 404 });
        }

        const communityId = member.community_id;

        // Get treasury balance from communities table
        const { data: community, error: communityError } = await supabaseAdmin
            .from('communities')
            .select('treasury_balance, name')
            .eq('community_id', communityId)
            .single();

        if (communityError || !community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        // Get all members in this community for loan lookups
        const { data: communityMembers } = await supabaseAdmin
            .from('members')
            .select('wallet_address')
            .eq('community_id', communityId);

        const memberAddresses = (communityMembers || []).map((m: any) => m.wallet_address);

        // Count active/approved treasury loans in the community
        let treasuryLoanCount = 0;
        let peerLoanCount = 0;

        if (memberAddresses.length > 0) {
            const { count: tCount } = await supabaseAdmin
                .from('loans')
                .select('*', { count: 'exact', head: true })
                .eq('loan_type', 'treasury')
                .in('status', ['active', 'approved'])
                .in('borrower_address', memberAddresses);

            const { count: pCount } = await supabaseAdmin
                .from('loans')
                .select('*', { count: 'exact', head: true })
                .eq('loan_type', 'peer')
                .in('status', ['active', 'approved'])
                .in('borrower_address', memberAddresses);

            treasuryLoanCount = tCount ?? 0;
            peerLoanCount = pCount ?? 0;
        }

        return NextResponse.json({
            communityName: community.name,
            treasuryBalance: community.treasury_balance ?? 0,
            activeLoanCount: treasuryLoanCount + peerLoanCount,
            treasuryLoanCount,
            peerLoanCount,
        });
    } catch (err: any) {
        console.error('Server error fetching community stats:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
