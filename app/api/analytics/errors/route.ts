import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/drizzle';
import { errorLogs } from '@/app/lib/schema';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    await db.insert(errorLogs).values({
      level: 'error',
      message: String(data.message || 'Unknown client error').slice(0, 1000),
      stack: data.stack ? String(data.stack).slice(0, 5000) : null,
      context: {
        type: data.type,
        filename: data.filename,
        lineno: data.lineno,
        source: 'client',
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
