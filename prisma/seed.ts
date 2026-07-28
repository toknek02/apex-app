import { PrismaClient, User } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const STAFF: { name: string; department: string; designation: string; email: string }[] = [
  { name: 'Bernard', department: 'DIRECTOR', designation: 'Director', email: 'bernard@apex.local' },
  { name: 'Von Kok Leong', department: 'DIRECTOR', designation: 'Director', email: 'von.kokleong@apex.local' },
  { name: 'Wan Zamharir', department: 'DIRECTOR', designation: 'Director', email: 'wan.zamharir@apex.local' },
  { name: 'Josephine Tan', department: 'ASSOCIATE', designation: 'Associate', email: 'josephine.tan@apex.local' },
  { name: 'Abdul Harris', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'abdul.harris@apex.local' },
  { name: 'Ani Nadirah Anuar', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'ani.nadirah@apex.local' },
  { name: 'Azri Aziz', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'azri.aziz@apex.local' },
  { name: 'Faiz Zarif', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'faiz.zarif@apex.local' },
  { name: 'Goh Jia En, Grace', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'grace.goh@apex.local' },
  { name: 'Jessie Ku Hui Lun', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'jessie.ku@apex.local' },
  { name: 'Lee Wei Lek', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'lee.weilek@apex.local' },
  { name: 'Mohamad Adlan', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'mohamad.adlan@apex.local' },
  { name: 'Muhammad Amzar', department: 'ARCHITECT (DESIGN)', designation: 'Architect', email: 'muhammad.amzar@apex.local' },
]

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
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@apex.local' },
    update: {},
    create: {
      name: 'Mohammad Azmi',
      email: 'admin@apex.local',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      department: 'DIRECTOR',
      designation: 'Administrator',
    },
  })

  const staffPasswordHash = await bcrypt.hash('staff123', 10)
  const staffUsers: User[] = []
  for (const s of STAFF) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name,
        email: s.email,
        passwordHash: staffPasswordHash,
        role: 'STAFF',
        department: s.department,
        designation: s.designation,
      },
    })
    staffUsers.push(user)
  }

  const venues = []
  for (const v of VENUES) {
    const existing = await prisma.venue.findFirst({ where: { description: v.description } })
    venues.push(existing ?? (await prisma.venue.create({ data: v })))
  }

  const projects = []
  for (const p of PROJECTS) {
    const project = await prisma.project.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    })
    projects.push(project)
  }

  const byName = (name: string) => staffUsers.find((u) => u.name === name)!
  const boardRoom = venues.find((v) => v.description === 'Board Room')!
  const meetingRoom2 = venues.find((v) => v.description === 'Meeting Room 2')!
  const kl2732 = projects.find((p) => p.code === 'KL2732')!

  const today = new Date()
  const daysFromNow = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    d.setHours(10, 0, 0, 0)
    return d
  }

  const existingEvent = await prisma.event.findFirst({ where: { title: 'Technical Meeting' } })
  if (!existingEvent) {
    await prisma.event.create({
      data: {
        title: 'Technical Meeting',
        date: daysFromNow(0),
        venueId: boardRoom.id,
        projectId: kl2732.id,
        createdById: admin.id,
        remarks: 'MPB Jln Ampang : Technical Meeting',
        attendees: {
          create: [{ userId: byName('Von Kok Leong').id }, { userId: byName('Lee Wei Lek').id }],
        },
      },
    })

    await prisma.event.create({
      data: {
        title: 'Progress Meeting',
        date: daysFromNow(1),
        venueId: meetingRoom2.id,
        createdById: admin.id,
        remarks: 'Nil : Progress Meeting',
        attendees: { create: [{ userId: byName('Faiz Zarif').id }] },
      },
    })
  }

  // seed a few sign-ins for "today" so the dashboard/staff screens show live status
  const alreadySignedIn = await prisma.signInRecord.findFirst({
    where: { userId: byName('Josephine Tan').id, signOutAt: null },
  })
  if (!alreadySignedIn) {
    const signedInNames = ['Josephine Tan', 'Abdul Harris', 'Ani Nadirah Anuar', 'Azri Aziz', 'Faiz Zarif']
    for (const name of signedInNames) {
      await prisma.signInRecord.create({ data: { userId: byName(name).id } })
    }
  }

  console.log('Seed complete. Admin login: admin@apex.local / admin123')
  console.log('Staff login (any staff email above) / staff123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
