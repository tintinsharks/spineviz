/* ═══════════════════════════════════════════════════════════════
   SHOULDER CONTENT LIBRARY
   
   Same architecture as kneeContentLibrary.js
   Maps NLP output → visualization-ready findings with clinical content
   ═══════════════════════════════════════════════════════════════ */

const MESH_MAP = {
  supraspinatus:     ["supraspinatus"],
  infraspinatus:     ["infraspinatus"],
  subscapularis:     ["subscapularis"],
  teres_minor:       ["teres_minor"],
  labrum_superior:   ["labrum"],
  labrum_anterior:   ["labrum"],
  labrum_posterior:   ["labrum"],
  labrum_inferior:    ["labrum"],
  biceps_tendon:     ["biceps_tendon"],
  bone_humeral_head: ["humeral_head"],
  bone_glenoid:      ["glenoid"],
  ac_joint:          ["ac_joint"],
  subacromial:       ["acromion"],
  effusion:          ["effusion"],
  cartilage:         ["glenoid"],
  capsule:           ["capsule"],
};

const CAM_MAP = {
  supraspinatus:     { p: [0, 2, 3], t: [0, 1, 0] },
  infraspinatus:     { p: [-2.5, 1, -1], t: [0, 1, 0] },
  subscapularis:     { p: [2.5, 0.5, 1], t: [0, 0.5, 0] },
  teres_minor:       { p: [-2, 0, -1.5], t: [0, 0.5, 0] },
  labrum_superior:   { p: [0, 2.5, 2], t: [0, 0.5, 0] },
  labrum_anterior:   { p: [2, 0.5, 2], t: [0, 0.5, 0] },
  labrum_posterior:  { p: [-2, 0.5, -1.5], t: [0, 0.5, 0] },
  labrum_inferior:   { p: [1, -1, 2.5], t: [0, 0.5, 0] },
  biceps_tendon:     { p: [1.5, 1, 2.5], t: [0, 0.5, 0] },
  bone_humeral_head: { p: [2, 1.5, 2], t: [0, 1, 0] },
  bone_glenoid:      { p: [-1, 0.5, 2.5], t: [0, 0.5, 0] },
  ac_joint:          { p: [0, 2.5, 2.5], t: [0, 1.5, 0] },
  subacromial:       { p: [0, 2, 3], t: [0, 1.5, 0] },
  effusion:          { p: [2.5, 0.5, 2], t: [0, 0.5, 0] },
  cartilage:         { p: [1.5, 0.5, 2.5], t: [0, 0.5, 0] },
  capsule:           { p: [2, 0, 2], t: [0, 0.5, 0] },
};

const DISPLAY_NAMES = {
  supraspinatus: "Supraspinatus", infraspinatus: "Infraspinatus",
  subscapularis: "Subscapularis", teres_minor: "Teres Minor",
  labrum_superior: "Superior Labrum", labrum_anterior: "Anterior Labrum",
  labrum_posterior: "Posterior Labrum", labrum_inferior: "Inferior Labrum",
  biceps_tendon: "Biceps Tendon (Long Head)", bone_humeral_head: "Humeral Head",
  bone_glenoid: "Glenoid", ac_joint: "AC Joint",
  subacromial: "Subacromial Space", effusion: "Joint Fluid",
  cartilage: "Glenohumeral Cartilage", capsule: "Joint Capsule",
};

const SEV_SCORE = {
  mild: [0.15, 0.35], equivocal: [0.15, 0.20], moderate: [0.40, 0.60], severe: [0.70, 0.90],
};

/* ═══════════════════ CLINICAL CONTENT ═══════════════════ */

