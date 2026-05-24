import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

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

        const response = NextResponse.json({ requests: data || [] });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
