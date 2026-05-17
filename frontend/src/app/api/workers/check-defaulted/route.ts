import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const DEFAULT_GRACE_DAYS = 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function estimatePayloadBytes(payload: object) {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}

export async function POST(request: Request) {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - DEFAULT_GRACE_DAYS * MS_PER_DAY);
  const thresholdIso = thresholdDate.toISOString();
  const nowIso = now.toISOString();

  const { data: loans, error } = await supabaseAdmin
    .from('loans')
    .select('*')
    .eq('status', 'overdue')
    .lte('needed_by_date', thresholdIso);

  if (error) throw error;

  let defaultedCount = 0;

  for (const loan of loans || []) {
    await supabaseAdmin
      .from('loans')
      .update({
        status: 'defaulted',
      })
      .eq('loan_id', loan.loan_id);

    const payload = {
      loanId: loan.loan_id,
      borrower: loan.borrower_address,
      dueDate: loan.needed_by_date,
      defaultedAt: nowIso,
    };

    await supabaseAdmin.from('onchain_queue').insert({
      community_id: loan.community_id,
      record_type: 'loan_defaulted',
      payload,
      status: 'queued',
      estimated_bytes: estimatePayloadBytes(payload),
      created_at: nowIso,
    });

    defaultedCount += 1;
  }

  return NextResponse.json({ defaulted: defaultedCount });
}
