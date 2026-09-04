import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SetupForm } from '@/components/setup-form'

// Deliberately reads the session directly instead of requireUser(), which
// redirects here — going through it would loop.
export default async function SetupPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.mustCompleteSetup) redirect('/')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })

  return <SetupForm name={user?.name ?? ''} existingEmail={user?.email ?? ''} />
}
