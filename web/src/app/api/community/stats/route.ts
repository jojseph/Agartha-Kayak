import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            {
                global: {
                    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
                },
            }
        );

        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('community_id')
            .eq('wallet_address', address)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (memberError || !member || !member.community_id) {
            return NextResponse.json({ error: 'Member or community not found' }, { status: 404 });
        }

        const communityId = member.community_id;

        const { data: community, error: communityError } = await supabase
            .from('communities')
            .select('treasury_balance, name, gas_balance')
            .eq('community_id', communityId)
            .single();

        if (communityError || !community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        const { data: communityMembers } = await supabase
            .from('members')
            .select('wallet_address')
            .eq('community_id', communityId);

        const memberAddresses = (communityMembers || []).map((m: any) => m.wallet_address);

        let treasuryLoanCount = 0;
        let peerLoanCount = 0;

        if (memberAddresses.length > 0) {
            const { count: tCount } = await supabase
                .from('loans')
                .select('*', { count: 'exact', head: true })
                .eq('loan_type', 'treasury')
                .in('status', ['active', 'approved'])
                .in('borrower_address', memberAddresses);

            const { count: pCount } = await supabase
                .from('loans')
                .select('*', { count: 'exact', head: true })
                .eq('loan_type', 'peer')
                .in('status', ['active', 'approved'])
                .in('borrower_address', memberAddresses);

            treasuryLoanCount = tCount ?? 0;
            peerLoanCount = pCount ?? 0;
        }

        const response = NextResponse.json({
            communityName: community.name,
            treasuryBalance: community.treasury_balance ?? 0,
            gasBalance: community.gas_balance ?? 0,
            activeLoanCount: treasuryLoanCount + peerLoanCount,
            treasuryLoanCount,
            peerLoanCount,
        });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
    } catch (err: any) {
        console.error('Server error fetching community stats:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
