import jsPDF from "jspdf";

/* ═══════════════════════════════════════════════════════════════
   CLEARSCAN REPORT GENERATOR v3
   Multi-specialist MRI report with illustrated exercise pages
   ═══════════════════════════════════════════════════════════════ */

/* ═══════ PALETTE ═══════ */
const P = {
  blue:[0,113,227], blueLt:[232,242,252], bluePale:[245,249,254],
  tx:[29,29,31], txM:[110,110,115], txL:[174,174,178], txF:[200,200,202],
  bg:[245,244,241], bgD:[236,234,230], sf:[255,255,255], bd:[229,229,234],
  mild:[139,117,0], mildBg:[253,248,232], mildBd:[210,195,80],
  mod:[184,84,0], modBg:[253,242,232], modBd:[220,160,80],
  sev:[168,16,42], sevBg:[252,232,235], sevBd:[220,100,110],
  green:[45,139,78], greenBg:[232,245,236],
  purple:[107,63,160], purpleBg:[240,235,248],
  teal:[26,127,122], tealBg:[230,245,244],
  orange:[196,93,0], orangeBg:[253,242,232],
  accent:[0,113,227],
};
const SC = {mild:P.mild,moderate:P.mod,severe:P.sev};
const SBG = {mild:P.mildBg,moderate:P.modBg,severe:P.sevBg};
const SBD = {mild:P.mildBd,moderate:P.modBd,severe:P.sevBd};

/* ═══════ LAYOUT ═══════ */
const ML = 15, MR = 15; // margins
let W, PW; // set on init

/* ═══════ DRAWING UTILS ═══════ */
function box(d,x,y,w,h,fill,border,r=0){
  if(fill){d.setFillColor(...fill);if(r)d.roundedRect(x,y,w,h,r,r,"F");else d.rect(x,y,w,h,"F");}
  if(border){d.setDrawColor(...border);d.setLineWidth(0.3);if(r)d.roundedRect(x,y,w,h,r,r,"S");else d.rect(x,y,w,h,"S");}
}

function txt(d,s,x,y,{sz=10,st="normal",c=P.tx,mw,lh,align}={}){
  d.setFontSize(sz);d.setFont("helvetica",st);d.setTextColor(...c);
  if(mw){const ln=d.splitTextToSize(s,mw);d.text(ln,x,y,{align});return ln.length*(lh||(sz*0.42));}
  d.text(s,x,y,{align});return sz*0.42;
}

function line(d,x1,y1,x2,y2,c=P.bd,w=0.3){d.setDrawColor(...c);d.setLineWidth(w);d.line(x1,y1,x2,y2);}
function circle(d,x,y,r,fill,stroke){if(fill){d.setFillColor(...fill);d.circle(x,y,r,"F");}if(stroke){d.setDrawColor(...stroke);d.setLineWidth(0.3);d.circle(x,y,r,"S");}}
function hexToRgb(hex){if(!hex||typeof hex!=="string")return null;const m=hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);if(!m)return null;return[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)];}

/* ═══════ HEADER / FOOTER ═══════ */
function header(d){
  box(d,ML,8,6,6,P.blue,null,1.2);
  d.setFontSize(9);d.setFont("helvetica","bold");d.setTextColor(255,255,255);d.text("C",ML+1.6,12.5);
  txt(d,"ClearScan",ML+8,12.5,{sz:10,st:"bold"});
  txt(d,"MRI Findings Guide",ML+30,12.5,{sz:8,c:P.txL});
  const dt=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  txt(d,dt,W-MR,12.5,{sz:8,c:P.txL,align:"right"});
  line(d,ML,16,W-MR,16,P.bd,0.4);
}

function footer(d,pg){
  const h=d.internal.pageSize.getHeight();
  line(d,ML,h-14,W-MR,h-14,P.bd,0.3);
  txt(d,"For educational purposes only. Does not replace evaluation by your physician.",ML,h-10,{sz:7,c:P.txL});
  txt(d,`Page ${pg}`,W-MR,h-10,{sz:7,c:P.txL,align:"right"});
}

let pageNum=1;
function newPg(d){d.addPage();pageNum++;header(d);footer(d,pageNum);return 24;}
function checkPg(d,y,need){if(y+need>258){return newPg(d);}return y;}

/* ═══════ SECTION TITLE ═══════ */
function sectionTitle(d,y,title,sub){
  y=checkPg(d,y,20);
  // Accent bar
  box(d,ML,y,3,10,P.blue);
  txt(d,title,ML+7,y+4,{sz:16,st:"bold"});
  if(sub){txt(d,sub,ML+7,y+9,{sz:9,c:P.txM});}
  return y+14;
}

