import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', address)
            .single();

        if (memberError || !member || !['elder', 'owner'].includes(member.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can view reconciliations' }, { status: 403 });
        }

        const { data: reconciliations, error: reconError } = await supabaseAdmin
            .from('treasury_reconciliations')
            .select(`
                *,
                proposer:members!treasury_reconciliations_proposed_by_fkey(alias, wallet_address),
                signatures:reconciliation_signatures(elder_address, decision, signed_at)
            `)
            .eq('community_id', member.community_id)
            .order('created_at', { ascending: false });

        if (reconError) {
            console.error('Fetch reconciliations error:', reconError);
            return NextResponse.json({ error: 'Failed to fetch reconciliations', detail: reconError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, reconciliations: reconciliations ?? [] });
    } catch (err: any) {
        console.error('Server error fetching reconciliations:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
