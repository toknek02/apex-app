import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PERMISSIONS } from '../lib/permissions'

const prisma = new PrismaClient()

const VENUES = [
  { description: 'Meeting Room 1', collisionCheck: true },
  { description: 'Meeting Room 2', collisionCheck: true },
  { description: 'Board Room', collisionCheck: true },
  { description: 'In My Office', collisionCheck: false },
  { description: 'External Venue', collisionCheck: false },
]

const PROJECTS = [
  { code: 'AR0100', title: 'Lowyat Group Feasibility Studies', status: 'Active', access: 'Team' },
  { code: 'AR0101', title: 'Christine Resort Phase 1 (Lien Hoe)', status: 'Active', access: 'Team' },
  { code: 'AR0102', title: 'Lot PT78710 Puchong (Lien Hoe)', status: 'Active', access: 'Team' },
  { code: 'AR0CMY', title: 'CMY Tower', status: 'Active', access: 'Team' },
  { code: 'KL2732', title: 'MPB Jln Ampang', status: 'Active', access: 'Team' },
  { code: 'ID0MK-D', title: 'Mont Kiara Damai', status: 'Active', access: 'Team' },
  { code: 'ID-DEL-101', title: 'ID Works for Plaza Best World, JB', status: 'Archived', access: 'Team' },
  { code: 'ID-DEL-103', title: 'Prop. Interior Design - OCBC Cyber Jaya', status: 'Suspended', access: 'Team' },
]

async function main() {
  const permissions = []
  for (const p of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: p.code },
      update: { label: p.label, description: p.description },
      create: { code: p.code, label: p.label, description: p.description },
    })
    permissions.push(permission)
  }

  const administratorRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: { isSystem: true },
    create: { name: 'Administrator', description: 'Full system access. Protected — cannot be edited or deleted.', isSystem: true },
  })
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: administratorRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: administratorRole.id, permissionId: permission.id },
    })
  }

  await prisma.role.upsert({
    where: { name: 'Employee' },
    update: {},
    create: { name: 'Employee', description: 'Default role with no elevated permissions.', isSystem: false },
  })

  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@apex.local' },
    update: {},
    create: {
      name: 'Mohammad Azmi',
      email: 'admin@apex.local',
      passwordHash: adminPasswordHash,
      roleId: administratorRole.id,
      department: 'DIRECTOR',
      designation: 'Administrator',
    },
  })

  for (const v of VENUES) {
    const existing = await prisma.venue.findFirst({ where: { description: v.description } })
    if (!existing) await prisma.venue.create({ data: v })
  }

  for (const p of PROJECTS) {
    await prisma.project.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    })
  }

  console.log('Seed complete. Admin login: admin@apex.local / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
