import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logError } from '@/lib/error-log'

export async function POST(req: NextRequest) {
  const session = await auth()
  const body = await req.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message : ''
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  await logError({
    source: 'client',
    message,
    stack: typeof body.stack === 'string' ? body.stack : null,
    url: typeof body.url === 'string' ? body.url : null,
    userId: session?.user?.id ?? null,
    userName: session?.user?.name ?? null,
  })
  return NextResponse.json({ success: true })
}
