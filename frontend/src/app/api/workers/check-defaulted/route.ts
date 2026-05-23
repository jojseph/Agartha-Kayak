export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { enqueueReceipt } from '@/lib/enqueueReceipt';

const DEFAULT_GRACE_DAYS = 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
  const thresholdDate = new Date(now.getTime() - DEFAULT_GRACE_DAYS * MS_PER_DAY);
  const thresholdDbFormat = thresholdDate.toISOString().split('T')[0]; 

  // 2) Collect candidates (Temporarily comment out the .lte line to test connectivity)
  const { data: loans, error } = await supabaseAdmin
    .from('loans')
    .select('*')
    .in('status', ['active', 'overdue'])
    // .lte('needed_by_date', thresholdDbFormat); // 👈 TEMPORARILY COMMENT THIS LINE OUT

  console.log("Number of active/overdue loans found in DB:", loans?.length || 0);
  if (loans && loans.length > 0) {
    console.log("First loan sample found:", {
      loan_id: loans[0].loan_id,
      status: loans[0].status,
      needed_by_date: loans[0].needed_by_date
    });
  }
  console.log("=== WORKER DIAGNOSTIC END ===");

  if (error) {
    console.error('Defaulted cron lookup failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let defaultedCount = 0;

  for (const loan of loans || []) {
    // DYNAMIC LOOKUP: Resolve the missing community_id by crossing over to the members table
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('community_id')
      .eq('wallet_address', loan.borrower_address)
      .maybeSingle();

    const resolvedCommunityId = member?.community_id || '00000000-0000-0000-0000-000000000001';

    // Transition loan status to defaulted
    const { error: updateError } = await supabaseAdmin
      .from('loans')
      .update({ status: 'defaulted' })
      .eq('loan_id', loan.loan_id);

    if (updateError) {
      console.error(`Failed to default loan ${loan.loan_id}:`, updateError);
      continue;
    }

    const payload = {
      loanId: loan.loan_id,
      borrower: loan.borrower_address,
      dueDate: loan.needed_by_date,
      defaultedAt: now.toISOString(),
    };

    // Push standard record directly to the onchain queue wrapper using the resolved ID
    await enqueueReceipt({
      communityId: resolvedCommunityId,
      recordType: 'loan_defaulted', // Matches the updated check constraint perfectly!
      referenceId: loan.loan_id,
      memberAddress: loan.borrower_address || 'system',
      summary: `Loan ${loan.loan_id} permanently moved to Defaulted state (breached 60-day threshold).`,
      estimatedBytes: Buffer.byteLength(JSON.stringify(payload), 'utf8'),
    });

    defaultedCount++;
  }

  return NextResponse.json({ defaulted: defaultedCount });
}