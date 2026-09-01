import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE, APP_URL } = process.env

let transporter: nodemailer.Transporter | null = null
let warnedUnconfigured = false

// Email is optional. With SMTP_HOST + SMTP_FROM unset the app runs exactly
// as before — notifications stay in-app only and password resets fall back
// to the HR queue. See .env.example for the variables.
export function isEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_FROM)
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? Number(SMTP_PORT) : 587,
      secure: SMTP_SECURE === 'true', // true for 465, false for 587/STARTTLS
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  }
  return transporter
}

// Absolute URL for links inside emails. APP_URL is the one thing email can't
// derive from a request (notifications are sent from server actions with no
// guaranteed request origin). Without it, links degrade to a bare path
// rather than pointing at the wrong host.
export function absoluteUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  return APP_URL ? `${APP_URL.replace(/\/$/, '')}${p}` : p
}

// Never throws. Email is a best-effort side channel — a mail-server outage
// must not roll back the in-app write that triggered the send.
export async function sendMail(opts: { to: string | string[]; subject: string; text: string; html?: string }) {
  if (!isEmailConfigured()) {
    if (!warnedUnconfigured) {
      console.warn('[email] SMTP not configured (SMTP_HOST / SMTP_FROM) — outgoing email disabled')
      warnedUnconfigured = true
    }
    return
  }
  try {
    await getTransporter().sendMail({ from: SMTP_FROM, ...opts })
  } catch (err) {
    console.error('[email] send failed:', err)
  }
}
