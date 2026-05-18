import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const revalidate = 0; // Disable caching to always get live data

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('onchain_queue')
            .select(`
                *,
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

        const formattedRecords = data.map((record: any) => {
            // Extract amount from summary (e.g., "Treasury Loan ₱5,000 — purpose")
            const amountMatch = record.summary?.match(/₱([\d,]+(\.\d+)?)/);
            const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
            
            // Extract purpose from summary
            const purposeSplit = record.summary?.split('—');
            const purpose = purposeSplit && purposeSplit.length > 1 
                ? purposeSplit.slice(1).join('—').trim() 
                : record.summary || 'Network Transaction';

            // Determine type
            let type = 'member';
            if (record.record_type === 'loan_approved' || record.record_type === 'reconciliation_approved') {
                type = 'treasury';
            }

            return {
                id: record.queue_id,
                type,
                coop: record.communities?.name || 'Unknown Cooperative',
                purpose,
                amount,
                timestamp: new Date(record.created_at).toLocaleString('en-PH', { 
                    month: 'short', day: 'numeric', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit', timeZoneName: 'short' 
                }),
                hash: record.tx_hash || record.member_address || 'Pending Network Sync',
                status: record.status,
            };
        });

        return NextResponse.json({ records: formattedRecords });
    } catch (error) {
        console.error('Error in public records API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