/* ═══════════════════════════════════════════════════════════════
   EXERCISE ILLUSTRATION SYSTEM
   Draws simple but recognizable stick figures for each exercise
   ═══════════════════════════════════════════════════════════════ */
function drawStickFigure(d, cx, cy, scale, pose) {
  const s = scale;
  d.setDrawColor(...P.txM);
  d.setLineWidth(0.6);

  // Head
  circle(d, cx, cy - 8*s, 2.5*s, null, P.txM);

  // Based on pose, draw different body positions
  switch(pose) {
    case "quad_set": // Lying down, leg straight
      // Torso horizontal
      d.line(cx, cy-5.5*s, cx-12*s, cy-5.5*s);
      // Head at left
      circle(d, cx-14*s, cy-5.5*s, 2.5*s, null, P.txM);
      // Legs straight
      d.line(cx, cy-5.5*s, cx+10*s, cy-5.5*s);
      d.line(cx+10*s, cy-5.5*s, cx+14*s, cy-4*s); // foot
      // Arrow showing quad engagement
      d.setDrawColor(...P.blue); d.setLineWidth(0.4);
      d.line(cx+4*s, cy-8*s, cx+4*s, cy-10*s);
      d.line(cx+3*s, cy-9*s, cx+4*s, cy-10*s);
      d.line(cx+5*s, cy-9*s, cx+4*s, cy-10*s);
      break;

    case "heel_slide": // Lying, one knee bent
      d.line(cx, cy-5.5*s, cx-12*s, cy-5.5*s);
      circle(d, cx-14*s, cy-5.5*s, 2.5*s, null, P.txM);
      // Bent leg
      d.line(cx, cy-5.5*s, cx+5*s, cy-11*s); // thigh up
      d.line(cx+5*s, cy-11*s, cx+8*s, cy-5.5*s); // shin down
      // Straight leg
      d.line(cx, cy-4*s, cx+10*s, cy-4*s);
      // Arrow
      d.setDrawColor(...P.blue); d.setLineWidth(0.4);
      d.line(cx+9*s, cy-5.5*s, cx+7*s, cy-5.5*s);
      break;

    case "slr": // Lying, one leg raised
      d.line(cx, cy-5.5*s, cx-12*s, cy-5.5*s);
      circle(d, cx-14*s, cy-5.5*s, 2.5*s, null, P.txM);
      // Raised leg
      d.line(cx, cy-5.5*s, cx+10*s, cy-10*s);
      // Other leg flat
      d.line(cx, cy-4*s, cx+10*s, cy-4*s);
      // Arrow
      d.setDrawColor(...P.blue); d.setLineWidth(0.4);
      d.line(cx+8*s, cy-9*s, cx+8*s, cy-11*s);
      break;

    case "ankle_pump": // Foot movement
      // Just show foot and ankle
      d.line(cx-5*s, cy-3*s, cx+3*s, cy-3*s); // shin
      d.line(cx+3*s, cy-3*s, cx+6*s, cy-1*s); // foot down
      d.setDrawColor(...P.blue); d.setLineWidth(0.4);
      // Curved arrow showing pump motion
      d.line(cx+5*s, cy+1*s, cx+7*s, cy-2*s);
      d.line(cx+3*s, cy-3*s, cx+6*s, cy-6*s); // foot up position (dotted feel)
      break;

    case "ice": // Knee with ice pack
      // Leg
      d.line(cx-6*s, cy+2*s, cx, cy-2*s); // thigh
      d.line(cx, cy-2*s, cx+6*s, cy+2*s); // shin
      // Ice pack rectangle on knee
      box(d, cx-3*s, cy-4*s, 6*s, 4*s, P.blueLt, P.blue, 0.5);
      txt(d,"ICE",cx,cy-1.5*s,{sz:5,c:P.blue,align:"center"});
      break;

    case "mini_squat": // Standing, slight knee bend
      // Torso
      d.line(cx, cy-5.5*s, cx, cy);
      // Arms out for balance
      d.line(cx, cy-4*s, cx-5*s, cy-2*s);
      d.line(cx, cy-4*s, cx+5*s, cy-2*s);
      // Legs slightly bent
      d.line(cx, cy, cx-3*s, cy+4*s);
      d.line(cx-3*s, cy+4*s, cx-3*s, cy+7*s);
      d.line(cx, cy, cx+3*s, cy+4*s);
      d.line(cx+3*s, cy+4*s, cx+3*s, cy+7*s);
      // 45° angle indicator
      d.setDrawColor(...P.blue); d.setLineWidth(0.3);
      break;

    case "step_up": // One foot on platform, stepping up
      // Platform
      box(d, cx-4*s, cy+3*s, 8*s, 2*s, P.bgD, P.txL);
      // Torso
      d.line(cx, cy-5.5*s, cx, cy);
      // Leg on platform
      d.line(cx, cy, cx-2*s, cy+3*s);
      // Other leg hanging
      d.line(cx, cy, cx+3*s, cy+5*s);
      d.line(cx+3*s, cy+5*s, cx+3*s, cy+8*s);
      // Arrow up
      d.setDrawColor(...P.blue); d.setLineWidth(0.4);
      d.line(cx-6*s, cy, cx-6*s, cy-3*s);
      d.line(cx-7*s, cy-2*s, cx-6*s, cy-3*s);
      d.line(cx-5*s, cy-2*s, cx-6*s, cy-3*s);
      break;

    case "balance": // Standing on one leg
      // Torso
      d.line(cx, cy-5.5*s, cx, cy);
      // Arms out
      d.line(cx, cy-4*s, cx-6*s, cy-3*s);
      d.line(cx, cy-4*s, cx+6*s, cy-3*s);
      // Standing leg
      d.line(cx, cy, cx, cy+7*s);
      // Raised leg
      d.line(cx, cy, cx+4*s, cy+2*s);
      d.line(cx+4*s, cy+2*s, cx+6*s, cy+4*s);
      break;

    case "bike": // On stationary bike
      // Bike frame
      d.setDrawColor(...P.txL);
      d.line(cx-4*s, cy+3*s, cx+4*s, cy+3*s); // base
      d.line(cx+4*s, cy+3*s, cx+2*s, cy-2*s); // seat post
      d.line(cx-4*s, cy+3*s, cx-5*s, cy-1*s); // handlebar post
      // Wheel circles
      circle(d, cx-4*s, cy+5*s, 2*s, null, P.txL);
      circle(d, cx+4*s, cy+5*s, 2*s, null, P.txL);
      // Person
      d.setDrawColor(...P.txM);
      circle(d, cx-3*s, cy-5*s, 2*s, null, P.txM); // head
      d.line(cx-3*s, cy-3*s, cx+1*s, cy-2*s); // torso
      d.line(cx+1*s, cy-2*s, cx-1*s, cy+3*s); // leg
      break;

    case "hip_abd": // Side-lying, top leg raised
      // Lying body
      d.line(cx-10*s, cy, cx+2*s, cy); // body horizontal
      circle(d, cx-12*s, cy, 2.5*s, null, P.txM); // head
      // Bottom leg straight
      d.line(cx+2*s, cy, cx+10*s, cy+1*s);
      // Top leg raised
      d.line(cx+2*s, cy-1*s, cx+10*s, cy-5*s);
      // Arrow
      d.setDrawColor(...P.blue); d.setLineWidth(0.4);
      d.line(cx+8*s, cy-3*s, cx+8*s, cy-6*s);
      break;

    case "rdl": // Single leg RDL - hinging forward
      // Standing leg
      d.line(cx, cy+7*s, cx, cy);
      // Torso hinged forward
      d.line(cx, cy, cx+7*s, cy-3*s);
      circle(d, cx+9*s, cy-3.5*s, 2*s, null, P.txM);
      // Back leg extended
      d.line(cx, cy, cx-6*s, cy-4*s);
      // Arms hanging
      d.line(cx+3*s, cy-1*s, cx+3*s, cy+3*s);
      break;

    case "band_walk": // Standing with band, stepping lateral
      // Torso
      d.line(cx, cy-5.5*s, cx, cy);
      // Legs apart with band
      d.line(cx, cy, cx-4*s, cy+6*s);
      d.line(cx, cy, cx+4*s, cy+6*s);
      // Band
      d.setDrawColor(...P.green); d.setLineWidth(0.5);
      d.line(cx-3*s, cy+4*s, cx+3*s, cy+4*s);
      // Arrow sideways
      d.setDrawColor(...P.blue); d.setLineWidth(0.4);
      d.line(cx+5*s, cy+3*s, cx+8*s, cy+3*s);
      d.line(cx+7*s, cy+2*s, cx+8*s, cy+3*s);
      d.line(cx+7*s, cy+4*s, cx+8*s, cy+3*s);
      break;

    case "lunge": // Forward lunge position
      // Torso upright
      d.line(cx, cy-5.5*s, cx, cy);
      // Front leg bent
      d.line(cx, cy, cx+4*s, cy+4*s);
      d.line(cx+4*s, cy+4*s, cx+4*s, cy+7*s);
      // Back leg extended
      d.line(cx, cy, cx-5*s, cy+5*s);
      d.line(cx-5*s, cy+5*s, cx-6*s, cy+7*s);
      break;

    default: // Generic standing figure
      d.line(cx, cy-5.5*s, cx, cy);
      d.line(cx, cy-4*s, cx-4*s, cy-1*s);
      d.line(cx, cy-4*s, cx+4*s, cy-1*s);
      d.line(cx, cy, cx-3*s, cy+6*s);
      d.line(cx, cy, cx+3*s, cy+6*s);
  }

  d.setDrawColor(...P.txM);
  d.setLineWidth(0.3);
}

