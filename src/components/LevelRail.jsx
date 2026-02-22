import { LEVELS, SEV } from '../data'

export default function LevelRail({ findingsMap, hoveredLevel, selectedLevel, onHover, onSelect }) {
  return (
    <div style={{
      width: 52, borderLeft: '1px solid rgba(255,255,255,0.06)',
      padding: '6px 0', display: 'flex', flexDirection: 'column',
      alignItems: 'center', overflow: 'auto', flexShrink: 0,
    }}>
      {LEVELS.map((lv) => {
        const f = findingsMap[lv.id]
        const isH = hoveredLevel === lv.id
        const isS = selectedLevel === lv.id

        return (
          <div
            key={lv.id}
            onMouseEnter={() => onHover(lv.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(selectedLevel === lv.id ? null : lv.id)}
            style={{
              width: 38, height: 19, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 8, fontFamily: 'monospace',
              fontWeight: f ? 700 : 400,
              color: f ? SEV[f.severity].hex : isH ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.12)',
              background: isS ? (f ? SEV[f.severity].bg : 'rgba(255,255,255,0.04)') : 'transparent',
              borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s',
              borderLeft: f ? `2px solid ${SEV[f.severity].hex}` : '2px solid transparent',
            }}
          >
            {lv.id}
          </div>
        )
      })}
    </div>
  )
}
