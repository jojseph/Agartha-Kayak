import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyWalletAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * GET — SuperUser lists pending community requests.
 */
export async function GET(request: Request) {
  const auth = await verifyWalletAuth(request, { role: ['superuser'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const { data, error } = await supabaseAdmin
      .from('coop_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('admin coop-applications GET error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ applications: data ?? [] });
  } catch (error) {
    console.error('admin coop-applications GET server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH — SuperUser approves or rejects a community request.
 *
 * Approve: create the community (owner = applicant), then create the applicant's
 * owner member row, then mark the application approved. No Postgres RPC exists for
 * this, so the steps run sequentially with a compensating delete on the community
 * if member creation fails (avoids an orphan community). This is not fully atomic;
 * an `approve_coop_application` RPC is the robust follow-up if contention matters.
 */
export async function PATCH(request: Request) {
  const auth = await verifyWalletAuth(request, { role: ['superuser'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const { application_id, action, rejection_reason } = await request.json();

    if (!application_id || (action !== 'approved' && action !== 'rejected')) {
      return NextResponse.json(
        { error: 'application_id and action ("approved" | "rejected") are required' },
        { status: 400 }
      );
    }

    const { data: app, error: appErr } = await supabaseAdmin
      .from('coop_applications')
      .select('*')
      .eq('application_id', application_id)
      .maybeSingle();

    if (appErr) {
      console.error('admin coop-applications fetch error:', appErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (app.status !== 'pending') {
      return NextResponse.json(
        { error: `Application already ${app.status}` },
        { status: 409 }
      );
    }

    const reviewedAt = new Date().toISOString();

    if (action === 'rejected') {
      const { error: rejErr } = await supabaseAdmin
        .from('coop_applications')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || null,
          reviewed_by: auth.walletAddress,
          reviewed_at: reviewedAt,
        })
        .eq('application_id', application_id);

      if (rejErr) {
        console.error('admin coop-applications reject error:', rejErr);
        return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
      }
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // action === 'approved'
    const { data: community, error: commErr } = await supabaseAdmin
      .from('communities')
      .insert([
        {
          name: app.proposed_name,
          treasury_wallet_address: app.treasury_wallet_address,
          treasury_balance: app.initial_funds ? Number(app.initial_funds) : 0,
          initial_funds: app.initial_funds ? Number(app.initial_funds) : 0,
          owner_address: app.applicant_address,
        },
      ])
      .select()
      .single();

    if (commErr || !community) {
      console.error('admin coop-applications community insert error:', commErr);
      return NextResponse.json(
        { error: 'Failed to create community', details: commErr?.message },
        { status: 500 }
      );
    }

    const { error: memberErr } = await supabaseAdmin.from('members').insert([
      {
        wallet_address: app.applicant_address,
        alias: app.applicant_alias,
        email: app.applicant_email,
        barangay: null,
        community_id: community.community_id,
        role: 'owner',
        status: 'approved',
      },
    ]);

    if (memberErr) {
      // Compensate: roll back the community so we don't leave an orphan.
      await supabaseAdmin
        .from('communities')
        .delete()
        .eq('community_id', community.community_id);
      console.error('admin coop-applications member insert error:', memberErr);
      return NextResponse.json(
        { error: 'Failed to create owner member; community rolled back', details: memberErr.message },
        { status: 500 }
      );
    }

    const { error: updErr } = await supabaseAdmin
      .from('coop_applications')
      .update({
        status: 'approved',
        reviewed_by: auth.walletAddress,
        reviewed_at: reviewedAt,
      })
      .eq('application_id', application_id);

    if (updErr) {
      // Community + member exist; only the bookkeeping update failed. Surface it
      // but don't tear down a now-live community.
      console.error('admin coop-applications status update error:', updErr);
      return NextResponse.json(
        {
          success: true,
          status: 'approved',
          warning: 'Community created but application status update failed',
          community,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, status: 'approved', community });
  } catch (error) {
    console.error('admin coop-applications PATCH server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
