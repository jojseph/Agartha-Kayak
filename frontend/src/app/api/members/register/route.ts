import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    
    // Security Check: Verify the request is coming from your frontend
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }
    
    try {
        const { walletAddress, alias, barangay } = await request.json();

        // Validate inputs
        if (!walletAddress || !alias) {
            return NextResponse.json({ error: 'Wallet address and alias are required' }, { status: 400 });
        }

        // Auto-assign to a default community (create if doesn't exist)
        let communityId = null;
        const defaultCommunityName = 'Consolacion Cooperative';
        const defaultTreasuryAddress = 'addr_test1placeholder_treasury'; // Replace with real one if needed

        const { data: existingCommunity, error: communityError } = await supabaseAdmin
            .from('communities')
            .select('community_id')
            .eq('name', defaultCommunityName)
            .single();

        if (existingCommunity) {
            communityId = existingCommunity.community_id;
        } else {
            const { data: newCommunity, error: createError } = await supabaseAdmin
                .from('communities')
                .insert([
                    { name: defaultCommunityName, treasury_wallet_address: defaultTreasuryAddress }
                ])
                .select('community_id')
                .single();
            
            if (newCommunity) {
                communityId = newCommunity.community_id;
            } else {
                console.error('Failed to create default community:', createError);
            }
        }

        // Insert the new member into Supabase
        const { data, error } = await supabaseAdmin
            .from('members')
            .insert([
                { 
                    wallet_address: walletAddress, 
                    alias: alias,
                    barangay: barangay || null,
                    community_id: communityId,
                    trust_score: 25.00 // The starting score for the Bayanihan Ledger
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