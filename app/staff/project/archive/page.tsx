import { redirect } from 'next/navigation'

export default function ProjectArchivePage() {
  redirect('/staff/project?status=Archived')
}
