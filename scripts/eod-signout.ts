import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Runs daily at 6:30pm (see the "APEX EOD Signout" scheduled task) to close
// out anyone who's still "signed in" at end of day and force their session
// to end, so attendance doesn't drift into the next day just because
// someone left without formally signing out.
//
// Writes its own audit-log row directly (rather than importing
// lib/audit.ts's logAudit) because that file pulls in lib/prisma.ts via the
// `@/` path alias, which ts-node can't resolve when run through
// scripts/tsconfig.json (no `paths` mapping there) — that silently broke
// this exact script for weeks (every run failed at import time, before
// main() ever ran, so no attendance records were ever actually closed).
async function main() {
  const now = new Date()

  const [closedRecords, clearedSessions] = await Promise.all([
    prisma.signInRecord.updateMany({ where: { signOutAt: null }, data: { signOutAt: now } }),
    prisma.user.updateMany({ where: { activeSessionId: { not: null } }, data: { activeSessionId: null } }),
  ])

  await prisma.auditLog.create({
    data: {
      actorId: 'system',
      actorName: 'System (EOD auto sign-out)',
      action: 'attendance.eod_auto_signout',
      targetType: 'SignInRecord',
      metadata: { closedRecordCount: closedRecords.count, sessionsInvalidated: clearedSessions.count, ranAt: now.toISOString() },
    },
  })

  console.log(`Closed ${closedRecords.count} open attendance record(s), invalidated ${clearedSessions.count} active session(s) at ${now.toISOString()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
