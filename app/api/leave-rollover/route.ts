import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { computeRolloverPreview, applyRollover, getRolloverHistory } from '@/lib/leave-rollover'

function parseCap(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_LEAVE_ENTITLEMENTS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const fromYear = Number(sp.get('fromYear'))
  if (!Number.isInteger(fromYear) || fromYear < 2000 || fromYear > 2100) {
    return NextResponse.json({ error: 'fromYear must be a valid year' }, { status: 400 })
  }
  const capDays = parseCap(sp.get('cap'))

  const [rows, history] = await Promise.all([computeRolloverPreview(fromYear, capDays), getRolloverHistory()])
  return NextResponse.json({
    rows,
    capDays,
    alreadyApplied: history.find((h) => h.fromYear === fromYear) ?? null,
    history,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user, 'MANAGE_LEAVE_ENTITLEMENTS')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const fromYear = Number(body.fromYear)
  if (!Number.isInteger(fromYear) || fromYear < 2000 || fromYear > 2100) {
    return NextResponse.json({ error: 'fromYear must be a valid year' }, { status: 400 })
  }
  const capDays = parseCap(typeof body.cap === 'number' ? String(body.cap) : body.cap)

  try {
    const { affectedCount } = await applyRollover(fromYear, capDays, session.user)
    return NextResponse.json({ success: true, affectedCount })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Rollover failed' }, { status: 409 })
  }
}
