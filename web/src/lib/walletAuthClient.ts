'use client';

const EMPTY_BODY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb924' + '27ae41e4649b934ca495991b7852b855';

export type SigningWallet = {
  getChangeAddress: () => Promise<string>;
  signData: (
    addressBech32: string,
    data: string
  ) => Promise<{ key: string; signature: string }>;
};

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (let i = 0; i < values.length; i++) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[i];
    for (let j = 0; j < 5; j++) {
      if ((top >>> j) & 1) chk ^= BECH32_GEN[j];
    }
  }
  return chk >>> 0;
}

function bech32HrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >>> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

function bech32Checksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const out: number[] = [];
  for (let p = 0; p < 6; p++) out.push((mod >>> (5 * (5 - p))) & 31);
  return out;
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = data.concat(bech32Checksum(hrp, data));
  let out = hrp + '1';
  for (let i = 0; i < combined.length; i++) out += BECH32_CHARSET.charAt(combined[i]);
  return out;
}

function convert8to5(bytes: Uint8Array): number[] {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    acc = (acc << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.push((acc >>> bits) & 31);
    }
  }
  if (bits > 0) out.push((acc << (5 - bits)) & 31);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 ? '0' + hex : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function hexAddressToBech32(hex: string): string {
  const bytes = hexToBytes(hex);
  const networkId = bytes[0] & 0x0f;
  const hrp = networkId === 1 ? 'addr' : 'addr_test';
  return bech32Encode(hrp, convert8to5(bytes));
}

export async function resolveWalletAddress(
  wallet: SigningWallet
): Promise<string> {
  const addr = await wallet.getChangeAddress();
  if (!addr) {
    throw new Error('Wallet returned an empty address');
  }
  if (addr.startsWith('addr')) {
    return addr;
  }
  if (/^[0-9a-fA-F]+$/.test(addr)) {
    return hexAddressToBech32(addr);
  }
  throw new Error(
    `Unrecognized wallet address format: ${addr.slice(0, 16)}…`
  );
}

function toHex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function sha256Hex(body: string): Promise<string> {
  if (body.length === 0) return EMPTY_BODY_SHA256;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(body)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function walletAuthFetch(
  wallet: SigningWallet,
  url: string,
  opts: RequestInit = {}
): Promise<Response> {
  const walletAddress = await resolveWalletAddress(wallet);

  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      'X-Wallet-Address': walletAddress,
    },
  });
}

