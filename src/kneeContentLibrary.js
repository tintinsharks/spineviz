/* ═══════════════════════════════════════════════════════════════
   KNEE CONTENT LIBRARY
   
   Maps raw NLP-extracted findings to visualization-ready data.
   All clinical content is pre-authored and selected by pattern
   matching — NOT generated per-patient by the LLM.
   
   mapToVisualization(rawFindings) → findings array for the UI
   ═══════════════════════════════════════════════════════════════ */

/* ─── 3D Mesh Mapping ─── */
const MESH_MAP = {
  acl:                  ["acl"],
  pcl:                  ["pcl"],
  mcl:                  ["mcl"],
  lcl:                  ["lcl"],
  meniscus_medial:      ["meniscus_medial"],
  meniscus_lateral:     ["meniscus_lateral"],
  cartilage_medial:     ["cartilage_medial"],
  cartilage_lateral:    ["cartilage_lateral"],
  cartilage_patella:    ["patella"],
  cartilage_tibial:     ["tibial_plateau"],
  effusion:             ["effusion"],
  bone_femoral_medial:  ["condyle_medial"],
  bone_femoral_lateral: ["condyle_lateral"],
  bone_tibial_medial:   ["tibial_plateau"],
  bone_tibial_lateral:  ["tibial_plateau"],
  bone_patella:         ["patella"],
  patella_tendon:       ["patella"],
  quad_tendon:          ["femur"],
  plica:                ["meniscus_medial"],
  bakers_cyst:          ["bakers_cyst"],
  loose_body:           ["effusion"],
};

/* ─── Camera Positions ─── */
const CAM_MAP = {
  acl:                  { p: [1.5, 0.2, 2.5], t: [0, 0, 0] },
  pcl:                  { p: [-1.5, 0.2, -2.5], t: [0, 0, -0.1] },
  mcl:                  { p: [-2.5, 0.3, 1.5], t: [-0.3, 0, 0] },
  lcl:                  { p: [2.5, 0.3, 1.5], t: [0.3, 0, 0] },
  meniscus_medial:      { p: [1.8, 0.3, 2.2], t: [0, -0.1, 0] },
  meniscus_lateral:     { p: [-1.8, 0.3, 2.2], t: [0, -0.1, 0] },
  cartilage_medial:     { p: [2, -0.2, 2], t: [0, -0.1, 0] },
  cartilage_lateral:    { p: [-2, -0.2, 2], t: [0, -0.1, 0] },
  cartilage_patella:    { p: [0, 0.3, 3], t: [0, 0.2, 0] },
  cartilage_tibial:     { p: [2, -0.5, 2], t: [0, -0.2, 0] },
  effusion:             { p: [2.5, 1.5, 1.5], t: [0, 0.5, 0] },
  bone_femoral_medial:  { p: [2, 0.8, 1.5], t: [0, 0.2, 0] },
  bone_femoral_lateral: { p: [2, 0.8, 1.5], t: [0, 0.2, 0] },
  bone_tibial_medial:   { p: [2, -0.5, 2], t: [0, -0.2, 0] },
  bone_tibial_lateral:  { p: [2, -0.5, 2], t: [0, -0.2, 0] },
  bone_patella:         { p: [0, 0.5, 3], t: [0, 0.3, 0] },
  patella_tendon:       { p: [0, -0.3, 3], t: [0, 0, 0] },
  quad_tendon:          { p: [0, 1.5, 3], t: [0, 1, 0] },
  plica:                { p: [1.8, 0.3, 2.2], t: [0, 0, 0] },
  bakers_cyst:          { p: [0, 0, -3], t: [0, -0.1, -0.3] },
  loose_body:           { p: [2.5, 1, 2], t: [0, 0.3, 0] },
};

