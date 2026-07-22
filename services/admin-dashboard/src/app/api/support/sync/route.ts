import { NextResponse } from 'next/server';
import { ImapWorker } from '@/lib/support/imap-worker';
import { validateAdminAuth } from '@/lib/support/auth';

export async function POST(request: Request) {
  const authError = await validateAdminAuth(request, "write:admin");
  if (authError) return authError;

  try {
    const worker = new ImapWorker();
    await worker.poll();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Support Sync] Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
