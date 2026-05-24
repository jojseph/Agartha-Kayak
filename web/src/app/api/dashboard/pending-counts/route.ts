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
            .select('role, community_id')
            .eq('wallet_address', address)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (memberError || !member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        const counts = {
            treasuryLoans: 0,
            newMembers: 0,
            reconciliations: 0,
            memberRequests: 0,
        };

        const { count: mCount } = await supabase
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('lender_address', address)
            .eq('loan_type', 'peer')
            .eq('status', 'pending');

        counts.memberRequests = mCount ?? 0;

        if (member.role === 'elder' || member.role === 'owner') {
            const communityId = member.community_id;

            const { data: communityMembers } = await supabase
                .from('members')
                .select('wallet_address')
                .eq('community_id', communityId);

            const memberAddresses = (communityMembers || []).map((m: any) => m.wallet_address);

            if (memberAddresses.length > 0) {
                const { data: loans } = await supabase
                    .from('loans')
                    .select('loan_id, borrower_address')
                    .eq('loan_type', 'treasury')
                    .eq('status', 'pending')
                    .in('borrower_address', memberAddresses);

                if (loans && loans.length > 0) {
                    const loanIds = loans.map((l: any) => l.loan_id);
                    const { data: myVotes } = await supabase
                        .from('treasury_loan_votes')
                        .select('loan_id')
                        .eq('elder_address', address)
                        .in('loan_id', loanIds);

                    const votedLoanIds = new Set((myVotes || []).map((v: any) => v.loan_id));
                    counts.treasuryLoans = loans.filter((l: any) => !votedLoanIds.has(l.loan_id) && l.borrower_address !== address).length;
                }
            }

            const { count: nmCount } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('community_id', communityId)
                .eq('status', 'pending');

            counts.newMembers = nmCount ?? 0;

            const { data: reconciliations } = await supabase
                .from('treasury_reconciliations')
                .select('reconciliation_id, proposed_by')
                .eq('community_id', communityId)
                .eq('status', 'pending');

            if (reconciliations && reconciliations.length > 0) {
                const reconIds = reconciliations.map((r: any) => r.reconciliation_id);
                const { data: mySigs } = await supabase
                    .from('reconciliation_signatures')
                    .select('reconciliation_id')
                    .eq('elder_address', address)
                    .in('reconciliation_id', reconIds);

                const signedReconIds = new Set((mySigs || []).map((s: any) => s.reconciliation_id));
                counts.reconciliations = reconciliations.filter((r: any) => !signedReconIds.has(r.reconciliation_id) && r.proposed_by !== address).length;
            }
        }

        const response = NextResponse.json({ counts });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
    } catch (err: any) {
        console.error('Server error fetching pending counts:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
