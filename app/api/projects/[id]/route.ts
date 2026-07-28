import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { title, status, access } = await req.json()

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(access !== undefined ? { access } : {}),
    },
  })
  return NextResponse.json({ project })
}