const CONTENT = {
  supraspinatus: {
    desc: (raw) => {
      const p = raw.pathology.toLowerCase();
      if (p.includes("full")) return "A complete tear through the full thickness of your supraspinatus tendon — the most commonly injured rotator cuff tendon, running along the top of your shoulder.";
      if (p.includes("partial")) return "A partial tear of your supraspinatus tendon — the tendon hasn't torn all the way through but has significant damage.";
      if (p.includes("tendinosis")) return "Degeneration (tendinosis) of your supraspinatus tendon — the tendon tissue is breaking down but hasn't torn.";
      return "Your supraspinatus tendon shows pathology — this is the most commonly affected rotator cuff tendon.";
    },
    imp: "Difficulty raising your arm overhead or out to the side. Pain reaching into cabinets, washing hair, or sleeping on the affected side. Night pain is common.",
    ctx: "The supraspinatus is the most commonly torn rotator cuff tendon due to its location in the subacromial space. Partial tears can often be managed conservatively; full-thickness tears are evaluated for surgical repair based on size, retraction, and patient factors.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "The critical factors are tear size, retraction, muscle quality (fatty infiltration), and whether the tear is acute or chronic. Small to medium tears with good muscle quality have the best surgical outcomes." },
      { spec: "Physical Therapy", color: "#1A7F7A", text: "Partial tears and tendinosis respond well to progressive loading. Scapular stabilization is essential — a poorly positioned scapula increases impingement and makes the rotator cuff work harder." },
      { spec: "Sports Medicine", color: "#C45D00", text: "For overhead athletes (baseball, swimming, tennis), the decision between repair and rehab depends heavily on the patient's competitive level and ability to modify technique." },
    ],
    questions: ["What size is the tear and how much retraction is there?", "Is there fatty infiltration of the muscle?", "Would surgery or physical therapy be recommended first?", "If I don't repair it, will the tear get bigger?"],
    timeline: "Tendinosis: 6-12 weeks PT. Partial tear: 8-16 weeks conservative. Full-thickness repair: 4-6 months recovery.",
    selfAssess: [
      { q: "Can you raise your arm straight overhead without pain or compensating by leaning?", why: "Active overhead reach tests supraspinatus function. Compensatory lean suggests significant weakness." },
      { q: "Does your shoulder hurt at night, especially when lying on that side?", why: "Night pain is a hallmark of rotator cuff tears and helps gauge severity and surgical urgency." },
      { q: "Can you hold your arm out to the side at shoulder height for 10 seconds?", why: "The \"empty can\" hold tests supraspinatus strength. Inability to hold suggests a significant tear." },
    ],
    treatments: [
      { name: "Physical Therapy + Activity Modification", type: "conservative", color: "#2D8B4E", desc: "Progressive rotator cuff strengthening, scapular stabilization, and postural correction. First-line for partial tears and tendinosis.", timeline: "8-16 weeks. Most patients see significant improvement by 6-8 weeks.", pros: "Avoids surgery. Effective for partial tears and tendinosis. Addresses underlying biomechanical issues.", cons: "Full-thickness tears may not heal. Requires consistent effort." },
      { name: "Cortisone Injection", type: "interventional", color: "#C45D00", desc: "Subacromial corticosteroid injection to reduce inflammation and pain. Enables participation in physical therapy.", timeline: "Relief within 1-2 weeks. May last 4-12 weeks.", pros: "Quick pain relief. Enables PT progression. Diagnostic value.", cons: "Temporary. Repeated injections may weaken tendons. Maximum 3 per year." },
      { name: "Arthroscopic Rotator Cuff Repair", type: "surgical", color: "#0071E3", desc: "Minimally invasive reattachment of torn tendon to bone using suture anchors. Gold standard for complete tears in appropriate candidates.", timeline: "Sling 4-6 weeks. PT for 4-6 months. Full recovery 6-12 months.", pros: "Restores anatomy. Prevents tear progression and muscle atrophy. Best long-term outcomes for repairable tears.", cons: "Prolonged rehab. Re-tear rate 10-30% depending on tear size. Stiffness risk." },
    ],
  },

  infraspinatus: {
    desc: () => "Your infraspinatus tendon is affected — the tendon on the back of your shoulder responsible for external rotation (rotating your arm outward).",
    imp: "Weakness rotating your arm outward. Difficulty with reaching behind your back, driving, or activities requiring arm rotation.",
    ctx: "Infraspinatus tears often occur alongside supraspinatus tears as the tear extends posteriorly. Isolated infraspinatus tears are less common.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "Infraspinatus involvement increases the importance of surgical consideration — two-tendon tears have worse outcomes if left unreparied." },
      { spec: "Physical Therapy", color: "#1A7F7A", text: "External rotation strengthening is the priority. Side-lying external rotation with a towel roll is the foundational exercise." },
    ],
    questions: ["Is this an isolated tear or extension of a supraspinatus tear?", "What is the muscle quality of the infraspinatus?"],
    timeline: "Conservative: 8-16 weeks. Surgical repair: 6-9 months.",
    selfAssess: [
      { q: "Can you rotate your forearm outward against resistance while keeping your elbow at your side?", why: "External rotation strength directly tests infraspinatus function." },
    ],
    treatments: [
      { name: "PT — External Rotation Focus", type: "conservative", color: "#2D8B4E", desc: "Progressive external rotation strengthening and posterior cuff loading.", timeline: "8-16 weeks.", pros: "Effective for partial tears. Builds compensatory strength.", cons: "Full-thickness tears unlikely to heal." },
      { name: "Arthroscopic Repair", type: "surgical", color: "#0071E3", desc: "Repair of infraspinatus, often combined with supraspinatus repair.", timeline: "6-9 months recovery.", pros: "Restores external rotation strength. Prevents further retraction.", cons: "Longer rehab than single-tendon repair." },
    ],
  },

  subscapularis: {
    desc: () => "Your subscapularis tendon is affected — the large tendon on the front of your shoulder responsible for internal rotation and stability.",
    imp: "Weakness lifting objects in front of you, pressing movements, and internal rotation. May feel unstable reaching forward.",
    ctx: "Subscapularis tears are often under-recognized. They frequently coexist with biceps tendon pathology due to their anatomical relationship at the bicipital groove.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "Subscapularis tears are associated with biceps instability — the upper subscapularis forms part of the biceps pulley. Both should be addressed if repair is pursued." },
    ],
    questions: ["Is the biceps tendon also involved?", "How much of the subscapularis is torn?"],
    timeline: "Partial: 8-16 weeks PT. Full-thickness repair: 4-6 months.",
    selfAssess: [
      { q: "Press your hand against your belly and try to push inward — is there pain or weakness?", why: "The belly press test isolates subscapularis function." },
    ],
    treatments: [
      { name: "Conservative Management", type: "conservative", color: "#2D8B4E", desc: "Internal rotation strengthening and anterior shoulder stabilization.", timeline: "8-16 weeks.", pros: "Effective for partial tears.", cons: "Complete tears with biceps instability usually need surgery." },
      { name: "Arthroscopic Subscapularis Repair", type: "surgical", color: "#0071E3", desc: "Repair of subscapularis, often with biceps tenodesis if biceps is also involved.", timeline: "4-6 months.", pros: "Restores anterior stability and internal rotation.", cons: "Technically demanding surgery. Careful rehab needed." },
    ],
  },

  labrum_anterior: {
    desc: (raw) => {
      if (/bankart/i.test(raw.pathology)) return "A Bankart lesion — a tear of the anterior-inferior labrum typically caused by shoulder dislocation. The labrum is the cartilage ring that deepens and stabilizes your shoulder socket.";
      return "A tear of the anterior (front) labrum — the fibrocartilage rim that helps keep your shoulder stable in the socket.";
    },
    imp: "Sensation of the shoulder slipping or giving way, especially with the arm overhead and rotated outward. Apprehension reaching behind to throw or serve.",
    ctx: "Anterior labral tears are most commonly caused by shoulder dislocations or subluxations. In young, active patients, the recurrence rate for instability without surgery is high (50-80%).",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "Age at first dislocation is the most important predictor. Patients under 25 with a Bankart lesion have very high recurrence rates without repair — surgery is often recommended." },
      { spec: "Sports Medicine", color: "#C45D00", text: "For collision and overhead athletes under 25 with a clear Bankart, arthroscopic repair provides the best chance of return to sport without recurrence." },
    ],
    questions: ["How many dislocations or subluxations have I had?", "Is there bone loss on the glenoid or humeral head?", "Would arthroscopic repair or open Latarjet be recommended?"],
    timeline: "Conservative: 3-6 months stability program. Arthroscopic repair: sling 4 weeks, return to sport 4-6 months.",
    selfAssess: [
      { q: "Has your shoulder ever dislocated or felt like it was about to slip out?", why: "History of instability events is the primary factor in surgical decision-making." },
      { q: "Do you feel apprehensive when your arm is in the cocking position (overhead, rotated outward)?", why: "Apprehension in the throwing position is a hallmark of anterior instability." },
    ],
    treatments: [
      { name: "Stability-Focused PT", type: "conservative", color: "#2D8B4E", desc: "Dynamic stabilization, proprioception training, and periscapular strengthening.", timeline: "3-6 months.", pros: "Avoids surgery. May be sufficient for low-demand patients or first-time subluxations.", cons: "High recurrence rate in young, active patients (50-80%)." },
      { name: "Arthroscopic Bankart Repair", type: "surgical", color: "#0071E3", desc: "Reattachment of the torn labrum to the glenoid rim using suture anchors.", timeline: "Sling 4 weeks. Return to sport 4-6 months.", pros: "70-90% success rate. Low morbidity. Restores stability.", cons: "5-15% recurrence. May not be sufficient with significant bone loss." },
      { name: "Latarjet Procedure", type: "surgical", color: "#6B3FA0", desc: "Bone block transfer from coracoid to glenoid. Recommended when significant glenoid bone loss is present.", timeline: "Return to sport 5-6 months.", pros: "Lowest recurrence rate (<5%). Addresses bone loss.", cons: "Larger surgery. Higher complication rate. Limits future surgical options." },
    ],
  },

  labrum_superior: {
    desc: (raw) => {
      if (/SLAP/i.test(raw.pathology)) return "A SLAP tear — a tear of the superior labrum from anterior to posterior, where the biceps tendon anchors to the shoulder socket.";
      return "A tear of the superior (top) labrum — the area where the long head of the biceps tendon attaches to the glenoid.";
    },
    imp: "Deep shoulder pain, popping or clicking with overhead activities, and sometimes pain reaching across the body.",
    ctx: "SLAP tears are common in overhead athletes and workers. Treatment is age-dependent — younger patients may benefit from repair, while patients over 40 often do better with biceps tenodesis.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "Age is a major factor. In patients over 40, biceps tenodesis tends to produce more reliable outcomes than SLAP repair, which has higher failure rates in older patients." },
      { spec: "Sports Medicine", color: "#C45D00", text: "In overhead athletes under 35, SLAP repair can restore function but return to prior competitive level is unpredictable (50-70% for throwers)." },
    ],
    questions: ["What type of SLAP tear is this?", "Would repair or biceps tenodesis be more appropriate?", "Is this contributing to my symptoms or an incidental finding?"],
    timeline: "Conservative: 8-12 weeks. SLAP repair: 4-6 months. Biceps tenodesis: 3-4 months.",
    selfAssess: [
      { q: "Do you get pain or a pop when reaching overhead or across your body?", why: "The active compression test reproduced with cross-body adduction suggests a symptomatic SLAP tear." },
    ],
    treatments: [
      { name: "Conservative PT", type: "conservative", color: "#2D8B4E", desc: "Posterior capsule stretching, scapular stabilization, and rotator cuff strengthening.", timeline: "8-12 weeks.", pros: "Many SLAP tears on MRI are asymptomatic. PT addresses underlying cause.", cons: "True mechanical tears may not respond." },
      { name: "Arthroscopic SLAP Repair", type: "surgical", color: "#0071E3", desc: "Reattachment of superior labrum to glenoid.", timeline: "4-6 months. Return to sport 6-9 months.", pros: "Preserves native biceps anchor. Best for young athletes.", cons: "Stiffness risk. Variable return-to-sport rates for throwers." },
      { name: "Biceps Tenodesis", type: "surgical", color: "#6B3FA0", desc: "Reattach biceps tendon to the humerus and debride the torn labrum.", timeline: "3-4 months.", pros: "More predictable outcomes. Lower stiffness rate. Preferred for patients >40.", cons: "Changes biceps anatomy. Mild cosmetic change possible." },
    ],
  },

  biceps_tendon: {
    desc: () => "The long head of your biceps tendon shows pathology — this tendon runs through a groove at the front of your shoulder and anchors at the top of the glenoid.",
    imp: "Pain at the front of the shoulder, especially with lifting, curling, or overhead activities. May feel a popping or snapping sensation.",
    ctx: "Biceps tendon pathology frequently accompanies rotator cuff tears and labral tears. It can be a significant pain generator.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "If the biceps is subluxating or a significant pain generator, tenodesis is often performed at the time of rotator cuff repair." },
    ],
    questions: ["Is this contributing to my pain or secondary to another problem?", "Would tenodesis be appropriate?"],
    timeline: "Conservative: 6-12 weeks. Tenodesis: 3-4 months.",
    selfAssess: [
      { q: "Do you have pain when you rotate your palm upward against resistance (like turning a screwdriver)?", why: "The Speed's test isolates biceps tendon pain." },
    ],
    treatments: [
      { name: "PT + Injection", type: "conservative", color: "#2D8B4E", desc: "Activity modification, biceps stretching, and optional ultrasound-guided injection.", timeline: "6-12 weeks.", pros: "Effective for tendinosis.", cons: "Subluxating biceps rarely improves without surgery." },
      { name: "Biceps Tenodesis", type: "surgical", color: "#0071E3", desc: "Reattach biceps tendon lower on the humerus, removing it from the inflamed groove.", timeline: "3-4 months.", pros: "Reliable pain relief. Often combined with other repairs.", cons: "Minor changes to biceps appearance/strength." },
    ],
  },

  bone_humeral_head: {
    desc: () => "A Hill-Sachs lesion — a compression fracture on the back of the humeral head caused by the shoulder dislocating and impacting the glenoid rim.",
    imp: "Usually does not cause symptoms directly but indicates the shoulder has dislocated. Large lesions can engage the glenoid and cause recurrent instability.",
    ctx: "Present in the majority of shoulder dislocations. The size of the defect matters — small lesions are typically inconsequential, while engaging lesions may require surgical addressing.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "The glenoid track concept determines if a Hill-Sachs is 'on-track' (stable) or 'off-track' (engaging). Off-track lesions may need remplissage or bone grafting." },
    ],
    questions: ["Is this an engaging or non-engaging Hill-Sachs?", "Does this change the surgical approach?"],
    timeline: "Typically addressed at the time of instability repair if needed.",
    selfAssess: [
      { q: "Does your shoulder catch or click when moving from an overhead position back down?", why: "Catching during specific arc of motion may indicate the Hill-Sachs is engaging the glenoid." },
    ],
    treatments: [
      { name: "Observation", type: "conservative", color: "#2D8B4E", desc: "Small non-engaging lesions require no specific treatment.", timeline: "Ongoing monitoring.", pros: "No intervention needed for small lesions.", cons: "Large engaging lesions won't improve on their own." },
      { name: "Remplissage", type: "surgical", color: "#0071E3", desc: "Fill the Hill-Sachs defect with infraspinatus tendon, performed arthroscopically.", timeline: "Added to Bankart repair. Same recovery.", pros: "Prevents engagement. Low morbidity.", cons: "Slight loss of external rotation." },
    ],
  },

  ac_joint: {
    desc: () => "Your acromioclavicular (AC) joint shows pathology — the joint at the top of your shoulder where the collarbone meets the acromion.",
    imp: "Pain at the top of the shoulder, especially with reaching across the body, pressing overhead, or sleeping on that side.",
    ctx: "AC joint degeneration is extremely common, especially over age 40, and is frequently an incidental finding on MRI. The key question is whether it's causing symptoms.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "AC joint findings on MRI are so common that they're often incidental. Injection testing can determine if the AC joint is actually the pain generator." },
    ],
    questions: ["Is this finding causing my symptoms or incidental?", "Would a diagnostic injection help determine this?"],
    timeline: "Conservative: 4-8 weeks. Distal clavicle excision if needed: 2-3 months.",
    selfAssess: [
      { q: "Does it hurt when you reach your arm across your body to touch the opposite shoulder?", why: "The cross-body adduction test specifically stresses the AC joint." },
    ],
    treatments: [
      { name: "Activity Modification + PT", type: "conservative", color: "#2D8B4E", desc: "Avoid aggravating positions. Strengthen supporting musculature.", timeline: "4-8 weeks.", pros: "Often effective. Many AC joint findings are incidental.", cons: "Ongoing if truly symptomatic." },
      { name: "AC Joint Injection", type: "interventional", color: "#C45D00", desc: "Diagnostic and therapeutic corticosteroid injection.", timeline: "Relief within days. Diagnostic clarity.", pros: "Confirms diagnosis. May provide lasting relief.", cons: "Temporary if structural damage is advanced." },
    ],
  },

  subacromial: {
    desc: () => "Subacromial pathology — irritation or impingement of the structures in the space between your acromion (bone above) and rotator cuff (tendons below).",
    imp: "Painful arc of motion, especially raising the arm between 60-120 degrees. Overhead activities are painful.",
    ctx: "Subacromial impingement is the most common cause of shoulder pain. It usually responds well to physical therapy and is often associated with rotator cuff tendinosis.",
    lenses: [
      { spec: "Physical Therapy", color: "#1A7F7A", text: "Impingement is almost always a biomechanical problem — poor scapular mechanics, posterior capsule tightness, and rotator cuff weakness create the problem. Addressing these resolves most cases." },
    ],
    questions: ["Is this structural (bone spur) or functional (biomechanical)?", "Is there an underlying rotator cuff problem?"],
    timeline: "6-12 weeks of targeted PT resolves most cases.",
    selfAssess: [
      { q: "Is there a specific arc of motion (about shoulder height) where pain is worst?", why: "A 'painful arc' between 60-120° is classic for subacromial impingement." },
    ],
    treatments: [
      { name: "PT — Scapular Stabilization", type: "conservative", color: "#2D8B4E", desc: "Correct scapular dyskinesis, strengthen rotator cuff, stretch posterior capsule.", timeline: "6-12 weeks.", pros: "Addresses root cause. 80-90% success rate.", cons: "Requires compliance." },
      { name: "Subacromial Injection", type: "interventional", color: "#C45D00", desc: "Corticosteroid injection into the subacromial space.", timeline: "Relief within 1-2 weeks.", pros: "Enables PT participation. Diagnostic value.", cons: "Temporary. Does not fix underlying biomechanics." },
    ],
  },

  effusion: {
    desc: () => "Excess fluid in your shoulder joint — your body's inflammatory response to internal irritation or injury.",
    imp: "Shoulder may feel stiff, swollen, or heavy. Pain with end-range motion.",
    ctx: "Effusion is almost always secondary to another pathology (rotator cuff tear, labral tear, arthritis) rather than a primary problem. Treatment targets the underlying cause.",
    lenses: [],
    questions: ["What is causing the effusion?"],
    timeline: "Resolves as the underlying condition improves.",
    selfAssess: [
      { q: "Does your shoulder feel swollen or heavy compared to the other side?", why: "Subjective swelling confirms clinically significant effusion." },
    ],
    treatments: [
      { name: "Treat Underlying Cause", type: "conservative", color: "#2D8B4E", desc: "Effusion resolves when the causative pathology is addressed.", timeline: "2-6 weeks.", pros: "Self-limiting.", cons: "Persistent effusion may indicate ongoing pathology." },
    ],
  },

  capsule: {
    desc: () => "Adhesive capsulitis (frozen shoulder) — thickening and tightening of the shoulder capsule causing progressive stiffness and pain.",
    imp: "Severely restricted motion in all directions. Difficulty reaching overhead, behind your back, or out to the side. Pain often worst at night.",
    ctx: "Frozen shoulder is self-limiting (12-24 months) but very disabling. Risk factors include diabetes, thyroid disease, and prolonged immobilization.",
    lenses: [
      { spec: "Shoulder Ortho", color: "#0071E3", text: "The natural history is resolution over 12-24 months, but many patients cannot tolerate that timeline. Manipulation under anesthesia or arthroscopic capsular release can accelerate recovery." },
      { spec: "Physical Therapy", color: "#1A7F7A", text: "Gentle, pain-free stretching is the cornerstone. Aggressive stretching in the inflammatory phase worsens the condition. Timing matters — know which phase you're in." },
    ],
    questions: ["What phase of frozen shoulder am I in?", "Would manipulation or capsular release help?", "How long will this last?"],
    timeline: "Freezing phase: 2-9 months. Frozen phase: 4-12 months. Thawing phase: 5-24 months. Total: 12-24+ months.",
    selfAssess: [
      { q: "Can someone gently move your arm further than you can move it yourself?", why: "Frozen shoulder restricts both active AND passive motion equally — if passive is also limited, it supports the diagnosis." },
      { q: "Is your range of motion getting worse, staying the same, or gradually improving?", why: "This determines which phase you're in and guides treatment approach." },
    ],
    treatments: [
      { name: "PT + Anti-Inflammatory", type: "conservative", color: "#2D8B4E", desc: "Gentle range of motion exercises, heat, and oral anti-inflammatories. The cornerstone of treatment.", timeline: "12-24 months natural course. PT can shorten to 6-12 months.", pros: "Self-limiting condition. PT accelerates resolution.", cons: "Slow process. Very frustrating for patients." },
      { name: "Hydrodilatation", type: "interventional", color: "#C45D00", desc: "Injection of saline and steroid to stretch the capsule under pressure.", timeline: "Improvement over 2-4 weeks.", pros: "Can break adhesions. Provides quick pain relief.", cons: "May need to be repeated." },
      { name: "Manipulation Under Anesthesia", type: "surgical", color: "#0071E3", desc: "Physician forcefully moves the shoulder through full range while you're asleep to break adhesions.", timeline: "Immediate improvement. PT critical afterward.", pros: "Rapid restoration of motion.", cons: "Risk of fracture (rare). Requires immediate aggressive PT." },
    ],
  },
};

