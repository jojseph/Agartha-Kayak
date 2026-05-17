import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Body = {
  targetType: 'loan' | 'community_transaction';
  targetId: string;
  isPublic: boolean;
};

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

const devMode = process.env.NODE_ENV !== 'production' || process.env.DEV_AUTH === 'true';

export async function PATCH(request: Request) {
  try {
    const verifyWalletAuth = await loadVerifier();

    let authContext: any = null;
    if (verifyWalletAuth) {
      try {
        authContext = await verifyWalletAuth(request, { role: ['elder', 'owner'] });
      } catch (e) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== process.env.NEXT_PUBLIC_API_KAYAK_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = (await request.json()) as Body;
    if (!body || !body.targetType || !body.targetId || typeof body.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const table = body.targetType === 'loan' ? 'loans' : 'community_transactions';
    const keyColumn = body.targetType === 'loan' ? 'loan_id' : 'id';
    const selectFields = body.targetType === 'loan' ? `${keyColumn},is_public` : `${keyColumn},community_id,is_public`;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select(selectFields)
      .eq(keyColumn, body.targetId)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error fetching target row for visibility toggle:', fetchErr);
      return NextResponse.json(
        {
          error: 'Database error',
          details: devMode ? fetchErr.message || JSON.stringify(fetchErr) : undefined,
        },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    if (body.targetType === 'community_transaction' && authContext && authContext.communityId) {
      if (!existing.community_id || existing.community_id !== authContext.communityId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from(table)
      .update({ is_public: body.isPublic })
      .eq(keyColumn, body.targetId)
      .select()
      .maybeSingle();

    if (updateErr) {
      console.error('Error updating visibility flag:', updateErr);
      return NextResponse.json(
        {
          error: 'Failed to update',
          details: devMode ? updateErr.message || JSON.stringify(updateErr) : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, row: updated });
  } catch (err) {
    console.error('Visibility toggle handler error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Internal server error', details: devMode ? message : undefined },
      { status: 500 }
    );
  }
}
