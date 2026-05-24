

const fs = require('fs');
const path = require('path');

const BASE = process.env.WORKER_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.WORKER_TRIGGER_SECRET;
const INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_DELAY_MS = 5000;
const STATUS_FILE = process.env.WORKER_STATUS_FILE || path.join(process.cwd(), '.worker-status.json');

let runTimer = null;
let currentStatus = {
  startedAt: new Date().toISOString(),
  intervalMs: INTERVAL_MS,
  isRunning: false,
  nextRunAt: null,
  lastRunStartedAt: null,
  lastRunFinishedAt: null,
  lastStatus: 'starting',
  lastResult: null,
  lastError: null,
};

function writeStatus(patch = {}) {
  currentStatus = {
    ...currentStatus,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(currentStatus, null, 2));
  } catch (err) {
    console.error(new Date().toISOString(), 'failed to write worker status:', err);
  }
}

if (!SECRET) {
  console.error('WORKER_TRIGGER_SECRET is not set. The endpoint will return 401. Aborting.');
  process.exit(1);
}

async function runOnce() {
  const startedAt = new Date().toISOString();
  console.log(startedAt, `triggering etch-all worker at ${BASE}/api/workers/etch-all`);

  writeStatus({
    isRunning: true,
    nextRunAt: null,
    lastRunStartedAt: startedAt,
    lastStatus: 'running',
    lastError: null,
  });

  try {
    const res = await fetch(`${BASE}/api/workers/etch-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: SECRET },
      body: '{}',
    });
    const result = await res.json();
    console.log(
      new Date().toISOString(),
      `etch-all ${res.status}: processed ${result.processedCommunities ?? 0} communit${result.processedCommunities === 1 ? 'y' : 'ies'}`
    );

    const failedGasChecks = Object.values(result.results || {})
      .filter((community) => community?.detail?.errors?.some((error) => String(error?.message || '').includes('Insufficient gas balance')));

    if (failedGasChecks.length > 0) {
      console.log(
        new Date().toISOString(),
        `${failedGasChecks.length} communit${failedGasChecks.length === 1 ? 'y' : 'ies'} skipped because gas balance is below 0.5 ADA`
      );
    }

    writeStatus({
      isRunning: false,
      lastRunFinishedAt: new Date().toISOString(),
      lastStatus: res.ok ? 'ok' : 'failed',
      lastResult: result,
      lastError: res.ok ? null : result,
    });
  } catch (err) {
    console.error(new Date().toISOString(), 'etch-all trigger failed:', err);
    writeStatus({
      isRunning: false,
      lastRunFinishedAt: new Date().toISOString(),
      lastStatus: 'failed',
      lastError: err instanceof Error ? err.message : String(err),
    });
  }
}

function scheduleNext(delayMs) {
  if (runTimer) clearTimeout(runTimer);

  writeStatus({
    isRunning: false,
    nextRunAt: new Date(Date.now() + delayMs).toISOString(),
    intervalMs: INTERVAL_MS,
  });

  runTimer = setTimeout(async () => {
    await runOnce();
    scheduleNext(INTERVAL_MS);
  }, delayMs);
}

scheduleNext(INITIAL_DELAY_MS);