/* ─── Display Names ─── */
const DISPLAY_NAMES = {
  acl: "ACL", pcl: "PCL", mcl: "MCL", lcl: "LCL",
  meniscus_medial: "Medial Meniscus", meniscus_lateral: "Lateral Meniscus",
  cartilage_medial: "Medial Femoral Cartilage", cartilage_lateral: "Lateral Femoral Cartilage",
  cartilage_patella: "Patellar Cartilage", cartilage_tibial: "Tibial Cartilage",
  effusion: "Joint Fluid", bone_femoral_medial: "Bone (Medial Femur)",
  bone_femoral_lateral: "Bone (Lateral Femur)", bone_tibial_medial: "Bone (Medial Tibia)",
  bone_tibial_lateral: "Bone (Lateral Tibia)", bone_patella: "Bone (Patella)",
  patella_tendon: "Patellar Tendon", quad_tendon: "Quadriceps Tendon",
  plica: "Plica", bakers_cyst: "Baker's Cyst", loose_body: "Loose Body",
};

/* ─── Severity Score (for gauge) ─── */
const SEV_SCORE = {
  mild: { min: 0.15, max: 0.35 },
  moderate: { min: 0.40, max: 0.60 },
  severe: { min: 0.70, max: 0.90 },
  equivocal: { min: 0.10, max: 0.25 },
};

/* ═══════════════════════════════════════════════════════════════
   CLINICAL CONTENT LIBRARY
   Keyed by structure ID. Contains all pre-authored content.
   ═══════════════════════════════════════════════════════════════ */

