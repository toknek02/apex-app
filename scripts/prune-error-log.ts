import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Same reasoning as prune-audit-log.ts — these are for debugging recent
// issues, not long-term record-keeping, so a short window is fine.
const RETENTION_DAYS = 7

async function main() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  const { count } = await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  console.log(`Pruned ${count} error log entr${count === 1 ? 'y' : 'ies'} older than ${RETENTION_DAYS} days`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
