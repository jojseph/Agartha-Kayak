import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWalletAuth } from '@/lib/auth';

export async function PATCH(request: Request) {
    const auth = await verifyWalletAuth(request, { role: ['superuser'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await request.json();
        const { wallet_address, role } = body;

        if (!wallet_address || !role) {
            return NextResponse.json({ error: 'Wallet address and role are required' }, { status: 400 });
        }

        if (role !== 'member' && role !== 'elder') {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('members')
            .update({ role })
            .eq('wallet_address', wallet_address)
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: 'Failed to update member role', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, member: data });
    } catch (error) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
