import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
    return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function POST(request: Request) {
    try {
        const { walletAddress } = await request.json();

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('members')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (error && error.code != 'PGRST116') {
            console.error('Database error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({
            exists: !!data,
            member: data
        });

    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
