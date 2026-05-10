import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { loanId, elderAddress, vote } = await request.json();

        if (!loanId || !elderAddress || !vote) {
            return NextResponse.json({ error: 'loanId, elderAddress, and vote are required' }, { status: 400 });
        }

        if (!['approve', 'reject'].includes(vote)) {
            return NextResponse.json({ error: 'vote must be "approve" or "reject"' }, { status: 400 });
        }

        // Verify caller is an elder
        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elder || elder.role !== 'elder') {
            return NextResponse.json({ error: 'Only elders can vote on treasury loans' }, { status: 403 });
        }

        // Verify the loan exists, is treasury type, is still pending
        const { data: loan, error: loanError } = await supabaseAdmin
            .from('loans')
            .select(`
                loan_id, loan_type, status,
                borrower:members!loans_borrower_address_fkey(community_id)
            `)
            .eq('loan_id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        if (loan.loan_type !== 'treasury') {
            return NextResponse.json({ error: 'This is not a treasury loan' }, { status: 400 });
        }

        if (loan.status !== 'pending') {
            return NextResponse.json({ error: 'This loan is no longer pending' }, { status: 400 });
        }

        // Ensure elder is in the same community as the borrower
        const borrowerCommunityId = (loan.borrower as any)?.community_id;
        if (borrowerCommunityId !== elder.community_id) {
            return NextResponse.json({ error: 'Elder is not in the same community as the borrower' }, { status: 403 });
        }

        // Check if elder already voted
        const { data: existingVote } = await supabaseAdmin
            .from('treasury_loan_votes')
            .select('id, vote')
            .eq('loan_id', loanId)
            .eq('elder_address', elderAddress)
            .single();

        if (existingVote) {
            return NextResponse.json({ error: 'You have already voted on this loan request' }, { status: 409 });
        }

        // Record the vote
        const { error: insertError } = await supabaseAdmin
            .from('treasury_loan_votes')
            .insert([{ loan_id: loanId, elder_address: elderAddress, vote }]);

        if (insertError) {
            console.error('Insert vote error:', insertError);
            return NextResponse.json({ error: 'Failed to record vote', detail: insertError.message }, { status: 500 });
        }

        // --- Resolution logic ---
        // If REJECT: immediately mark loan as rejected
        if (vote === 'reject') {
            const { error: updateError } = await supabaseAdmin
                .from('loans')
                .update({ status: 'rejected' })
                .eq('loan_id', loanId);

            if (updateError) {
                console.error('Update loan to rejected error:', updateError);
                return NextResponse.json({ error: 'Failed to update loan status' }, { status: 500 });
            }

            return NextResponse.json({ success: true, vote, approved: false, rejected: true, sigCount: 0 });
        }

        // If APPROVE: count total approve votes and promote to 'approved' if >= 2
        const { count: approveCount, error: countError } = await supabaseAdmin
            .from('treasury_loan_votes')
            .select('*', { count: 'exact', head: true })
            .eq('loan_id', loanId)
            .eq('vote', 'approve');

        if (countError) {
            console.error('Count approvals error:', countError);
            return NextResponse.json({ error: 'Failed to count approvals' }, { status: 500 });
        }

        const count = approveCount ?? 0;
        let approved = false;

        if (count >= 2) {
            const { error: approveError } = await supabaseAdmin
                .from('loans')
                .update({ status: 'approved' })
                .eq('loan_id', loanId);

            if (approveError) {
                console.error('Update loan to approved error:', approveError);
                return NextResponse.json({ error: 'Failed to approve loan' }, { status: 500 });
            }
            approved = true;
        }

        return NextResponse.json({ success: true, vote, approved, rejected: false, sigCount: count });
    } catch (err: any) {
        console.error('Server error processing treasury vote:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
