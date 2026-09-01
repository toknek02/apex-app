import { describe, it, expect } from 'vitest'
import { composeEmail } from '@/lib/email'

describe('composeEmail', () => {
  it('puts the heading and every paragraph into both text and html', () => {
    const { text, html } = composeEmail({ heading: 'Leave approved', paragraphs: ['Line one.', 'Line two.'] })
    for (const s of ['Leave approved', 'Line one.', 'Line two.']) {
      expect(text).toContain(s)
      expect(html).toContain(s)
    }
    expect(html).toContain('MAA-OA')
  })

  it('renders the CTA as a link in html and a labelled URL in text', () => {
    const { text, html } = composeEmail({
      heading: 'Reset',
      paragraphs: ['x'],
      cta: { label: 'Reset your password', url: 'http://host/reset-password?token=abc' },
    })
    expect(html).toContain('href="http://host/reset-password?token=abc"')
    expect(text).toContain('Reset your password: http://host/reset-password?token=abc')
  })

  it('omits CTA markup when no cta is given', () => {
    const { html } = composeEmail({ heading: 'x', paragraphs: ['y'] })
    expect(html).not.toContain('<a href')
  })

  it('escapes html-significant characters in content', () => {
    const { html } = composeEmail({ heading: 'A & B <script>', paragraphs: ['1 < 2'] })
    expect(html).toContain('A &amp; B &lt;script&gt;')
    expect(html).toContain('1 &lt; 2')
    expect(html).not.toContain('<script>')
  })
})
