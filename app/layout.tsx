import type { Metadata } from 'next'
import { Inter, Sora } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorReporter } from '@/components/error-reporter'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const sora = Sora({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-sora', display: 'swap' })

export const metadata: Metadata = {
  title: 'MAA-OA',
  description: 'Arkitek MAA — MAA-OA staff, logbook, and project management system',
}

// Runs before first paint so the theme is applied without a flash. No attribute
// = follow the OS setting (handled in globals.css via prefers-color-scheme).
const themeScript = `(function(){try{var t=localStorage.getItem('apex-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ErrorReporter />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
