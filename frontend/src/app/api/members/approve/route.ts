import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }
    
    try {
        const { elderAddress, memberAddress, action } = await request.json();

        if (!elderAddress || !memberAddress || !action) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        if (action !== 'approved' && action !== 'rejected') {
            return NextResponse.json({ error: 'Invalid action. Must be "approved" or "rejected".' }, { status: 400 });
        }

        // Verify that the requester is an elder
        const { data: elderData, error: elderError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', elderAddress)
            .single();

        if (elderError || !elderData) {
            return NextResponse.json({ error: 'Could not verify elder status' }, { status: 500 });
        }

        if (elderData.role !== 'elder') {
            return NextResponse.json({ error: 'Forbidden. Only elders can approve members.' }, { status: 403 });
        }

        // Update the member's status
        const { error: updateError } = await supabaseAdmin
            .from('members')
            .update({ status: action })
            .eq('wallet_address', memberAddress)
            .eq('community_id', elderData.community_id);

        if (updateError) {
            console.error('Update member status error:', updateError);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ success: true, action });
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
