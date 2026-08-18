import { prisma } from '@/lib/prisma'

type NotificationInput = {
  userId: string
  type: string
  title: string
  body?: string
  link?: string
}

export async function notifyUser(input: NotificationInput) {
  await notifyUsers([input.userId], input)
}

// Notifies multiple users at once, skipping duplicate userIds (e.g. someone
// who is both the applicant's director and an HR notification recipient)
// and anyone who has muted this notification type — never creating a row
// for them at all, rather than creating one already marked read.
export async function notifyUsers(userIds: string[], input: Omit<NotificationInput, 'userId'>) {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return

  const recipients = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, mutedNotificationTypes: true },
  })
  const recipientIds = recipients.filter((u) => !u.mutedNotificationTypes.includes(input.type)).map((u) => u.id)
  if (recipientIds.length === 0) return

  await prisma.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    })),
  })
}
