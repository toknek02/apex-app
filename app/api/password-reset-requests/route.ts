import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })

  await prisma.passwordResetRequest.create({
    data: { email, userId: user?.id },
  })

  // Always respond the same way regardless of whether the email matched a
  // user, so this endpoint can't be used to enumerate accounts.
  return NextResponse.json({ success: true })
}
