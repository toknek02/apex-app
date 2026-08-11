import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const open = await prisma.signInRecord.findFirst({
    where: { userId: session.user.id, signOutAt: null },
    orderBy: { signInAt: 'desc' },
  })

  return NextResponse.json({ signedIn: Boolean(open), signInAt: open?.signInAt ?? null })
}

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const open = await prisma.signInRecord.findFirst({
    where: { userId: session.user.id, signOutAt: null },
    orderBy: { signInAt: 'desc' },
  })

  if (open) {
    const record = await prisma.signInRecord.update({
      where: { id: open.id },
      data: { signOutAt: new Date() },
    })
    return NextResponse.json({ record, status: 'signed-out' })
  }

  const record = await prisma.signInRecord.create({
    data: { userId: session.user.id },
  })
  return NextResponse.json({ record, status: 'signed-in' })
}
