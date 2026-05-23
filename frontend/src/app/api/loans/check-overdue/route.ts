import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

const DAILY_OVERDUE_RATE = 0.01; // 1% of principal per overdue day
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function calculatePenaltyAmount(amountLovelace: number | null, overdueDays: number) {
  if (!amountLovelace || overdueDays <= 0) return 0;
  return Math.floor(amountLovelace * DAILY_OVERDUE_RATE * overdueDays);
}

function estimatePayloadBytes(payload: object) {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}

export async function POST(request: Request) {
  // 1) Worker Token Authentication Gate
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const workerSecret = process.env.WORKER_TRIGGER_SECRET;

  if (!workerSecret || token !== workerSecret) {
    return NextResponse.json({ error: 'Unauthorized worker action' }, { status: 401 });
  }

  const now = new Date();

  // 2) Find loans whose due date has passed
  const { data: loans, error } = await supabaseAdmin
    .from('loans')
    .select('*')
    .in('status', ['active', 'overdue'])
    .lte('needed_by_date', now.toISOString());

  if (error) {
    console.error('Overdue cron lookup failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updatedCount = 0;

  for (const loan of loans || []) {
    const dueDate = loan.needed_by_date ? new Date(loan.needed_by_date) : null;
    if (!dueDate) continue;

    const overdueDays = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / MS_PER_DAY));
    const totalPenalty = calculatePenaltyAmount(loan.amount, overdueDays);
    const existingPenalty = loan.penalty_amount ?? 0;
    
    const shouldUpdate = loan.status !== 'overdue' || totalPenalty !== existingPenalty;
    if (!shouldUpdate) continue;

    // DYNAMIC LOOKUP: Resolve the missing community_id by crossing over to the members table
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('community_id')
      .eq('wallet_address', loan.borrower_address)
      .maybeSingle();

    // Fallback safely to our test community ID if the relation cannot be resolved
    const resolvedCommunityId = member?.community_id || '00000000-0000-0000-0000-000000000001';

    // Update the loan state
    const { error: updateError } = await supabaseAdmin
      .from('loans')
      .update({
        penalty_amount: totalPenalty,
        status: 'overdue',
      })
      .eq('loan_id', loan.loan_id);

    if (updateError) {
      console.error(`Failed to update loan ${loan.loan_id}:`, updateError);
      continue;
    }

    const payload = {
      loanId: loan.loan_id,
      borrower: loan.borrower_address,
      dueDate: loan.needed_by_date,
      overdueDays,
      penalty_amount: totalPenalty,
    };

    // Push standard record directly to the onchain queue wrapper using the resolved ID
    await enqueueReceipt({
      communityId: resolvedCommunityId,
      recordType: 'loan_overdue',
      referenceId: loan.loan_id,
      memberAddress: loan.borrower_address || 'system',
      summary: `Loan ${loan.loan_id} noted overdue (${overdueDays} days). Current penalty: ${totalPenalty} Lovelace.`,
      estimatedBytes: estimatePayloadBytes(payload),
    });

    updatedCount++;
  }

  return NextResponse.json({ updated: updatedCount });
}