import { supabaseAdmin } from "./supabaseAdmin";
//inig bayad pami
export async function updateTrustScore(walletAddress: string, points: number){
    const {data} = await supabaseAdmin
        .from('members')
        .select('trust_score')
        .eq('wallet_address', walletAddress)
        .single();

    const newScore = (data?.trust_score || 50) + points;

    await supabaseAdmin
        .from('members')
        .update({trust_score: Math.min(newScore, 100)}) //cap at 100
        .eq('wallet_address', walletAddress);

}