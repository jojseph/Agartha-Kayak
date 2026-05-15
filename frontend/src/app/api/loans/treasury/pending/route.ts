import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        // Verify the caller is an elder and get their community
        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', address)
            .single();

        if (elderError || !elder) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        if (elder.role !== 'elder' && elder.role !== 'owner') {
            return NextResponse.json({ error: 'Only elders or owners can view treasury loan requests' }, { status: 403 });
        }

        if (!elder.community_id) {
            return NextResponse.json({ error: 'Elder is not part of any community' }, { status: 400 });
        }

        // Fetch all pending treasury loans in the same community
        // We join via borrower's community_id
        const { data: loans, error: loansError } = await supabaseAdmin
            .from('loans')
            .select(`
                *,
                borrower:members!loans_borrower_address_fkey(alias, barangay, community_id)
            `)
            .eq('loan_type', 'treasury')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (loansError) {
            console.error('Fetch treasury loans error:', loansError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Filter to same community as the elder, AND hide the elder's own request
        // from their approval list (TODO.md #2 — an Elder shouldn't see their own
        // pending treasury loan as something they can vote on).
        const communityLoans = (loans || []).filter(
            (loan: any) =>
                loan.borrower?.community_id === elder.community_id &&
                loan.borrower_address !== address
        );

        // For each loan, fetch the existing votes from treasury_loan_votes
        const loanIds = communityLoans.map((l: any) => l.loan_id);
        let votes: any[] = [];
        if (loanIds.length > 0) {
            const { data: voteData } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('loan_id, elder_address, vote')
                .in('loan_id', loanIds);
            votes = voteData || [];
        }

        // Attach vote summary to each loan
        const enrichedLoans = communityLoans.map((loan: any) => {
            const loanVotes = votes.filter(v => v.loan_id === loan.loan_id);
            const approveCount = loanVotes.filter(v => v.vote === 'approve').length;
            const rejectCount = loanVotes.filter(v => v.vote === 'reject').length;
            const myVote = loanVotes.find(v => v.elder_address === address)?.vote || null;
            return {
                ...loan,
                approve_count: approveCount,
                reject_count: rejectCount,
                my_vote: myVote,
            };
        });

        return NextResponse.json({ requests: enrichedLoans, myAddress: address });
    } catch (err) {
        console.error('Server error fetching treasury requests:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
