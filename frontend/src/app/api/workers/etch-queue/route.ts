import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

const DEFAULT_GRACE_DAYS = 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function estimatePayloadBytes(payload: object) {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}

export async function POST(request: Request) {
  // 1) Worker Ingress Token Authentication Gate (ADR-003 Compliance)
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const workerSecret = process.env.WORKER_TRIGGER_SECRET;

  if (!workerSecret || token !== workerSecret) {
    return NextResponse.json({ error: 'Unauthorized worker action' }, { status: 401 });
  }

  const now = new Date();
  const thresholdDate = new Date(now.getTime() - DEFAULT_GRACE_DAYS * MS_PER_DAY);
  const thresholdIso = thresholdDate.toISOString();
  const nowIso = now.toISOString();

  // 2) Self-healing target collection: includes both active and overdue breaches
  const { data: loans, error } = await supabaseAdmin
    .from('loans')
    .select('*')
    .in('status', ['active', 'overdue'])
    .lte('needed_by_date', thresholdIso);

  if (error) {
    console.error('Defaulted cron lookup failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let defaultedCount = 0;

  for (const loan of loans || []) {
    const { error: updateError } = await supabaseAdmin
      .from('loans')
      .update({
        status: 'defaulted',
      })
      .eq('loan_id', loan.loan_id);

    if (updateError) {
      console.error(`Failed to default loan ${loan.loan_id}:`, updateError);
      continue;
    }

    const payload = {
      loanId: loan.loan_id,
      borrower: loan.borrower_address,
      dueDate: loan.needed_by_date,
      defaultedAt: nowIso,
    };

    // Uniform system receipt queue invocation
    await enqueueReceipt({
      communityId: loan.community_id,
      recordType: 'loan_defaulted',
      referenceId: loan.loan_id,
      memberAddress: loan.borrower_address || 'system',
      summary: `Loan ${loan.loan_id} permanently moved to Defaulted state (breached 60-day threshold).`,
      estimatedBytes: estimatePayloadBytes(payload),
    });

    defaultedCount++;
  }

  return NextResponse.json({ defaulted: defaultedCount });
}