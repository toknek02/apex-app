import fs from 'fs/promises'
import path from 'path'

const STORAGE_ROOT = process.env.APEX_STORAGE_ROOT ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage')

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
}

export function getAnnouncementFilePath(relativePath: string) {
  return path.join(STORAGE_ROOT, relativePath)
}

export async function saveAnnouncementFile(buffer: Buffer, announcementId: string, fileName: string): Promise<string> {
  const dir = path.join(STORAGE_ROOT, 'announcements', announcementId)
  await ensureDir(dir)

  const filePath = path.join(dir, fileName)
  await fs.writeFile(filePath, buffer)

  return path.join('announcements', announcementId, fileName)
}

export async function deleteAnnouncementFile(relativePath: string) {
  const absPath = getAnnouncementFilePath(relativePath)
  await fs.unlink(absPath).catch((err) => {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  })
}
