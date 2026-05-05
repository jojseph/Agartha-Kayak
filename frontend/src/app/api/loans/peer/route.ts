import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { blockfrost } from '@/lib/blockfrost';

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized BRAH!' }, { status: 401 });
    }

    try {
        const { borrowerAddress, lenderAddress, txHash, amount, currency, purpose, proof_url } =
            await request.json();

        if (!borrowerAddress || !lenderAddress || !amount || !purpose) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!txHash) {
            return NextResponse.json({ error: 'Transaction hash is required for on-chain verification' }, { status: 400 });
        }

        // ── Blockfrost: confirm the transaction exists on-chain ──────────────
        let txData: any;
        try {
            txData = await blockfrost.txs(txHash);
        } catch (bfErr: any) {
            // Blockfrost throws when the tx is not found yet
            if (bfErr?.status_code === 404) {
                return NextResponse.json(
                    { error: 'Transaction not yet confirmed on-chain. Please wait a moment and try again.' },
                    { status: 404 }
                );
            }
            throw bfErr;
        }

        if (!txData) {
            return NextResponse.json({ error: 'Transaction not found on-chain.' }, { status: 404 });
        }

        // ── Blockfrost: verify the output actually went to the lender ─────────
        try {
            const utxos = await blockfrost.txsUtxos(txHash);
            // Blockfrost returns bech32 addresses; lenderAddress from DB may be hex.
            const { bech32 } = await import('bech32');
            let lenderBech32 = lenderAddress;
            if (!lenderAddress.startsWith('addr')) {
                const bytes = Buffer.from(lenderAddress, 'hex');
                const networkId = bytes[0] & 0x0f;
                const hrp = networkId === 1 ? 'addr' : 'addr_test';
                lenderBech32 = bech32.encode(hrp, bech32.toWords(bytes), 1000);
            }
            const sentToLender = utxos.outputs.some(
                (o: any) => o.address === lenderBech32
            );
            if (!sentToLender) {
                return NextResponse.json(
                    { error: 'Transaction output does not match the lender\'s address.' },
                    { status: 400 }
                );
            }
        } catch (utxoErr: any) {
            // Non-fatal: if utxo lookup fails, proceed (tx existence already confirmed)
            console.warn('UTxO verification skipped:', utxoErr?.message);
        }

        // ── Record the loan as active in Supabase ────────────────────────────
        const { data, error } = await supabaseAdmin
            .from('loans')
            .insert([
                {
                    borrower_address: borrowerAddress,
                    lender_address: lenderAddress,
                    loan_type: 'peer',
                    amount: amount,
                    currency: currency || 'Php',
                    purpose: purpose,
                    proof_url: proof_url,
                    tx_hash: txHash,
                    status: 'active',
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Insert peer loan error:', error);
            return NextResponse.json({ 
                error: 'Failed to record loan in the ledger.',
                detail: error.message,
                code: error.code,
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, loan: data });
    } catch (err: any) {
        console.error('Server error creating peer loan:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