const CONTENT = {
  /* ─── ACL ─── */
  acl: {
    desc: (raw) => {
      const complete = /complete|full[- ]thickness|ruptur|disrupt|absent|discontinu/i.test(raw.pathology + ' ' + (raw.details||''));
      return complete
        ? "Your anterior cruciate ligament is completely torn — the primary stabilizer preventing your shin bone from sliding forward."
        : "Your anterior cruciate ligament has a partial tear — some fibers are intact but the ligament is structurally compromised.";
    },
    imp: "Instability during cutting, pivoting, or sudden stops. Walking and cycling typically unaffected.",
    ctx: "About 200,000 ACL injuries occur annually in the US. Treatment depends on your activity goals — many return to full activity with structured rehabilitation.",
    lenses: [
      { spec: "Sports Medicine Ortho", color: "#0071E3", text: "The decision between surgical reconstruction and conservative management depends heavily on your activity goals. For patients wanting to return to cutting/pivoting sports, reconstruction is generally recommended. For straight-line activities, structured PT may restore functional stability without surgery." },
      { spec: "Pain Medicine", color: "#6B3FA0", text: "The ACL itself is often not the primary pain generator after the acute phase. Much of the ongoing pain may come from associated bone bruising, effusion, and altered biomechanics. If pain persists beyond expectations, there may be interventional options worth discussing." },
      { spec: "Physiatry / Rehab", color: "#2D8B4E", text: "Regardless of whether surgery is pursued, early rehabilitation focusing on quad activation, ROM restoration, and swelling control is universally recommended. \"Prehab\" before surgery is associated with better post-operative outcomes." },
    ],
    questions: ["Based on my age and activity level, would you recommend reconstruction or PT?", "If I pursue PT first, what signs would tell us surgery is needed?", "What graft type would you recommend, and why?", "What is the realistic timeline for returning to my specific activities?", "Are there factors in my MRI that make my case more complex than typical?"],
    timeline: "Conservative: 3-6 months structured PT. Surgical: 6-9 months total recovery, return to sport 9-12 months.",
    selfAssess: [
      { q: "Does your knee feel like it's going to \"give way\" or buckle — especially when pivoting, turning, or stepping off a curb?", why: "Functional instability is the primary indication for ACL reconstruction. Patients who experience frequent giving-way episodes are more likely to benefit from surgery." },
      { q: "Did you hear or feel a \"pop\" at the time of injury?", why: "An audible pop at injury is reported in ~70% of ACL tears and helps confirm the diagnosis." },
      { q: "What activities and sports are important to you? Do you play sports that involve cutting, pivoting, or jumping?", why: "Your activity goals are the single most important factor in the reconstruction vs. conservative decision." },
      { q: "Have you had any episodes where the knee gave out and then swelled up significantly afterward?", why: "Recurrent giving-way episodes with re-swelling suggest ongoing joint damage from instability." },
      { q: "Do you feel confident pushing off the injured leg to change direction quickly?", why: "This tests your subjective sense of knee trust. If you instinctively don't trust the knee during quick movements, that's clinically meaningful instability." },
    ],
    treatments: [
      { name: "Structured Physical Therapy", type: "conservative", color: "#2D8B4E", desc: "Intensive rehabilitation focusing on quadriceps/hamstring strengthening, proprioception training, and neuromuscular control.", timeline: "3-6 months structured program. Re-evaluation at 6-12 weeks.", pros: "Avoids surgery. Many patients achieve functional stability. Can always proceed to surgery later.", cons: "Does not restore anatomic ACL. Higher re-injury risk with cutting/pivoting sports." },
      { name: "ACL Reconstruction — Patellar Tendon", type: "surgical", color: "#0071E3", desc: "Bone-patellar tendon-bone autograft. Considered the gold standard for athletes.", timeline: "6-9 months recovery. Return to sport 9-12 months.", pros: "Strongest fixation. Lowest re-tear rate in athletes. Most studied option.", cons: "Anterior knee pain and kneeling discomfort in 10-20%." },
      { name: "ACL Reconstruction — Hamstring", type: "surgical", color: "#0071E3", desc: "Semitendinosus and gracilis tendons harvested from same leg. Smaller incision.", timeline: "6-9 months recovery.", pros: "Less kneeling pain. Smaller incision. Good for recreational athletes.", cons: "Soft tissue-to-bone healing. Slight hamstring weakness may persist." },
      { name: "Prehabilitation", type: "conservative", color: "#1A7F7A", desc: "PT before reconstruction to optimize quad strength, reduce swelling, restore ROM.", timeline: "2-6 weeks before surgery.", pros: "Better post-surgical outcomes. Faster early rehab milestones.", cons: "Delays surgery by a few weeks (generally beneficial)." },
    ],
  },

  /* ─── MENISCUS (medial & lateral share content, parameterized) ─── */
  meniscus_medial: {
    desc: (raw) => `A ${(raw.pathology||'').toLowerCase()} in your medial meniscus — the C-shaped shock absorber on the inner side of your knee.${raw.location ? ` Located in the ${raw.location}.` : ''}`,
    imp: "Pain along the inner knee line, especially with deep squats, twisting, or stair climbing. Possible catching or locking.",
    ctx: "Meniscal tears are among the most common knee findings. Many respond well to physical therapy without surgery.",
    lenses: [
      { spec: "Sports Medicine Ortho", color: "#0071E3", text: "Many meniscal tears can be managed conservatively. If ACL reconstruction is pursued, the meniscus is typically evaluated during the same procedure. The key question is whether this tear is stable or unstable." },
      { spec: "Physical Therapy", color: "#1A7F7A", text: "Targeted strengthening of quadriceps and hip musculature reduces mechanical load through the medial compartment. Avoid deep squatting and pivoting until cleared." },
      { spec: "Trauma Ortho", color: "#C45D00", text: "Options range from partial meniscectomy (trimming) to meniscal repair (suturing). Repair is preferred when feasible, as preserving meniscal tissue protects the joint long-term." },
    ],
    questions: ["Is my meniscal tear contributing to symptoms, or could it be managed conservatively?", "If surgery is needed, would you repair or trim?", "How does this affect the rehabilitation timeline?"],
    timeline: "Conservative: 3-6 weeks to return to most activities. Post-repair: 4-6 weeks restricted weight-bearing, 3-4 months full recovery.",
    selfAssess: [
      { q: "Do you experience clicking, popping, or a snapping sensation in the knee?", why: "Mechanical symptoms suggest an unstable fragment that may flip or catch — this often changes the treatment approach from conservative to surgical." },
      { q: "Does your knee ever lock — get stuck where you can't fully straighten it?", why: "True locking indicates a displaced meniscal fragment blocking the joint." },
      { q: "Do you feel catching or something \"getting in the way\" when bending or straightening?", why: "Catching suggests the torn portion is intermittently interfering with joint mechanics." },
      { q: "Where exactly is your pain — can you point to the spot with one finger?", why: "Pain precisely on the joint line supports the meniscus as a pain generator." },
      { q: "Is the pain worse going downstairs versus upstairs?", why: "Downstairs loads the meniscus more. This pattern is classic for meniscal pain." },
      { q: "Does deep squatting reproduce the pain?", why: "Deep flexion compresses the posterior horn where many tears are located." },
    ],
    treatments: [
      { name: "Physical Therapy (Conservative)", type: "conservative", color: "#2D8B4E", desc: "Strengthening of quadriceps, hamstrings, and hip stabilizers to reduce meniscal load.", timeline: "4-8 weeks to meaningful improvement.", pros: "No surgery, low risk. Effective for many horizontal/degenerative tears.", cons: "May not resolve mechanical symptoms (catching/locking)." },
      { name: "Partial Meniscectomy (Trimming)", type: "surgical", color: "#0071E3", desc: "Arthroscopic removal of the torn, unstable portion. Quick outpatient procedure.", timeline: "Return to most activities in 2-4 weeks.", pros: "Fast recovery. Immediate relief of mechanical symptoms.", cons: "Removes protective tissue — more cartilage wear long-term." },
      { name: "Meniscal Repair (Suturing)", type: "surgical", color: "#6B3FA0", desc: "Arthroscopic suturing to preserve meniscal tissue. Best when combined with ACL reconstruction.", timeline: "4-6 weeks restricted. Full recovery 3-4 months.", pros: "Preserves tissue. 80-90% healing rate with concurrent ACL reconstruction.", cons: "Slower rehab. Not all tears are repairable." },
      { name: "Corticosteroid Injection", type: "interventional", color: "#C45D00", desc: "Intra-articular injection to reduce inflammation and facilitate PT.", timeline: "Relief within 2-5 days. Lasts 4-8 weeks.", pros: "Breaks pain/swelling cycle. No recovery time.", cons: "Temporary. Discuss timing relative to any planned surgery." },
    ],
  },

  meniscus_lateral: null, // Populated in init() below — mirrors medial with "lateral" labels

  /* ─── EFFUSION ─── */
  effusion: {
    desc: () => "Excess fluid in your knee joint — your body's inflammatory response to internal injuries.",
    imp: "Stiffness, tightness, difficulty fully bending or straightening. May feel warm and puffy.",
    ctx: "Expected after acute injury. Improves with RICE (rest, ice, compression, elevation) over 2-4 weeks.",
    lenses: [
      { spec: "Physiatry / Rehab", color: "#2D8B4E", text: "Reducing effusion is the most important early goal because swelling directly inhibits quad activation (arthrogenic muscle inhibition)." },
      { spec: "Pain Medicine", color: "#6B3FA0", text: "If effusion persists beyond 4-6 weeks despite conservative measures, aspiration with or without corticosteroid injection may be considered." },
    ],
    questions: ["Should the fluid be drained?", "What's normal vs. concerning swelling at this stage?", "How will this affect my rehabilitation?"],
    timeline: "Acute effusion typically resolves in 2-4 weeks with RICE. Persistent effusion beyond 6 weeks may warrant aspiration.",
    selfAssess: [
      { q: "Is the swelling getting better, staying the same, or getting worse?", why: "The trajectory matters more than the amount." },
      { q: "Can you fully straighten your knee? Bend it to 90 degrees?", why: "Loss of full extension is more concerning than loss of flexion." },
      { q: "Does the knee feel warm compared to the other side?", why: "Warmth indicates active inflammation." },
      { q: "Does the swelling increase after activity and decrease with rest?", why: "Activity-related swelling that resolves is mechanical (expected). Persistent swelling may need attention." },
    ],
    treatments: [
      { name: "RICE Protocol", type: "conservative", color: "#2D8B4E", desc: "Rest, Ice (20 min 4-6x/day), Compression, Elevation.", timeline: "Improvement within 3-7 days. Most resolves in 2-4 weeks.", pros: "No risk, highly effective for acute effusion.", cons: "Requires consistency. May not resolve chronic effusion." },
      { name: "Aspiration (Joint Drainage)", type: "interventional", color: "#C45D00", desc: "Needle removal of excess fluid. Provides immediate relief.", timeline: "Immediate relief. May need repeating.", pros: "Instant pressure reduction. Fluid can be analyzed diagnostically.", cons: "Minor discomfort. Fluid may reaccumulate." },
      { name: "Corticosteroid Injection", type: "interventional", color: "#6B3FA0", desc: "Often combined with aspiration to reduce inflammation.", timeline: "Effect peaks at 2-5 days. Lasts 4-8 weeks.", pros: "Breaks inflammatory cycle. Reduces reaccumulation.", cons: "Repeated injections may affect cartilage. Discuss timing with surgery." },
    ],
  },

  /* ─── CARTILAGE (template, parameterized for location) ─── */
  cartilage_medial: {
    desc: (raw) => {
      const grade = (raw.pathology||'').match(/grade\s*(\d)/i)?.[1] || '2';
      return `The cartilage on the inner surface of your thigh bone shows changes — Grade ${grade} on the Outerbridge scale (4-point system).`;
    },
    imp: "Occasional dull ache with prolonged sitting or weight-bearing. Mild grinding sensation possible.",
    ctx: "Very common and frequently incidental in adults over 30. Quadriceps strengthening is the most effective conservative treatment.",
    lenses: [
      { spec: "Pain Medicine", color: "#6B3FA0", text: "Early cartilage changes are found on a very large proportion of knee MRIs, often with no symptoms at all. This finding may be incidental — discuss with your physician." },
      { spec: "Physical Therapy", color: "#1A7F7A", text: "The strongest evidence for managing early cartilage changes is quadriceps and gluteal strengthening, which reduces compressive load. Low-impact activities like cycling and swimming are well-tolerated." },
    ],
    questions: ["Is this cartilage finding causing my pain, or is it incidental?", "Will this get worse over time?", "Are there any injections worth considering?"],
    timeline: "Typically managed long-term with strength maintenance. Not expected to progress rapidly with appropriate exercise.",
    selfAssess: [
      { q: "Did you have knee pain or grinding before this injury?", why: "Pre-existing symptoms suggest the cartilage finding was already symptomatic." },
      { q: "Do you feel or hear grinding when bending your knee?", why: "Crepitus helps gauge how symptomatic the cartilage surface is." },
      { q: "Is there pain when sitting for long periods with the knee bent?", why: "The 'movie theater sign' is classic for cartilage involvement." },
      { q: "Does going downstairs cause more pain than upstairs?", why: "Eccentric loading creates higher compressive forces through cartilage." },
    ],
    treatments: [
      { name: "Quad & Gluteal Strengthening", type: "conservative", color: "#2D8B4E", desc: "Evidence-based first-line treatment. Stronger muscles reduce cartilage load.", timeline: "Ongoing long-term program. Benefits in 6-8 weeks.", pros: "Most effective intervention. Protects against progression.", cons: "Requires consistent effort." },
      { name: "Activity Modification", type: "conservative", color: "#1A7F7A", desc: "Shift to lower-impact activities (cycling, swimming, elliptical).", timeline: "Ongoing lifestyle adjustment.", pros: "Reduces cartilage wear. Maintains fitness.", cons: "May require modifying sport preferences." },
      { name: "PRP (Platelet-Rich Plasma)", type: "interventional", color: "#6B3FA0", desc: "Injection of concentrated platelets to stimulate cartilage healing.", timeline: "1-3 injections. Results at 6-12 weeks.", pros: "Uses your own biology. Emerging evidence for symptom relief.", cons: "Not covered by most insurance. Evidence promising but not definitive." },
      { name: "Viscosupplementation", type: "interventional", color: "#C45D00", desc: "Hyaluronic acid injection to supplement joint fluid.", timeline: "1-3 injections. Effects may last 3-6 months.", pros: "May reduce pain. Minimal side effects.", cons: "Evidence is mixed. Generally more effective for higher-grade disease." },
    ],
  },

  /* ─── BONE BRUISE (template for any bone location) ─── */
  _bone: {
    desc: (raw, displayName) => `Bone marrow edema (bruising) in your ${displayName.toLowerCase()}. ${raw.associated?.length ? 'Often seen with ligament injuries.' : 'This represents microtrauma to the bone.'}`,
    imp: "Deep, aching pain that gradually fades over 6-12 weeks. No specific treatment required.",
    ctx: "Present in over 80% of acute ACL injuries. Resolves on its own within 2-3 months.",
    lenses: [
      { spec: "Trauma Ortho", color: "#C45D00", text: "Bone bruise patterns confirm the mechanism of injury and help with surgical planning. Does not require specific treatment." },
      { spec: "Pain Medicine", color: "#6B3FA0", text: "Bone bruises can be a significant pain source early on. If pain is disproportionate, discuss weight-bearing modifications or anti-inflammatory strategies." },
    ],
    questions: ["Is this bruise pattern typical for my injury?", "Will this affect surgical timing?", "Do I need to limit weight-bearing?"],
    timeline: "Typically resolves in 2-3 months. Pain improves significantly within 4-6 weeks.",
    selfAssess: [
      { q: "When you press on that area, does it reproduce a deep aching pain?", why: "Point tenderness confirms the bruise as an active pain source." },
      { q: "Is weight-bearing more painful than expected?", why: "Disproportionate pain may warrant temporary crutches." },
      { q: "Is the pain improving week over week?", why: "Bone bruises should show gradual linear improvement. Plateau or worsening should be reported." },
    ],
    treatments: [
      { name: "Activity Modification + Time", type: "conservative", color: "#2D8B4E", desc: "Avoid high-impact activities. Weight-bear as tolerated.", timeline: "Significant improvement in 4-6 weeks. Full resolution 2-3 months.", pros: "Heals reliably on its own.", cons: "Can be painful early on." },
      { name: "Protected Weight-Bearing", type: "conservative", color: "#1A7F7A", desc: "Crutches or brace to offload bruised bone for 1-2 weeks.", timeline: "1-2 weeks, then progressive loading.", pros: "Reduces pain, allows more comfortable rehab.", cons: "Prolonged crutch use causes deconditioning." },
    ],
  },

  /* ─── PCL ─── */
  pcl: {
    desc: (raw) => {
      const partial = /partial|sprain|grade [12]/i.test(raw.pathology + ' ' + (raw.details||''));
      return partial
        ? "Your posterior cruciate ligament has a partial tear. The PCL prevents your shin bone from sliding backward."
        : "Your posterior cruciate ligament is torn. The PCL is the strongest ligament in the knee.";
    },
    imp: "Pain in the back of the knee. Instability when going downhill or decelerating. Often less obvious than ACL instability.",
    ctx: "PCL injuries are less common than ACL tears. Many can be managed conservatively unless combined with other ligament injuries.",
    lenses: [
      { spec: "Sports Medicine Ortho", color: "#0071E3", text: "Isolated PCL injuries often heal well with bracing and PT. Combined PCL + posterolateral corner injuries are more complex and may require surgery." },
      { spec: "Physiatry / Rehab", color: "#2D8B4E", text: "Quadriceps strengthening is the most important exercise for PCL-deficient knees — strong quads counteract posterior tibial translation." },
    ],
    questions: ["Is this an isolated PCL injury or combined with other structures?", "Do I need a brace?", "What is the likelihood this heals without surgery?"],
    timeline: "Isolated Grade 1-2: 4-8 weeks. Grade 3 or combined: may require surgery with 6-9 month recovery.",
    selfAssess: [
      { q: "Do you feel instability going downstairs or downhill?", why: "Posterior sag under gravity is the hallmark of PCL insufficiency." },
      { q: "Was there a direct blow to the front of your shin (like a dashboard injury)?", why: "This is the classic mechanism for PCL tears." },
    ],
    treatments: [
      { name: "Bracing + Physical Therapy", type: "conservative", color: "#2D8B4E", desc: "PCL-specific brace with intensive quad strengthening program.", timeline: "6-12 weeks for most isolated injuries.", pros: "Most isolated PCL tears heal well without surgery.", cons: "Some residual laxity may persist on exam but be functionally insignificant." },
      { name: "PCL Reconstruction", type: "surgical", color: "#0071E3", desc: "Arthroscopic reconstruction using tendon graft. Reserved for high-grade or combined injuries.", timeline: "6-9 months recovery.", pros: "Restores posterior stability.", cons: "More technically demanding than ACL reconstruction. Reserved for severe cases." },
    ],
  },

  /* ─── MCL ─── */
  mcl: {
    desc: () => "Your medial collateral ligament is injured — the ligament on the inner side of your knee that resists sideways forces.",
    imp: "Pain on the inner side of the knee, especially with valgus stress. Swelling along the inner knee.",
    ctx: "MCL injuries are common and almost always heal without surgery, even complete tears.",
    lenses: [
      { spec: "Sports Medicine Ortho", color: "#0071E3", text: "The MCL has excellent healing potential. Even Grade 3 (complete) tears typically heal with bracing and PT. Surgery is only considered if healing fails or if combined with other injuries requiring surgery." },
    ],
    questions: ["What grade is my MCL injury?", "Do I need a brace?", "When can I return to activity?"],
    timeline: "Grade 1: 1-2 weeks. Grade 2: 3-6 weeks. Grade 3: 6-8 weeks.",
    selfAssess: [
      { q: "Is there pain or a sense of opening when someone pushes your knee inward?", why: "Valgus stress testing helps grade the MCL injury." },
    ],
    treatments: [
      { name: "Hinged Knee Brace + PT", type: "conservative", color: "#2D8B4E", desc: "Functional bracing with progressive rehabilitation. First-line for all MCL grades.", timeline: "Grade 1: 1-2 weeks. Grade 3: 6-8 weeks.", pros: "Excellent healing rate without surgery.", cons: "Grade 3 tears require longer bracing period." },
    ],
  },

  /* ─── PATELLAR TENDON ─── */
  patella_tendon: {
    desc: () => "Your patellar tendon shows changes — the tendon connecting your kneecap to your shin bone.",
    imp: "Pain below the kneecap, especially with jumping, stairs, or prolonged sitting.",
    ctx: "Patellar tendon pathology ranges from tendinitis (inflammation) to partial tears. Complete ruptures are rare on MRI as they typically present acutely.",
    lenses: [
      { spec: "Sports Medicine Ortho", color: "#0071E3", text: "Most patellar tendon pathology responds to eccentric loading programs (decline squats). Imaging findings often lag behind symptom improvement." },
    ],
    questions: ["Is this tendinitis or a structural tear?", "Should I modify my activities?"],
    timeline: "Tendinitis: 6-12 weeks with eccentric loading program. Partial tears: 3-6 months.",
    selfAssess: [
      { q: "Is the pain worse at the start of activity and then warms up?", why: "This 'warm-up phenomenon' is characteristic of tendinopathy." },
    ],
    treatments: [
      { name: "Eccentric Loading Program", type: "conservative", color: "#2D8B4E", desc: "Decline squat protocol — the gold standard for patellar tendinopathy.", timeline: "6-12 weeks.", pros: "Evidence-based, highly effective.", cons: "Requires daily compliance. Pain during exercises is expected initially." },
    ],
  },

  /* ─── BAKER'S CYST ─── */
  bakers_cyst: {
    desc: () => "A fluid-filled cyst behind your knee (popliteal cyst). These are very common and almost always secondary to another knee problem causing excess fluid.",
    imp: "Tightness or fullness behind the knee. Occasionally noticeable as a visible lump. Usually not the primary pain source.",
    ctx: "Baker's cysts are a symptom, not a disease. They form when excess joint fluid herniates into the back of the knee. Treating the underlying cause (meniscal tear, arthritis, effusion) usually resolves the cyst.",
    lenses: [
      { spec: "Pain Medicine", color: "#6B3FA0", text: "Baker's cysts rarely need direct treatment. Address the underlying intra-articular pathology and the cyst typically resolves." },
    ],
    questions: ["Is this cyst causing any of my symptoms?", "Will it go away on its own?"],
    timeline: "Typically resolves when the underlying condition is treated. May persist for months.",
    selfAssess: [
      { q: "Do you feel fullness or tightness behind the knee?", why: "Posterior knee tightness with flexion is the most common symptom of Baker's cysts." },
    ],
    treatments: [
      { name: "Treat Underlying Condition", type: "conservative", color: "#2D8B4E", desc: "Address the intra-articular pathology causing the effusion. Cyst typically resolves.", timeline: "Resolves as underlying condition improves.", pros: "Treats root cause.", cons: "Cyst may take weeks to months to fully resolve." },
    ],
  },
};

