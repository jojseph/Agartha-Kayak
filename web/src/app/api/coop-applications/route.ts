import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  const applicantAddress = request.headers.get('X-Wallet-Address');
  if (!applicantAddress || !applicantAddress.startsWith('addr')) {
    return NextResponse.json({ error: 'Missing or invalid X-Wallet-Address header' }, { status: 401 });
  }

  try {
    const { proposedName, treasuryWalletAddress, initialFunds, alias, email } =
      await request.json();

    if (!proposedName || !treasuryWalletAddress || !alias || !email) {
      return NextResponse.json(
        { error: 'Community name, treasury wallet address, full name, and email are required' },
        { status: 400 }
      );
    }

    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('wallet_address')
      .eq('wallet_address', applicantAddress)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: 'This wallet is already a registered member' },
        { status: 409 }
      );
    }

    const { data: pendingApp } = await supabaseAdmin
      .from('coop_applications')
      .select('application_id')
      .eq('applicant_address', applicantAddress)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingApp) {
      return NextResponse.json(
        { error: 'You already have a community request under review' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('coop_applications')
      .insert([
        {
          applicant_address: applicantAddress,
          proposed_name: proposedName,
          treasury_wallet_address: treasuryWalletAddress,
          initial_funds: initialFunds ? Number(initialFunds) : 0,
          applicant_alias: alias,
          applicant_email: email,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('coop-applications insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit community request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, application: data });
  } catch (error) {
    console.error('coop-applications POST server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const walletAddress = new URL(request.url).searchParams.get('walletAddress');
    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('coop_applications')
      .select('application_id, status, rejection_reason, proposed_name, created_at')
      .eq('applicant_address', walletAddress)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('coop-applications GET error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ application: data ?? null });
  } catch (error) {
    console.error('coop-applications GET server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
