import { useState } from "react";

/* ═══════════════════ LOCKED STATE ═══════════════════ */
function LockedExerciseTab({onUnlock}){
  return(
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"30px 10px"}}>
      <div style={{fontSize:40,marginBottom:12}}>🔒</div>
      <div style={{fontSize:16,fontWeight:700,color:"#1D1D1F",marginBottom:6,fontFamily:"Georgia,serif"}}>Personalized Exercise Program</div>
      <div style={{fontSize:12,color:"#6E6E73",lineHeight:1.6,maxWidth:280,margin:"0 auto 18px"}}>
        Unlock Pro to get a customized exercise program based on your MRI findings, pain level, activity goals, and medical history.
      </div>
      <div style={{textAlign:"left",maxWidth:260,margin:"0 auto 18px"}}>
        {["18 exercises matched to your pathology","3-phase progression (Weeks 1-12)","Pain-adapted rep prescriptions","Goal-specific exercise priorities","Condition-aware safety modifications"].map((f,i)=>(
          <div key={i} style={{fontSize:11,color:"#6E6E73",padding:"4px 0",display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:"#0071E3",fontSize:11}}>✓</span>{f}
          </div>
        ))}
      </div>
      <button onClick={onUnlock} style={{
        background:"linear-gradient(135deg,#0071E3 0%,#0059B3 100%)",border:"none",color:"#fff",
        padding:"12px 32px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",
        boxShadow:"0 4px 16px rgba(0,113,227,0.3)",
      }}>$5 — Unlock Pro</button>
      <div style={{fontSize:10,color:"#AEAEB2",marginTop:8}}>One-time payment · Instant access</div>
    </div>
  );
}

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

