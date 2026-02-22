import { SEV, SAMPLE_REPORT } from '../data'
import { dedupeFindings } from '../api'

const styles = {
  panel: {
    width: 340, borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
    background: 'rgba(255,255,255,0.008)',
  },
  inner: { padding: 20, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  h2: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: '0 0 4px' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 14px' },
  textarea: {
    flex: 1, minHeight: 180, background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    padding: 14, color: '#c8ccd8', fontSize: 13, lineHeight: 1.6, resize: 'none',
  },
  btnRow: { display: 'flex', gap: 8, marginTop: 12 },
  btnAnalyze: {
    flex: 1, padding: 10, borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnAnalyzeDisabled: {
    flex: 1, padding: 10, borderRadius: 8, border: 'none',
    background: 'rgba(99,102,241,0.3)',
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'not-allowed',
  },
  btnSample: {
    padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
    fontSize: 12, cursor: 'pointer',
  },
  error: {
    marginTop: 10, padding: 10, borderRadius: 6,
    background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)',
    color: '#ff6b6b', fontSize: 12,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: 1.2, color: 'rgba(255,255,255,0.25)', marginBottom: 10,
  },
  summaryRow: { display: 'flex', gap: 8, marginBottom: 16 },
  findingsList: { flex: 1, overflow: 'auto', paddingRight: 4 },
  btnEdit: {
    marginTop: 10, padding: 8, borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
    color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', flexShrink: 0,
  },
}

function SummaryCard({ severity, count }) {
  const s = SEV[severity]
  return (
    <div style={{ flex: 1, padding: 10, borderRadius: 8, background: s.bg, border: `1px solid ${s.bdr}`, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: s.hex, fontFamily: 'monospace' }}>{count}</div>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: s.hex, opacity: 0.7, marginTop: 2 }}>{severity}</div>
    </div>
  )
}

function FindingCard({ finding, isSelected, isHovered, onHover, onSelect }) {
  const s = SEV[finding.severity]
  return (
    <div
      onMouseEnter={() => onHover(finding.level)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(finding.level)}
      style={{
        padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
        transition: 'all 0.2s', marginBottom: 8,
        border: `1px solid ${isSelected ? s.hex : isHovered ? s.bdr : 'rgba(255,255,255,0.06)'}`,
        background: isSelected ? s.bg : isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: s.hex }}>
          {finding.disc_level || finding.level}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
          color: s.hex, background: s.bg, border: `1px solid ${s.bdr}`,
          padding: '2px 8px', borderRadius: 4,
        }}>
          {finding.severity}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
        {finding.findings?.map((t, i) => (
          <div key={i} style={{ marginTop: i ? 3 : 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.18)', marginRight: 6 }}>›</span>{t}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Panel({
  text, setText, findings, loading, error,
  onAnalyze, hoveredLevel, selectedLevel,
  onHover, onSelect, inputMode, setInputMode,
}) {
  const unique = dedupeFindings(findings)
    .sort((a, b) => ({ severe: 0, moderate: 1, mild: 2 }[a.severity] - { severe: 0, moderate: 1, mild: 2 }[b.severity]))

  const counts = { mild: 0, moderate: 0, severe: 0 }
  unique.forEach((f) => counts[f.severity]++)

  const canAnalyze = !loading && text.trim().length > 0

  return (
    <div style={styles.panel}>
      <div style={styles.inner}>
        {inputMode ? (
          <>
            <h2 style={styles.h2}>MRI Report</h2>
            <p style={styles.sub}>Paste the Impression section below</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste MRI report impression text here..."
              style={styles.textarea}
            />
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.btnRow}>
              <button
                onClick={onAnalyze}
                disabled={!canAnalyze}
                style={canAnalyze ? styles.btnAnalyze : styles.btnAnalyzeDisabled}
              >
                {loading ? 'Analyzing...' : 'Analyze Report'}
              </button>
              <button onClick={() => setText(SAMPLE_REPORT)} style={styles.btnSample}>
                Sample
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={styles.sectionLabel}>Summary</div>
            <div style={styles.summaryRow}>
              {Object.entries(counts)
                .filter(([, c]) => c > 0)
                .map(([sev, ct]) => <SummaryCard key={sev} severity={sev} count={ct} />)}
            </div>
            <div style={styles.sectionLabel}>Findings ({unique.length} levels)</div>
            <div style={styles.findingsList}>
              {unique.map((f, i) => (
                <FindingCard
                  key={`${f.level}-${i}`}
                  finding={f}
                  isSelected={selectedLevel === f.level}
                  isHovered={hoveredLevel === f.level}
                  onHover={onHover}
                  onSelect={(id) => onSelect(selectedLevel === id ? null : id)}
                />
              ))}
            </div>
            <button onClick={() => setInputMode(true)} style={styles.btnEdit}>
              Edit Report
            </button>
          </>
        )}
      </div>
    </div>
  )
}
