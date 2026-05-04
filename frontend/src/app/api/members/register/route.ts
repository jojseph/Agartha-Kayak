import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    
    // Security Check: Verify the request is coming from your frontend
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }
    
    try {
        const { walletAddress, alias } = await request.json();

        // Validate inputs
        if (!walletAddress || !alias) {
            return NextResponse.json({ error: 'Wallet address and alias are required' }, { status: 400 });
        }

        // Insert the new member into Supabase
        const { data, error } = await supabaseAdmin
            .from('members')
            .insert([
                { 
                    wallet_address: walletAddress, 
                    alias: alias,
                    trust_score: 25.00 // The starting score for the Bayanihan Ledger
                }
            ])
            .select()
            .single();

        // Handle database errors
        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: 'Failed to insert into database' }, { status: 500 });
        }

        // Success!
        return NextResponse.json({ success: true, member: data });

    } catch (error) {
        console.error('Server error during registration:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}