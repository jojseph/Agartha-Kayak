import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const elderAddress = url.searchParams.get('address'); 

        if (!elderAddress) {
            return NextResponse.json({ error: 'Elder wallet address is required' }, { status: 400 });
        }

        // Verify that the requester is an elder and get their community_id
        const { data: elderData, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elderData) {
            return NextResponse.json({ error: 'Could not verify elder status' }, { status: 500 });
        }

        if (!['elder', 'owner'].includes(elderData.role)) {
            return NextResponse.json({ error: 'Forbidden. Only elders and owners can view pending members.' }, { status: 403 });
        }

        // Fetch pending and rejected members for that community
        const { data: pendingMembers, error: pendingError } = await supabaseAdmin
            .from('members')
            .select('*')
            .eq('community_id', elderData.community_id)
            .in('status', ['pending', 'rejected'])
            .order('created_at', { ascending: false });

        if (pendingError) {
            console.error('Fetch pending members error:', pendingError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ members: pendingMembers || [] });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
