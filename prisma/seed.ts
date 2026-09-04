import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
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
  { code: 'AR0100', shortName: 'Lowyat Feasibility', title: 'Lowyat Group Feasibility Studies', status: 'Active', access: 'Team' },
  { code: 'AR0101', shortName: 'Christine Resort P1', title: 'Christine Resort Phase 1 (Lien Hoe)', status: 'Active', access: 'Team' },
  { code: 'AR0102', shortName: 'PT78710 Puchong', title: 'Lot PT78710 Puchong (Lien Hoe)', status: 'Active', access: 'Team' },
  { code: 'AR0CMY', shortName: 'CMY Tower', title: 'CMY Tower', status: 'Active', access: 'Team' },
  { code: 'KL2732', shortName: 'MPB Jln Ampang', title: 'MPB Jln Ampang', status: 'Active', access: 'Team' },
  { code: 'ID0MK-D', shortName: 'Mont Kiara Damai', title: 'Mont Kiara Damai', status: 'Active', access: 'Team' },
  { code: 'ID-DEL-101', shortName: 'Plaza Best World JB', title: 'ID Works for Plaza Best World, JB', status: 'Archived', access: 'Team' },
  { code: 'ID-DEL-103', shortName: 'OCBC Cyber Jaya', title: 'Prop. Interior Design - OCBC Cyber Jaya', status: 'Suspended', access: 'Team' },
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

  // The first admin's password must never be a literal in this file — it is
  // committed to the repository, so anyone reading it would know how to sign
  // in. Set SEED_ADMIN_PASSWORD to choose one; otherwise a random password is
  // generated and printed once, here, and nowhere else. Either way the account
  // is created with mustCompleteSetup, so whoever signs in first is forced to
  // replace it immediately.
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@apex.local' } })
  if (!existingAdmin) {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString('base64url')
    await prisma.user.create({
      data: {
        name: 'Mohammad Azmi',
        email: 'admin@apex.local',
        passwordHash: await bcrypt.hash(adminPassword, 10),
        roleId: administratorRole.id,
        department: 'DIRECTOR',
        designation: 'Administrator',
        mustCompleteSetup: true,
      },
    })
    console.log(`Created admin@apex.local with a one-time password: ${adminPassword}`)
    console.log('Sign in with it now — you will be asked to set your own password immediately.')
  }

  for (const v of VENUES) {
    const existing = await prisma.venue.findFirst({ where: { description: v.description } })
    if (!existing) await prisma.venue.create({ data: v })
  }

  for (const p of PROJECTS) {
    await prisma.project.upsert({
      where: { code: p.code },
      update: { shortName: p.shortName },
      create: p,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
