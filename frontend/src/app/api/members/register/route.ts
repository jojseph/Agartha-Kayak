import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWalletSignature } from '@/lib/auth';

export async function POST(request: Request) {
    const sig = await verifyWalletSignature(request);
    if (sig instanceof NextResponse) return sig;
    
    try {
        const { walletAddress, alias, communityId, barangay, email } = await request.json();

        // Validate inputs
        console.log('REGISTER DEBUG:', { walletAddress, alias, communityId, barangay, email });
        if (!walletAddress || !alias || !communityId || !email) {
            return NextResponse.json({ error: 'Wallet address, alias, community, and email are required' }, { status: 400 });
        }

        if (walletAddress !== sig.walletAddress) {
            return NextResponse.json({ error: 'walletAddress in body must match the signing wallet' }, { status: 403 });
        }

        // members.wallet_address now FKs to wallets (phase4_wallets_identity) —
        // ensure the wallet identity exists before inserting the member.
        const { error: walletError } = await supabaseAdmin
            .from('wallets')
            .upsert({ wallet_address: walletAddress }, { onConflict: 'wallet_address', ignoreDuplicates: true });

        if (walletError) {
            console.error('Supabase wallet upsert error:', walletError);
            return NextResponse.json({ error: 'Failed to register wallet identity', details: walletError.message }, { status: 500 });
        }

        // Insert the new member into Supabase
        const { data, error } = await supabaseAdmin
            .from('members')
            .insert([
                { 
                    wallet_address: walletAddress, 
                    alias: alias,
                    email: email,
                    barangay: barangay || null,
                    community_id: communityId
                }
            ])
            .select()
            .single();

        // Handle database errors
        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: 'Failed to insert into database', details: error.message }, { status: 500 });
        }

        // Success!
        return NextResponse.json({ success: true, member: data });

    } catch (error) {
        console.error('Server error during registration:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
