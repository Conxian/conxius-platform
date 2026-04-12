import { NextResponse } from 'next/server';
import { ImapWorker } from '@/lib/support/imap-worker';

export async function POST(request: Request) {
  const authHeader = request.headers.get('X-Admin-API-Key');
  if (authHeader !== process.env.ADMIN_DASHBOARD_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const worker = new ImapWorker();
    await worker.poll();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Support Sync] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
