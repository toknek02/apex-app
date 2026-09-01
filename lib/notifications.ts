import { prisma } from '@/lib/prisma'
import { sendMail, absoluteUrl } from '@/lib/email'

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
//
// When SMTP is configured, the same recipients (who have an email on file)
// also get the notification by email. muteNotificationTypes covers both
// channels — a muted type is neither stored nor mailed.
export async function notifyUsers(userIds: string[], input: Omit<NotificationInput, 'userId'>) {
  const uniqueIds = [...new Set(userIds)]
  if (uniqueIds.length === 0) return

  const recipients = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, email: true, mutedNotificationTypes: true },
  })
  const wanted = recipients.filter((u) => !u.mutedNotificationTypes.includes(input.type))
  if (wanted.length === 0) return

  await prisma.notification.createMany({
    data: wanted.map((u) => ({
      userId: u.id,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    })),
  })

  // Fire-and-forget: the in-app notification above is the source of truth,
  // and sendMail() swallows its own errors — don't hold the HTTP response
  // open while a slow SMTP server works through a long recipient list.
  const emails = wanted.map((u) => u.email).filter((e): e is string => !!e)
  if (emails.length > 0) {
    const linkLine = input.link ? `\n\n${absoluteUrl(input.link)}` : ''
    void Promise.allSettled(
      emails.map((to) =>
        sendMail({ to, subject: input.title, text: `${input.body ?? input.title}${linkLine}` })
      )
    )
  }
}
