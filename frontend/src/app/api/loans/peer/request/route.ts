import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }

    try {
        const { borrowerAddress, lenderAddress, mode, amount, itemName, date, time, purpose } = await request.json();

        if (!borrowerAddress || !lenderAddress || !purpose) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (mode === 'money' && (!amount || amount <= 0)) {
            return NextResponse.json({ error: 'Amount is required for money loans' }, { status: 400 });
        }

        if (mode === 'things' && !itemName) {
            return NextResponse.json({ error: 'Item name is required for things loans' }, { status: 400 });
        }

        // ── Record the loan request as pending in Supabase ────────────────────────────
        const { data, error } = await supabaseAdmin
            .from('loans')
            .insert([
                {
                    borrower_address: borrowerAddress,
                    lender_address: lenderAddress,
                    loan_type: 'peer',
                    mode: mode,
                    amount: mode === 'money' ? amount : null,
                    item_name: mode === 'things' ? itemName : null,
                    currency: 'PHP',
                    purpose: purpose,
                    needed_by_date: date || null,
                    needed_by_time: time || null,
                    status: 'pending', // Waiting for approval
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Insert peer loan request error:', error);
            return NextResponse.json({ 
                error: 'Failed to record loan request in the ledger.',
                detail: error.message,
                code: error.code,
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error creating peer loan request:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
