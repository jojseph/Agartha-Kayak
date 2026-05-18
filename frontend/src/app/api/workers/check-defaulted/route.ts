import { NextResponse } from 'next/server';
import { verifyAddressAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

const DEFAULT_GRACE_DAYS = 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;


export async function POST(request: Request) {
  try {
    // Server-to-server worker: authorize via EITHER a superuser WalletSig
    // (Module 1 contract: returns AuthContext | NextResponse, never throws)
    // OR the WORKER_TRIGGER_SECRET. Mirrors /api/workers/etch-queue.
    const auth = await verifyAddressAuth(request, { role: ['superuser'] });
    if (auth instanceof NextResponse) {
      const authHeader = request.headers.get('Authorization');
      if (
        !process.env.WORKER_TRIGGER_SECRET ||
        authHeader !== process.env.WORKER_TRIGGER_SECRET
      ) {
        return auth; // formatted 401/403 from verifyWalletAuth
      }
    }

    const now = new Date();
    const thresholdDate = new Date(now.getTime() - DEFAULT_GRACE_DAYS * MS_PER_DAY);
    const thresholdIso = thresholdDate.toISOString();
    const nowIso = now.toISOString();

    const { data: loans, error } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('status', 'overdue')
      .lte('needed_by_date', thresholdIso);

    if (error) {
      console.error('check-defaulted: loan query failed', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let defaultedCount = 0;

    for (const loan of loans || []) {
      await supabaseAdmin
        .from('loans')
        .update({ status: 'defaulted' })
        .eq('loan_id', loan.loan_id);

      await enqueueReceipt({
        communityId: loan.community_id,
        recordType: 'loan_defaulted',
        referenceId: loan.loan_id,
        memberAddress: loan.borrower_address,
        loanType: 'TRS',
        mode: 'M',
        amount: loan.amount,
        currency: loan.currency ?? 'PHP',
        purpose: loan.purpose,
        dueDate: loan.needed_by_date,
        action: 'defaulted',
      });

      defaultedCount += 1;
    }

    return NextResponse.json({ defaulted: defaultedCount });
  } catch (err) {
    console.error('check-defaulted worker failed', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
