import { SEV } from '../data'

export function HoverHUD({ level, findingsMap }) {
  if (!level) return null
  const f = findingsMap[level]

  return (
    <div style={{
      position: 'absolute', top: 16, left: 16,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
      padding: '8px 14px', borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.1)',
      fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: '#fff',
      pointerEvents: 'none', zIndex: 10,
    }}>
      {level}
      {f && (
        <span style={{ marginLeft: 8, fontSize: 10, color: SEV[f.severity].hex }}>
          ● {f.severity}
        </span>
      )}
    </div>
  )
}

export function DetailOverlay({ finding }) {
  if (!finding) return null
  const s = SEV[finding.severity]

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20, right: 20, maxWidth: 500,
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(16px)',
      padding: '16px 20px', borderRadius: 12,
      border: `1px solid ${s.bdr}`,
      pointerEvents: 'none', zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: s.hex }}>
          {finding.disc_level || finding.level}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
          color: s.hex, background: s.bg,
          padding: '3px 10px', borderRadius: 4, border: `1px solid ${s.bdr}`,
        }}>
          {finding.severity}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
        {finding.findings?.map((t, i) => (
          <div key={i} style={{ marginTop: i ? 4 : 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: 6 }}>›</span>{t}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ControlsHint() {
  return (
    <div style={{
      position: 'absolute', top: 16, right: 16,
      fontSize: 10, color: 'rgba(255,255,255,0.18)',
      textAlign: 'right', lineHeight: 1.6, pointerEvents: 'none',
    }}>
      Drag to rotate · Scroll to zoom · Click vertebra
    </div>
  )
}

export function EmptyState() {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)', textAlign: 'center',
      color: 'rgba(255,255,255,0.18)', fontSize: 14, pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 42, marginBottom: 14, opacity: 0.35 }}>🦴</div>
      <div style={{ fontWeight: 500 }}>Paste an MRI report to begin</div>
      <div style={{ fontSize: 12, marginTop: 6, opacity: 0.5 }}>
        Affected vertebrae illuminate on the 3D model
      </div>
    </div>
  )
}
