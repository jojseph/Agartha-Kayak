import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('*')
            .eq('wallet_address', address)
            .single();

        if (memberError || !member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        const role = member.role;
        const activities: any[] = [];

        // 1. LOANS — borrower's own loans
        const { data: borrowedLoans } = await supabaseAdmin
            .from('loans')
            .select('*')
            .eq('borrower_address', address);
        
        // For treasury loans: fetch repayment totals to show progress
        const treasuryLoanIds = (borrowedLoans || [])
            .filter((l: any) => l.loan_type === 'treasury')
            .map((l: any) => l.loan_id);

        let repaymentTotalsMap: Record<string, number> = {};
        if (treasuryLoanIds.length > 0) {
            const { data: repaymentData } = await supabaseAdmin
                .from('repayments')
                .select('loan_id, amount')
                .in('loan_id', treasuryLoanIds)
                .eq('status', 'confirmed');
            (repaymentData || []).forEach((r: any) => {
                repaymentTotalsMap[r.loan_id] = (repaymentTotalsMap[r.loan_id] || 0) + Number(r.amount);
            });
        }

        if (borrowedLoans) {
            borrowedLoans.forEach(loan => {
                const totalRepaid = repaymentTotalsMap[loan.loan_id] || 0;
                const remainingBalance = Math.max(0, Number(loan.amount) - totalRepaid);
                activities.push({
                    id: `loan_b_${loan.loan_id}`,
                    type: loan.loan_type === 'treasury' ? 'treasury_loan' : 'peer_loan',
                    title: loan.loan_type === 'treasury' ? 'Treasury Loan' : 'Peer Loan Requested',
                    description: loan.purpose,
                    status: loan.status,
                    amount: loan.amount,
                    currency: loan.currency || 'PHP',
                    referenceId: loan.loan_id,
                    loanId: loan.loan_id,
                    loanType: loan.loan_type,
                    mode: loan.mode,
                    lenderAddress: loan.lender_address,
                    borrowerAddress: loan.borrower_address,
                    itemName: loan.item_name,
                    collateral: loan.collateral,
                    termMonths: loan.term_months,
                    repaymentFrequency: loan.repayment_frequency,
                    totalRepaid: loan.loan_type === 'treasury' ? totalRepaid : undefined,
                    remainingBalance: loan.loan_type === 'treasury' ? remainingBalance : undefined,
                    actorRole: 'member',
                    createdAt: loan.created_at,
                });
            });
        }

        const { data: lentLoans } = await supabaseAdmin
            .from('loans')
            .select('*')
            .eq('lender_address', address);
        
        if (lentLoans) {
            lentLoans.forEach(loan => {
                activities.push({
                    id: `loan_l_${loan.loan_id}`,
                    type: 'peer_loan_lender',
                    title: 'Peer Loan (You are Lender)',
                    description: loan.purpose,
                    status: loan.status,
                    amount: loan.amount,
                    currency: loan.currency || 'PHP',
                    referenceId: loan.loan_id,
                    loanId: loan.loan_id,
                    loanType: loan.loan_type,
                    mode: loan.mode,
                    lenderAddress: loan.lender_address,
                    borrowerAddress: loan.borrower_address,
                    itemName: loan.item_name,
                    isLender: true,
                    actorRole: 'member',
                    createdAt: loan.created_at,
                });
            });
        }

        // 2. REPAYMENTS — as borrower
        const { data: repaymentsPayer } = await supabaseAdmin
            .from('repayments')
            .select('*')
            .eq('payer_address', address);
        
        if (repaymentsPayer) {
            repaymentsPayer.forEach(rep => {
                activities.push({
                    id: `rep_p_${rep.repayment_id}`,
                    type: 'repayment_submitted',
                    title: 'Repayment Confirmed',
                    description: `Repayment confirmed via ${rep.method || 'cash'}`,
                    status: rep.status,
                    amount: rep.amount,
                    currency: 'PHP',
                    referenceId: rep.repayment_id,
                    actorRole: 'member',
                    createdAt: rep.confirmed_at || rep.repaid_at || new Date().toISOString(),
                });
            });
        }

        if (['elder', 'owner'].includes(role)) {
            // 3. TREASURY LOAN VOTES
            const { data: treasuryVotes } = await supabaseAdmin
                .from('treasury_loan_votes')
                .select('*, loans (purpose, amount)')
                .eq('elder_address', address);
            
            if (treasuryVotes) {
                treasuryVotes.forEach(vote => {
                    const loan = Array.isArray(vote.loans) ? vote.loans[0] : vote.loans;
                    activities.push({
                        id: `vote_${vote.id}`,
                        type: 'treasury_loan_vote',
                        title: 'Voted on Treasury Loan',
                        description: `Voted to ${vote.vote} loan for ${loan?.purpose || 'treasury'}`,
                        status: vote.vote === 'approve' ? 'Approved' : 'Rejected',
                        referenceId: vote.loan_id,
                        actorRole: role,
                        createdAt: vote.created_at,
                    });
                });
            }

            // 4. REPAYMENT CONFIRMATIONS
            const { data: confirmedRepayments } = await supabaseAdmin
                .from('repayments')
                .select('*')
                .eq('confirmed_by', address);
            
            if (confirmedRepayments) {
                confirmedRepayments.forEach(rep => {
                    activities.push({
                        id: `rep_c_${rep.repayment_id}`,
                        type: 'repayment_confirmed',
                        title: 'Confirmed Repayment',
                        description: `Confirmed repayment of amount ${rep.amount}`,
                        status: rep.status,
                        amount: rep.amount,
                        currency: 'PHP',
                        referenceId: rep.repayment_id,
                        actorRole: role,
                        createdAt: rep.confirmed_at || rep.repaid_at || new Date().toISOString(),
                    });
                });
            }

            // 5. RECONCILIATION SIGNATURES
            const { data: reconSigs } = await supabaseAdmin
                .from('reconciliation_signatures')
                .select('*, treasury_reconciliations (reason, proposed_balance)')
                .eq('elder_address', address);
            
            if (reconSigs) {
                reconSigs.forEach(sig => {
                    const recon = Array.isArray(sig.treasury_reconciliations) ? sig.treasury_reconciliations[0] : sig.treasury_reconciliations;
                    activities.push({
                        id: `recon_sig_${sig.id}`,
                        type: 'reconciliation_signature',
                        title: 'Signed Reconciliation',
                        description: `Signed to ${sig.decision} reconciliation: ${recon?.reason || ''}`,
                        status: sig.decision === 'approve' ? 'Approved' : 'Rejected',
                        referenceId: sig.reconciliation_id,
                        actorRole: role,
                        createdAt: sig.signed_at,
                    });
                });
            }

            // 6. ONCHAIN QUEUE FOR MEMBER APPROVALS / GAS APPROVALS
            const { data: queueRecords } = await supabaseAdmin
                .from('onchain_queue')
                .select('*')
                .eq('member_address', address)
                .in('record_type', ['member_approved', 'member_rejected', 'gas_topup_approved']);

            if (queueRecords) {
                queueRecords.forEach(queue => {
                    activities.push({
                        id: `queue_${queue.queue_id}`,
                        type: queue.record_type,
                        title: queue.record_type === 'gas_topup_approved' ? 'Approved Gas Top-Up' 
                               : queue.record_type === 'member_approved' ? 'Approved New Member'
                               : 'Rejected New Member',
                        description: queue.summary,
                        status: queue.record_type.includes('approved') ? 'Approved' : 'Rejected',
                        referenceId: queue.reference_id,
                        actorRole: role,
                        createdAt: queue.created_at,
                    });
                });
            }

            // 7. ELDER: Active treasury loans in community that need management
            // Elders see all community treasury loans they can act on (not their own)
            if (member.community_id) {
                const { data: communityTreasuryLoans } = await supabaseAdmin
                    .from('loans')
                    .select(`
                        *,
                        borrower:members!loans_borrower_address_fkey(alias, barangay)
                    `)
                    .eq('loan_type', 'treasury')
                    .in('status', ['approved', 'active', 'overdue'])
                    .neq('borrower_address', address); // exclude own loans

                // Filter to same community
                const communityTreasuryLoansFiltered = (communityTreasuryLoans || []).filter((loan: any) => {
                    // We need borrower to be in same community
                    // Pull via a separate check or trust the community_id join
                    return true; // all results from same community if we had a join; using neq as safety
                });

                // Get repayment totals for these loans
                const manageLoanIds = communityTreasuryLoansFiltered.map((l: any) => l.loan_id);
                let manageRepaymentMap: Record<string, number> = {};
                if (manageLoanIds.length > 0) {
                    const { data: mgmtRepayments } = await supabaseAdmin
                        .from('repayments')
                        .select('loan_id, amount')
                        .in('loan_id', manageLoanIds)
                        .eq('status', 'confirmed');
                    (mgmtRepayments || []).forEach((r: any) => {
                        manageRepaymentMap[r.loan_id] = (manageRepaymentMap[r.loan_id] || 0) + Number(r.amount);
                    });
                }

                communityTreasuryLoansFiltered.forEach((loan: any) => {
                    const totalRepaid = manageRepaymentMap[loan.loan_id] || 0;
                    const remainingBalance = Math.max(0, Number(loan.amount) - totalRepaid);
                    const borrowerAlias = (loan.borrower as any)?.alias || loan.borrower_address?.slice(0, 12) + '…';
                    activities.push({
                        id: `tloan_mgmt_${loan.loan_id}`,
                        type: 'treasury_loan_manage',
                        title: `Treasury Loan — ${borrowerAlias}`,
                        description: loan.purpose,
                        status: loan.status,
                        amount: loan.amount,
                        currency: loan.currency || 'PHP',
                        referenceId: loan.loan_id,
                        loanId: loan.loan_id,
                        loanType: 'treasury',
                        mode: 'money',
                        borrowerAddress: loan.borrower_address,
                        borrowerAlias,
                        collateral: loan.collateral,
                        termMonths: loan.term_months,
                        repaymentFrequency: loan.repayment_frequency,
                        totalRepaid,
                        remainingBalance,
                        isElderManaged: true,
                        actorRole: role,
                        createdAt: loan.created_at,
                    });
                });
            }
        }

        // Sort by created_at newest-first
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Map statuses to standard format for UI
        const normalizedActivities = activities.map(act => {
            let badgeStatus = act.status;
            if (act.status === 'pending') badgeStatus = 'Pending review';
            else if (act.status === 'approved' || act.status === 'confirmed') badgeStatus = 'Approved';
            else if (act.status === 'rejected') badgeStatus = 'Rejected';
            else if (act.status === 'active') badgeStatus = 'Active';
            else if (act.status === 'overdue') badgeStatus = 'Overdue';
            else if (act.status === 'fully_paid' || act.status === 'fully paid') badgeStatus = 'Fully paid';
            else if (act.status === 'defaulted') badgeStatus = 'Defaulted';
            else if (act.status === 'valid') badgeStatus = 'Valid';
            else if (act.status === 'invalid') badgeStatus = 'Invalid';

            return {
                ...act,
                statusBadge: badgeStatus,
            };
        });

        return NextResponse.json({ activities: normalizedActivities });
    } catch (err: any) {
        console.error('API Error in /api/activity:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
