import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        
        // Fetch loans, joining with members to get aliases
        const { data, error } = await supabaseAdmin
            .from('loans')
            .select('*, borrower:members!loans_borrower_address_fkey(alias), lender:members!loans_lender_address_fkey(alias)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching dashboard records:', error);
            return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
        }

        const formatted = data.map((loan: any) => {
            let fromName = '';
            let toName = loan.borrower?.alias || 'Unknown Borrower';
            
            if (loan.loan_type === 'treasury') {
                fromName = 'Cooperative Treasury';
            } else {
                fromName = loan.lender?.alias || 'Unknown Lender';
            }

            // Create a shorter version of the txHash or ID for the UI
            const displayHash = loan.tx_hash 
                ? loan.tx_hash.substring(0, 6) + '…' + loan.tx_hash.substring(loan.tx_hash.length - 4)
                : loan.loan_id.substring(0, 6) + '…' + loan.loan_id.substring(loan.loan_id.length - 4);

            return {
                id: loan.loan_id,
                fullHash: loan.tx_hash || loan.loan_id,
                displayHash,
                type: loan.loan_type === 'treasury' ? 'treasury' : 'member',
                purpose: loan.purpose || 'Unknown',
                amount: loan.amount,
                fromName,
                toName,
                timestampStr: new Date(loan.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' — ' + new Date(loan.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                shortDate: new Date(loan.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric' }),
                isPublic: loan.is_public || false
            };
        });

        return NextResponse.json({ records: formatted });
    } catch (error) {
        console.error('Error in dashboard records API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
