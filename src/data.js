export const LEVELS = [
  { id: 'C1', type: 'c', idx: 0 },
  { id: 'C2', type: 'c', idx: 1 },
  { id: 'C3', type: 'c', idx: 2 },
  { id: 'C4', type: 'c', idx: 3 },
  { id: 'C5', type: 'c', idx: 4 },
  { id: 'C6', type: 'c', idx: 5 },
  { id: 'C7', type: 'c', idx: 6 },
  { id: 'T1', type: 't', idx: 7 },
  { id: 'T2', type: 't', idx: 8 },
  { id: 'T3', type: 't', idx: 9 },
  { id: 'T4', type: 't', idx: 10 },
  { id: 'T5', type: 't', idx: 11 },
  { id: 'T6', type: 't', idx: 12 },
  { id: 'T7', type: 't', idx: 13 },
  { id: 'T8', type: 't', idx: 14 },
  { id: 'T9', type: 't', idx: 15 },
  { id: 'T10', type: 't', idx: 16 },
  { id: 'T11', type: 't', idx: 17 },
  { id: 'T12', type: 't', idx: 18 },
  { id: 'L1', type: 'l', idx: 19 },
  { id: 'L2', type: 'l', idx: 20 },
  { id: 'L3', type: 'l', idx: 21 },
  { id: 'L4', type: 'l', idx: 22 },
  { id: 'L5', type: 'l', idx: 23 },
  { id: 'S1', type: 's', idx: 24 },
]

// Spacing between vertebra instances along Y axis
export const SPACING = 0.55

// Scale per region type
export function getRegionScale(level) {
  if (level.type === 'c') return 0.60 + level.idx * 0.01
  if (level.type === 't') return 0.72 + (level.idx - 7) * 0.012
  if (level.type === 'l') return 0.95 + (level.idx - 19) * 0.035
  return 1.1
}

// Y position for each level
export function getLevelY(level) {
  return (LEVELS.length / 2 - level.idx) * SPACING
}

export const SEV = {
  mild: {
    hex: '#F5D636',
    three: 0xf5d636,
    bg: 'rgba(245,214,54,0.10)',
    bdr: 'rgba(245,214,54,0.30)',
  },
  moderate: {
    hex: '#FF8C1A',
    three: 0xff8c1a,
    bg: 'rgba(255,140,26,0.10)',
    bdr: 'rgba(255,140,26,0.30)',
  },
  severe: {
    hex: '#FF2626',
    three: 0xff2626,
    bg: 'rgba(255,38,38,0.10)',
    bdr: 'rgba(255,38,38,0.30)',
  },
}

export const SAMPLE_REPORT = `IMPRESSION:
1. L4-L5: Moderate broad-based disc herniation with moderate bilateral foraminal stenosis and mild central canal narrowing. Moderate facet arthropathy.
2. L5-S1: Mild disc bulge with mild bilateral foraminal narrowing. Mild disc desiccation noted.
3. L3-L4: Mild disc bulge without significant stenosis. Early facet arthropathy.
4. C5-C6: Moderate disc protrusion with mild left foraminal stenosis. Mild cord flattening without signal change.
5. C6-C7: Mild disc bulge with mild bilateral foraminal narrowing.`
