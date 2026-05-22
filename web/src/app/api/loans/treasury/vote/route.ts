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

        const { data: voter, error: voterError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (voterError || !voter || !['elder', 'owner'].includes(voter.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can vote on treasury loans' }, { status: 403 });
        }

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

        if (loan.borrower_address === auth.walletAddress) {
            return NextResponse.json({ error: 'You cannot vote on your own loan request' }, { status: 403 });
        }

        if (loan.loan_type !== 'treasury') {
            return NextResponse.json({ error: 'This is not a treasury loan' }, { status: 400 });
        }

        const borrowerCommunityId = (loan.borrower as any)?.community_id;
        if (borrowerCommunityId !== voter.community_id) {
            return NextResponse.json({ error: 'Voter is not in the same community as the borrower' }, { status: 403 });
        }

        const { count: totalVoters, error: voterCountError } = await supabaseAdmin
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', voter.community_id)
            .in('role', ['elder', 'owner'])
            .eq('status', 'approved')
            .neq('wallet_address', loan.borrower_address);

        if (voterCountError) {
            console.error('Count eligible voters error:', voterCountError);
            return NextResponse.json({ error: 'Failed to count eligible voters' }, { status: 500 });
        }

        const totalEligible = totalVoters ?? 0;
        const majorityThreshold = Math.floor(totalEligible / 2) + 1;

        const voteSummary = async () => {
            const { count: approveCount, error: approveCountError } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('*', { count: 'exact', head: true })
                .eq('loan_id', loanId)
                .eq('vote', 'approve');

            if (approveCountError) {
                throw approveCountError;
            }

            const { count: rejectCount, error: rejectCountError } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('*', { count: 'exact', head: true })
                .eq('loan_id', loanId)
                .eq('vote', 'reject');

            if (rejectCountError) {
                throw rejectCountError;
            }

            return {
                approves: approveCount ?? 0,
                rejects: rejectCount ?? 0,
            };
        };

        const { data: existingVote, error: existingVoteError } = await supabaseAdmin
            .from('treasury_loan_votes')
            .select('id, vote')
            .eq('loan_id', loanId)
            .eq('elder_address', elderAddress)
            .maybeSingle();

        if (existingVoteError) {
            console.error('Fetch existing vote error:', existingVoteError);
            return NextResponse.json({ error: 'Failed to check existing vote' }, { status: 500 });
        }

        if (existingVote) {
            const { approves, rejects } = await voteSummary();
            if (existingVote.vote === vote) {
                return NextResponse.json({
                    success: true,
                    vote,
                    alreadyVoted: true,
                    approved: loan.status === 'approved',
                    rejected: loan.status === 'rejected',
                    approveCount: approves,
                    rejectCount: rejects,
                    totalEligible,
                    majorityThreshold,
                });
            }

            return NextResponse.json({
                error: `You have already ${existingVote.vote === 'approve' ? 'approved' : 'rejected'} this loan request`,
                alreadyVoted: true,
                existingVote: existingVote.vote,
                approveCount: approves,
                rejectCount: rejects,
                totalEligible,
                majorityThreshold,
            }, { status: 409 });
        }

        if (loan.status !== 'pending') {
            return NextResponse.json({ error: 'This loan is no longer pending' }, { status: 400 });
        }

        const { error: insertError } = await supabaseAdmin
            .from('treasury_loan_votes')
            .insert([{ loan_id: loanId, elder_address: elderAddress, vote }]);

        if (insertError) {
            if (insertError.code === '23505') {
                const { data: racedVote } = await supabaseAdmin
                    .from('treasury_loan_votes')
                    .select('vote')
                    .eq('loan_id', loanId)
                    .eq('elder_address', elderAddress)
                    .maybeSingle();
                const { approves, rejects } = await voteSummary();

                if (racedVote?.vote === vote) {
                    return NextResponse.json({
                        success: true,
                        vote,
                        alreadyVoted: true,
                        approved: loan.status === 'approved',
                        rejected: loan.status === 'rejected',
                        approveCount: approves,
                        rejectCount: rejects,
                        totalEligible,
                        majorityThreshold,
                    });
                }

                return NextResponse.json({
                    error: 'You have already voted on this loan request',
                    alreadyVoted: true,
                    existingVote: racedVote?.vote,
                    approveCount: approves,
                    rejectCount: rejects,
                    totalEligible,
                    majorityThreshold,
                }, { status: 409 });
            }
            console.error('Insert vote error:', insertError);
            return NextResponse.json({ error: 'Failed to record vote', detail: insertError.message }, { status: 500 });
        }

        const { count: approveCount, error: approveCountError } = await supabaseAdmin
            .from('treasury_loan_votes')
            .select('*', { count: 'exact', head: true })
            .eq('loan_id', loanId)
            .eq('vote', 'approve');

        if (approveCountError) {
            console.error('Count approvals error:', approveCountError);
            return NextResponse.json({ error: 'Failed to count approvals' }, { status: 500 });
        }

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

        await enqueueReceipt({
            communityId: voter.community_id,
            recordType: 'vote_cast',
            referenceId: loanId,
            memberAddress: elderAddress,
            role: voter.role,
            action: vote,
            approvedBy: vote === 'approve' ? [elderAddress] : undefined,
            rejectedBy: vote === 'reject' ? [elderAddress] : undefined,
        });

        const remainingVotes = totalEligible - (approves + rejects);
        const maxPossibleApproves = approves + remainingVotes;

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

            const { data: approvedLoan } = await supabaseAdmin
                .from('loans')
                .select('amount, purpose, borrower_address, collateral, term_months, currency, mode')
                .eq('loan_id', loanId)
                .single();

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

        else if (maxPossibleApproves < majorityThreshold) {
            const { error: rejectError } = await supabaseAdmin
                .from('loans')
                .update({ status: 'rejected' })
                .eq('loan_id', loanId);

            if (rejectError) {
                console.error('Update loan to rejected error:', rejectError);
                return NextResponse.json({ error: 'Failed to reject loan' }, { status: 500 });
            }
            rejected = true;

            const { data: rejectedLoan } = await supabaseAdmin
                .from('loans')
                .select('amount, purpose, borrower_address, collateral, term_months, currency, mode')
                .eq('loan_id', loanId)
                .single();

            const { data: rejectVotes } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('elder_address')
                .eq('loan_id', loanId)
                .eq('vote', 'reject');

            const rejecterAddressList = (rejectVotes ?? []).map((v: any) => v.elder_address);

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

