import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    // Note: in a real app, use better auth checks. 
    // If the frontend isn't sending it consistently, we can relax it for dev or ensure we send it.
    
    try {
        const url = new URL(request.url);
        const q = url.searchParams.get('q');
        const excludeAddress = url.searchParams.get('exclude'); // The current user

        // 1. Get the current user's community_id
        let userCommunityId = null;
        if (excludeAddress) {
            const { data: user, error: userError } = await supabaseAdmin
                .from('members')
                .select('community_id')
                .eq('wallet_address', excludeAddress)
                .single();
            
            if (user && user.community_id) {
                userCommunityId = user.community_id;
            }
        }

        let query = supabaseAdmin
            .from('members')
            .select('wallet_address, alias, trust_score, barangay');

        // 2. Filter by same organization
        if (userCommunityId) {
            query = query.eq('community_id', userCommunityId);
        }

        if (q) {
            query = query.ilike('alias', `%${q}%`);
        }
        
        if (excludeAddress) {
            query = query.neq('wallet_address', excludeAddress);
        }

        const { data, error } = await query.limit(50);

        if (error) {
            console.error('Search error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ members: data || [] });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
