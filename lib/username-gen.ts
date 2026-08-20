const TITLES = new Set(['ar', 'dr', 'ir', 'ts', 'prof', 'dato', 'datuk', 'datin', 'sr'])

function cleanWords(name: string): string[] {
  const n = name.split('@')[0].replace(/\(.*?\)/g, '').replace(/[^A-Za-z\s]/g, ' ')
  let words = n.split(/\s+/).filter(Boolean)
  while (words.length > 0 && TITLES.has(words[0].toLowerCase().replace(/\.$/, ''))) {
    words = words.slice(1)
  }
  return words
}

function baseUsername(words: string[]): string {
  return (words[0] ?? 'user').toLowerCase()
}

function disambigUsername(words: string[]): string {
  if (words.length >= 2) return (words[0] + words[1]).toLowerCase()
  return baseUsername(words)
}

// Generates a login username from a full name: first name, lowercase. On
// collision, tries first+second name instead of a bare number, then falls
// back to a numeric suffix as a last resort. Mutates `usedUsernames` with
// the chosen result so a batch of names can be processed in sequence
// without colliding with each other.
export function generateUsername(name: string, usedUsernames: Set<string>): string {
  const words = cleanWords(name)
  let candidate = baseUsername(words)
  if (usedUsernames.has(candidate)) {
    candidate = disambigUsername(words)
  }
  let suffix = 2
  const original = candidate
  while (usedUsernames.has(candidate)) {
    candidate = `${original}${suffix}`
    suffix++
  }
  usedUsernames.add(candidate)
  return candidate
}
