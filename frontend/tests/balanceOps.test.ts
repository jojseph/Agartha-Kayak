import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { adjustTreasuryBalance, setTreasuryBalance } from '@/lib/balanceOps';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const rpcMock = supabaseAdmin.rpc as unknown as ReturnType<typeof vi.fn>;
const fromMock = supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adjustTreasuryBalance', () => {
  it('calls the adjust_treasury_balance RPC with the right arguments and returns the new balance', async () => {
    rpcMock.mockResolvedValue({ data: 1500, error: null });
    const result = await adjustTreasuryBalance('comm-1', 500);
    expect(result).toBe(1500);
    expect(rpcMock).toHaveBeenCalledWith('adjust_treasury_balance', {
      p_community_id: 'comm-1',
      p_delta: 500,
    });
  });

  it('throws when the RPC returns an error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'Community not found' } });
    await expect(adjustTreasuryBalance('bad', 100)).rejects.toThrow(/Community not found/);
  });

  it('coerces the returned balance to a number', async () => {
    // Postgres NUMERIC can come back as a string from PostgREST in some configs
    rpcMock.mockResolvedValue({ data: '2000.50', error: null });
    const result = await adjustTreasuryBalance('comm-1', 0);
    expect(result).toBe(2000.5);
  });
});

describe('setTreasuryBalance', () => {
  function setupBuilder(response: { data?: unknown; error?: unknown }) {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(response),
    };
    fromMock.mockReturnValue(builder);
    return builder;
  }

  it('issues a single UPDATE and returns the new balance', async () => {
    const builder = setupBuilder({ data: { treasury_balance: 2000 }, error: null });
    const result = await setTreasuryBalance('comm-1', 2000);
    expect(result).toBe(2000);
    expect(builder.update).toHaveBeenCalledWith({ treasury_balance: 2000 });
    expect(builder.eq).toHaveBeenCalledWith('community_id', 'comm-1');
  });

  it('throws when the community does not exist', async () => {
    setupBuilder({ data: null, error: null });
    await expect(setTreasuryBalance('bad', 1000)).rejects.toThrow(/not found/);
  });

  it('throws when the UPDATE itself errors', async () => {
    setupBuilder({ data: null, error: { message: 'permission denied' } });
    await expect(setTreasuryBalance('comm-1', 1000)).rejects.toThrow(/permission denied/);
  });
});
