import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { parseStaffWorkbook } from '@/lib/bulk-upload-parse'
import { generateUsername } from '@/lib/username-gen'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_USERS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file')
  const password = form.get('password')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required' }, { status: 400 })
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Temporary password must be at least 6 characters' }, { status: 400 })
  }

  let rows
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    rows = await parseStaffWorkbook(buffer, file.name)
  } catch {
    return NextResponse.json({ error: 'Could not read that file — make sure it\'s an unprotected .xlsx or .csv file' }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows found — the file needs a header row with "Name" and "Designation" columns' }, { status: 400 })
  }

  const employeeRole = await prisma.role.findFirst({ where: { name: 'Employee' } })
  if (!employeeRole) return NextResponse.json({ error: 'No "Employee" role exists to assign new staff to' }, { status: 400 })

  const existingUsers = await prisma.user.findMany({ select: { name: true, username: true } })
  const existingNameKeys = new Set(existingUsers.map((u) => u.name.trim().toLowerCase()))
  const usedUsernames = new Set(existingUsers.map((u) => u.username).filter((u): u is string => !!u))
  // Guard against duplicate names within the file itself, not just against
  // what's already in the database.
  const seenThisUpload = new Set<string>()

  const passwordHash = await bcrypt.hash(password, 10)
  const created: { name: string; designation: string; username: string }[] = []
  const skipped: { name: string; reason: string }[] = []

  for (const row of rows) {
    const key = row.name.trim().toLowerCase()
    if (existingNameKeys.has(key)) {
      skipped.push({ name: row.name, reason: 'Already exists' })
      continue
    }
    if (seenThisUpload.has(key)) {
      skipped.push({ name: row.name, reason: 'Duplicate row in this file' })
      continue
    }
    seenThisUpload.add(key)

    const username = generateUsername(row.name, usedUsernames)
    await prisma.user.create({
      data: { name: row.name, username, passwordHash, designation: row.designation || null, roleId: employeeRole.id },
    })
    created.push({ name: row.name, designation: row.designation, username })
  }

  if (created.length > 0) {
    await logAudit({
      actor: session.user,
      action: 'user.bulk_upload',
      targetType: 'User',
      targetLabel: `${created.length} staff from ${file.name}`,
      metadata: { fileName: file.name, createdCount: created.length, skippedCount: skipped.length },
    })
  }

  return NextResponse.json({ created, skipped })
}
