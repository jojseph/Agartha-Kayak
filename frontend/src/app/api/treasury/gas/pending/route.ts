import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        // Get member's community_id
        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('community_id, role')
            .eq('wallet_address', address)
            .single();

        if (memberError || !member || !['elder', 'owner'].includes(member.role)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Fetch pending or approved gas proposals
        const { data: proposals, error: propError } = await supabaseAdmin
            .from('gas_topup_proposals')
            .select(`
                *,
                signatures:gas_topup_signatures(count),
                my_signature:gas_topup_signatures(signer_address)
            `)
            .eq('community_id', member.community_id)
            .in('status', ['pending', 'approved'])
            .order('created_at', { ascending: false });

        if (propError) {
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Format for frontend
        const formatted = proposals.map(p => {
            const hasSigned = p.my_signature.some((sig: any) => sig.signer_address === address);
            return {
                ...p,
                has_signed: hasSigned,
                signature_count: p.signatures[0]?.count ?? 0
            };
        });

        return NextResponse.json({ proposals: formatted });
    } catch (err: any) {
        console.error('Server error fetching pending gas proposals:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