export default function PTLibrary({ findings, onSelectFinding, activeEx, setActiveEx, assessAnswers, paid, onUnlock, onGoToReport }) {
  const [viewMode, setViewMode] = useState("byPhase"); // byPhase | byFinding
  const [activePhase, setActivePhase] = useState(null);

  if (!findings || findings.length === 0) return null;

  // Not paid → show locked state
  if (!paid) return (
    <LockedExerciseTab onUnlock={onUnlock} />
  );

  // Paid but assessment not completed → prompt to finish
  if (!assessAnswers) return (
    <div style={{animation:"fadeIn .4s",textAlign:"center",padding:"24px 10px"}}>
      <div style={{fontSize:36,marginBottom:10}}>🏋️</div>
      <div style={{fontSize:15,fontWeight:700,color:"#1D1D1F",marginBottom:6,fontFamily:"Georgia,serif"}}>Your Exercise Program</div>
      <div style={{fontSize:12,color:"#6E6E73",lineHeight:1.6,maxWidth:280,margin:"0 auto 16px"}}>
        Complete the clinical assessment first. We'll use your pain level, activity goals, and medical history to build a personalized exercise program.
      </div>
      <button onClick={onGoToReport} style={{
        background:"#0071E3",border:"none",color:"#fff",padding:"10px 24px",borderRadius:8,
        fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 12px rgba(0,113,227,0.2)",
      }}>Go to Assessment →</button>
    </div>
  );

  // ── Assessment-based customization ──
  const painLevel = assessAnswers.pain ?? 5;
  const goals = assessAnswers.goals || [];
  const conditions = assessAnswers.history || [];
  const hasInstability = assessAnswers.instability === true;
  const hadPriorTx = assessAnswers.prior === true;

  // Condition flags
  const hasOsteoporosis = conditions.includes("Osteoporosis");
  const hasOA = conditions.includes("Osteoarthritis");
  const hasRA = conditions.includes("Rheumatoid Arthritis");
  const hasObesity = conditions.includes("Obesity (BMI > 30)");
  const isHighImpactGoal = goals.some(g => ["Running","Cutting/Pivoting Sports","Return to Competition"].includes(g));
  const isLowImpactGoal = goals.some(g => ["Cycling","Swimming","Yoga/Flexibility","Walking Daily","Desk Work Only"].includes(g));

  // Map finding IDs to exercise target tags
  const STRUCTURE_TO_TAG = {
    acl: "acl", pcl: "pcl", mcl: "mcl", lcl: "lcl",
    meniscus_medial: "men", meniscus_lateral: "men",
    cartilage_medial: "cart", cartilage_lateral: "cart",
    cartilage_patella: "cart", cartilage_tibial: "cart",
    effusion: "eff",
    bone_femoral_medial: "bone", bone_femoral_lateral: "bone",
    bone_tibial_medial: "bone", bone_tibial_lateral: "bone",
    bone_patella: "bone",
    patella_tendon: "cart", quad_tendon: "acl",
  };

  const findingTags = new Set();
  const tagToFinding = {};
  findings.forEach(f => {
    // Try to extract structure from NLP-style ID (e.g., "acl_0" → "acl")
    const structKey = f.id.replace(/_\d+$/, '');
    const tag = STRUCTURE_TO_TAG[structKey] || f.id; // fallback to raw id for demo data
    findingTags.add(tag);
    // Also add the raw ID for demo data compatibility
    findingTags.add(f.id);
    if (!tagToFinding[tag]) tagToFinding[tag] = f;
    if (!tagToFinding[f.id]) tagToFinding[f.id] = f;
  });

  const relevantExercises = EXERCISES.filter(ex => ex.targets.some(t => findingTags.has(t)));

  // ── Customize exercises based on assessment ──
  const customizedExercises = relevantExercises.map(ex => {
    const custom = { ...ex, notes: [], adjustedRx: ex.rx };

    // Pain-based adjustments
    if (painLevel >= 7) {
      if (ex.phase >= 2) custom.notes.push("⚠️ Start conservatively given your high pain level. Reduce reps by half and progress only when pain-free.");
      if (ex.phase === 1) custom.adjustedRx = ex.rx.replace(/(\d+)\s*reps/i, (m, n) => `${Math.max(5, Math.ceil(n*0.7))} reps`);
    } else if (painLevel <= 3) {
      if (ex.phase === 1) custom.notes.push("Your pain is well-controlled — focus on quality and consistency over quantity.");
    }

    // Goal-based emphasis
    if (isHighImpactGoal && ex.phase === 3) {
      custom.notes.push("⭐ Priority exercise for your return-to-sport goals.");
      custom.priority = true;
    }
    if (isLowImpactGoal && !isHighImpactGoal && ex.id === "plyo") {
      custom.notes.push("Optional — include only if your goals evolve toward higher-impact activities.");
      custom.optional = true;
    }

    // Condition-based modifications
    if (hasOsteoporosis && ex.id === "plyo") {
      custom.notes.push("⚠️ Modified protocol recommended due to osteoporosis. Discuss impact activities with your physician.");
    }
    if (hasOA && ex.phase >= 2) {
      custom.notes.push("Lower reps with longer holds may be better tolerated with osteoarthritis.");
    }
    if (hasObesity) {
      if (ex.id === "slr" || ex.id === "qs") custom.notes.push("Excellent starting exercise — builds strength without joint loading.");
      if (ex.id === "plyo") custom.notes.push("⚠️ Progress gradually to reduce joint stress. Body weight management can significantly reduce knee load.");
    }
    if (hasRA) {
      custom.notes.push("Monitor joint response carefully. Skip on flare days. Water-based alternatives may be beneficial.");
    }

    // Instability-based
    if (hasInstability && ex.targets.includes("acl")) {
      if (ex.phase === 1) custom.notes.push("Critical for your knee stability. Prioritize this exercise.");
      if (ex.id === "slb") custom.notes.push("⭐ Especially important given your reported instability. Progress slowly through difficulty levels.");
    }

    // Prior treatment context
    if (hadPriorTx && ex.phase === 1) {
      custom.notes.push("If you've done these before, your baseline may be higher. Start where you left off if comfortable.");
    }

    return custom;
  })

  // Filter: if very high pain, defer phase 3
  .filter(ex => {
    if (painLevel >= 8 && ex.phase === 3) return false;
    return true;
  })

  // Sort: priority exercises first within each phase
  .sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    if (a.optional && !b.optional) return 1;
    if (!a.optional && b.optional) return -1;
    return 0;
  });

  // Helper: get findings that match an exercise's targets
  const getMatchedFindings = (ex) => {
    const matched = [];
    const seen = new Set();
    ex.targets.forEach(t => {
      const f = tagToFinding[t];
      if (f && !seen.has(f.id)) { seen.add(f.id); matched.push(f); }
    });
    return matched;
  };

  const toggleEx = (ex) => setActiveEx?.(prev => prev?.id === ex.id ? null : ex);

  // ── Exercise Card ──
  const ExCard = ({ ex }) => {
    const isSel = activeEx?.id === ex.id;
    const pc = PHASE_COLOR[ex.phase];
    const addressedFindings = getMatchedFindings(ex);

    return (
      <div style={{ marginBottom: 6 }}>
        <div onClick={() => toggleEx(ex)} style={{
          padding: "10px 12px", borderRadius: 8, cursor: "pointer",
          border: `1px solid ${isSel ? pc+"44" : ex.priority ? "rgba(0,113,227,0.15)" : "rgba(0,0,0,0.06)"}`,
          background: isSel ? pc+"08" : ex.priority ? "rgba(0,113,227,0.02)" : "#fff", transition: "all .2s",
          opacity: ex.optional ? 0.7 : 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: pc, fontSize: 14, fontWeight: 700, fontFamily: "monospace", width: 20 }}>
                {isSel ? "●" : "○"}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F" }}>{ex.name}</span>
              {ex.priority && <span style={{fontSize:7,fontWeight:800,color:"#0071E3",background:"rgba(0,113,227,0.1)",padding:"1px 4px",borderRadius:2}}>PRIORITY</span>}
              {ex.optional && <span style={{fontSize:7,fontWeight:800,color:"#AEAEB2",background:"rgba(0,0,0,0.04)",padding:"1px 4px",borderRadius:2}}>OPTIONAL</span>}
            </div>
            <span style={{ fontSize: 10, color: pc, fontWeight: 600, padding: "2px 8px", background: pc+"12", borderRadius: 4 }}>
              {PHASE_TIME[ex.phase]}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4, marginLeft: 28, flexWrap: "wrap" }}>
            {addressedFindings.map(f => (
              <span key={f.id} onClick={(e) => { e.stopPropagation(); onSelectFinding?.(f); }}
                style={{ fontSize: 9, color: f.sev === "severe" ? "#BF1029" : f.sev === "moderate" ? "#C45D00" : "#A68B00",
                  background: f.sev === "severe" ? "rgba(191,16,41,0.06)" : f.sev === "moderate" ? "rgba(196,93,0,0.06)" : "rgba(166,139,0,0.06)",
                  padding: "1px 6px", borderRadius: 3, cursor: "pointer" }}>
                {f.str}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#AEAEB2", marginTop: 3, marginLeft: 28 }}>{ex.adjustedRx || ex.rx}</div>
          {ex.notes && ex.notes.length > 0 && (
            <div style={{ marginTop: 4, marginLeft: 28 }}>
              {ex.notes.map((n, i) => (
                <div key={i} style={{ fontSize: 10, color: n.startsWith("⚠️") ? "#C45D00" : n.startsWith("⭐") ? "#0071E3" : "#6E6E73", lineHeight: 1.4, marginTop: 2 }}>{n}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── By Phase View ──
  const byPhaseView = () => (
    <div>
      {[1, 2, 3].map(phase => {
        const phaseExs = customizedExercises.filter(ex => ex.phase === phase);
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
        const structKey = f.id.replace(/_\d+$/, '');
        const tag = STRUCTURE_TO_TAG[structKey] || f.id;
        const fExs = customizedExercises.filter(ex => ex.targets.includes(tag) || ex.targets.includes(f.id));
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

  const priorityCount = customizedExercises.filter(e => e.priority).length;
  const activePhases = [...new Set(customizedExercises.map(e => e.phase))].length;

  return (
    <div style={{ animation: "fadeIn .4s" }}>
      {/* Personalization summary */}
      <div style={{ padding: "10px 12px", background: "rgba(0,113,227,0.04)", borderRadius: 8, border: "1px solid rgba(0,113,227,0.08)", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#0071E3", marginBottom: 4 }}>PERSONALIZED TO YOUR ASSESSMENT</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: painLevel >= 7 ? "rgba(191,16,41,0.08)" : painLevel >= 4 ? "rgba(196,93,0,0.08)" : "rgba(45,139,78,0.08)", color: painLevel >= 7 ? "#BF1029" : painLevel >= 4 ? "#C45D00" : "#2D8B4E", fontWeight: 600 }}>
            Pain: {painLevel}/10
          </span>
          {goals.slice(0, 3).map(g => (
            <span key={g} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(0,113,227,0.06)", color: "#0071E3", fontWeight: 600 }}>{g}</span>
          ))}
          {goals.length > 3 && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(0,0,0,0.03)", color: "#AEAEB2", fontWeight: 600 }}>+{goals.length - 3} more</span>}
          {conditions.length > 0 && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(107,63,160,0.06)", color: "#6B3FA0", fontWeight: 600 }}>{conditions.length} condition{conditions.length > 1 ? "s" : ""} noted</span>}
        </div>
      </div>

      {/* Important notice */}
      <div style={{ padding: "10px 12px", background: "#E6F5F4", borderRadius: 8, border: "1px solid rgba(26,127,122,0.2)", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#1A7F7A", marginBottom: 3 }}>DISCUSS WITH YOUR PT BEFORE STARTING</div>
        <div style={{ fontSize: 11, lineHeight: 1.5, color: "#6E6E73" }}>
          This program is adapted to your pain level, goals, and medical history. Your physical therapist will further modify based on examination.
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#ECEAE6", borderRadius: 8, padding: 3 }}>
        {[["byPhase", "By Phase"], ["byFinding", "By Finding"]].map(([v, label]) => (
          <button key={v} onClick={() => { setViewMode(v); setActivePhase(null); }}
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
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0071E3", fontFamily: "monospace" }}>{customizedExercises.length}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase" }}>Exercises</div>
        </div>
        <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#F5F9FE", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0071E3", fontFamily: "monospace" }}>{priorityCount}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase" }}>Priority</div>
        </div>
        <div style={{ flex: 1, padding: "8px", borderRadius: 8, background: "#F5F9FE", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0071E3", fontFamily: "monospace" }}>{activePhases} Phase{activePhases>1?"s":""}</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase" }}>Program</div>
        </div>
      </div>

      {/* Exercise list */}
      {viewMode === "byPhase" ? byPhaseView() : byFindingView()}

      {/* Attribution */}
      <div style={{ padding: "8px 10px", background: "#FAFAF8", borderRadius: 6, marginTop: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: "#AEAEB2" }}>
          Exercise protocols reviewed by the ClearScan Clinical Advisory Panel (Orthopedics, PM&R, Physical Therapy) following AAOS and APTA guidelines.
        </div>
      </div>
    </div>
  );
}
