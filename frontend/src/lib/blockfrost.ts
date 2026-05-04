import { BlockFrostAPI } from '@blockfrost/blockfrost-js'; // if wala ka ani then do ( npm install @blockfrost/blockfrost-js )

export const blockfrost = new BlockFrostAPI({
    projectId: process.env.BLOCKFROST_PROJECT_ID || '',
    network: 'preprod',
});