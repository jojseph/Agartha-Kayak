import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabaseAdmin';
import {blockfrost} from '@/lib/blockfrost';

export async function GET(request: Request) {
    return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }

    try{
        const {txHash, borrowerAddress, amountLovelace, purpose} = await request.json();
        // minimum loan is 1M lovelace or 1 ADA
        if(amountLovelace < 1000000){
            return NextResponse.json({error: 'Bai.. Mao rani imo utangon, bai? magpa utang rakog 1,000,000 lovelace, bai'}, {status: 400});
        }

        const tx = await blockfrost.txs(txHash);

        if(!tx){
            return NextResponse.json({error: 'Transaction not found'}, {status:404});

        }

        //metadata here but optional for now

        // update to active if valid
        const {data, error} = await supabaseAdmin
            .from('loans')
            .insert([
                {
                    loan_id: txHash,
                    borrower_address: borrowerAddress,
                    amount_lovelace: amountLovelace,
                    purpose: purpose,
                    status: 'active'
                }
            ]);
        if (error) throw error;

        return NextResponse.json({success: true, message: 'Digital receipt recorded'});
    } catch (err){
        return NextResponse.json({error: 'Verification Failed, Bai'}, {status: 500});
    }
    

}
