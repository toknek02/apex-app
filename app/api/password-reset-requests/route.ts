import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { isEmailConfigured, sendMail, absoluteUrl, composeEmail } from '@/lib/email'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })

  const request = await prisma.passwordResetRequest.create({
    data: { email, userId: user?.id },
  })

  // If the email matches an active account and SMTP is set up, send a
  // single-use reset link. Otherwise the request just sits in the HR queue
  // for a manual reset, exactly as before. Either way the response is
  // identical, so this can't be used to probe which emails have accounts.
  if (user?.isActive && user.email && isEmailConfigured()) {
    const token = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    await prisma.passwordResetRequest.update({
      where: { id: request.id },
      data: { tokenHash, tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    })
    const { text, html } = composeEmail({
      heading: 'Password reset request',
      paragraphs: [
        `Hello ${user.name},`,
        `We received a request to reset the password for your MAA-OA account (${user.email}).`,
        `To choose a new password, use the secure link below. For your security it expires in 1 hour and can be used only once.`,
      ],
      cta: { label: 'Reset your password', url: absoluteUrl(`/reset-password?token=${token}`) },
      footNote:
        `If you did not request this, no action is needed — your current password stays active. ` +
        `If you keep receiving these emails unexpectedly, please contact your system administrator.`,
    })
    await sendMail({ to: user.email, subject: 'Reset your MAA-OA password', text, html })
  }

  // Always respond the same way regardless of whether the email matched a
  // user, so this endpoint can't be used to enumerate accounts.
  return NextResponse.json({ success: true })
}
