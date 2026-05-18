import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAddressAuth } from '@/lib/auth';

// Reads must reflect a role change immediately (the console refetches after a
// promote/demote), so never serve this from Next's data cache.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * GET — list the owner's community members eligible for a role change
 * (members + elders only; never the owner themselves or superusers).
 */
export async function GET(request: Request) {
  const auth = await verifyAddressAuth(request, { role: ['owner'] });
  if (auth instanceof NextResponse) return auth;

  if (!auth.communityId) {
    return NextResponse.json({ error: 'Owner has no community' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('members')
      .select('wallet_address, alias, role')
      .eq('community_id', auth.communityId)
      .in('role', ['member', 'elder'])
      .neq('wallet_address', auth.walletAddress)
      .order('alias', { ascending: true });

    if (error) {
      console.error('owner role list error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ members: data ?? [] });
  } catch (error) {
    console.error('owner role GET server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH — promote a member to elder or demote an elder to member, scoped to
 * the owner's own community. Cannot touch the owner or a superuser.
 */
export async function PATCH(request: Request) {
  const auth = await verifyAddressAuth(request, { role: ['owner'] });
  if (auth instanceof NextResponse) return auth;

  if (!auth.communityId) {
    return NextResponse.json({ error: 'Owner has no community' }, { status: 400 });
  }

  try {
    const { targetAddress, role } = await request.json();

    if (!targetAddress || (role !== 'member' && role !== 'elder')) {
      return NextResponse.json(
        { error: 'targetAddress and role ("member" | "elder") are required' },
        { status: 400 }
      );
    }
    if (targetAddress === auth.walletAddress) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    const { data: target, error: targetErr } = await supabaseAdmin
      .from('members')
      .select('wallet_address, role, community_id')
      .eq('wallet_address', targetAddress)
      .maybeSingle();

    if (targetErr) {
      console.error('owner role target fetch error:', targetErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (target.community_id !== auth.communityId) {
      return NextResponse.json({ error: 'Member is not in your community' }, { status: 403 });
    }
    if (target.role !== 'member' && target.role !== 'elder') {
      return NextResponse.json(
        { error: `Cannot change the role of a ${target.role}` },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('members')
      .update({ role })
      .eq('wallet_address', targetAddress)
      .select('wallet_address, alias, role')
      .single();

    if (error) {
      console.error('owner role update error:', error);
      return NextResponse.json({ error: 'Failed to update role', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: data });
  } catch (error) {
    console.error('owner role PATCH server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
