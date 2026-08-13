import { prisma } from '@/lib/prisma'

type NotificationInput = {
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}

export async function notifyUser(input: NotificationInput) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  })
}

// Notifies multiple users at once, skipping duplicate userIds (e.g. someone
// who is both the applicant's director and an HR notification recipient).
export async function notifyUsers(userIds: string[], input: Omit<NotificationInput, 'userId'>) {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return
  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    })),
  })
}
