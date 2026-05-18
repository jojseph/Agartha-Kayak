import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { loanId, elderAddress, vote } = await request.json();

        if (!loanId || !elderAddress || !vote) {
            return NextResponse.json({ error: 'loanId, elderAddress, and vote are required' }, { status: 400 });
        }

        if (elderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'elderAddress must match the signing wallet' }, { status: 403 });
        }

        if (!['approve', 'reject'].includes(vote)) {
            return NextResponse.json({ error: 'vote must be "approve" or "reject"' }, { status: 400 });
        }

        // Verify caller is an elder OR owner (both can vote on treasury loans)
        const { data: voter, error: voterError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (voterError || !voter || !['elder', 'owner'].includes(voter.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can vote on treasury loans' }, { status: 403 });
        }

        // Verify the loan exists, is treasury type, is still pending
        const { data: loan, error: loanError } = await supabaseAdmin
            .from('loans')
            .select(`
                loan_id, loan_type, status, borrower_address,
                borrower:members!loans_borrower_address_fkey(community_id)
            `)
            .eq('loan_id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
        }

        // Block self-voting: an Elder cannot vote on their own treasury loan request (TODO.md #1)
        if (loan.borrower_address === auth.walletAddress) {
            return NextResponse.json({ error: 'You cannot vote on your own loan request' }, { status: 403 });
        }

        if (loan.loan_type !== 'treasury') {
            return NextResponse.json({ error: 'This is not a treasury loan' }, { status: 400 });
        }

        if (loan.status !== 'pending') {
            return NextResponse.json({ error: 'This loan is no longer pending' }, { status: 400 });
        }

        // Ensure voter is in the same community as the borrower
        const borrowerCommunityId = (loan.borrower as any)?.community_id;
        if (borrowerCommunityId !== voter.community_id) {
            return NextResponse.json({ error: 'Voter is not in the same community as the borrower' }, { status: 403 });
        }

        // Check if voter already voted
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

        // --- Majority Resolution Logic (>50% of Elders + Owner) ---

        // Count total eligible voters in this community (all elders + owner)
        const { count: totalVoters, error: voterCountError } = await supabaseAdmin
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', voter.community_id)
            .in('role', ['elder', 'owner'])
            .eq('status', 'approved');

        if (voterCountError) {
            console.error('Count eligible voters error:', voterCountError);
            return NextResponse.json({ error: 'Failed to count eligible voters' }, { status: 500 });
        }

        const totalEligible = totalVoters ?? 0;
        const majorityThreshold = Math.floor(totalEligible / 2) + 1; // >50%

        // Count approve votes so far
        const { count: approveCount, error: approveCountError } = await supabaseAdmin
            .from('treasury_loan_votes')
            .select('*', { count: 'exact', head: true })
            .eq('loan_id', loanId)
            .eq('vote', 'approve');

        if (approveCountError) {
            console.error('Count approvals error:', approveCountError);
            return NextResponse.json({ error: 'Failed to count approvals' }, { status: 500 });
        }

        // Count reject votes so far
        const { count: rejectCount, error: rejectCountError } = await supabaseAdmin
            .from('treasury_loan_votes')
            .select('*', { count: 'exact', head: true })
            .eq('loan_id', loanId)
            .eq('vote', 'reject');

        if (rejectCountError) {
            console.error('Count rejections error:', rejectCountError);
            return NextResponse.json({ error: 'Failed to count rejections' }, { status: 500 });
        }

        const approves = approveCount ?? 0;
        const rejects = rejectCount ?? 0;
        let approved = false;
        let rejected = false;

        // Check if majority approved
        if (approves >= majorityThreshold) {
            const { error: approveError } = await supabaseAdmin
                .from('loans')
                .update({ status: 'approved' })
                .eq('loan_id', loanId);

            if (approveError) {
                console.error('Update loan to approved error:', approveError);
                return NextResponse.json({ error: 'Failed to approve loan' }, { status: 500 });
            }
            approved = true;

            // Enqueue the approval receipt for on-chain etching
            const { data: approvedLoan } = await supabaseAdmin
                .from('loans')
                .select('amount, purpose, borrower_address, collateral, term_months, currency, mode')
                .eq('loan_id', loanId)
                .single();

            // Fetch all wallets that voted to approve this loan
            const { data: approveVotes } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('elder_address')
                .eq('loan_id', loanId)
                .eq('vote', 'approve');

            const approverAddressList = (approveVotes ?? []).map((v: any) => v.elder_address);

            if (approvedLoan) {
                await enqueueReceipt({
                    communityId: voter.community_id,
                    recordType: 'loan_approved',
                    referenceId: loanId,
                    memberAddress: approvedLoan.borrower_address,
                    loanType: 'TRS',
                    mode: 'M',
                    amount: approvedLoan.amount,
                    currency: approvedLoan.currency ?? 'PHP',
                    purpose: approvedLoan.purpose,
                    collateral: approvedLoan.collateral,
                    termMonths: approvedLoan.term_months,
                    approvedBy: approverAddressList,
                });
            }
        }
        // Check if rejection is mathematically certain (remaining votes can't save it)
        else if (rejects >= majorityThreshold) {
            const { error: rejectError } = await supabaseAdmin
                .from('loans')
                .update({ status: 'rejected' })
                .eq('loan_id', loanId);

            if (rejectError) {
                console.error('Update loan to rejected error:', rejectError);
                return NextResponse.json({ error: 'Failed to reject loan' }, { status: 500 });
            }
            rejected = true;

            // Enqueue the rejection receipt for on-chain etching
            const { data: rejectedLoan } = await supabaseAdmin
                .from('loans')
                .select('amount, purpose, borrower_address, collateral, term_months, currency, mode')
                .eq('loan_id', loanId)
                .single();

            // Fetch all wallets that voted to reject this loan
            const { data: rejectVotes } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('elder_address')
                .eq('loan_id', loanId)
                .eq('vote', 'reject');

            const rejecterAddressList = (rejectVotes ?? []).map((v: any) => v.elder_address);

            // Also fetch approve votes so far for full record transparency
            const { data: approveVotesOnReject } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('elder_address')
                .eq('loan_id', loanId)
                .eq('vote', 'approve');

            const approverAddressesOnReject = (approveVotesOnReject ?? []).map((v: any) => v.elder_address);

            if (rejectedLoan) {
                await enqueueReceipt({
                    communityId: voter.community_id,
                    recordType: 'loan_rejected',
                    referenceId: loanId,
                    memberAddress: rejectedLoan.borrower_address,
                    loanType: 'TRS',
                    mode: 'M',
                    amount: rejectedLoan.amount,
                    currency: rejectedLoan.currency ?? 'PHP',
                    purpose: rejectedLoan.purpose,
                    collateral: rejectedLoan.collateral,
                    termMonths: rejectedLoan.term_months,
                    rejectedBy: rejecterAddressList,
                    approvedBy: approverAddressesOnReject,
                    action: 'reject',
                });
            }
        }

        return NextResponse.json({
            success: true,
            vote,
            approved,
            rejected,
            approveCount: approves,
            rejectCount: rejects,
            totalEligible,
            majorityThreshold,
        });
    } catch (err: any) {
        console.error('Server error processing treasury vote:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

