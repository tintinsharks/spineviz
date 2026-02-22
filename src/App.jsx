import { useState, useMemo, useCallback, Suspense } from 'react'
import SpineViewer from './components/SpineViewer'
import Panel from './components/Panel'
import LevelRail from './components/LevelRail'
import { HoverHUD, DetailOverlay, ControlsHint, EmptyState } from './components/Overlays'
import { parseMRIReport, buildFindingsMap, dedupeFindings } from './api'

export default function App() {
  const [text, setText] = useState('')
  const [findings, setFindings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hoveredLevel, setHoveredLevel] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [inputMode, setInputMode] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [showApiInput, setShowApiInput] = useState(false)

  const findingsMap = useMemo(() => buildFindingsMap(findings), [findings])

  const selectedFinding = useMemo(
    () => findings?.find((f) => f.level === selectedLevel) || null,
    [findings, selectedLevel]
  )

  const analyze = useCallback(async () => {
    if (!text.trim()) return
    // Check for API key
    if (!apiKey.trim()) {
      setShowApiInput(true)
      return
    }
    setLoading(true)
    setError(null)
    setFindings(null)
    setSelectedLevel(null)
    try {
      const parsed = await parseMRIReport(text, apiKey)
      setFindings(parsed)
      setInputMode(false)
    } catch (e) {
      setError(e.message || 'Failed to parse report. Check text and retry.')
    } finally {
      setLoading(false)
    }
  }, [text, apiKey])

  const reset = () => {
    setFindings(null)
    setInputMode(true)
    setSelectedLevel(null)
    setHoveredLevel(null)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{
        height: 52, borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0, background: 'rgba(255,255,255,0.015)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff',
          }}>S</div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>SpineViz</span>
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4,
          }}>AI · Three.js · GLB</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowApiInput(!showApiInput)}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: apiKey ? 'rgba(100,200,100,0.6)' : 'rgba(255,255,255,0.4)',
              padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
            }}
          >
            {apiKey ? '🔑 Key Set' : '🔑 API Key'}
          </button>
          {findings && (
            <button onClick={reset} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', padding: '6px 14px', borderRadius: 6,
              fontSize: 12, cursor: 'pointer',
            }}>New Report</button>
          )}
        </div>
      </div>

      {/* API Key Input Bar */}
      {showApiInput && (
        <div style={{
          padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(99,102,241,0.05)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
            Anthropic API Key:
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              flex: 1, maxWidth: 400, background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
              padding: '6px 12px', color: '#c8ccd8', fontSize: 12,
              fontFamily: 'monospace', outline: 'none',
            }}
          />
          <button
            onClick={() => setShowApiInput(false)}
            style={{
              background: 'rgba(99,102,241,0.3)', border: 'none',
              color: '#fff', padding: '6px 14px', borderRadius: 6,
              fontSize: 12, cursor: 'pointer',
            }}
          >Done</button>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            Stored in memory only — never sent anywhere except Anthropic's API
          </span>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel */}
        <Panel
          text={text}
          setText={setText}
          findings={findings}
          loading={loading}
          error={error}
          onAnalyze={analyze}
          hoveredLevel={hoveredLevel}
          selectedLevel={selectedLevel}
          onHover={setHoveredLevel}
          onSelect={setSelectedLevel}
          inputMode={inputMode}
          setInputMode={setInputMode}
        />

        {/* 3D Viewport */}
        <div style={{
          flex: 1, position: 'relative',
          background: 'radial-gradient(ellipse at 50% 40%, #1a2340 0%, #0d1220 60%, #080c18 100%)',
        }}>
          <Suspense fallback={
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)', textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
            }}>
              <div style={{
                width: 32, height: 32,
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: 'rgba(99,102,241,0.8)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              Loading 3D model...
            </div>
          }>
            <SpineViewer
              findingsMap={findingsMap}
              hoveredLevel={hoveredLevel}
              selectedLevel={selectedLevel}
              onHover={setHoveredLevel}
              onSelect={(id) => setSelectedLevel((prev) => prev === id ? null : id)}
            />
          </Suspense>

          <HoverHUD level={hoveredLevel} findingsMap={findingsMap} />
          <DetailOverlay finding={selectedFinding} />
          <ControlsHint />
          {!findings && !loading && <EmptyState />}
        </div>

        {/* Right rail */}
        <LevelRail
          findingsMap={findingsMap}
          hoveredLevel={hoveredLevel}
          selectedLevel={selectedLevel}
          onHover={setHoveredLevel}
          onSelect={setSelectedLevel}
        />
      </div>
    </div>
  )
}
