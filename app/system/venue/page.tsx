import { Pencil } from 'lucide-react'
import { requirePermission } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { AppShell, Breadcrumb } from '@/components/layout/app-shell'
import { VenueModal } from '@/components/system/venue-modal'

export default async function VenuePage() {
  const user = await requirePermission('MANAGE_VENUES')
  const venues = await prisma.venue.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <AppShell user={{ name: user.name ?? '', roleName: user.roleName, permissions: user.permissions }}>
      <Breadcrumb items={['System', 'Venue']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700 }}>Venue</h1>
        <VenueModal
          trigger={
            <span style={{ padding: '8px 16px', backgroundColor: 'var(--apex-accent)', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              New
            </span>
          }
        />
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid var(--apex-border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--apex-tbl-hdr)' }}>
              {['ID', 'Description', 'Collision Check', 'Actions'].map((h) => (
                <th key={h} style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {venues.map((v, i) => (
              <tr key={v.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : '#fff' }}>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12, color: 'var(--apex-muted)' }}>{i}</td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>{v.description}</td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>{v.collisionCheck ? 'Yes' : 'No'}</td>
                <td style={{ borderRight: '1px solid var(--apex-border)', padding: '9px 14px', fontSize: 12 }}>
                  <VenueModal venue={v} trigger={<Pencil size={14} color="var(--apex-accent)" />} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
