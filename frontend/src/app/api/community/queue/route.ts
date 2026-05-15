import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_BATCH_BYTES = 16384; // 16KB Cardano metadata limit

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
            .select('community_id')
            .eq('wallet_address', address)
            .single();

        if (memberError || !member || !member.community_id) {
            return NextResponse.json({ error: 'Member or community not found' }, { status: 404 });
        }

        const communityId = member.community_id;

        // Fetch all queue items for this community, ordered by status priority then creation time
        // Status priority: queued first, then batched, then etched (most recent)
        const { data: queueItems, error: queueError } = await supabaseAdmin
            .from('onchain_queue')
            .select('queue_id, record_type, reference_id, member_address, summary, estimated_bytes, status, batch_id, tx_hash, block_number, created_at, etched_at')
            .eq('community_id', communityId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (queueError) {
            console.error('Error fetching queue:', queueError);
            return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
        }

        const items = queueItems || [];

        // Get member aliases for display
        const memberAddresses = Array.from(new Set(items.map(i => i.member_address)));
        let aliasMap: Record<string, string> = {};

        if (memberAddresses.length > 0) {
            const { data: members } = await supabaseAdmin
                .from('members')
                .select('wallet_address, alias')
                .in('wallet_address', memberAddresses);

            aliasMap = (members || []).reduce((acc: Record<string, string>, m: any) => {
                acc[m.wallet_address] = m.alias;
                return acc;
            }, {});
        }

        // Enrich items with alias
        const enrichedItems = items.map(item => ({
            ...item,
            member_alias: aliasMap[item.member_address] || item.member_address.slice(0, 12) + '…',
        }));

        // Calculate batch stats for queued items only
        const queuedItems = items.filter(i => i.status === 'queued');
        const totalBytes = queuedItems.reduce((sum, i) => sum + (i.estimated_bytes || 200), 0);
        const batchCount = Math.max(1, Math.ceil(totalBytes / MAX_BATCH_BYTES));

        const batchStats = {
            queuedCount: queuedItems.length,
            totalBytes,
            maxBytes: MAX_BATCH_BYTES,
            percentFull: Math.min(100, (totalBytes / MAX_BATCH_BYTES) * 100),
            batchCount,
            willOverflow: totalBytes > MAX_BATCH_BYTES,
        };

        return NextResponse.json({ queue: enrichedItems, batchStats });
    } catch (err: any) {
        console.error('Server error fetching queue:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
