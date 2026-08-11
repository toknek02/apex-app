import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Audit entries are for accountability/investigation, not disaster recovery
// like the DB backups — kept for a much shorter window on purpose.
const RETENTION_DAYS = 7

async function main() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  const { count } = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  console.log(`Pruned ${count} audit log entr${count === 1 ? 'y' : 'ies'} older than ${RETENTION_DAYS} days`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
