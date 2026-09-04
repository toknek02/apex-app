// Read-only counterpart to ProjectInfoForm, shown to staff without
// MANAGE_PROJECTS. It also surfaces the register fields the edit form doesn't
// carry (typology, GFA, site area, D-I-C and so on), which are exactly the
// details people look a project up for.

type ProjectView = {
  code: string
  title: string
  status: string
  client: string | null
  description: string | null
  offices: string[]
  startDate: string | null
  completedAt: string | null
  address: string | null
  state: string | null
  country: string | null
  mainTypology: string | null
  subTypology: string | null
  scopeOfWorks: string | null
  designInCharge: string | null
  siteArea: number | null
  gfa: number | null
  noOfFloors: number | null
  noOfUnits: number | null
  certification: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '9px 0', borderBottom: '1px solid var(--apex-border)', fontSize: 13 }}>
      <span style={{ color: 'var(--apex-muted)', width: 150, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

export function ProjectInfoView({ project }: { project: ProjectView }) {
  const location = [project.address, project.state, project.country].filter(Boolean).join(', ')
  const typology = [project.mainTypology, project.subTypology].filter(Boolean).join(' — ')
  const rows: [string, React.ReactNode][] = [
    ['Job Code', project.code],
    ['Title', project.title],
    ['Status', project.status],
    ['Client', project.client],
    ['Scope of Works', project.scopeOfWorks],
    ['Typology', typology],
    ['Location', location],
    ['Design In Charge', project.designInCharge],
    ['Start Date', fmtDate(project.startDate)],
    ['Completed', fmtDate(project.completedAt)],
    ['Offices', project.offices.length > 0 ? project.offices.join(', ') : null],
    ['Site Area', project.siteArea],
    ['GFA', project.gfa],
    ['Floors', project.noOfFloors],
    ['Units', project.noOfUnits],
    ['Certification', project.certification],
    ['Notes', project.description],
  ]
  // Blank fields are dropped rather than shown as dashes — most of the
  // imported register is sparse, and a wall of "—" hides the real content.
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && v !== '')

  return (
    <div className="apex-card" style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      {filled.map(([label, value]) => (
        <Row key={label} label={label} value={value} />
      ))}
      <p style={{ fontSize: 11, color: 'var(--apex-muted)', marginTop: 14 }}>
        View only — contact an administrator to change any of these details.
      </p>
    </div>
  )
}
