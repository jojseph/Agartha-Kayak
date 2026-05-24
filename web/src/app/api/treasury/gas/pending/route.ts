import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const { data: members, error: memberError } = await supabase
            .from('members')
            .select('community_id, role')
            .eq('wallet_address', address)
            .in('role', ['elder', 'owner'])
            .order('created_at', { ascending: false })
            .limit(1);

        const member = members?.[0];

        if (memberError || !member) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const { data: proposals, error: propError } = await supabase
            .from('gas_topup_proposals')
            .select('*')
            .eq('community_id', member.community_id)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false });

        if (propError) {
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const formatted = await Promise.all(proposals.map(async (p: any) => {
            const { count } = await supabase
                .from('gas_topup_signatures')
                .select('*', { count: 'exact', head: true })
                .eq('proposal_id', p.id);

            const { data: mySigs } = await supabase
                .from('gas_topup_signatures')
                .select('signer_address')
                .eq('proposal_id', p.id)
                .eq('signer_address', address);

            return {
                ...p,
                has_signed: (mySigs?.length ?? 0) > 0,
                signature_count: count ?? 0
            };
        }));

        const response = NextResponse.json({ proposals: formatted });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