/* ═══════ EXERCISE CARD ═══════ */
function exerciseCard(d, x, y, w, h, ex, phaseColor) {
  // Card background
  box(d, x, y, w, h, P.sf, P.bd, 2);

  // Phase color accent bar at top
  box(d, x, y, w, 1.5, phaseColor);

  // Illustration area
  const illustY = y + 4;
  const illustH = h * 0.42;
  box(d, x+2, illustY, w-4, illustH, P.bg, null, 1.5);
  drawStickFigure(d, x + w/2, illustY + illustH/2 + 2, 1.1, ex.pose);

  // Exercise name
  const textY = illustY + illustH + 4;
  txt(d, ex.name, x + w/2, textY, {sz:9, st:"bold", c:P.tx, align:"center"});

  // Prescription
  txt(d, ex.rx, x + w/2, textY + 4.5, {sz:8, c:phaseColor, st:"bold", align:"center"});

  // Description
  const descY = textY + 9;
  d.setFontSize(7.5); d.setFont("helvetica","normal"); d.setTextColor(...P.txM);
  const descLines = d.splitTextToSize(ex.desc, w - 6);
  d.text(descLines, x + 3, descY);

  // Tip if present
  if (ex.tip) {
    const tipY = descY + descLines.length * 3.2 + 2;
    d.setFontSize(7); d.setFont("helvetica","italic"); d.setTextColor(...P.txL);
    const tipLines = d.splitTextToSize("Tip: " + ex.tip, w - 8);
    d.text(tipLines, x + 4, tipY);
  }
}


