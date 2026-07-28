import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({ orderBy: { code: 'asc' } })
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { code, title, status, access } = await req.json()
  if (!code || !title) return NextResponse.json({ error: 'Code and title are required' }, { status: 400 })

  const project = await prisma.project.create({
    data: { code, title, status: status || 'Active', access: access || 'Team' },
  })
  return NextResponse.json({ project }, { status: 201 })
}
