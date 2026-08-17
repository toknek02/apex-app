import Link from 'next/link'
import { Paperclip, Pencil, Plus } from 'lucide-react'
import { requireUser, hasPermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { DeleteAnnouncementButton } from '@/components/announcements/delete-announcement-button'
import { MarkAnnouncementsRead } from '@/components/announcements/mark-announcements-read'

export default async function AnnouncementsPage() {
  const user = await requireUser()
  const canManage = hasPermission(user, 'MANAGE_ANNOUNCEMENTS')

  const announcements = await prisma.announcement.findMany({
    where: canManage ? {} : { OR: [{ recipients: { none: {} } }, { recipients: { some: { userId: user.id } } }] },
    include: { attachments: true, createdBy: { select: { name: true } }, recipients: { select: { user: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <MarkAnnouncementsRead />
      <Breadcrumb items={['Announcements']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Announcements</h1>
        {canManage && (
          <Link
            href="/announcements/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: 'var(--apex-accent)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
          >
            <Plus size={14} /> New Announcement
          </Link>
        )}
      </div>

      {announcements.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 24, fontSize: 13, color: 'var(--apex-muted)' }}>
          No announcements yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.map((a) => (
            <div key={a.id} style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{a.title}</h2>
                {canManage && (
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                    <Link href={`/announcements/${a.id}/edit`} style={{ display: 'inline-flex' }}>
                      <Pencil size={14} color="var(--apex-accent)" />
                    </Link>
                    <DeleteAnnouncementButton id={a.id} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--apex-muted)', marginBottom: 12 }}>
                Posted by {a.createdBy.name} on {a.createdAt.toLocaleDateString('en-GB')}
                {a.updatedAt.getTime() !== a.createdAt.getTime() ? ' (edited)' : ''}
                {canManage && a.recipients.length > 0 && (
                  <> — sent to {a.recipients.map((r) => r.user.name).join(', ')}</>
                )}
              </div>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: a.attachments.length > 0 ? 14 : 0 }}>{a.body}</p>
              {a.attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {a.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/announcements/${a.id}/attachments/${att.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--apex-accent)', textDecoration: 'none', width: 'fit-content' }}
                    >
                      <Paperclip size={13} /> {att.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
