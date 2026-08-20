import ExcelJS from 'exceljs'

// Rows whose first meaningful cell is one of these are section labels or
// running totals, not real data — real spreadsheets like HR's leave-summary
// workbook mix these into the same columns as actual rows.
const SUMMARY_ROW = /^(total|grand total|sub ?total|all staff( only)?|directors? *@? *hq|site staff|staff only)$/i
// A free-text note/remark rather than a name or code — e.g. "Record: Site
// staff 1/2 entitled on 19/3" showed up as a stray row in the real workbook
// this was built against. Real names/codes essentially never contain a colon.
const LOOKS_LIKE_A_NOTE = /:/

async function loadWorkbook(buffer: Buffer, filename: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  if (filename.toLowerCase().endsWith('.csv')) {
    // exceljs' CSV reader wants a stream, not a buffer.
    const { Readable } = await import('stream')
    await workbook.csv.read(Readable.from(buffer))
  } else {
    // exceljs bundles its own @types/node version, which conflicts with the
    // project's — functionally identical Buffer at runtime either way.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
  }
  return workbook
}

// Finds the first row (in the first sheet that has one) containing all of
// the given column labels — each entry in `columnKeywords` is a list of
// acceptable alternate labels for that column (case-insensitive substring
// match), checked in order. Returns the 1-indexed column number found for
// each, in the same order, plus that row's own cell text per column — a
// header spanning multiple merged rows (common for two-line headers) makes
// exceljs echo the master cell's text on every row it's merged across, so
// callers need this to recognize and skip those echoed continuation rows
// rather than reading them as the first data row.
function findHeaderRow(worksheet: ExcelJS.Worksheet, columnKeywords: string[][]): { rowNumber: number; cols: number[]; headerTexts: string[] } | null {
  for (let r = 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r)
    const cols = columnKeywords.map((keywords) => {
      let found = -1
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (found !== -1) return
        const val = String(cell.value ?? '').toLowerCase()
        if (keywords.some((k) => val.includes(k))) found = colNumber
      })
      return found
    })
    if (cols.every((c) => c !== -1)) {
      return { rowNumber: r, cols, headerTexts: cols.map((c) => cellText(row, c).toLowerCase()) }
    }
  }
  return null
}

function cellText(row: ExcelJS.Row, col: number): string {
  const value = row.getCell(col).value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && 'text' in value) return String((value as { text: unknown }).text ?? '').trim()
  if (typeof value === 'object' && 'result' in value) return String((value as { result: unknown }).result ?? '').trim()
  return String(value).trim()
}

export type StaffRow = { name: string; designation: string }

// Scans every sheet for a header row containing "name" and "designation",
// then reads every row below it whose name cell isn't blank or a summary
// label. Matches the layout of the real HR leave-tracking workbook, which
// has one sheet per department/level with its own header row.
export async function parseStaffWorkbook(buffer: Buffer, filename: string): Promise<StaffRow[]> {
  const workbook = await loadWorkbook(buffer, filename)
  const rows: StaffRow[] = []

  workbook.eachSheet((worksheet) => {
    const header = findHeaderRow(worksheet, [['name'], ['designation']])
    if (!header) return
    const [nameCol, designationCol] = header.cols
    const [nameHeaderText, designationHeaderText] = header.headerTexts
    for (let r = header.rowNumber + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r)
      const name = cellText(row, nameCol)
      if (!name || SUMMARY_ROW.test(name) || LOOKS_LIKE_A_NOTE.test(name)) continue
      const designation = cellText(row, designationCol)
      // A merged multi-row header echoes its own text on every row it
      // spans — this is that echo, not real data.
      if (name.toLowerCase() === nameHeaderText && designation.toLowerCase() === designationHeaderText) continue
      rows.push({ name, designation })
    }
  })

  return rows
}

export type ProjectRow = { code: string; shortName: string; title: string }

export async function parseProjectWorkbook(buffer: Buffer, filename: string): Promise<ProjectRow[]> {
  const workbook = await loadWorkbook(buffer, filename)
  const rows: ProjectRow[] = []

  workbook.eachSheet((worksheet) => {
    const header = findHeaderRow(worksheet, [['code'], ['short name', 'shortname'], ['title']])
    if (!header) return
    const [codeCol, shortNameCol, titleCol] = header.cols
    const [codeHeaderText, , titleHeaderText] = header.headerTexts
    for (let r = header.rowNumber + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r)
      const code = cellText(row, codeCol)
      if (!code || SUMMARY_ROW.test(code) || LOOKS_LIKE_A_NOTE.test(code)) continue
      const title = cellText(row, titleCol)
      if (code.toLowerCase() === codeHeaderText && title.toLowerCase() === titleHeaderText) continue
      rows.push({ code, shortName: cellText(row, shortNameCol), title })
    }
  })

  return rows
}
