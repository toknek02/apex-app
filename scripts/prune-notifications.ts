import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Unlike audit/error logs, notifications are personal — someone might still
// want to scroll back through recent history, so this window is longer.
// Only READ notifications are pruned; unread ones are never auto-deleted,
// since disappearing before someone's acted on them would be surprising.
const RETENTION_DAYS = 30

async function main() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  const { count } = await prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: cutoff } } })
  console.log(`Pruned ${count} read notification${count === 1 ? '' : 's'} older than ${RETENTION_DAYS} days`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
