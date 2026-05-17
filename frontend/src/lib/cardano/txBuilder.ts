import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { BlockfrostProvider, MeshTxBuilder } from '@meshsdk/core';

const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID;
const CARDANO_SUBMITTER_SKEY = process.env.CARDANO_SUBMITTER_SKEY;
const CARDANO_SUBMITTER_ADDRESS = process.env.CARDANO_SUBMITTER_ADDRESS;

if (!BLOCKFROST_PROJECT_ID) {
  throw new Error('Missing BLOCKFROST_PROJECT_ID environment variable');
}

if (!CARDANO_SUBMITTER_SKEY) {
  throw new Error('Missing CARDANO_SUBMITTER_SKEY environment variable');
}

if (!CARDANO_SUBMITTER_ADDRESS) {
  throw new Error('Missing CARDANO_SUBMITTER_ADDRESS environment variable');
}

function getCardanoNetwork(projectId: string): 'mainnet' | 'preview' | 'preprod' {
  if (projectId.startsWith('preprod')) return 'preprod';
  if (projectId.startsWith('preview')) return 'preview';
  return 'mainnet';
}

export const blockfrostProvider = new BlockfrostProvider(BLOCKFROST_PROJECT_ID, 0);
export const blockfrostClient = new BlockFrostAPI({
  projectId: BLOCKFROST_PROJECT_ID,
  network: getCardanoNetwork(BLOCKFROST_PROJECT_ID!),
});

export async function buildTxWithMetadata(
  metadata: object,
  label = 674
): Promise<string> {
  const network = getCardanoNetwork(BLOCKFROST_PROJECT_ID!);
  const protocolParameters = await blockfrostProvider.fetchProtocolParameters();

  const builder = new MeshTxBuilder({
    fetcher: blockfrostProvider,
    submitter: blockfrostProvider,
    params: protocolParameters,
  });

  builder.setNetwork(network);
  builder.changeAddress(CARDANO_SUBMITTER_ADDRESS!);
  builder.metadataValue(label, metadata);
  builder.signingKey(CARDANO_SUBMITTER_SKEY!);

  const txHex = await builder.complete();
  const txHash = await builder.submitTx(txHex);

  if (!txHash || typeof txHash !== 'string') {
    throw new Error('Cardano transaction submission failed to return a tx hash');
  }

  return txHash;
}

export async function fetchTxBlockNumber(txHash: string): Promise<number | null> {
  try {
    const tx = await blockfrostClient.txs(txHash);
    return typeof tx.block_height === 'number' ? tx.block_height : null;
  } catch (error) {
    console.error('Unable to fetch Blockfrost tx info for', txHash, error);
    return null;
  }
}
