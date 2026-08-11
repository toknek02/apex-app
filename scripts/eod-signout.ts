import { PrismaClient } from '@prisma/client'
import { logAudit } from '../lib/audit'

const prisma = new PrismaClient()

// Runs daily at 6:30pm (see the "APEX EOD Signout" scheduled task) to close
// out anyone who's still "signed in" at end of day and force their session
// to end, so attendance doesn't drift into the next day just because
// someone left without formally signing out.
async function main() {
  const now = new Date()

  const [closedRecords, clearedSessions] = await Promise.all([
    prisma.signInRecord.updateMany({ where: { signOutAt: null }, data: { signOutAt: now } }),
    prisma.user.updateMany({ where: { activeSessionId: { not: null } }, data: { activeSessionId: null } }),
  ])

  await logAudit({
    actor: { id: 'system', name: 'System (EOD auto sign-out)' },
    action: 'attendance.eod_auto_signout',
    targetType: 'SignInRecord',
    metadata: { closedRecordCount: closedRecords.count, sessionsInvalidated: clearedSessions.count, ranAt: now.toISOString() },
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
