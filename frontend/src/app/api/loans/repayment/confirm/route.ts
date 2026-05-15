import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWalletAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';
import { adjustTreasuryBalance } from '@/lib/balanceOps';

// POST: Elder/Owner confirms (or rejects) a pending repayment
export async function POST(request: Request) {
    const auth = await verifyWalletAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { repaymentId, elderAddress, action } = await request.json();

        if (!repaymentId || !elderAddress || !action) {
            return NextResponse.json({ error: 'repaymentId, elderAddress, and action are required' }, { status: 400 });
        }

        if (elderAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'elderAddress must match the signing wallet' }, { status: 403 });
        }

        if (!['confirmed', 'rejected'].includes(action)) {
            return NextResponse.json({ error: 'action must be "confirmed" or "rejected"' }, { status: 400 });
        }

        // Verify caller is an elder or owner
        const { data: elder, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elder || !['elder', 'owner'].includes(elder.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can confirm repayments' }, { status: 403 });
        }

        // Get the repayment
        const { data: repayment, error: repaymentError } = await supabaseAdmin
            .from('repayments')
            .select('*, loan:loans!repayments_loan_id_fkey(loan_id, borrower_address, amount, loan_type, status)')
            .eq('repayment_id', repaymentId)
            .single();

        if (repaymentError || !repayment) {
            return NextResponse.json({ error: 'Repayment not found' }, { status: 404 });
        }

        if (repayment.status !== 'pending') {
            return NextResponse.json({ error: `This repayment has already been ${repayment.status}` }, { status: 400 });
        }

        // Verify elder is in the same community as the borrower
        const { data: borrower } = await supabaseAdmin
            .from('members')
            .select('community_id')
            .eq('wallet_address', (repayment.loan as any)?.borrower_address)
            .single();

        if (borrower?.community_id !== elder.community_id) {
            return NextResponse.json({ error: 'You are not in the same community as this borrower' }, { status: 403 });
        }

        // Update the repayment status
        const { error: updateError } = await supabaseAdmin
            .from('repayments')
            .update({
                status: action,
                confirmed_by: elderAddress,
                confirmed_at: new Date().toISOString(),
            })
            .eq('repayment_id', repaymentId);

        if (updateError) {
            console.error('Update repayment status error:', updateError);
            return NextResponse.json({ error: 'Failed to update repayment' }, { status: 500 });
        }

        // If confirmed, check if the loan is now fully paid
        if (action === 'confirmed') {
            const loan = repayment.loan as any;

            // Enqueue the repayment receipt for on-chain etching
            await enqueueReceipt({
                communityId: elder.community_id,
                recordType: 'repayment_confirmed',
                referenceId: repaymentId,
                memberAddress: repayment.payer_address,
                summary: `Repayment \u20b1${Number(repayment.amount).toLocaleString()} confirmed \u2014 ${loan.loan_type === 'treasury' ? 'Treasury' : 'P2P'} Loan`,
                estimatedBytes: 240,
            });

            // Get all confirmed repayments for this loan (including the one we just confirmed)
            const { data: allConfirmed } = await supabaseAdmin
                .from('repayments')
                .select('amount')
                .eq('loan_id', loan.loan_id)
                .eq('status', 'confirmed');

            const totalRepaid = (allConfirmed || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
            const loanAmount = Number(loan.amount);

            if (totalRepaid >= loanAmount) {
                // Mark loan as fully paid
                await supabaseAdmin
                    .from('loans')
                    .update({ status: 'fully_paid' })
                    .eq('loan_id', loan.loan_id);

                // If it's a treasury loan, add the repaid amount back to the community treasury
                if (loan.loan_type === 'treasury') {
                    // Log the repayment as a community transaction
                    await supabaseAdmin
                        .from('community_transactions')
                        .insert([{
                            community_id: elder.community_id,
                            member_address: loan.borrower_address,
                            loan_id: loan.loan_id,
                            repayment_id: repaymentId,
                            transaction_type: 'repayment',
                            amount: Number(repayment.amount),
                            description: `Repayment confirmed for treasury loan (FULLY PAID)`,
                        }]);

                    // Atomically credit the treasury with the final repayment
                    await adjustTreasuryBalance(elder.community_id, Number(repayment.amount));
                }

                return NextResponse.json({
                    success: true,
                    action,
                    loanFullyPaid: true,
                    totalRepaid,
                    loanAmount,
                });
            }

            // Partial repayment — if treasury loan, still credit the treasury
            if (loan.loan_type === 'treasury') {
                await supabaseAdmin
                    .from('community_transactions')
                    .insert([{
                        community_id: elder.community_id,
                        member_address: loan.borrower_address,
                        loan_id: loan.loan_id,
                        repayment_id: repaymentId,
                        transaction_type: 'repayment',
                        amount: Number(repayment.amount),
                        description: `Repayment confirmed for treasury loan`,
                    }]);

                // Atomically credit the treasury with the partial repayment
                await adjustTreasuryBalance(elder.community_id, Number(repayment.amount));
            }

            return NextResponse.json({
                success: true,
                action,
                loanFullyPaid: false,
                totalRepaid,
                loanAmount,
                remaining: loanAmount - totalRepaid,
            });
        }

        // If rejected
        return NextResponse.json({ success: true, action, message: 'Repayment rejected by Elder.' });
    } catch (err: any) {
        console.error('Server error confirming repayment:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
