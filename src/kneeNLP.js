/* ═══════════════════════════════════════════════════════════════
   KNEE MRI NLP ENGINE
   
   Extracts structured findings from radiology impression text.
   Uses Claude API with a tightly constrained schema prompt.
   
   Architecture:
   - extractFindings(text) → raw structured findings (API call)
   - mapToVisualization(raw) → visualization-ready data (deterministic)
   ═══════════════════════════════════════════════════════════════ */

const EXTRACTION_PROMPT = `You are a radiology NLP parser specialized in knee MRI reports. Extract structured findings from the IMPRESSION section.

RULES:
- Extract ONLY pathological findings. Skip normal/intact structures.
- If a single impression line contains multiple findings, split them (e.g., "ACL tear with bone bruising" = 2 findings).
- Use standardized structure names from the list below.
- Classify severity conservatively — if language is equivocal ("may represent", "cannot exclude"), use "equivocal".
- "Signal abnormality" alone is NOT a tear unless the radiologist says tear/disruption.
- Grade cartilage using Outerbridge if mentioned, otherwise estimate from descriptors.
- For meniscal tears, capture the tear type (horizontal, radial, complex, bucket-handle, etc.) and location (anterior horn, body, posterior horn).
- Skip incidental findings unrelated to the knee joint (e.g., subcutaneous edema, Baker's cyst unless specifically called out).
- Include Baker's cyst only if it's called out as a distinct finding.

STRUCTURE NAMES (use exactly):
- acl (anterior cruciate ligament)
- pcl (posterior cruciate ligament) 
- mcl (medial collateral ligament)
- lcl (lateral collateral ligament)
- meniscus_medial (medial meniscus)
- meniscus_lateral (lateral meniscus)
- cartilage_medial (medial femoral condyle articular cartilage)
- cartilage_lateral (lateral femoral condyle articular cartilage)
- cartilage_patella (patellar/trochlear articular cartilage)
- cartilage_tibial (tibial plateau articular cartilage)
- effusion (joint effusion)
- bone_femoral_medial (medial femoral condyle bone)
- bone_femoral_lateral (lateral femoral condyle bone)
- bone_tibial_medial (medial tibial plateau bone)
- bone_tibial_lateral (lateral tibial plateau bone)
- bone_patella (patellar bone)
- patella_tendon (patellar tendon)
- quad_tendon (quadriceps tendon)
- plica (plica)
- bakers_cyst (Baker's/popliteal cyst)
- loose_body (loose body/free fragment)

SEVERITY LEVELS:
- mild: Grade 1-2 changes, minor signal abnormality, small effusion, bone bruise, stable tears, incidental findings
- moderate: Grade 2-3 changes, partial tears, moderate effusion, unstable meniscal tears, significant bone marrow edema
- severe: Complete tears/ruptures, Grade 4 cartilage loss, large displaced fragments, complex multi-ligament injury

OUTPUT FORMAT — respond with ONLY a JSON array, no markdown, no backticks, no explanation:
[
  {
    "structure": "acl",
    "pathology": "Complete Tear",
    "severity": "severe",
    "location": "midsubstance",
    "details": "Complete disruption of ACL fibers with anterior tibial translation",
    "associated": ["bone bruising lateral compartment"],
    "equivocal": false
  }
]

If no pathological findings are present, return: []

IMPRESSION TEXT:
`;

/**
 * Extract structured findings from MRI impression text via Claude API.
 * 
 * @param {string} text - The MRI impression text
 * @param {string} [apiKey] - Anthropic API key (optional in claude.ai artifacts)
 * @returns {Promise<Array>} - Array of raw extracted findings
 */
export async function extractFindings(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Strip common prefixes
  const cleaned = trimmed
    .replace(/^(IMPRESSION|FINDINGS|CONCLUSION)[:\s]*/i, '')
    .trim();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: EXTRACTION_PROMPT + cleaned }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('API error:', res.status, err);
      throw new Error(`API error ${res.status}`);
    }

    const data = await res.json();
    const raw = data.content.map(c => c.text || '').join('');
    const jsonStr = raw.replace(/```json|```/g, '').trim();
    
    const findings = JSON.parse(jsonStr);
    
    // Validate structure
    if (!Array.isArray(findings)) {
      console.error('Expected array, got:', typeof findings);
      return [];
    }

    return findings.filter(f => 
      f.structure && f.pathology && f.severity &&
      ['mild', 'moderate', 'severe', 'equivocal'].includes(f.severity)
    );

  } catch (err) {
    console.error('NLP extraction failed:', err);
    throw err;
  }
}

/**
 * Deduplicate findings that map to the same visualization structure.
 * If two findings hit the same structure, keep the more severe one
 * but merge the pathology descriptions.
 */
export function dedupeFindings(findings) {
  const map = new Map();
  const SEV_RANK = { mild: 0, equivocal: 0, moderate: 1, severe: 2 };

  for (const f of findings) {
    const key = f.structure;
    if (map.has(key)) {
      const existing = map.get(key);
      if ((SEV_RANK[f.severity] || 0) > (SEV_RANK[existing.severity] || 0)) {
        f.details = `${f.details}. Also: ${existing.pathology} — ${existing.details}`;
        map.set(key, f);
      } else {
        existing.details = `${existing.details}. Also: ${f.pathology} — ${f.details}`;
      }
    } else {
      map.set(key, f);
    }
  }

  return Array.from(map.values());
}
