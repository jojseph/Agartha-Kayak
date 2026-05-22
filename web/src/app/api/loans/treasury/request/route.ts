import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const { borrowerAddress, amount, purpose, termMonths, repaymentFrequency, collateral } = await request.json();

        if (!borrowerAddress || !amount || !purpose) {
            return NextResponse.json({ error: 'Missing required fields: borrowerAddress, amount, purpose' }, { status: 400 });
        }

        if (borrowerAddress !== auth.walletAddress) {
            return NextResponse.json({ error: 'borrowerAddress must match the signing wallet' }, { status: 403 });
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
        }

        if (purpose.trim().length < 5) {
            return NextResponse.json({ error: 'Purpose must be at least 5 characters' }, { status: 400 });
        }

        if (!collateral || collateral.trim().length < 3) {
            return NextResponse.json({ error: 'Collateral declaration is required (e.g. "Samsung Galaxy S24", "Honda Click 125i")' }, { status: 400 });
        }

        const { data: borrower, error: borrowerError } = await supabaseAdmin
            .from('members')
            .select('wallet_address, community_id, alias')
            .eq('wallet_address', borrowerAddress)
            .single();

        if (borrowerError || !borrower) {
            return NextResponse.json({ error: 'Borrower not found' }, { status: 404 });
        }

        if (!borrower.community_id) {
            return NextResponse.json({ error: 'Borrower is not part of any community' }, { status: 400 });
        }

        const { data: community, error: communityError } = await supabaseAdmin
            .from('communities')
            .select('treasury_balance')
            .eq('community_id', borrower.community_id)
            .single();

        if (communityError || !community) {
            return NextResponse.json({ error: 'Community not found' }, { status: 404 });
        }

        if (community.treasury_balance < amount) {
            return NextResponse.json({ error: 'Requested amount exceeds available treasury balance' }, { status: 400 });
        }

        const { count: activeCount, error: activeCheckError } = await supabaseAdmin
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('borrower_address', borrowerAddress)
            .eq('loan_type', 'treasury')
            .in('status', ['pending', 'approved', 'active', 'overdue']);

        if (activeCheckError) {
            console.error('Active treasury loan check error:', activeCheckError);
            return NextResponse.json({ error: 'Failed to check existing loans' }, { status: 500 });
        }

        if ((activeCount ?? 0) > 0) {
            return NextResponse.json(
                { error: 'You already have an active treasury loan. Settle it before requesting another.' },
                { status: 409 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('loans')
            .insert([
                {
                    borrower_address: borrowerAddress,
                    lender_address: null,
                    loan_type: 'treasury',
                    mode: 'money',
                    amount: amount,
                    currency: 'PHP',
                    purpose: purpose.trim(),
                    term_months: termMonths || null,
                    repayment_frequency: repaymentFrequency || null,
                    collateral: collateral.trim(),
                    status: 'pending',
                    sigs_required: 2,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Insert treasury loan error:', error);
            return NextResponse.json({
                error: 'Failed to submit treasury loan request',
                detail: error.message,
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error submitting treasury loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
