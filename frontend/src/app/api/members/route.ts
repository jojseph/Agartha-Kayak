import {NextResponse} from 'next/server';
import {supabaseAdmin} from '@/lib/supabaseAdmin';
// i dunno if mu block bani
export async function GET(request: Request) {
    return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }
    
    try{
        const { walletAddress } = await request.json();

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        const {data, error} = await supabaseAdmin
            .from('members')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (error && error.code != 'PGRST116') { // PGRST116 means no rows found, which is fine
            console.error('Database error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ 
            exists: !!data,
            member: data
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
