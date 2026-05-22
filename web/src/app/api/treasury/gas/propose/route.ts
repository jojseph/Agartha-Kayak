import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

export async function POST(request: Request) {
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { amount, reason } = await request.json();
        const proposerAddress = auth.walletAddress;

        if (!amount || amount <= 0 || !reason) {
            return NextResponse.json({ error: 'Valid amount and reason are required' }, { status: 400 });
        }

        const { data: member, error: memberError } = await supabaseAdmin
            .from('members')
            .select('role, community_id')
            .eq('wallet_address', proposerAddress)
            .single();

        if (memberError || !member || !['elder', 'owner'].includes(member.role)) {
            return NextResponse.json({ error: 'Only elders and the owner can propose gas top-ups' }, { status: 403 });
        }

        const { data: proposal, error: insertError } = await supabaseAdmin
            .from('gas_topup_proposals')
            .insert([{
                community_id: member.community_id,
                proposed_by: proposerAddress,
                amount: amount,
                reason: reason,
                sigs_required: 1,
                status: 'pending'
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Insert gas proposal error:', insertError);
            return NextResponse.json({ error: 'Failed to create gas proposal', detail: insertError.message }, { status: 500 });
        }

        await enqueueReceipt({
            communityId: member.community_id,
            recordType: 'gas_topup_proposed',
            referenceId: member.community_id,
            memberAddress: proposerAddress,
            amount,
            currency: 'tADA',
            purpose: `Proposal ${proposal.id}: ${reason}`,
            role: member.role,
            action: 'propose',
        });

        return NextResponse.json({ success: true, proposal });
    } catch (err: any) {
        console.error('Server error creating gas proposal:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
