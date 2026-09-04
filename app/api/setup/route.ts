import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

// First-run setup: the account was created with a temporary password chosen by
// HR (the bulk upload gives everyone the same one), so this is where the user
// replaces it with their own and optionally binds an email for self-service
// resets. Only ever acts on the caller's own account.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Once setup is done this endpoint is closed — password changes go through
  // the normal reset flow, so a stale tab can't quietly rewrite an email later.
  if (!session.user.mustCompleteSetup) {
    return NextResponse.json({ error: 'Setup has already been completed for this account' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.isActive) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  // The whole point is to get off the shared temporary password.
  if (await bcrypt.compare(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Please choose a different password from your temporary one' }, { status: 400 })
  }

  // Email is optional — some staff have none — but a bad or already-taken one
  // is rejected rather than silently dropped.
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'That email address does not look valid' }, { status: 400 })
    }
    const taken = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } }, select: { id: true } })
    if (taken) {
      return NextResponse.json({ error: 'That email is already used by another account' }, { status: 409 })
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      mustCompleteSetup: false,
      ...(email ? { email } : {}),
    },
  })

  await logAudit({
    actor: { id: user.id, name: user.name },
    action: 'user.completed_setup',
    targetType: 'User',
    targetId: user.id,
    targetLabel: user.name,
    metadata: { emailBound: Boolean(email) },
  })

  return NextResponse.json({ success: true })
}