// Copy content templates for structures that share patterns
CONTENT.labrum_posterior = { ...CONTENT.labrum_anterior, desc: () => "A tear of the posterior (back) labrum. Less common than anterior tears, often seen with repetitive overhead sports or internal impingement." };
CONTENT.labrum_inferior = { ...CONTENT.labrum_anterior, desc: () => "A tear of the inferior (bottom) labrum, which may be part of a more extensive labral tear pattern." };
CONTENT.teres_minor = { ...CONTENT.infraspinatus, desc: () => "Your teres minor tendon is affected — a small but important rotator cuff tendon on the back of your shoulder that assists with external rotation." };
CONTENT.bone_glenoid = { ...CONTENT.bone_humeral_head, desc: () => "Glenoid bone pathology — the socket side of your shoulder joint shows structural changes, potentially from dislocation-related bone loss." };
CONTENT.cartilage = { desc: () => "Cartilage changes in your glenohumeral joint.", imp: "May contribute to catching, grinding, or progressive stiffness.", ctx: "Cartilage damage may indicate early arthritis or post-traumatic changes.", lenses: [], questions: ["Is this early arthritis or post-traumatic?"], timeline: "Depends on cause and severity.", selfAssess: [], treatments: [{ name: "Activity Modification + PT", type: "conservative", color: "#2D8B4E", desc: "Strengthen stabilizers, reduce impact loading.", timeline: "Ongoing.", pros: "Slows progression.", cons: "Cannot reverse cartilage loss." }] };

