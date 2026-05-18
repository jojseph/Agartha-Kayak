import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { collectPublicRecordWallets, formatQueueRecordForPublicBoard } from '@/lib/publicRecordFormatting';

export const revalidate = 0;

const LOAN_RECORD_TYPES = [
    'loan_approved',
    'loan_rejected',
    'peer_loan_approved',
    'peer_loan_rejected',
    'peer_loan_settled',
    'loan_defaulted',
];

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        let communityId: string | null = null;
        if (address) {
            const { data: member, error: memberError } = await supabaseAdmin
                .from('members')
                .select('community_id')
                .eq('wallet_address', address)
                .maybeSingle();

            if (memberError) {
                console.error('Error resolving dashboard member community:', memberError);
                return NextResponse.json({ error: 'Failed to resolve community' }, { status: 500 });
            }

            communityId = member?.community_id ?? null;
        }

        let query = supabaseAdmin
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

        if (communityId) {
            query = query.eq('community_id', communityId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching dashboard public records:', error);
            return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
        }

        const records = data || [];
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

        const loanReferenceIds = Array.from(new Set(
            records
                .filter((record: any) => LOAN_RECORD_TYPES.includes(record.record_type))
                .map((record: any) => record.reference_id)
                .filter(Boolean)
        ));
        let visibilityMap: Record<string, boolean> = {};

        if (loanReferenceIds.length > 0) {
            const { data: loans } = await supabaseAdmin
                .from('loans')
                .select('loan_id, is_public')
                .in('loan_id', loanReferenceIds);

            visibilityMap = (loans || []).reduce((acc: Record<string, boolean>, loan: any) => {
                acc[loan.loan_id] = Boolean(loan.is_public);
                return acc;
            }, {});
        }

        const formatted = records.map((record: any) => formatQueueRecordForPublicBoard(record, aliasMap, visibilityMap));

        return NextResponse.json({ records: formatted });
    } catch (error) {
        console.error('Error in dashboard records API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
