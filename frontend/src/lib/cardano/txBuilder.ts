import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { BlockfrostProvider, MeshTxBuilder } from '@meshsdk/core';

function getCardanoNetwork(projectId: string): 'mainnet' | 'preview' | 'preprod' {
  if (projectId.startsWith('preprod')) return 'preprod';
  if (projectId.startsWith('preview')) return 'preview';
  return 'mainnet';
}

// Env validation + client construction are deferred to first call so that
// importing this module during `next build` (page-data collection) does not
// throw when the Cardano submitter secrets are absent from the build env.
type CardanoEnv = {
  projectId: string;
  submitterSkey: string;
  submitterAddress: string;
  network: 'mainnet' | 'preview' | 'preprod';
};

function getCardanoEnv(): CardanoEnv {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  const submitterSkey = process.env.CARDANO_SUBMITTER_SKEY;
  const submitterAddress = process.env.CARDANO_SUBMITTER_ADDRESS;

  if (!projectId) {
    throw new Error('Missing BLOCKFROST_PROJECT_ID environment variable');
  }
  if (!submitterSkey) {
    throw new Error('Missing CARDANO_SUBMITTER_SKEY environment variable');
  }
  if (!submitterAddress) {
    throw new Error('Missing CARDANO_SUBMITTER_ADDRESS environment variable');
  }

  return {
    projectId,
    submitterSkey,
    submitterAddress,
    network: getCardanoNetwork(projectId),
  };
}

let _provider: BlockfrostProvider | undefined;
let _client: BlockFrostAPI | undefined;

function getBlockfrostProvider(): BlockfrostProvider {
  if (!_provider) {
    _provider = new BlockfrostProvider(getCardanoEnv().projectId, 0);
  }
  return _provider;
}

function getBlockfrostClient(): BlockFrostAPI {
  if (!_client) {
    const { projectId, network } = getCardanoEnv();
    _client = new BlockFrostAPI({ projectId, network });
  }
  return _client;
}

// Cardano transaction metadata rejects any text string longer than 64 BYTES
// (UTF-8). The standard convention is to split a long string into a list of
// <=64-byte chunks. Walk the metadata recursively and apply that, splitting
// on code-point boundaries so multibyte characters are never cut in half.
const MAX_METADATA_STRING_BYTES = 64;

function byteSafeChunks(str: string): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const cp of Array.from(str)) {
    if (Buffer.byteLength(current + cp, 'utf8') > MAX_METADATA_STRING_BYTES) {
      if (current) chunks.push(current);
      current = cp;
    } else {
      current += cp;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function chunkMetadataStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return Buffer.byteLength(value, 'utf8') > MAX_METADATA_STRING_BYTES
      ? byteSafeChunks(value)
      : value;
  }
  if (Array.isArray(value)) {
    return value.map(chunkMetadataStrings);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key =
        Buffer.byteLength(k, 'utf8') > MAX_METADATA_STRING_BYTES
          ? k.slice(0, MAX_METADATA_STRING_BYTES)
          : k;
      out[key] = chunkMetadataStrings(v);
    }
    return out;
  }
  return value;
}

export async function buildTxWithMetadata(
  metadata: object,
  label = 674
): Promise<string> {
  const { submitterSkey, submitterAddress, network } = getCardanoEnv();
  const provider = getBlockfrostProvider();
  const protocolParameters = await provider.fetchProtocolParameters();

  const builder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
    params: protocolParameters,
  });

  builder.setNetwork(network);
  builder.changeAddress(submitterAddress);
  builder.metadataValue(label, chunkMetadataStrings(metadata) as object);
  builder.signingKey(submitterSkey);

  const txHex = await builder.complete();
  const txHash = await builder.submitTx(txHex);

  if (!txHash || typeof txHash !== 'string') {
    throw new Error('Cardano transaction submission failed to return a tx hash');
  }

  return txHash;
}

export async function fetchTxBlockNumber(txHash: string): Promise<number | null> {
  try {
    const tx = await getBlockfrostClient().txs(txHash);
    return typeof tx.block_height === 'number' ? tx.block_height : null;
  } catch (error) {
    console.error('Unable to fetch Blockfrost tx info for', txHash, error);
    return null;
  }
}
