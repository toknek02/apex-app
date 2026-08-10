import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { ErrorReporter } from '@/components/error-reporter'

export const metadata: Metadata = {
  title: 'APEX',
  description: 'APEX staff, logbook, and project management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
