import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_BATCH_BYTES = 16384;

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
            process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            {
                global: {
                    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
                },
            }
        );

        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('community_id')
            .eq('wallet_address', address)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (memberError || !member || !member.community_id) {
            return NextResponse.json({ error: 'Member or community not found' }, { status: 404 });
        }

        const communityId = member.community_id;

        const { data: queueItems, error: queueError } = await supabase
            .from('onchain_queue')
            .select('queue_id, record_type, reference_id, member_address, summary, estimated_bytes, status, batch_id, tx_hash, block_number, created_at, etched_at')
            .eq('community_id', communityId)
            .in('status', ['queued', 'batched', 'failed'])
            .order('created_at', { ascending: false })
            .limit(50);

        if (queueError) {
            console.error('Error fetching queue:', queueError);
            return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
        }

        const items = queueItems || [];

        const memberAddresses = Array.from(new Set(items.map(i => i.member_address)));
        let aliasMap: Record<string, string> = {};

        if (memberAddresses.length > 0) {
            const { data: members } = await supabase
                .from('members')
                .select('wallet_address, alias')
                .in('wallet_address', memberAddresses);

            aliasMap = (members || []).reduce((acc: Record<string, string>, m: any) => {
                acc[m.wallet_address] = m.alias;
                return acc;
            }, {});
        }

        const enrichedItems = items.map(item => ({
            ...item,
            member_alias: aliasMap[item.member_address] || item.member_address.slice(0, 12) + '…',
        }));

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

        const response = NextResponse.json({ queue: enrichedItems, batchStats });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
    } catch (err: any) {
        console.error('Server error fetching queue:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
