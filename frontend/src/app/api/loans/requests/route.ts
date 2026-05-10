import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    // Basic auth check
    
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address'); // The person receiving requests

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('loans')
            .select(`
                *,
                borrower:members!loans_borrower_address_fkey(alias, barangay)
            `)
            .eq('lender_address', address)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch loan requests error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ requests: data || [] });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
