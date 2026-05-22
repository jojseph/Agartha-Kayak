import { NextResponse } from 'next/server';
import { verifyAddressAuth } from '@/lib/auth';
import { submitBatchForCommunity } from '@/lib/cardano/submitBatch';

type WorkerRequestBody = {
  communityId?: string;
};

export async function POST(request: Request) {
  try {

    const auth = await verifyAddressAuth(request, { role: ['superuser'] });

    let communityId: string | undefined;
    let authorizedViaSecret = false;

    if (auth instanceof NextResponse) {
      const authHeader = request.headers.get('Authorization');
      if (
        !process.env.WORKER_TRIGGER_SECRET ||
        authHeader !== process.env.WORKER_TRIGGER_SECRET
      ) {
        return auth;
      }
      authorizedViaSecret = true;
    } else {
      communityId = auth.communityId ?? undefined;
    }

    const body = (await request.json().catch(() => ({}))) as WorkerRequestBody;
    communityId = communityId ?? body.communityId;

    if (!communityId) {
      return NextResponse.json(
        { error: 'Missing communityId in request body or auth context' },
        { status: 400 }
      );
    }

    const result = await submitBatchForCommunity(communityId);

    return NextResponse.json({ success: true, authorizedViaSecret, result });
  } catch (error) {
    console.error('etch-queue worker failed', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
