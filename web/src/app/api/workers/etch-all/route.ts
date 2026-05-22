import { NextResponse } from 'next/server';
import { verifyAddressAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { submitBatchForCommunity } from '@/lib/cardano/submitBatch';

export async function POST(request: Request) {
  try {

    const auth = await verifyAddressAuth(request, { role: ['superuser'] });

    if (auth instanceof NextResponse) {
      const authHeader = request.headers.get('Authorization');
      if (
        !process.env.WORKER_TRIGGER_SECRET ||
        authHeader !== process.env.WORKER_TRIGGER_SECRET
      ) {
        return auth;
      }
    }

    const { data: communities, error: communitiesError } = await supabaseAdmin
      .from('communities')
      .select('community_id, name');

    if (communitiesError) {
      console.error('etch-all: failed to query communities', communitiesError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results: Record<string, any> = {};
    let processedCommunities = 0;

    for (const community of communities || []) {

      const { count, error: queueError } = await supabaseAdmin
        .from('onchain_queue')
        .select('queue_id', { count: 'exact', head: true })
        .eq('community_id', community.community_id)
        .eq('status', 'queued');

      if (queueError) {
        console.error(`etch-all: failed to query queue count for community ${community.name} (${community.community_id})`, queueError);
        continue;
      }

      if (count && count > 0) {
        console.log(`etch-all: triggering batch for ${community.name} with ${count} queued items`);
        try {
          const batchResult = await submitBatchForCommunity(community.community_id);
          results[community.community_id] = {
            name: community.name,
            queuedItems: count,
            status: 'processed',
            detail: batchResult,
          };
          processedCommunities++;
        } catch (batchErr: any) {
          console.error(`etch-all: failed to submit batch for ${community.name}`, batchErr);
          results[community.community_id] = {
            name: community.name,
            queuedItems: count,
            status: 'failed',
            error: batchErr.message || String(batchErr),
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedCommunities,
      results,
    });
  } catch (error) {
    console.error('etch-all worker failed', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
