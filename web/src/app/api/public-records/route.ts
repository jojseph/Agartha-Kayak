import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { collectPublicRecordWallets, formatQueueRecordForPublicBoard } from '@/lib/publicRecordFormatting';
import { hydratePublicRecordProofs } from '@/lib/publicRecordProof';

export const revalidate = 0;

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('onchain_queue')
            .select(`
                queue_id,
                community_id,
                record_type,
                reference_id,
                member_address,
                summary,
                estimated_bytes,
                status,
                batch_id,
                tx_hash,
                block_number,
                created_at,
                etched_at,
                onchain_payload,
                communities (
                    name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching public records:', error);
            return NextResponse.json({ error: 'Failed to fetch public records' }, { status: 500 });
        }

        const records = await hydratePublicRecordProofs(data || []);
        const walletAddresses = collectPublicRecordWallets(records as any[]);
        let aliasMap: Record<string, string> = {};

        if (walletAddresses.length > 0) {
            const { data: members } = await supabaseAdmin
                .from('members')
                .select('wallet_address, alias')
                .in('wallet_address', walletAddresses);

            aliasMap = (members || []).reduce((acc: Record<string, string>, member: any) => {
                acc[member.wallet_address] = member.alias;
                return acc;
            }, {});
        }

        const formattedRecords = records.map((record: any) => formatQueueRecordForPublicBoard(record, aliasMap));

        return NextResponse.json({ records: formattedRecords });
    } catch (error) {
        console.error('Error in public records API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
