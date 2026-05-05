import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('loans')
            .select('*')
            .or(`borrower_address.eq.${address},lender_address.eq.${address}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch user loans error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ loans: data || [] });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
