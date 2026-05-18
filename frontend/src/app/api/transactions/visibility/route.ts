import { NextResponse } from 'next/server';
import { verifyAddressAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type Body = {
  targetType: 'loan' | 'community_transaction';
  targetId: string;
  isPublic: boolean;
};

const devMode = process.env.NODE_ENV !== 'production';

export async function PATCH(request: Request) {
  try {
    // Module 1 contract: verifyWalletAuth returns AuthContext | NextResponse
    // and NEVER throws — check the union, don't try/catch for auth.
    const auth = await verifyAddressAuth(request, { role: ['elder', 'owner'] });
    if (auth instanceof NextResponse) return auth;

    const body = (await request.json()) as Body;
    if (!body || !body.targetType || !body.targetId || typeof body.isPublic !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const table = body.targetType === 'loan' ? 'loans' : 'community_transactions';
    const keyColumn = body.targetType === 'loan' ? 'loan_id' : 'id';
    const selectFields =
      body.targetType === 'loan'
        ? `${keyColumn},is_public`
        : `${keyColumn},community_id,is_public`;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select(selectFields)
      .eq(keyColumn, body.targetId)
      .maybeSingle();

    if (fetchErr) {
      console.error('Error fetching target row for visibility toggle:', fetchErr);
      return NextResponse.json(
        { error: 'Database error', details: devMode ? fetchErr.message : undefined },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 });
    }

    const existingRow = existing as { community_id?: string | null };
    if (body.targetType === 'community_transaction' && auth.communityId) {
      if (!existingRow.community_id || existingRow.community_id !== auth.communityId) {
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
        { error: 'Failed to update', details: devMode ? updateErr.message : undefined },
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