/* ═══════════════════ MAPPER ═══════════════════ */

export function mapToVisualization(rawFindings) {
  return rawFindings.map((f, idx) => {
    const content = CONTENT[f.structure] || {};
    const displayName = DISPLAY_NAMES[f.structure] || f.structure;
    const [lo, hi] = SEV_SCORE[f.severity] || [0.3, 0.5];

    // Dynamic score within severity range
    let sc = (lo + hi) / 2;
    const p = (f.pathology + " " + f.details).toLowerCase();
    if (/complete|full.thickness|massive|retract|rupture/.test(p)) sc = hi;
    if (/partial|moderate|sublux/.test(p)) sc = (lo + hi) / 2;
    if (/mild|small|minimal|fraying|signal/.test(p)) sc = lo;

    const descFn = content.desc;
    const desc = typeof descFn === "function" ? descFn(f, displayName) : (descFn || `${displayName}: ${f.pathology}`);

    return {
      id: `${f.structure}_${idx}`,
      str: displayName,
      path: f.pathology,
      sev: f.severity === "equivocal" ? "mild" : f.severity,
      sc: Math.round(sc * 100) / 100,
      m: MESH_MAP[f.structure] || ["default"],
      cam: CAM_MAP[f.structure] || { p: [0, 1, 3], t: [0, 0.5, 0] },
      desc,
      imp: content.imp || "",
      ctx: content.ctx || "",
      lenses: content.lenses || [],
      questions: content.questions || [],
      timeline: content.timeline || "",
      selfAssess: content.selfAssess || [],
      treatments: content.treatments || [],
      raw: f,
    };
  });
}
