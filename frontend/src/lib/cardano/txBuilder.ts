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
  builder.metadataValue(label, metadata);
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
