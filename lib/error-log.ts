import { prisma } from '@/lib/prisma'

export async function logError(entry: {
  source: 'server' | 'client'
  message: string
  stack?: string | null
  url?: string | null
  userId?: string | null
  userName?: string | null
}) {
  try {
    await prisma.errorLog.create({
      data: {
        source: entry.source,
        message: entry.message.slice(0, 2000),
        stack: entry.stack ? entry.stack.slice(0, 8000) : null,
        url: entry.url ?? null,
        userId: entry.userId ?? null,
        userName: entry.userName ?? null,
      },
    })
  } catch {
    // Logging must never crash the caller — if the DB write fails there's
    // nowhere else safe to report that failure.
  }
}
