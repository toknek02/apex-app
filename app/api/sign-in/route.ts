import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Attendance is now tied to login/logout (see lib/auth.ts) rather than a
// manual toggle — this route is read-only, just for the status indicator.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const open = await prisma.signInRecord.findFirst({
    where: { userId: session.user.id, signOutAt: null },
    orderBy: { signInAt: 'desc' },
  })

  return NextResponse.json({ signedIn: Boolean(open), signInAt: open?.signInAt ?? null })
}
