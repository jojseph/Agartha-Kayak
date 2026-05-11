import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, treasury_wallet_address, treasury_balance } = body;

        if (!name || !treasury_wallet_address) {
            return NextResponse.json({ error: 'Name and treasury wallet address are required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('communities')
            .insert([
                { 
                    name, 
                    treasury_wallet_address, 
                    treasury_balance: treasury_balance ? Number(treasury_balance) : 0 
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: 'Failed to create community', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, community: data });
    } catch (error) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { community_id, treasury_balance } = body;

        if (!community_id || treasury_balance === undefined) {
            return NextResponse.json({ error: 'Community ID and treasury balance are required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('communities')
            .update({ treasury_balance: Number(treasury_balance) })
            .eq('community_id', community_id)
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: 'Failed to update treasury balance', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, community: data });
    } catch (error) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
