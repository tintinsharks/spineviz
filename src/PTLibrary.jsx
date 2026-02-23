import { useState } from "react";

/* ═══════════════════ EXERCISE DATABASE ═══════════════════
   Each exercise is tagged with which findings it addresses.
   The library filters to show only exercises relevant to
   the patient's specific pathology combination.
*/
const EXERCISES = [
  // ── ACL-SPECIFIC ──
  { id:"qs", name:"Quad Sets (Isometric)", targets:["acl","eff","cart"], phase:1,
    rx:"3 sets × 15 reps, 2x daily", duration:"Hold 5 seconds each",
    desc:"Sit or lie with knee straight. Tighten the muscle on top of your thigh by pressing the back of your knee into the surface. Hold 5 seconds, release.",
    why:"Quadriceps activation is the single most important early exercise after ACL injury. Swelling inhibits your quad from firing — this exercise retrains that connection.",
    avoid:"None — this is safe for virtually all knee injuries.",
    video:"quad-sets", finding:"ACL / Effusion / Cartilage" },
  { id:"hr", name:"Heel Slides", targets:["acl","men","eff"], phase:1,
    rx:"3 sets × 10 reps", duration:"Slow, controlled",
    desc:"Lie on your back. Slowly slide your heel toward your buttock, bending your knee as far as comfortable. Hold 2 seconds at end range, then slide back.",
    why:"Restores flexion range of motion. Goal is 90° by end of week 2. Don't force it — let gravity and gentle effort do the work.",
    avoid:"Stop if you feel sharp pain or a mechanical block (catching).",
    video:"heel-slides", finding:"ACL / Meniscus / Effusion" },
  { id:"slr", name:"Straight Leg Raises", targets:["acl","cart"], phase:1,
    rx:"3 sets × 12 reps", duration:"Hold 3 seconds at top",
    desc:"Lie on your back, injured leg straight, other knee bent. Lock your knee fully straight, then lift the leg 12 inches off the surface. Hold 3 seconds, lower slowly.",
    why:"Builds quad strength without bending the knee. If your knee can't lock straight, do quad sets first until it can — SLR with a bent knee is ineffective.",
    avoid:"If you cannot lock your knee fully straight, focus on quad sets and heel slides first.",
    video:"slr", finding:"ACL / Cartilage" },
  { id:"ap", name:"Ankle Pumps", targets:["acl","eff","bone"], phase:1,
    rx:"20 reps every waking hour", duration:"Quick, rhythmic",
    desc:"Point your toes down, then pull them up toward your shin. Repeat rhythmically. Simple but effective.",
    why:"Drives blood flow through the calf, reducing swelling and DVT risk. Especially important in the first 2 weeks.",
    avoid:"None.",
    video:"ankle-pumps", finding:"Effusion / Bone Bruise" },
  { id:"phc", name:"Prone Hamstring Curls", targets:["acl"], phase:1,
    rx:"3 sets × 10 reps", duration:"Controlled",
    desc:"Lie face down. Slowly bend your knee, bringing your heel toward your buttock. Stop at 90° or where comfortable. Lower slowly.",
    why:"Gentle hamstring loading supports the ACL-deficient knee. Hamstrings act as a dynamic ACL substitute.",
    avoid:"If meniscus repair is planned or performed, your surgeon may restrict this initially.",
    video:"prone-ham-curl", finding:"ACL" },

  // ── MENISCUS-SPECIFIC ──
  { id:"ssu", name:"Short-Arc Quad Extensions", targets:["men","cart"], phase:1,
    rx:"3 sets × 15 reps", duration:"Hold 3 seconds at top",
    desc:"Place a rolled towel under your knee. Straighten your knee fully over the towel, lifting just the lower leg. Hold at the top, lower slowly.",
    why:"Strengthens the quad through a limited, meniscus-safe range. Avoids deep flexion that can stress the meniscal tear.",
    avoid:"Do not go past 90° of flexion with meniscal tears.",
    video:"short-arc-quad", finding:"Meniscus / Cartilage" },

  // ── PHASE 2: PROGRESSIVE LOADING ──
  { id:"msq", name:"Mini Squats (to 45°)", targets:["acl","men","cart"], phase:2,
    rx:"3 sets × 12 reps", duration:"3 sec down, 1 sec hold, 2 sec up",
    desc:"Stand with feet shoulder-width apart, back against a wall if needed. Slowly bend knees to about 45° — like sitting in a tall chair. Don't let knees go past toes.",
    why:"First closed-chain exercise. Builds functional quad and glute strength in a knee-safe range. The wall removes balance as a variable so you can focus on form.",
    avoid:"Do not go past 45° until cleared. Stop if sharp medial knee pain (meniscus).",
    video:"mini-squats", finding:"ACL / Meniscus / Cartilage" },
  { id:"stu", name:"Step-Ups (6-8\" Platform)", targets:["acl","men"], phase:2,
    rx:"3 sets × 10 each leg", duration:"Controlled descent",
    desc:"Step up onto a low platform with your injured leg. Slowly lower back down, controlling the descent with your injured leg. The lowering is the important part.",
    why:"Eccentric quad strengthening — the controlled lowering phase is more valuable than the step up. Start with 6\" and progress to 8\" when confident.",
    avoid:"Ensure knee tracks over 2nd toe. Stop if pain or instability.",
    video:"step-ups", finding:"ACL / Meniscus" },
  { id:"slb", name:"Single-Leg Balance", targets:["acl","men","bone"], phase:2,
    rx:"3 × 30 second holds each leg", duration:"Progress difficulty",
    desc:"Stand on your injured leg. Hold for 30 seconds. Progress: eyes open → eyes closed → unstable surface (pillow) → eyes closed on unstable surface.",
    why:"Proprioception — your knee's position sense — is disrupted after ACL injury. This is one of the most critical exercises for preventing re-injury. Don't skip it.",
    avoid:"Have a wall or chair nearby for safety. Stop if sharp pain.",
    video:"single-leg-balance", finding:"ACL / Meniscus" },
  { id:"bike", name:"Stationary Bike", targets:["acl","men","eff","cart"], phase:2,
    rx:"15-20 minutes, low resistance", duration:"Comfortable RPE 3-4/10",
    desc:"Set seat height so your knee is almost fully straight at the bottom of the pedal stroke. Start with very low resistance. Pedal smoothly.",
    why:"Excellent for range of motion, cardiovascular fitness, and quad endurance without impact. The best 'do everything' exercise in Phase 2.",
    avoid:"Don't push through pain. If you can't complete a full revolution initially, rock back and forth until ROM improves.",
    video:"stationary-bike", finding:"ACL / Meniscus / Effusion / Cartilage" },
  { id:"sha", name:"Side-Lying Hip Abduction", targets:["acl","men","cart"], phase:2,
    rx:"3 sets × 15 reps", duration:"Hold 2 seconds at top",
    desc:"Lie on your uninjured side. Keep your injured leg straight and lift it 12 inches toward the ceiling. Hold 2 seconds, lower slowly. Don't roll backward.",
    why:"Strengthens gluteus medius — the key muscle that prevents your knee from collapsing inward during single-leg activities. Weak glutes are a major ACL re-injury risk factor.",
    avoid:"None — this is a safe, essential exercise.",
    video:"hip-abduction", finding:"ACL / Meniscus / Cartilage" },
  { id:"cr", name:"Calf Raises", targets:["acl","bone"], phase:2,
    rx:"3 sets × 15 reps", duration:"Slow both ways",
    desc:"Stand on both feet. Rise up on your toes, hold 2 seconds, lower slowly. Progress to single-leg when bilateral becomes easy.",
    why:"Calf and ankle strength supports the entire kinetic chain. Often neglected but important for return to running and sport.",
    avoid:"May be uncomfortable with acute bone bruise — start bilateral.",
    video:"calf-raises", finding:"ACL / Bone Bruise" },

  // ── PHASE 3: FUNCTIONAL ──
  { id:"srdl", name:"Single-Leg Romanian Deadlift", targets:["acl"], phase:3,
    rx:"3 sets × 8 each leg", duration:"Slow, controlled",
    desc:"Stand on your injured leg. Hinge forward at the hip, reaching the opposite hand toward the floor while your free leg extends behind you. Keep a slight knee bend. Return to standing.",
    why:"Develops posterior chain (hamstrings, glutes) and balance simultaneously. The hamstrings protect the ACL dynamically — this is one of the best exercises for that.",
    avoid:"Start with no weight. Add light dumbbell only when form is solid.",
    video:"single-leg-rdl", finding:"ACL" },
  { id:"lbw", name:"Lateral Band Walks", targets:["acl","men"], phase:3,
    rx:"3 sets × 12 steps each direction", duration:"Controlled steps",
    desc:"Place a resistance band just above your knees. Get into a quarter-squat position. Step sideways, keeping tension on the band. Don't let your knees collapse inward.",
    why:"Fires the gluteus medius under dynamic load. This is the exercise that teaches your hip to protect your knee during real-world movement.",
    avoid:"Use appropriate band tension — you should feel the burn in your outer hip, not your knee.",
    video:"lateral-band-walks", finding:"ACL / Meniscus" },
  { id:"lun", name:"Forward & Lateral Lunges", targets:["acl","men","cart"], phase:3,
    rx:"3 sets × 8 each leg", duration:"Controlled",
    desc:"Step forward into a lunge, lowering until your back knee nearly touches the ground. Push back to start. Progress to lateral lunges once confident with forward.",
    why:"Multi-directional strengthening that prepares the knee for real-world demands. Lateral lunges specifically challenge the medial meniscus and MCL.",
    avoid:"Start with shorter stride length. Watch knee tracking. Forward lunges first, then lateral.",
    video:"lunges", finding:"ACL / Meniscus / Cartilage" },
  { id:"plyo", name:"Progressive Plyometrics", targets:["acl"], phase:3,
    rx:"Per PT guidance", duration:"Quality over quantity",
    desc:"Begin with double-leg hops in place. Progress to single-leg hops, then lateral hops. Final stage: drop jumps and sport-specific plyometrics.",
    why:"Retrains explosive muscle function and landing mechanics. Essential for return to sport. Landing quality matters more than height or distance.",
    avoid:"ONLY begin when cleared by your PT. Quad strength must be >80% of uninjured side.",
    video:"plyometrics", finding:"ACL" },

  // ── SWELLING MANAGEMENT ──
  { id:"ice", name:"Ice + Compression + Elevation", targets:["eff","bone","acl","men"], phase:1,
    rx:"20 minutes, 4-6x daily", duration:"First 2-4 weeks",
    desc:"Apply ice wrapped in a thin cloth over the knee. Use a compression wrap. Elevate the leg above heart level. Repeat throughout the day.",
    why:"The most effective swelling management strategy. Reducing effusion is critical because swelling directly inhibits your quad from activating properly.",
    avoid:"Don't apply ice directly to skin. Don't ice for more than 20 minutes at a time.",
    video:"rice-protocol", finding:"Effusion / Bone Bruise" },
];