/* ═══════════════════════════════════════════════════════════════
   EXERCISE DATA
   ═══════════════════════════════════════════════════════════════ */
const EXERCISES = {
  phase1: {
    name: "Phase 1: Early Recovery",
    timeline: "Weeks 1–2",
    color: P.blue,
    goal: "Reduce swelling, restore range of motion, activate the quadriceps",
    exercises: [
      { name:"Quad Sets", rx:"3×15 reps, 2x/day", pose:"quad_set",
        desc:"Lie flat. Tighten the front of your thigh, pressing the back of your knee into the surface. Hold 5 seconds.",
        tip:"Place a small towel roll under your knee for feedback." },
      { name:"Heel Slides", rx:"3×10 reps", pose:"heel_slide",
        desc:"Lie flat. Slowly bend your knee by sliding your heel toward your buttock. Return slowly to straight.",
        tip:"Use a towel under your foot to reduce friction." },
      { name:"Straight Leg Raises", rx:"3×12 reps", pose:"slr",
        desc:"Lie flat. Lock your knee fully straight. Lift your entire leg about 12 inches off the surface. Lower slowly.",
        tip:"If knee bends during lift, practice quad sets more first." },
      { name:"Ankle Pumps", rx:"20 reps / hour", pose:"ankle_pump",
        desc:"Point your toes down, then pull them up toward your shin. Repeat rhythmically to promote circulation.",
        tip:"Do these frequently — they're simple but important for swelling." },
      { name:"Ice + Elevation", rx:"20 min, 4–6x / day", pose:"ice",
        desc:"Apply ice over a thin cloth. Elevate your leg above heart level. This is the most effective early swelling strategy.",
        tip:"Frozen peas conform well to the knee. Always use a barrier." },
    ]
  },
  phase2: {
    name: "Phase 2: Building Strength",
    timeline: "Weeks 3–6",
    color: P.green,
    goal: "Progressive loading, balance restoration, normalizing gait",
    exercises: [
      { name:"Mini Squats (45°)", rx:"3×12 reps", pose:"mini_squat",
        desc:"Stand with feet shoulder-width apart. Bend knees to about 45 degrees, keeping weight even. Return to standing.",
        tip:"Use a wall for support initially. Don't let knees go past toes." },
      { name:"Step-Ups", rx:"3×10 / leg", pose:"step_up",
        desc:"Step up onto a low platform (6–8 inches). Focus on controlling the lowering phase — this is the important part.",
        tip:"Lower yourself slowly over 3 seconds. This builds eccentric strength." },
      { name:"Single-Leg Balance", rx:"3×30 sec / leg", pose:"balance",
        desc:"Stand on your affected leg. Hold for 30 seconds. Progress from eyes open to eyes closed.",
        tip:"Stand near a wall for safety. This rebuilds proprioception." },
      { name:"Stationary Bike", rx:"15–20 min", pose:"bike",
        desc:"Low resistance. Seat high enough for near-full knee extension at the bottom. Great for range of motion.",
        tip:"Start with 10 minutes if needed. No pain should be felt." },
      { name:"Hip Abduction", rx:"3×15 reps", pose:"hip_abd",
        desc:"Lie on your side. Raise the top leg toward the ceiling, keeping it straight. Lower slowly.",
        tip:"Strengthens the gluteus medius — critical for knee stability." },
    ]
  },
  phase3: {
    name: "Phase 3: Functional Progression",
    timeline: "Weeks 7–12",
    color: P.purple,
    goal: "Dynamic stability, sport-specific readiness, confidence",
    exercises: [
      { name:"Single-Leg RDL", rx:"3×8 / leg", pose:"rdl",
        desc:"Stand on one leg. Hinge forward at the hip, extending the other leg behind you. Return to standing.",
        tip:"Light dumbbell when ready. Focus on a flat back and controlled motion." },
      { name:"Lateral Band Walks", rx:"3×12 / direction", pose:"band_walk",
        desc:"Place a resistance band above your knees. Take controlled sideways steps, keeping tension constant.",
        tip:"Stay low in a partial squat position throughout. Feel it in the outer hip." },
      { name:"Forward Lunges", rx:"3×8 / leg", pose:"lunge",
        desc:"Take a controlled step forward. Lower your back knee toward the ground. Push back to standing.",
        tip:"Start with shorter steps. Add lateral lunges when confident." },
      { name:"Single-Leg Balance+", rx:"3×30 sec / leg", pose:"balance",
        desc:"Progress from flat ground to unstable surface. Add ball tosses or head turns for challenge.",
        tip:"Only progress when the basic version feels completely stable." },
      { name:"Step-Ups (Higher)", rx:"3×10 / leg", pose:"step_up",
        desc:"Increase platform height to 10–12 inches. Maintain slow, controlled lowering. Add light weight when ready.",
        tip:"Height should only increase when form is perfect at the lower height." },
    ]
  }
};

