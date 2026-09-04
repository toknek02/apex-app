// Read-only counterpart to ProjectTeamForm — who's on the project, without the
// add/remove controls.

type Member = { id: string; name: string; department: string | null }

export function ProjectTeamView({ members }: { members: Member[] }) {
  return (
    <div className="apex-card" style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 700 }}>Team ({members.length})</div>
      {members.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--apex-muted)', margin: 0 }}>No team members assigned yet.</p>
      ) : (
        <div style={{ border: '1px solid var(--apex-border)', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id} style={{ backgroundColor: i % 2 ? 'var(--apex-row-alt)' : 'var(--apex-surface)' }}>
                  <td style={{ padding: '7px 10px' }}>
                    {m.name}
                    {m.department && <span style={{ color: 'var(--apex-muted)', fontSize: 11 }}> ({m.department})</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
