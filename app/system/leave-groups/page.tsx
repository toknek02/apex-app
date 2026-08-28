import { Pencil, Users } from 'lucide-react'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { LeaveGroupModal } from '@/components/system/leave-group-modal'
import { LeaveGroupMembersModal } from '@/components/system/leave-group-members-modal'

export default async function LeaveGroupsPage() {
  const user = await requirePermission('MANAGE_LEAVE_GROUPS')

  const [leaveGroups, staff] = await Promise.all([
    prisma.leaveGroup.findMany({
      include: {
        director: { select: { id: true, name: true } },
        architect: { select: { id: true, name: true } },
        memberships: { select: { userId: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Groups']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Groups</h1>
        <LeaveGroupModal
          staff={staff}
          trigger={
            <span style={{ padding: '8px 16px', backgroundColor: 'var(--apex-accent)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              New
            </span>
          }
        />
      </div>
      <p style={{ fontSize: 12, color: 'var(--apex-muted)', marginBottom: 16, maxWidth: 640 }}>
        Each group has a Director, who gives final approval on that group's leave applications, and an
        optional Architect, who reviews applications first — if set, an application only reaches the
        Director after the Architect approves it. Staff can belong to more than one group, and pick
        which one to route a leave application through when applying. Click a group's member count to
        manage who's in it.
      </p>

      <div style={{ backgroundColor: 'var(--apex-surface)', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['Name', 'Architect', 'Director', 'Members', 'Actions'].map((h) => (
                <th key={h} style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaveGroups.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, fontStyle: 'italic', color: 'var(--apex-muted)' }}>
                  No groups yet.
                </td>
              </tr>
            ) : (
              leaveGroups.map((g, i) => (
                <tr key={g.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                  <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, fontWeight: 600 }}>{g.name}</td>
                  <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: g.architect ? 'var(--apex-text)' : 'var(--apex-muted)' }}>
                    {g.architect?.name ?? '— None —'}
                  </td>
                  <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>{g.director.name}</td>
                  <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                    <LeaveGroupMembersModal
                      groupId={g.id}
                      groupName={g.name}
                      staff={staff}
                      currentMemberIds={g.memberships.map((m) => m.userId)}
                      trigger={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--apex-accent)', fontWeight: 600 }}>
                          <Users size={13} /> {g.memberships.length}
                        </span>
                      }
                    />
                  </td>
                  <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                    <LeaveGroupModal
                      leaveGroup={{ id: g.id, name: g.name, directorId: g.directorId, architectId: g.architectId }}
                      staff={staff.map((s) => ({ id: s.id, name: s.name }))}
                      trigger={<Pencil size={14} color="var(--apex-accent)" />}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
