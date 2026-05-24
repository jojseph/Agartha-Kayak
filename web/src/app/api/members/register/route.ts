import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {

    const headerAddress = request.headers.get('X-Wallet-Address');
    if (!headerAddress || !headerAddress.startsWith('addr')) {
        return NextResponse.json({ error: 'Missing or invalid X-Wallet-Address header' }, { status: 401 });
    }

    try {
        const { walletAddress, alias, communityId, barangay, email } = await request.json();

        if (!walletAddress || !alias || !communityId || !email) {
            return NextResponse.json({ error: 'Wallet address, alias, community, and email are required' }, { status: 400 });
        }

        if (walletAddress !== headerAddress) {
            return NextResponse.json({ error: 'walletAddress in body must match the authenticated wallet' }, { status: 403 });
        }

        const { error: walletError } = await supabaseAdmin
            .from('wallets')
            .upsert({ wallet_address: walletAddress }, { onConflict: 'wallet_address', ignoreDuplicates: true });

        if (walletError) {
            console.error('Supabase wallet upsert error:', walletError);
            return NextResponse.json({ error: 'Failed to register wallet identity', details: walletError.message }, { status: 500 });
        }

        const { data: existingMember } = await supabaseAdmin
            .from('members')
            .select('status')
            .eq('wallet_address', walletAddress)
            .single();

        if (existingMember && existingMember.status !== 'rejected') {
            return NextResponse.json({ error: 'Wallet is already registered and not rejected.' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('members')
            .upsert([
                {
                    wallet_address: walletAddress,
                    alias: alias,
                    email: email,
                    barangay: barangay || null,
                    community_id: communityId,
                    status: 'pending'
                }
            ], { onConflict: 'wallet_address' })
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: 'Failed to insert into database', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, member: data });

    } catch (error) {
        console.error('Server error during registration:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
