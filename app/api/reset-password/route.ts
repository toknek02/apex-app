import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

// One generic message for every failure mode (bad token, expired, already
// used, deactivated user) so a stale or guessed link reveals nothing.
const INVALID = 'This reset link is invalid or has expired. Request a new one.'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!token) return NextResponse.json({ error: INVALID }, { status: 400 })
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const request = await prisma.passwordResetRequest.findUnique({ where: { tokenHash } })

  if (
    !request ||
    request.status !== 'pending' ||
    !request.userId ||
    !request.tokenExpiresAt ||
    request.tokenExpiresAt < new Date()
  ) {
    return NextResponse.json({ error: INVALID }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: request.userId } })
  if (!user || !user.isActive) return NextResponse.json({ error: INVALID }, { status: 400 })

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.$transaction([
    // Drop any live session — a password reset should log the account out
    // everywhere (matches the single-active-session model in lib/auth.ts).
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, activeSessionId: null } }),
    prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: { status: 'self_served', resolvedAt: new Date(), tokenHash: null, tokenExpiresAt: null },
    }),
  ])

  await logAudit({
    actor: { id: user.id, name: user.name },
    action: 'password_reset_request.self_served',
    targetType: 'PasswordResetRequest',
    targetId: request.id,
    targetLabel: request.email,
  })

  return NextResponse.json({ success: true })
}
