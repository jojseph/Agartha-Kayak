// Local Cardano-sync trigger (Node 18+, global fetch).
//
// This is the chosen scheduler for this project: a long-running local process
// that POSTs the all-communities worker every 5 minutes. /api/workers/etch-all
// figures out which communities have queued rows itself — no hardcoded IDs, new
// communities are picked up automatically. The worker submits to Cardano via
// Blockfrost (see src/lib/cardano/txBuilder.ts).
//
// Run:  WORKER_TRIGGER_SECRET=<same value as .env> node scripts/local-etch-worker.js
// Optional: WORKER_BASE_URL=http://localhost:3000 (default)
const BASE = process.env.WORKER_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.WORKER_TRIGGER_SECRET;

if (!SECRET) {
  console.error('WORKER_TRIGGER_SECRET is not set — the endpoint will return 401. Aborting.');
  process.exit(1);
}

async function runOnce() {
  try {
    const res = await fetch(`${BASE}/api/workers/etch-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: SECRET },
      body: '{}',
    });
    console.log(new Date().toISOString(), res.status, await res.json());
  } catch (err) {
    console.error(new Date().toISOString(), 'etch-all trigger failed:', err);
  }
}

setInterval(runOnce, 5 * 60 * 1000); // every 5 minutes
runOnce();