const PHASE_NAMES = { 1: "Phase 1: Early Recovery", 2: "Phase 2: Building Strength", 3: "Phase 3: Functional Progression" };
const PHASE_TIME = { 1: "Weeks 1-2", 2: "Weeks 3-6", 3: "Weeks 7-12" };
const PHASE_COLOR = { 1: "#0071E3", 2: "#2D8B4E", 3: "#6B3FA0" };

export default function PTLibrary({ findings, onSelectFinding }) {
  const [viewMode, setViewMode] = useState("byPhase"); // byPhase | byFinding
  const [expandedEx, setExpandedEx] = useState(null);
  const [activePhase, setActivePhase] = useState(null);

  if (!findings || findings.length === 0) return null;

  // Filter exercises to only those relevant to patient's findings
  const findingIds = new Set(findings.map(f => f.id));
  const relevantExercises = EXERCISES.filter(ex => ex.targets.some(t => findingIds.has(t)));

  const toggleEx = (id) => setExpandedEx(prev => prev === id ? null : id);

  // ── Exercise Card ──
  const ExCard = ({ ex }) => {
    const isOpen = expandedEx === ex.id;
    const pc = PHASE_COLOR[ex.phase];
    // Which of the patient's findings does this exercise address?
    const addressedFindings = findings.filter(f => ex.targets.includes(f.id));

    return (
      <div style={{ marginBottom: 6 }}>
        <div onClick={() => toggleEx(ex.id)} style={{
          padding: "10px 12px", borderRadius: 8, cursor: "pointer",
          border: `1px solid ${isOpen ? pc+"33" : "rgba(0,0,0,0.06)"}`,
          background: isOpen ? pc+"08" : "#fff", transition: "all .2s",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: pc, fontSize: 14, fontWeight: 700, fontFamily: "monospace", width: 20 }}>
                {isOpen ? "−" : "+"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{ex.name}</span>
            </div>
            <span style={{ fontSize: 10, color: pc, fontWeight: 600, padding: "2px 8px", background: pc+"12", borderRadius: 4 }}>
              {PHASE_TIME[ex.phase]}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4, marginLeft: 28 }}>
            {addressedFindings.map(f => (
              <span key={f.id} onClick={(e) => { e.stopPropagation(); onSelectFinding?.(f); }}
                style={{ fontSize: 9, color: f.sev === "severe" ? "#BF1029" : f.sev === "moderate" ? "#C45D00" : "#A68B00",
                  background: f.sev === "severe" ? "rgba(191,16,41,0.06)" : f.sev === "moderate" ? "rgba(196,93,0,0.06)" : "rgba(166,139,0,0.06)",
                  padding: "1px 6px", borderRadius: 3, cursor: "pointer" }}>
                {f.str}
              </span>
            ))}
          </div>
          {!isOpen && <div style={{ fontSize: 11, color: "#AEAEB2", marginTop: 3, marginLeft: 28 }}>{ex.rx}</div>}
        </div>

        {isOpen && (
          <div style={{ padding: "12px 14px 14px 42px", animation: "fadeIn .2s ease" }}>
            {/* Prescription */}
            <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Sets / Reps</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F" }}>{ex.rx}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Tempo</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F" }}>{ex.duration}</div>
              </div>
            </div>

            {/* How to */}
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "#6E6E73", marginBottom: 8 }}>{ex.desc}</div>

            {/* Why this exercise */}
            <div style={{ padding: "8px 10px", background: pc+"08", borderRadius: 6, borderLeft: `3px solid ${pc}`, marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: pc, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Why this exercise</div>
              <div style={{ fontSize: 11, lineHeight: 1.5, color: "#1D1D1F" }}>{ex.why}</div>
            </div>

            {/* Caution */}
            {ex.avoid && ex.avoid !== "None." && ex.avoid !== "None — this is safe for virtually all knee injuries." && ex.avoid !== "None — this is a safe, essential exercise." && (
              <div style={{ padding: "8px 10px", background: "rgba(191,16,41,0.04)", borderRadius: 6, borderLeft: "3px solid rgba(191,16,41,0.3)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#BF1029", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Caution</div>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: "#6E6E73" }}>{ex.avoid}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── By Phase View ──
  const byPhaseView = () => (
    <div>
      {[1, 2, 3].map(phase => {
        const phaseExs = relevantExercises.filter(ex => ex.phase === phase);
        if (phaseExs.length === 0) return null;
        const isActive = activePhase === null || activePhase === phase;
        return (
          <div key={phase} style={{ marginBottom: 14, opacity: isActive ? 1 : 0.5, transition: "opacity .2s" }}>
            <div onClick={() => setActivePhase(p => p === phase ? null : phase)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: PHASE_COLOR[phase] }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>{PHASE_NAMES[phase]}</span>
              </div>
              <span style={{ fontSize: 10, color: PHASE_COLOR[phase], fontWeight: 600 }}>{PHASE_TIME[phase]}</span>
            </div>
            {isActive && phaseExs.map(ex => <ExCard key={ex.id} ex={ex} />)}
          </div>
        );
      })}
    </div>
  );

  // ── By Finding View ──
  const byFindingView = () => (
    <div>
      {findings.map(f => {
        const fExs = relevantExercises.filter(ex => ex.targets.includes(f.id));
        if (fExs.length === 0) return null;
        const sc = f.sev === "severe" ? "#BF1029" : f.sev === "moderate" ? "#C45D00" : "#A68B00";
        return (
          <div key={f.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5,
                color: sc, background: sc+"12", padding: "2px 8px", borderRadius: 4 }}>{f.sev}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", fontFamily: "Georgia, serif" }}>{f.str}</span>
            </div>
            <div style={{ fontSize: 11, color: "#AEAEB2", marginBottom: 6, marginLeft: 4 }}>
              {fExs.length} exercises target this finding
            </div>
            {fExs.map(ex => <ExCard key={ex.id} ex={ex} />)}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      {/* Important notice */}
      <div style={{ padding: "10px 12px", background: "#E6F5F4", borderRadius: 8, border: "1px solid rgba(26,127,122,0.2)", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#1A7F7A", marginBottom: 3 }}>DISCUSS WITH YOUR PT BEFORE STARTING</div>
        <div style={{ fontSize: 11, lineHeight: 1.5, color: "#6E6E73" }}>
          These exercises are tailored to your specific findings. Your physical therapist will modify progressions and intensity based on your examination.
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#ECEAE6", borderRadius: 8, padding: 3 }}>
        {[["byPhase", "By Phase"], ["byFinding", "By Finding"]].map(([v, label]) => (
          <button key={v} onClick={() => { setViewMode(v); setActivePhase(null); setExpandedEx(null); }}
            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: viewMode === v ? "#fff" : "transparent", color: viewMode === v ? "#1D1D1F" : "#AEAEB2",
              boxShadow: viewMode === v ? "0 1px 3px rgba(0,0,0,0.06)" : "none", transition: "all .2s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#F5F9FE", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0071E3", fontFamily: "monospace" }}>{relevantExercises.length}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase" }}>Exercises</div>
        </div>
        <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#F5F9FE", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0071E3", fontFamily: "monospace" }}>3</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase" }}>Phases</div>
        </div>
        <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#F5F9FE", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0071E3", fontFamily: "monospace" }}>12 wk</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase" }}>Program</div>
        </div>
      </div>

      {/* Exercise list */}
      {viewMode === "byPhase" ? byPhaseView() : byFindingView()}

      {/* Attribution */}
      <div style={{ padding: "8px 10px", background: "#FAFAF8", borderRadius: 6, marginTop: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2" }}>
          Exercise protocols designed by the ClearScan Physical Therapy Advisory Team following AAOS and APTA clinical guidelines.
        </div>
      </div>
    </div>
  );
}
