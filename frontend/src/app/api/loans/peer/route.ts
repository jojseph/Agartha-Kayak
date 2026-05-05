import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }

    try {
        const { borrowerAddress, lenderAddress, amount, currency, purpose, proof_url } = await request.json();

        if (!borrowerAddress || !lenderAddress || !amount || !purpose) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('loans')
            .insert([
                {
                    borrower_address: borrowerAddress,
                    lender_address: lenderAddress,
                    loan_type: 'peer',
                    amount: amount,
                    currency: currency || 'Php',
                    purpose: purpose,
                    status: 'pending',
                    proof_url: proof_url,
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Insert peer loan error:', error);
            return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err) {
        console.error('Server error creating peer loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
