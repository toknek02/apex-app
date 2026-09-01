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

const ACCENT = '#4f46e5'
const INK = '#0f172a'
const MUTED = '#64748b'
const BORDER = '#e2e8f0'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Wraps message content in a plain corporate shell — MAA-OA header, one
// optional call-to-action button, Arkitek MAA footer — and returns both the
// HTML and a plain-text version so every client renders something sensible.
// Inline styles only; email clients strip <style> blocks and don't do flexbox.
export function composeEmail(opts: {
  heading: string
  paragraphs: string[]
  cta?: { label: string; url: string }
  footNote?: string
}): { text: string; html: string } {
  const { heading, paragraphs, cta, footNote } = opts

  const text = [
    heading,
    '',
    ...paragraphs,
    ...(cta ? ['', `${cta.label}: ${cta.url}`] : []),
    ...(footNote ? ['', footNote] : []),
    '',
    '—',
    'MAA-OA · Arkitek MAA Office Automation',
    'This is an automated message. Please do not reply to this email.',
  ].join('\n')

  const paraHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${INK}">${esc(p)}</p>`
    )
    .join('')

  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0">
         <tr><td style="border-radius:6px;background:${ACCENT}">
           <a href="${esc(cta.url)}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${esc(cta.label)}</a>
         </td></tr>
       </table>
       <p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all">
         If the button doesn't work, copy this link into your browser:<br>${esc(cta.url)}
       </p>`
    : ''

  const footHtml = footNote
    ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${MUTED}">${esc(footNote)}</p>`
    : ''

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:10px;overflow:hidden">
        <tr><td style="padding:20px 28px;border-bottom:1px solid ${BORDER}">
          <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${INK}">MAA-OA</span>
          <span style="font-size:12px;color:${MUTED};margin-left:8px">Arkitek MAA</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${INK}">${esc(heading)}</h1>
          ${paraHtml}
          ${ctaHtml}
          ${footHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${BORDER};font-size:12px;line-height:1.6;color:${MUTED}">
          MAA-OA · Arkitek MAA Office Automation<br>
          This is an automated message — please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  return { text, html }
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