/* ─── Initialize lateral meniscus as a copy of medial with label changes ─── */
function initLateralContent() {
  const med = CONTENT.meniscus_medial;
  CONTENT.meniscus_lateral = {
    ...med,
    desc: (raw) => `A ${(raw.pathology||'').toLowerCase()} in your lateral meniscus — the shock absorber on the outer side of your knee.${raw.location ? ` Located in the ${raw.location}.` : ''}`,
    imp: "Pain along the outer knee line, especially with twisting or squatting. May affect activities differently than medial tears.",
  };

  // Copy medial cartilage template for other cartilage locations
  ['cartilage_lateral', 'cartilage_patella', 'cartilage_tibial'].forEach(key => {
    if (!CONTENT[key]) {
      CONTENT[key] = { ...CONTENT.cartilage_medial };
      if (key === 'cartilage_patella') {
        CONTENT[key].desc = (raw) => {
          const grade = (raw.pathology||'').match(/grade\s*(\d)/i)?.[1] || '2';
          return `The cartilage on your kneecap or trochlear groove shows changes — Grade ${grade} on the Outerbridge scale.`;
        };
        CONTENT[key].imp = "Pain behind or around the kneecap, especially with stairs, squatting, or prolonged sitting.";
      }
      if (key === 'cartilage_tibial') {
        CONTENT[key].desc = (raw) => {
          const grade = (raw.pathology||'').match(/grade\s*(\d)/i)?.[1] || '2';
          return `The cartilage on your tibial plateau shows changes — Grade ${grade} on the Outerbridge scale.`;
        };
      }
    }
  });

  // Copy bone template for all bone locations
  ['bone_femoral_medial', 'bone_femoral_lateral', 'bone_tibial_medial', 'bone_tibial_lateral', 'bone_patella'].forEach(key => {
    if (!CONTENT[key]) {
      CONTENT[key] = { ...CONTENT._bone };
    }
  });
}
initLateralContent();


