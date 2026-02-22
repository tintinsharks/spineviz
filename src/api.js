const PARSE_PROMPT = `You are a medical NLP parser. Extract structured findings from this MRI spine report.
For each spinal level, output ONLY a JSON array (no markdown/backticks) with objects:
- "level": spinal level (e.g. "L4","C5","S1")
- "severity": "mild"|"moderate"|"severe" (most significant finding)
- "findings": string array of findings
- "disc_level": disc notation if any (e.g. "L4-L5")
If a disc spans two vertebrae, create entries for BOTH.
Return ONLY the JSON array.

Report:
`

export async function parseMRIReport(text, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: PARSE_PROMPT + text }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw = data.content.map((i) => i.text || '').join('')
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

// Build a lookup map: { "L4": finding, "L5": finding, ... }
export function buildFindingsMap(findings) {
  const map = {}
  if (!findings) return map
  findings.forEach((f) => {
    map[f.level] = f
  })
  return map
}

// Deduplicate findings by level
export function dedupeFindings(findings) {
  if (!findings) return []
  const seen = new Set()
  return findings.filter((f) => {
    if (seen.has(f.level)) return false
    seen.add(f.level)
    return true
  })
}
