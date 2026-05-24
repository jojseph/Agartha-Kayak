import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', address)
            .single();

        if (memberError || !member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        const counts = {
            treasuryLoans: 0,
            newMembers: 0,
            reconciliations: 0,
            memberRequests: 0,
        };

        const { count: mCount } = await supabaseAdmin
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('lender_address', address)
            .eq('status', 'pending');

        counts.memberRequests = mCount ?? 0;

        if (member.role === 'elder' || member.role === 'owner') {
            const communityId = member.community_id;

            const { data: communityMembers } = await supabaseAdmin
                .from('members')
                .select('wallet_address')
                .eq('community_id', communityId);

            const memberAddresses = (communityMembers || []).map((m: any) => m.wallet_address);

            if (memberAddresses.length > 0) {
                const { data: loans } = await supabaseAdmin
                    .from('loans')
                    .select('loan_id, borrower_address')
                    .eq('loan_type', 'treasury')
                    .eq('status', 'pending')
                    .in('borrower_address', memberAddresses);

                if (loans && loans.length > 0) {
                    const loanIds = loans.map((l: any) => l.loan_id);
                    const { data: myVotes } = await supabaseAdmin
                        .from('treasury_loan_votes')
                        .select('loan_id')
                        .eq('elder_address', address)
                        .in('loan_id', loanIds);

                    const votedLoanIds = new Set((myVotes || []).map((v: any) => v.loan_id));
                    counts.treasuryLoans = loans.filter((l: any) => !votedLoanIds.has(l.loan_id) && l.borrower_address !== address).length;
                }
            }

            const { count: nmCount } = await supabaseAdmin
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('community_id', communityId)
                .eq('status', 'pending');

            counts.newMembers = nmCount ?? 0;

            const { data: reconciliations } = await supabaseAdmin
                .from('treasury_reconciliations')
                .select('reconciliation_id, proposed_by')
                .eq('community_id', communityId)
                .eq('status', 'pending');

            if (reconciliations && reconciliations.length > 0) {
                const reconIds = reconciliations.map((r: any) => r.reconciliation_id);
                const { data: mySigs } = await supabaseAdmin
                    .from('reconciliation_signatures')
                    .select('reconciliation_id')
                    .eq('elder_address', address)
                    .in('reconciliation_id', reconIds);

                const signedReconIds = new Set((mySigs || []).map((s: any) => s.reconciliation_id));
                counts.reconciliations = reconciliations.filter((r: any) => !signedReconIds.has(r.reconciliation_id) && r.proposed_by !== address).length;
            }
        }

        return NextResponse.json({ counts });
    } catch (err: any) {
        console.error('Server error fetching pending counts:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
