import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { parseProjectWorkbook } from '@/lib/bulk-upload-parse'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PROJECTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required' }, { status: 400 })

  let rows
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    rows = await parseProjectWorkbook(buffer, file.name)
  } catch {
    return NextResponse.json({ error: 'Could not read that file — make sure it\'s an unprotected .xlsx or .csv file' }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows found — the file needs a header row with "Code", "Short Name", and "Title" columns' }, { status: 400 })
  }

  const existingProjects = await prisma.project.findMany({ select: { code: true } })
  const existingCodeKeys = new Set(existingProjects.map((p) => p.code.trim().toLowerCase()))
  const seenThisUpload = new Set<string>()

  const created: { code: string; shortName: string; title: string }[] = []
  const skipped: { code: string; reason: string }[] = []

  for (const row of rows) {
    const key = row.code.trim().toLowerCase()
    if (!row.title) {
      skipped.push({ code: row.code, reason: 'Missing title' })
      continue
    }
    if (existingCodeKeys.has(key)) {
      skipped.push({ code: row.code, reason: 'Already exists' })
      continue
    }
    if (seenThisUpload.has(key)) {
      skipped.push({ code: row.code, reason: 'Duplicate row in this file' })
      continue
    }
    seenThisUpload.add(key)

    await prisma.project.create({
      data: { code: row.code, shortName: row.shortName || '', title: row.title, status: 'Active', access: 'Team' },
    })
    created.push(row)
  }

  if (created.length > 0) {
    await logAudit({
      actor: session.user,
      action: 'project.bulk_upload',
      targetType: 'Project',
      targetLabel: `${created.length} projects from ${file.name}`,
      metadata: { fileName: file.name, createdCount: created.length, skippedCount: skipped.length },
    })
  }

  return NextResponse.json({ created, skipped })
}
