import { NextResponse } from 'next/server';
import { submitBatchForCommunity } from '@/lib/cardano/submitBatch';

async function loadVerifier() {
  const devMode = process.env.NODE_ENV !== 'production' || process.env.DEV_AUTH === 'true';

  if (devMode) {
    try {
      const dev = await import('@/lib/auth.dev');
      return dev.verifyWalletAuth;
    } catch {
      // continue to real auth if dev stub is unavailable
    }
  }

  try {
    const mod = await import('@/lib/auth');
    return mod.verifyWalletAuth;
  } catch (e) {
    if (devMode) {
      try {
        const dev = await import('@/lib/auth.dev');
        return dev.verifyWalletAuth;
      } catch {
        // fall through
      }
    }

    return null;
  }
}

type WorkerRequestBody = {
  communityId?: string;
};

export async function POST(request: Request) {
  try {
    const verifyWalletAuth = await loadVerifier();
    let authContext: any = null;
    let authorizedViaSecret = false;

    if (verifyWalletAuth) {
      try {
        authContext = await verifyWalletAuth(request, { role: ['superuser'] });
      } catch {
        // fall through to worker secret check
      }
    }

    if (!authContext) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== process.env.WORKER_TRIGGER_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      authorizedViaSecret = true;
    }

    const body = (await request.json().catch(() => ({}))) as WorkerRequestBody;
    const communityId = authContext?.communityId ?? body.communityId;

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
