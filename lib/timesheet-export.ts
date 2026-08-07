import ExcelJS from 'exceljs'

type ExportEntry = {
  date: Date
  eventType: string
  project: { code: string; title: string } | null
  stage: string | null
  task: string | null
  normalMins: number
  otMins: number
  remarks: string | null
  user?: { id: string; name: string; department: string | null } | null
}

type ExportMember = { id: string; name: string; department: string | null }

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2A44' } }
}

export async function buildTimesheetWorkbook({
  entries,
  members,
  teamScope,
}: {
  entries: ExportEntry[]
  members: ExportMember[]
  teamScope: boolean
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'APEX'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Timesheet Entries')
  const columns = [
    ...(teamScope ? [{ header: 'Staff', key: 'staff', width: 22 }, { header: 'Department', key: 'department', width: 18 }] : []),
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Event Type', key: 'eventType', width: 16 },
    { header: 'Project', key: 'project', width: 30 },
    { header: 'Stage', key: 'stage', width: 18 },
    { header: 'Task', key: 'task', width: 20 },
    { header: 'Normal (hrs)', key: 'normal', width: 12 },
    { header: 'OT (hrs)', key: 'ot', width: 10 },
    { header: 'Remarks', key: 'remarks', width: 30 },
  ]
  sheet.columns = columns
  styleHeader(sheet.getRow(1))

  for (const e of entries) {
    sheet.addRow({
      ...(teamScope ? { staff: e.user?.name ?? 'Unknown', department: e.user?.department ?? '' } : {}),
      date: e.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      eventType: e.eventType,
      project: e.project ? `${e.project.code} — ${e.project.title}` : '',
      stage: e.stage ?? '',
      task: e.task ?? '',
      normal: Number((e.normalMins / 60).toFixed(2)),
      ot: Number((e.otMins / 60).toFixed(2)),
      remarks: e.remarks ?? '',
    })
  }

  const totalRow = sheet.addRow({
    ...(teamScope ? { staff: '', department: '' } : {}),
    date: '',
    eventType: '',
    project: '',
    stage: '',
    task: 'Total',
    normal: Number((entries.reduce((sum, e) => sum + e.normalMins, 0) / 60).toFixed(2)),
    ot: Number((entries.reduce((sum, e) => sum + e.otMins, 0) / 60).toFixed(2)),
    remarks: '',
  })
  totalRow.font = { bold: true }

  if (teamScope) {
    const summarySheet = workbook.addWorksheet('Staff Summary')
    summarySheet.columns = [
      { header: 'Staff', key: 'staff', width: 22 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Normal (hrs)', key: 'normal', width: 12 },
      { header: 'OT (hrs)', key: 'ot', width: 10 },
    ]
    styleHeader(summarySheet.getRow(1))

    const byStaff = new Map<string, { name: string; department: string | null; normalMins: number; otMins: number }>()
    for (const m of members) {
      byStaff.set(m.id, { name: m.name, department: m.department, normalMins: 0, otMins: 0 })
    }
    for (const e of entries) {
      const key = e.user?.id
      if (!key) continue
      if (!byStaff.has(key)) byStaff.set(key, { name: e.user?.name ?? 'Unknown', department: e.user?.department ?? null, normalMins: 0, otMins: 0 })
      const s = byStaff.get(key)!
      s.normalMins += e.normalMins
      s.otMins += e.otMins
    }
    for (const s of byStaff.values()) {
      summarySheet.addRow({
        staff: s.name,
        department: s.department ?? '',
        normal: Number((s.normalMins / 60).toFixed(2)),
        ot: Number((s.otMins / 60).toFixed(2)),
      })
    }
    const summaryTotalRow = summarySheet.addRow({
      staff: 'Total',
      department: '',
      normal: Number(([...byStaff.values()].reduce((sum, s) => sum + s.normalMins, 0) / 60).toFixed(2)),
      ot: Number(([...byStaff.values()].reduce((sum, s) => sum + s.otMins, 0) / 60).toFixed(2)),
    })
    summaryTotalRow.font = { bold: true }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
