import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const q = url.searchParams.get('q');

        if (!q) {
            return NextResponse.json({ members: [] });
        }

        const { data, error } = await supabaseAdmin
            .from('members')
            .select('wallet_address, alias')
            .ilike('alias', `%${q}%`)
            .limit(10);

        if (error) {
            console.error('Search error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ members: data || [] });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
