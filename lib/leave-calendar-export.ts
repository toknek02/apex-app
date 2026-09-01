import ExcelJS from 'exceljs'

type ExportApplication = {
  userName: string
  department: string | null
  leaveType: string
  project: string
  startDate: Date
  endDate: Date
  dayPortion: string
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_ARCHITECT: 'Pending — Architect',
  PENDING_DIRECTOR: 'Pending — Director',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2A44' } }
}

export async function buildLeaveCalendarWorkbook({
  applications,
  monthLabel,
}: {
  applications: ExportApplication[]
  monthLabel: string
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'MAA-OA'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(monthLabel.replace(/[\\/*?:[\]]/g, ''))
  sheet.columns = [
    { header: 'Staff', key: 'staff', width: 22 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Leave Type', key: 'leaveType', width: 22 },
    { header: 'Project', key: 'project', width: 26 },
    { header: 'Start Date', key: 'startDate', width: 14 },
    { header: 'End Date', key: 'endDate', width: 14 },
    { header: 'Day', key: 'day', width: 10 },
    { header: 'Status', key: 'status', width: 16 },
  ]
  styleHeader(sheet.getRow(1))

  const sorted = [...applications].sort((a, b) => a.userName.localeCompare(b.userName) || a.startDate.getTime() - b.startDate.getTime())
  for (const a of sorted) {
    sheet.addRow({
      staff: a.userName,
      department: a.department ?? '',
      leaveType: a.leaveType,
      project: a.project,
      startDate: a.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      endDate: a.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      day: a.dayPortion === 'FULL' ? 'Full' : `Half (${a.dayPortion})`,
      status: STATUS_LABELS[a.status] ?? a.status,
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
