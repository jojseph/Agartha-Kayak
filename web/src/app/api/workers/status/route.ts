import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const STATUS_FILE = process.env.WORKER_STATUS_FILE || path.join(process.cwd(), '.worker-status.json');

export async function GET() {
  try {
    const raw = await readFile(STATUS_FILE, 'utf8');
    const status = JSON.parse(raw);
    const now = Date.now();
    const nextRunAt = status.nextRunAt ? new Date(status.nextRunAt).getTime() : null;
    const staleGraceMs = 45 * 1000;
    const isStale =
      !status.isRunning &&
      nextRunAt !== null &&
      !Number.isNaN(nextRunAt) &&
      nextRunAt + staleGraceMs < now;

    return NextResponse.json({
      available: !isStale,
      serverNow: new Date().toISOString(),
      stale: isStale,
      error: isStale ? 'Worker status is stale. The etch worker may not be running.' : undefined,
      ...status,
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return NextResponse.json({
        available: false,
        serverNow: new Date().toISOString(),
        error: 'Worker status file not found. Start the etch worker to sync the queue timer.',
      });
    }

    console.error('worker status read failed', err);
    return NextResponse.json(
      {
        available: false,
        serverNow: new Date().toISOString(),
        error: 'Failed to read worker status',
      },
      { status: 500 }
    );
  }
}