/* ═══════════════════════════════════════════════════════════════
   MAIN REPORT GENERATOR
   ═══════════════════════════════════════════════════════════════ */
export function generateReport(findings, joint) {
  const j = joint || "knee";
  const jLabel = j === "knee" ? "Knee" : j === "shoulder" ? "Shoulder" : j === "hip" ? "Hip" : "Joint";
  const d = new jsPDF({ unit:"mm", format:"letter" });
  W = d.internal.pageSize.getWidth();
  PW = W - ML - MR;
  pageNum = 1;
  let y;

  header(d); footer(d, 1);

  // ═══════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════
  y = 26;

  box(d, ML, y, 3, 12, P.blue);
  txt(d, `Your ${jLabel} MRI`, ML+7, y+4, {sz:26, st:"bold"});
  txt(d, "Explained", ML+7, y+11, {sz:26, st:"bold"});
  y += 18;
  txt(d, "A guide to understanding your findings before you see your specialist", ML+7, y, {sz:11, c:P.txM});
  y += 10;

  // Mission box
  box(d, ML, y, PW, 28, P.bluePale, P.blue, 2);
  const mission = "Getting MRI results can be overwhelming. Medical terminology is confusing, online searches can be frightening, and the wait to see a specialist may feel endless. This guide bridges that gap — translating your MRI findings into plain language, presenting perspectives from multiple specialists, and giving you specific questions for your next appointment. This is not a diagnosis or treatment plan — it's preparation for the conversation that matters most: the one with your care team.";
  txt(d, mission, ML+4, y+5, {sz:9, c:P.tx, mw:PW-8, lh:3.8});
  y += 34;

  // Findings overview
  const ct = {mild:0,moderate:0,severe:0};
  findings.forEach(f => ct[f.sev]++);
  y += 2;

  txt(d, "Findings at a Glance", ML, y, {sz:13, st:"bold"});
  y += 6;
  txt(d, `Your MRI identified ${findings.length} findings:`, ML, y, {sz:10, c:P.txM});
  y += 7;

  const bw = (PW - 6) / 3;
  [["severe",ct.severe],["moderate",ct.moderate],["mild",ct.mild]].forEach(([sv,c],i) => {
    if(c===0)return;
    const bx = ML + i*(bw+3);
    box(d, bx, y, bw, 16, SBG[sv], SBD[sv], 2);
    txt(d, String(c), bx+bw/2, y+7, {sz:20, st:"bold", c:SC[sv], align:"center"});
    txt(d, sv.toUpperCase(), bx+bw/2, y+13, {sz:7, st:"bold", c:SC[sv], align:"center"});
  });
  y += 22;

  txt(d, "Severity reflects general clinical significance, not urgency. Even \"severe\" findings often have excellent outcomes.", ML, y, {sz:8, st:"italic", c:P.txL, mw:PW, lh:3.2});
  y += 8;

  // ═══ ADVISORY PANEL ═══
  line(d, ML, y, W-MR, y); y += 6;
  y = sectionTitle(d, y-4, "Clinical Advisory Panel", "Developed with input from a multidisciplinary team");
  y += 2;

  const panel = [
    ["Pain Medicine","Interventional Pain Management",P.purple,P.purpleBg],
    ["Orthopedic Surgery — Sports Medicine","Sports Medicine Fellowship",P.blue,P.blueLt],
    ["Orthopedic Surgery — Trauma","Orthopedic Trauma Fellowship",P.orange,P.orangeBg],
    ["Physical Medicine & Rehabilitation","PM&R — Spine / Sports",P.green,P.greenBg],
    ["Physical Therapy","Board-Certified Orthopedic Specialist",P.teal,P.tealBg],
  ];
  panel.forEach(([title,cred,color,bg]) => {
    box(d, ML, y, PW, 7.5, bg, P.bd, 1.5);
    // Color dot
    circle(d, ML+4, y+3.8, 1.5, color);
    txt(d, title, ML+8, y+4.5, {sz:9, st:"bold", c:P.tx});
    txt(d, " — "+cred, ML+8+d.getTextWidth(title)*9/d.internal.getFontSize()+1, y+4.5, {sz:8, c:P.txL});
    y += 9;
  });
  y += 2;
  txt(d, "The specialists above contributed to the clinical framework. They have not personally reviewed your specific imaging.", ML, y, {sz:7.5, st:"italic", c:P.txL, mw:PW, lh:3});

  // ═══════════════════════════════════════════
  // FINDINGS PAGES — DYNAMIC
  // ═══════════════════════════════════════════
  y = newPg(d);

  box(d, ML, y, 3, 10, P.blue);
  txt(d, "Understanding Your Findings", ML+7, y+4, {sz:20, st:"bold"});
  txt(d, "Plain language explanations with specialist perspectives", ML+7, y+9, {sz:9, c:P.txM});
  y += 16;

  findings.forEach((f,fi) => {
    y = checkPg(d, y, 65);
    const sc = SC[f.sev] || P.txM;

    // Finding header bar
    box(d, ML, y, PW, 8, SBG[f.sev] || P.bg, SBD[f.sev] || P.bd, 1.5);
    txt(d, f.str || "Finding", ML+4, y+5, {sz:12, st:"bold", c:P.tx});
    txt(d, (f.sev||"").toUpperCase(), W-MR-4, y+5, {sz:8, st:"bold", c:sc, align:"right"});
    y += 10;

    // Pathology
    if(f.path) { txt(d, f.path, ML, y, {sz:11, st:"bold", c:sc}); y += 5; }

    // Description
    if(f.desc) { y += txt(d, f.desc, ML, y, {sz:9.5, c:P.tx, mw:PW, lh:4}) + 2; }

    // What you may feel
    if(f.imp) {
      y = checkPg(d, y, 16);
      const feelLines = d.splitTextToSize(f.imp, PW-10);
      const feelH = feelLines.length * 3.8 + 8;
      box(d, ML, y, PW, feelH, P.bg, P.bd, 1.5);
      txt(d, "What you may experience:", ML+4, y+4, {sz:8.5, st:"bold", c:P.tx});
      d.setFontSize(8.5); d.setFont("helvetica","normal"); d.setTextColor(...P.txM);
      d.text(feelLines, ML+4, y+8);
      y += feelH + 3;
    }

    // Specialist perspectives
    if(f.lenses && f.lenses.length > 0) {
      y = checkPg(d, y, 8);
      txt(d, "Specialist Perspectives", ML, y, {sz:10, st:"bold", c:P.tx}); y += 5;

      f.lenses.forEach(lens => {
        y = checkPg(d, y, 14);
        const lColor = hexToRgb(lens.color) || P.blue;
        circle(d, ML+2, y+1, 1.2, lColor);
        txt(d, (lens.spec||"Specialist")+":", ML+5, y+2, {sz:8.5, st:"bold", c:lColor});
        y += 4;
        y += txt(d, lens.text, ML+5, y, {sz:8.5, c:P.txM, mw:PW-8, lh:3.6}) + 2;
      });
    }

    // Context
    if(f.ctx) {
      y = checkPg(d, y, 8);
      y += txt(d, f.ctx, ML, y, {sz:8.5, st:"italic", c:P.txL, mw:PW, lh:3.5}) + 2;
    }

    if (fi < findings.length-1) { y += 3; line(d, ML, y, W-MR, y); y += 5; }
  });

  // ═══════════════════════════════════════════
  // QUESTIONS PAGE — DYNAMIC
  // ═══════════════════════════════════════════
  y = newPg(d);
  box(d, ML, y, 3, 10, P.blue);
  txt(d, "Questions for Your", ML+7, y+4, {sz:20, st:"bold"});
  txt(d, "Appointment", ML+7, y+10, {sz:20, st:"bold"});
  y += 16;
  txt(d, "Check the ones that matter to you. Bring this page to your visit.", ML+7, y, {sz:10, c:P.txM});
  y += 10;

  // Build question groups from findings
  const qGroups = [];
  findings.forEach(f => {
    if (f.questions && f.questions.length > 0) {
      qGroups.push([`About Your ${f.str}`, SC[f.sev] || P.blue, f.questions.slice(0, 5)]);
    }
  });
  // Always add general logistics
  qGroups.push(["General Questions", P.txM, [
    "What is the most important thing I should focus on right now?",
    "Should I start physical therapy before any other decisions?",
    "Are there activities I should avoid?",
    "What's the expected timeline for improvement?",
    "When should I follow up, and what would change your recommendation?",
  ]]);

  qGroups.forEach(([sec, color, qs]) => {
    y = checkPg(d, y, 8 + qs.length*5.5);
    circle(d, ML+2, y+1, 1.5, color);
    txt(d, sec, ML+6, y+2, {sz:11, st:"bold", c:P.tx}); y += 6;
    qs.forEach(q => {
      box(d, ML+4, y-1.5, 3, 3, null, P.bd);
      txt(d, q, ML+10, y+0.5, {sz:9, c:P.tx}); y += 5.5;
    });
    y += 3;
  });

  // ═══════════════════════════════════════════
  // TREATMENT LANDSCAPE — DYNAMIC
  // ═══════════════════════════════════════════
  y = newPg(d);
  y = sectionTitle(d, y, "Treatment Landscape", "Overview of pathways — not a recommendation");
  y += 2;
  y += txt(d, "The right path depends on factors only your physician can assess: examination findings, functional demands, health, and goals.", ML, y, {sz:9, c:P.txM, mw:PW, lh:3.6}) + 4;

  // Collect unique treatments from all findings
  const seenTx = new Set();
  findings.forEach(f => {
    if (!f.treatments) return;
    f.treatments.forEach(tx => {
      const key = tx.name;
      if (seenTx.has(key)) return;
      seenTx.add(key);

      y = checkPg(d, y, 22);
      const txColor = hexToRgb(tx.color) || P.blue;
      circle(d, ML+2, y+1.5, 1.5, txColor);
      txt(d, tx.name, ML+6, y+2.5, {sz:11, st:"bold", c:P.tx}); y += 7;

      if (tx.desc) { y += txt(d, tx.desc, ML+8, y, {sz:8.5, c:P.txM, mw:PW-12, lh:3.5}) + 2; }
      if (tx.timeline) {
        txt(d, "Timeline:", ML+8, y, {sz:8, st:"bold", c:P.tx});
        y += txt(d, " "+tx.timeline, ML+22, y, {sz:8, c:P.txM, mw:PW-26, lh:3.5}) + 1;
      }
      if (tx.pros) {
        txt(d, "Pros:", ML+8, y, {sz:8, st:"bold", c:P.green});
        y += txt(d, " "+tx.pros, ML+18, y, {sz:8, c:P.txM, mw:PW-22, lh:3.5}) + 1;
      }
      if (tx.cons) {
        txt(d, "Cons:", ML+8, y, {sz:8, st:"bold", c:P.sev});
        y += txt(d, " "+tx.cons, ML+18, y, {sz:8, c:P.txM, mw:PW-22, lh:3.5}) + 1;
      }
      y += 3;
    });
  });

  // ═══════════════════════════════════════════
  // EXERCISE PAGES — FROM FINDINGS EXERCISES
  // ═══════════════════════════════════════════
  // Collect unique exercises from findings' treatments that mention PT
  // Use the static EXERCISES data but filter to relevant
  Object.values(EXERCISES).forEach(phase => {
    y = newPg(d);

    // Phase header
    box(d, ML, y, PW, 14, phase.color === P.blue ? P.bluePale : phase.color === P.green ? P.greenBg : P.purpleBg, phase.color, 2);
    txt(d, phase.name, ML+5, y+5.5, {sz:14, st:"bold", c:P.tx});
    txt(d, phase.timeline, W-MR-5, y+5.5, {sz:11, st:"bold", c:phase.color, align:"right"});
    txt(d, "Goal: "+phase.goal, ML+5, y+10.5, {sz:8, c:P.txM});
    y += 19;

    if (phase.color === P.blue) {
      box(d, ML, y, PW, 10, P.tealBg, P.teal, 1.5);
      txt(d, "Discuss all exercises with your PT before beginning. Do not start without clearance.", ML+4, y+4, {sz:8, st:"bold", c:P.teal, mw:PW-8});
      y += 14;
    }

    const cardW = (PW - 4) / 2;
    const cardH = 52;
    const gap = 4;

    phase.exercises.forEach((ex, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      if (col === 0 && row > 0 && i > 0) { y += cardH + gap; }
      if (col === 0) { y = checkPg(d, y, cardH + 4); }
      const cx = ML + col * (cardW + gap);
      const cy = y;
      exerciseCard(d, cx, cy, cardW, cardH, ex, phase.color);
    });
    y += cardH + 6;
  });

  // ═══════════════════════════════════════════
  // TIMELINE — DYNAMIC
  // ═══════════════════════════════════════════
  y = checkPg(d, y, 70);
  if (y > 30) { y = newPg(d); }
  y = sectionTitle(d, y, "Recovery Timeline", "General guide — your timeline depends on treatment path and healing");
  y += 4;

  // Collect timelines from findings
  const tlEntries = [];
  findings.forEach(f => {
    if (f.timeline) tlEntries.push({ str: f.str, timeline: f.timeline });
  });

  if (tlEntries.length > 0) {
    box(d, ML, y, PW, 6, P.blueLt, P.bd);
    txt(d, "Finding", ML+3, y+4, {sz:7.5, st:"bold", c:P.txL});
    txt(d, "Expected Timeline", ML+60, y+4, {sz:7.5, st:"bold", c:P.txL});
    y += 7;
    tlEntries.forEach(({str, timeline}, i) => {
      y = checkPg(d, y, 8);
      const bg = i%2===0 ? P.sf : P.bg;
      const lines = d.splitTextToSize(timeline, PW-65);
      const rowH = Math.max(7, lines.length * 3.5 + 3);
      box(d, ML, y, PW, rowH, bg, P.bd);
      txt(d, str, ML+3, y+4.5, {sz:8, st:"bold", c:P.tx});
      d.setFontSize(8); d.setFont("helvetica","normal"); d.setTextColor(...P.txM);
      d.text(lines, ML+60, y+4.5);
      y += rowH;
    });
  } else {
    // Fallback generic timeline
    const TL = [
      ["Week 1–2","Swelling management, range of motion, muscle activation"],
      ["Week 3–6","Progressive strengthening, balance restoration"],
      ["Month 2–3","Functional strengthening, gait normalization"],
      ["Month 4–6","Return to most activities, sport-specific training"],
    ];
    box(d, ML, y, PW, 6, P.blueLt, P.bd);
    txt(d, "Timeframe", ML+3, y+4, {sz:7.5, st:"bold", c:P.txL});
    txt(d, "Focus", ML+40, y+4, {sz:7.5, st:"bold", c:P.txL});
    y += 7;
    TL.forEach(([time,focus],i) => {
      const bg = i%2===0 ? P.sf : P.bg;
      box(d, ML, y, PW, 7, bg, P.bd);
      txt(d, time, ML+3, y+4.5, {sz:8, st:"bold", c:P.tx});
      txt(d, focus, ML+40, y+4.5, {sz:8, c:P.txM});
      y += 7;
    });
  }

  // ═══════════════════════════════════════════
  // CLOSING
  // ═══════════════════════════════════════════
  y += 8;
  y = checkPg(d, y, 55);
  y = sectionTitle(d, y, "What to Do Next");
  y += 2;

  ["1. Review this guide and note which questions resonate with you.",
   "2. Bring this document to your next appointment — it's a starting point for discussion.",
   "3. If cleared, discuss Phase 1 exercises with your PT.",
   "4. Don't panic. These findings have well-established treatment pathways with excellent outcomes.",
  ].forEach(s => { txt(d, s, ML+4, y, {sz:9.5, c:P.tx}); y += 6; });

  y += 4;
  box(d, ML, y, PW, 16, P.bluePale, P.blue, 2);
  txt(d, "From the ClearScan team: We built this because patients deserve to understand their own bodies. An informed patient asks better questions, makes more confident decisions, and has better outcomes. This guide is your starting point — your care team is your destination.", ML+4, y+5, {sz:9, c:P.tx, mw:PW-8, lh:3.8});
  y += 22;

  txt(d, "Methodology: Generated using ACR standard terminology. Clinical perspectives reflect AAOS and APTA Guidelines. Exercise framework designed by the ClearScan PT Advisory Team. For educational purposes only.", ML, y, {sz:7.5, c:P.txL, mw:PW, lh:3});

  // Save
  d.save(`ClearScan_${jLabel}_MRI_Report.pdf`);
}
