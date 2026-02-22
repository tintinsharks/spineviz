import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { LEVELS, SPACING, getRegionScale, getLevelY, SEV } from '../data'

// Preload the model
useGLTF.preload('/models/vertebra_hq.glb')

/* ─── Single Vertebra Instance ─────────────────────── */
function VertebraUnit({ level, finding, isHovered, isSelected, onHover, onSelect }) {
  const { scene } = useGLTF('/models/vertebra_hq.glb')
  const groupRef = useRef()
  const meshRefs = useRef([])

  // Clone the scene for each instance
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true)
    // Deep clone materials so each instance can be colored independently
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.userData._lvl = level.id
        child.userData._origColor = child.material.color.clone()
      }
    })
    return clone
  }, [scene, level.id])

  const regionScale = getRegionScale(level)
  const y = getLevelY(level)

  // Animate: pulse, highlight colors
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()

    // Scale pulse for affected vertebrae
    let targetScale = regionScale
    if (isSelected) targetScale = regionScale * 1.08
    else if (isHovered) targetScale = regionScale * 1.05
    else if (finding) {
      const pulse = Math.sin(t * 2 + level.idx * 0.4) * 0.012 + 1.0
      targetScale = regionScale * pulse
    }

    const cur = groupRef.current.scale.x
    const lerped = cur + (targetScale - cur) * 0.12
    groupRef.current.scale.setScalar(lerped)

    // Update material colors
    groupRef.current.traverse((child) => {
      if (!child.isMesh) return
      const mat = child.material

      if (finding) {
        const sev = SEV[finding.severity]
        const bright = isSelected ? 1.4 : isHovered ? 1.25 : 1.0
        const col = new THREE.Color(sev.three)
        mat.color.lerp(col.multiplyScalar(bright), 0.15)
        if (!mat.emissive) mat.emissive = new THREE.Color()
        const emTarget = new THREE.Color(sev.three).multiplyScalar(
          isSelected ? 0.4 : isHovered ? 0.3 : 0.12 + Math.sin(t * 2 + level.idx * 0.4) * 0.06
        )
        mat.emissive.lerp(emTarget, 0.1)
        mat.roughness = 0.25
      } else {
        const orig = child.userData._origColor
        if (orig) {
          const target = orig.clone().multiplyScalar(isHovered ? 1.15 : 1.0)
          mat.color.lerp(target, 0.1)
        }
        if (!mat.emissive) mat.emissive = new THREE.Color()
        mat.emissive.lerp(new THREE.Color(isHovered ? 0x0a0a10 : 0x000000), 0.1)
        mat.roughness = 0.4
      }
    })
  })

  return (
    <group
      ref={groupRef}
      position={[0, y, 0]}
      scale={regionScale}
      onPointerOver={(e) => { e.stopPropagation(); onHover(level.id) }}
      onPointerOut={(e) => { e.stopPropagation(); onHover(null) }}
      onClick={(e) => { e.stopPropagation(); onSelect(level.id) }}
    >
      <primitive object={clonedScene} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}

/* ─── Glow Sprite for Affected Levels ──────────────── */
function GlowSprite({ level, finding, isHovered, isSelected }) {
  const spriteRef = useRef()
  const y = getLevelY(level)
  const scale = getRegionScale(level)

  // Create glow texture
  const glowMap = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128; c.height = 128
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.3, 'rgba(255,255,255,0.15)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame((state) => {
    if (!spriteRef.current) return
    const mat = spriteRef.current.material
    const t = state.clock.getElapsedTime()

    if (finding) {
      spriteRef.current.visible = true
      mat.color = new THREE.Color(SEV[finding.severity].three)
      const targetOpacity = isSelected ? 0.65 : isHovered ? 0.5 : 0.15 + Math.sin(t * 2 + level.idx * 0.4) * 0.1
      mat.opacity += (targetOpacity - mat.opacity) * 0.1
    } else if (isHovered) {
      spriteRef.current.visible = true
      mat.color = new THREE.Color(0x6688cc)
      mat.opacity += (0.12 - mat.opacity) * 0.1
    } else {
      mat.opacity += (0 - mat.opacity) * 0.15
      if (mat.opacity < 0.01) spriteRef.current.visible = false
    }
  })

  return (
    <sprite ref={spriteRef} position={[0, y, 0]} scale={[1.8 * scale, 0.9 * scale, 1]} visible={false}>
      <spriteMaterial
        map={glowMap}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

/* ─── Camera Controller ────────────────────────────── */
function CameraRig() {
  const controlsRef = useRef()
  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={3}
      maxDistance={15}
      minPolarAngle={Math.PI * 0.15}
      maxPolarAngle={Math.PI * 0.85}
      autoRotate
      autoRotateSpeed={0.3}
      dampingFactor={0.08}
      enableDamping
    />
  )
}

/* ─── Full Spine Assembly ──────────────────────────── */
function SpineAssembly({ findingsMap, hoveredLevel, selectedLevel, onHover, onSelect }) {
  return (
    <group>
      {LEVELS.map((level) => (
        <VertebraUnit
          key={level.id}
          level={level}
          finding={findingsMap[level.id]}
          isHovered={hoveredLevel === level.id}
          isSelected={selectedLevel === level.id}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      {LEVELS.map((level) => (
        <GlowSprite
          key={`glow-${level.id}`}
          level={level}
          finding={findingsMap[level.id]}
          isHovered={hoveredLevel === level.id}
          isSelected={selectedLevel === level.id}
        />
      ))}
    </group>
  )
}

/* ─── Main Exported Canvas ─────────────────────────── */
export default function SpineViewer({ findingsMap, hoveredLevel, selectedLevel, onHover, onSelect }) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 6], fov: 35, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
      }}
      style={{ background: 'transparent' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.7} color={0x6688bb} />
      <directionalLight position={[4, 8, 8]} intensity={2.2} color={0xfff5e8} />
      <directionalLight position={[-6, 4, -4]} intensity={0.7} color={0x8899cc} />
      <directionalLight position={[0, -3, -8]} intensity={0.5} color={0xaabbee} />
      <directionalLight position={[0, 15, 0]} intensity={0.4} />

      {/* Environment for reflections */}
      <Environment preset="studio" background={false} />

      {/* Controls */}
      <CameraRig />

      {/* Spine */}
      <SpineAssembly
        findingsMap={findingsMap}
        hoveredLevel={hoveredLevel}
        selectedLevel={selectedLevel}
        onHover={onHover}
        onSelect={onSelect}
      />
    </Canvas>
  )
}