/* ═══════════════════════════════════════════════════════════════
   MAIN MAPPING FUNCTION
   raw NLP findings → visualization-ready FD array
   ═══════════════════════════════════════════════════════════════ */

export function mapToVisualization(rawFindings) {
  return rawFindings.map((raw, idx) => {
    const structure = raw.structure;
    const content = CONTENT[structure];

    // Fallback for unknown structures
    if (!content) {
      return {
        id: `unk_${idx}`,
        str: DISPLAY_NAMES[structure] || structure,
        path: raw.pathology || 'Finding',
        sev: raw.severity === 'equivocal' ? 'mild' : raw.severity,
        m: MESH_MAP[structure] || [],
        desc: raw.details || 'Finding detected on MRI.',
        imp: 'Discuss this finding with your physician.',
        ctx: 'Your physician will determine the clinical significance of this finding.',
        sc: 0.3,
        cam: CAM_MAP[structure] || { p: [3, 1.5, 3], t: [0, 0.2, 0] },
        lenses: [],
        questions: ['What does this finding mean for me?', 'Does this require treatment?'],
        timeline: 'Discuss timeline with your physician.',
        selfAssess: [],
        treatments: [],
      };
    }

    const displayName = DISPLAY_NAMES[structure] || structure;
    const sev = raw.severity === 'equivocal' ? 'mild' : raw.severity;
    const sevRange = SEV_SCORE[raw.severity] || SEV_SCORE.mild;
    // Score within the severity range based on pathology keywords
    const isHigh = /complete|full|grade [34]|complex|large|displaced|bucket/i.test(raw.pathology + ' ' + (raw.details||''));
    const sc = isHigh ? sevRange.max : (sevRange.min + sevRange.max) / 2;

    return {
      id: `${structure}_${idx}`,
      str: displayName,
      path: raw.pathology,
      sev,
      m: MESH_MAP[structure] || [],
      desc: typeof content.desc === 'function' ? content.desc(raw, displayName) : content.desc,
      imp: content.imp,
      ctx: content.ctx,
      sc,
      cam: CAM_MAP[structure] || { p: [3, 1.5, 3], t: [0, 0.2, 0] },
      lenses: content.lenses || [],
      questions: content.questions || [],
      timeline: content.timeline || '',
      selfAssess: content.selfAssess || [],
      treatments: content.treatments || [],
    };
  });
}
