import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { parseProjectsListWorkbook, type ProjectsListRow } from '@/lib/bulk-upload-parse'

// Maps the source register's free-text Status values (a much wider, looser
// vocabulary than APEX's own five-status set) onto the closest APEX status —
// the raw value is preserved in the project's description block regardless,
// so nothing is lost even where the mapping is approximate.
const STATUS_MAP: Record<string, string> = {
  archived: 'Archived',
  completed: 'Completed',
  ccc: 'Completed',
  built: 'Completed',
  'unknown, built': 'Completed',
  'work in progress': 'Active',
  construction: 'Active',
  'not assigned': 'On Hold',
  kiv: 'On Hold',
  'pending client decision': 'On Hold',
  'pending design brief': 'On Hold',
  'not successful': 'Suspended',
  aborted: 'Suspended',
  terminated: 'Suspended',
}

function mapStatus(raw: string): string {
  return STATUS_MAP[raw.trim().toLowerCase()] ?? 'Active'
}

function buildAddress(row: ProjectsListRow): string | null {
  const parts = [row.street, row.taman, row.city, row.mukim, row.daerah].map((p) => p.trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

function buildDescription(row: ProjectsListRow): string | null {
  const lines: string[] = []
  if (row.status.trim()) lines.push(`Original status: ${row.status.trim()}`)
  if (row.scopeOfWorks.trim()) lines.push(`Scope of Works: ${row.scopeOfWorks.trim()}`)
  return lines.length > 0 ? lines.join('\n') : null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_PROJECTS')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'A file is required' }, { status: 400 })

  let rows: ProjectsListRow[]
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    rows = await parseProjectsListWorkbook(buffer, file.name)
  } catch {
    return NextResponse.json({ error: 'Could not read that file — make sure it\'s an unprotected .xlsx or .csv file' }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows found — the file needs a header row with "Job No" and "Project Name" columns' }, { status: 400 })
  }

  const existingProjects = await prisma.project.findMany({ select: { code: true } })
  const existingCodes = new Set(existingProjects.map((p) => p.code.trim().toLowerCase()))
  const usedThisRun = new Set<string>()

  const created: { code: string; title: string }[] = []
  const skipped: { jobNo: string; reason: string }[] = []

  for (const row of rows) {
    if (!row.title.trim()) {
      skipped.push({ jobNo: row.jobNo, reason: 'Missing project name' })
      continue
    }

    const baseCode = row.phase.trim() ? `KL${row.jobNo}-${row.phase.trim()}` : `KL${row.jobNo}`
    if (existingCodes.has(baseCode.toLowerCase())) {
      skipped.push({ jobNo: row.jobNo, reason: `Already exists as ${baseCode}` })
      continue
    }

    // A genuine intra-file collision (two rows sharing both Job No and Phase,
    // or both with a blank Phase) — distinct from the case above, since these
    // are new rows this run, not something already tracked in APEX.
    let code = baseCode
    if (usedThisRun.has(code.toLowerCase())) {
      let n = 2
      while (usedThisRun.has(`${code}-${n}`.toLowerCase())) n++
      code = `${code}-${n}`
    }
    usedThisRun.add(code.toLowerCase())

    await prisma.project.create({
      data: {
        code,
        shortName: row.title.trim(),
        title: row.title.trim(),
        status: mapStatus(row.status),
        access: 'Team',
        client: row.client.trim() || null,
        description: buildDescription(row),
        startDate: row.entryDate,
        completedAt: row.completionDate,
        jobNo: row.jobNo,
        phase: row.phase.trim() || null,
        scopeOfWorks: row.scopeOfWorks.trim() || null,
        address: buildAddress(row),
        state: row.state.trim() || null,
        country: row.country.trim() || null,
        mainTypology: row.mainTypology.trim() || null,
        subTypology: row.subTypology.trim() || null,
        designInCharge: row.designInCharge.trim() || null,
        siteArea: row.siteArea,
        gfa: row.gfa,
        noOfFloors: row.noOfFloors,
        noOfUnits: row.noOfUnits,
        certification: row.certification.trim() || null,
      },
    })
    created.push({ code, title: row.title.trim() })
  }

  if (created.length > 0) {
    await logAudit({
      actor: session.user,
      action: 'project.import_registry',
      targetType: 'Project',
      targetLabel: `${created.length} projects from ${file.name}`,
      metadata: { fileName: file.name, createdCount: created.length, skippedCount: skipped.length },
    })
  }

  return NextResponse.json({ created, skipped })
}
