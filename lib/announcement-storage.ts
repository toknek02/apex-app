import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

const STORAGE_ROOT = process.env.APEX_STORAGE_ROOT ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage')

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt']
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10MB per file

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
}

// Strips any directory components and disallowed characters from a
// client-supplied filename before it ever touches the filesystem. Without
// this, a crafted upload (e.g. "../../../../windows/system32/x") could
// write outside the announcements storage folder entirely.
function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')
  return base || 'file'
}

export function getAnnouncementFilePath(relativePath: string) {
  return path.join(STORAGE_ROOT, relativePath)
}

export async function saveAnnouncementFile(buffer: Buffer, announcementId: string, fileName: string): Promise<{ storagePath: string; fileName: string }> {
  const safeName = sanitizeFileName(fileName)
  const ext = safeName.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
    throw new Error(`File type .${ext} is not allowed`)
  }
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(`File exceeds the ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB limit`)
  }

  const dir = path.join(STORAGE_ROOT, 'announcements', announcementId)
  await ensureDir(dir)

  // Prefixed with a random id so two attachments with the same name on the
  // same announcement can't silently overwrite each other.
  const storedName = `${randomUUID()}-${safeName}`
  const filePath = path.join(dir, storedName)
  await fs.writeFile(filePath, buffer)

  return { storagePath: path.join('announcements', announcementId, storedName), fileName: safeName }
}

export async function deleteAnnouncementFile(relativePath: string) {
  const absPath = getAnnouncementFilePath(relativePath)
  await fs.unlink(absPath).catch((err) => {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  })
}
