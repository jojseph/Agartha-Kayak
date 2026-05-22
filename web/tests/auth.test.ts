import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@meshsdk/core', () => ({
  checkSignature: vi.fn(),
}));

import { verifyWalletSignature, verifyWalletAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkSignature } from '@meshsdk/core';

function makeRequest(authHeader?: string, body?: string): Request {
  const headers: Record<string, string> = body ? { 'Content-Type': 'application/json' } : {};
  if (authHeader) headers['Authorization'] = authHeader;
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers,
    body: body ?? null,
  });
}

async function expectFailure(
  result: unknown,
  status: number,
  reasonRegex?: RegExp
) {
  expect(result).toBeInstanceOf(NextResponse);
  if (result instanceof NextResponse) {
    expect(result.status).toBe(status);
    if (reasonRegex) {
      const body = await result.json();
      expect(body.error).toMatch(reasonRegex);
    }
  }
}

function mockFromSequence(responses: Array<{ data?: unknown; error?: unknown }>) {
  let i = 0;
  (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const response = responses[i++] ?? { data: null, error: null };
    return {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(response),
      maybeSingle: vi.fn().mockResolvedValue(response),
    };
  });
}

const TEST_WALLET = 'addr_test1qpfakeWALLETxyz';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('verifyWalletSignature — header parsing', () => {
  it('rejects missing Authorization header', async () => {
    const result = await verifyWalletSignature(makeRequest());
    await expectFailure(result, 401, /Missing or malformed/);
  });

  it('rejects header without WalletSig prefix', async () => {
    const result = await verifyWalletSignature(makeRequest('Bearer xyz'));
    await expectFailure(result, 401, /Missing or malformed/);
  });

  it('rejects WalletSig credentials with wrong number of colon-separated parts', async () => {

    const result = await verifyWalletSignature(makeRequest('WalletSig addr:nonce:sig'));
    await expectFailure(result, 401, /Malformed WalletSig/);
  });

  it('rejects WalletSig credentials with an empty component', async () => {
    const result = await verifyWalletSignature(makeRequest('WalletSig addr::key:sig'));
    await expectFailure(result, 401, /Empty credential/);
  });
});

describe('verifyWalletSignature — nonce validation', () => {
  const credentials = `WalletSig ${TEST_WALLET}:nonceval:keyhex:sighex`;

  it('rejects an unknown nonce', async () => {
    mockFromSequence([{ data: null, error: null }]);
    const result = await verifyWalletSignature(makeRequest(credentials));
    await expectFailure(result, 401, /Unknown nonce/);
  });

  it('rejects a nonce that has already been used', async () => {
    mockFromSequence([
      {
        data: {
          nonce: 'nonceval',
          wallet_address: TEST_WALLET,
          issued_at: new Date().toISOString(),
          used_at: new Date().toISOString(),
        },
        error: null,
      },
    ]);
    const result = await verifyWalletSignature(makeRequest(credentials));
    await expectFailure(result, 401, /already used/);
  });

  it('rejects when the nonce was issued to a different wallet', async () => {
    mockFromSequence([
      {
        data: {
          nonce: 'nonceval',
          wallet_address: 'addr_test1OTHERwallet',
          issued_at: new Date().toISOString(),
          used_at: null,
        },
        error: null,
      },
    ]);
    const result = await verifyWalletSignature(makeRequest(credentials));
    await expectFailure(result, 401, /not issued to this wallet/);
  });

  it('rejects an expired nonce (>5 minutes old)', async () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    mockFromSequence([
      {
        data: {
          nonce: 'nonceval',
          wallet_address: TEST_WALLET,
          issued_at: sixMinutesAgo,
          used_at: null,
        },
        error: null,
      },
    ]);
    const result = await verifyWalletSignature(makeRequest(credentials));
    await expectFailure(result, 401, /expired/);
  });
});

describe('verifyWalletSignature — signature check', () => {
  const credentials = `WalletSig ${TEST_WALLET}:nonceval:keyhex:sighex`;
  const validNonce = {
    nonce: 'nonceval',
    wallet_address: TEST_WALLET,
    issued_at: new Date().toISOString(),
    used_at: null,
  };

  it('rejects an invalid signature', async () => {
    mockFromSequence([{ data: validNonce, error: null }]);
    (checkSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const result = await verifyWalletSignature(makeRequest(credentials));
    await expectFailure(result, 401, /Invalid signature/);
  });

  it('returns walletAddress on a valid signature + successful nonce claim', async () => {
    mockFromSequence([
      { data: validNonce, error: null },
      { data: { nonce: 'nonceval' }, error: null },
    ]);
    (checkSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const result = await verifyWalletSignature(makeRequest(credentials));
    expect(result).not.toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) {
      expect(result.walletAddress).toBe(TEST_WALLET);
    }
  });
});

describe('verifyWalletAuth — member + role enforcement', () => {
  const credentials = `WalletSig ${TEST_WALLET}:nonceval:keyhex:sighex`;
  const validNonce = {
    nonce: 'nonceval',
    wallet_address: TEST_WALLET,
    issued_at: new Date().toISOString(),
    used_at: null,
  };

  beforeEach(() => {
    (checkSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('rejects a wallet that is not a registered member', async () => {
    mockFromSequence([
      { data: validNonce, error: null },
      { data: { nonce: 'nonceval' }, error: null },
      { data: null, error: null },
    ]);
    const result = await verifyWalletAuth(makeRequest(credentials));
    await expectFailure(result, 403, /not a registered member/);
  });

  it('rejects a wallet whose role does not satisfy the requirement', async () => {
    mockFromSequence([
      { data: validNonce, error: null },
      { data: { nonce: 'nonceval' }, error: null },
      {
        data: {
          wallet_address: TEST_WALLET,
          role: 'member',
          community_id: 'comm-1',
          alias: 'TestUser',
          status: 'approved',
        },
        error: null,
      },
    ]);
    const result = await verifyWalletAuth(makeRequest(credentials), {
      role: ['elder', 'owner'],
    });
    await expectFailure(result, 403, /not permitted/);
  });

  it('returns an AuthContext when role + community both match', async () => {
    mockFromSequence([
      { data: validNonce, error: null },
      { data: { nonce: 'nonceval' }, error: null },
      {
        data: {
          wallet_address: TEST_WALLET,
          role: 'elder',
          community_id: 'comm-1',
          alias: 'ElderUser',
          status: 'approved',
        },
        error: null,
      },
    ]);
    const result = await verifyWalletAuth(makeRequest(credentials), {
      role: ['elder', 'owner'],
      communityId: 'comm-1',
    });
    expect(result).not.toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) {
      expect(result.walletAddress).toBe(TEST_WALLET);
      expect(result.role).toBe('elder');
      expect(result.communityId).toBe('comm-1');
      expect(result.alias).toBe('ElderUser');
    }
  });

  it('rejects a wallet that is in the wrong community', async () => {
    mockFromSequence([
      { data: validNonce, error: null },
      { data: { nonce: 'nonceval' }, error: null },
      {
        data: {
          wallet_address: TEST_WALLET,
          role: 'elder',
          community_id: 'comm-1',
          alias: 'ElderUser',
          status: 'approved',
        },
        error: null,
      },
    ]);
    const result = await verifyWalletAuth(makeRequest(credentials), {
      role: ['elder'],
      communityId: 'comm-OTHER',
    });
    await expectFailure(result, 403, /required community/);
  });
});
