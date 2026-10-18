/**
 * Forgiving text matching used by universal search.
 * Score 0..1: exact > prefix > word-prefix > substring > subsequence > small edit distance.
 */
export const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0]; prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1))
      last = tmp
    }
  }
  return prev[b.length]
}

function isSubsequence(q, t) {
  let i = 0
  for (let j = 0; j < t.length && i < q.length; j++) if (t[j] === q[i]) i++
  return i === q.length
}

/** Score how well query `q` matches target text `t`. */
export function score(q, t) {
  q = norm(q); t = norm(t)
  if (!q || !t) return 0
  if (q === t) return 1
  if (t.startsWith(q)) return 0.92
  const words = t.split(' ')
  if (words.some((w) => w.startsWith(q))) return 0.85
  if (t.includes(q)) return 0.7
  // multi-word query: all words prefix-match some target word
  const qWords = q.split(' ')
  if (qWords.length > 1 && qWords.every((qw) => words.some((w) => w.startsWith(qw)))) return 0.68
  if (q.length >= 3 && t.length <= 6 && isSubsequence(q, t)) return 0.45
  // typo tolerance: compare against each word and the whole
  if (q.length >= 3) {
    const tol = q.length <= 4 ? 1 : q.length <= 7 ? 2 : 3
    const best = Math.min(levenshtein(q, t), ...words.map((w) => levenshtein(q, w.slice(0, q.length + 1))))
    if (best <= tol) return 0.6 - best * 0.1
  }
  return 0
}

/** Wrap matched characters with <mark> for display. Returns array of {text, hit}. */
export function highlight(text, q) {
  const t = String(text || '')
  const n = norm(q)
  if (!n) return [{ text: t, hit: false }]
  const lower = t.toLowerCase()
  const idx = lower.indexOf(n)
  if (idx >= 0) {
    return [
      { text: t.slice(0, idx), hit: false },
      { text: t.slice(idx, idx + n.length), hit: true },
      { text: t.slice(idx + n.length), hit: false },
    ].filter((p) => p.text)
  }
  // word-prefix fallback: highlight first word that starts with query's first word
  const first = n.split(' ')[0]
  const re = new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
  const m = re.exec(t)
  if (m) {
    return [
      { text: t.slice(0, m.index), hit: false },
      { text: t.slice(m.index, m.index + first.length), hit: true },
      { text: t.slice(m.index + first.length), hit: false },
    ].filter((p) => p.text)
  }
  return [{ text: t, hit: false }]
}
