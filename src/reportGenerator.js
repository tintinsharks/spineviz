import jsPDF from "jspdf";

/* ═══════════════════════════════════════════════════════════════
   CLEARSCAN REPORT GENERATOR v3
   Multi-specialist knee MRI report with illustrated exercise pages
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

/* ═══════ HEADER / FOOTER ═══════ */
function header(d){
  box(d,ML,8,6,6,P.blue,null,1.2);
  d.setFontSize(9);d.setFont("helvetica","bold");d.setTextColor(255,255,255);d.text("C",ML+1.6,12.5);
  txt(d,"ClearScan",ML+8,12.5,{sz:10,st:"bold"});
  txt(d,"Knee MRI Findings Guide",ML+30,12.5,{sz:8,c:P.txL});
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
export function generateReport(findings) {
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

  // Title with accent
  box(d, ML, y, 3, 12, P.blue);
  txt(d, "Your Knee MRI", ML+7, y+4, {sz:26, st:"bold"});
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
  // FINDINGS PAGES
  // ═══════════════════════════════════════════
  y = newPg(d);

  box(d, ML, y, 3, 10, P.blue);
  txt(d, "Understanding Your Findings", ML+7, y+4, {sz:20, st:"bold"});
  txt(d, "Plain language explanations with specialist perspectives", ML+7, y+9, {sz:9, c:P.txM});
  y += 16;

  const FD = [
    {id:"acl",str:"ACL (Anterior Cruciate Ligament)",path:"Complete Tear",sev:"severe",
      what:"Your anterior cruciate ligament — the main stabilizing ligament in the center of your knee — is completely torn. The ACL prevents your shin bone from sliding forward relative to your thigh bone and provides rotational stability.",
      feel:"A feeling of instability or \"giving way\" during pivoting, cutting, or sudden direction changes. Straight-line activities like walking and cycling are typically unaffected.",
      lenses:[[P.blue,"Sports Medicine Ortho","Reconstruction vs. conservative management depends on your activity goals. For cutting/pivoting sports, reconstruction is generally recommended. For straight-line activities, structured PT may restore functional stability."],[P.purple,"Pain Medicine","The ACL itself is often not the primary pain generator after the acute phase. Ongoing pain may come from bone bruising, effusion, and altered biomechanics."],[P.green,"Physiatry / Rehab","Early rehabilitation (quad activation, ROM, swelling control) is universally recommended regardless of surgical decision. \"Prehab\" improves post-op outcomes."]]},
    {id:"men",str:"Medial Meniscus",path:"Horizontal Tear — Posterior Horn",sev:"moderate",
      what:"Your medial meniscus has a horizontal cleavage tear in its posterior horn — the C-shaped shock absorber on the inner side of your knee.",
      feel:"Pain along the inner knee line with squats, twisting, or stairs. Possible catching or locking sensations.",
      lenses:[[P.blue,"Sports Medicine Ortho","Horizontal tears are often degenerative and many respond to conservative management. The key question is whether the tear is stable or unstable."],[P.teal,"Physical Therapy","Targeted quad and hip strengthening reduces load through the medial compartment. Avoid deep squatting and pivoting until cleared."],[P.orange,"Trauma Ortho","Posterior horn location matters — options range from partial meniscectomy to repair. Repair is preferred when feasible for long-term joint protection."]]},
    {id:"eff",str:"Joint Fluid",path:"Moderate Effusion",sev:"moderate",
      what:"Moderate excess fluid in your knee joint — your body's inflammatory response to the ACL and meniscal injuries.",
      feel:"Stiffness, tightness, difficulty fully bending or straightening. The knee may feel warm and swollen.",
      lenses:[[P.green,"Physiatry / Rehab","Reducing effusion is priority #1 — swelling directly inhibits quad activation (arthrogenic muscle inhibition). RICE protocol and gentle ROM exercises are first-line."],[P.purple,"Pain Medicine","If effusion persists beyond 4–6 weeks, aspiration with or without corticosteroid injection may break the inflammatory cycle."]]},
    {id:"cart",str:"Articular Cartilage (Medial)",path:"Grade 2 Chondromalacia",sev:"mild",
      what:"The cartilage on the inner surface of your thigh bone shows softening and early irregularity — Grade 2 on the Outerbridge 4-point scale.",
      feel:"Dull ache with prolonged sitting or weight-bearing. Mild grinding sensation possible.",
      lenses:[[P.purple,"Pain Medicine","Grade 2 changes are found on a large proportion of knee MRIs in adults over 30, often incidentally. This finding may be unrelated to your current symptoms."],[P.teal,"Physical Therapy","Quad and gluteal strengthening reduces compressive load through the affected compartment. Cycling and swimming are well-tolerated."]]},
    {id:"bone",str:"Bone (Lateral Femoral Condyle / Tibial Plateau)",path:"Bone Bruise",sev:"mild",
      what:"Bone marrow bruising in a characteristic \"kissing contusion\" pattern — seen in over 80% of ACL injuries when these bone surfaces impact each other.",
      feel:"Deep aching pain, most noticeable in the first few weeks. Improves gradually without specific treatment.",
      lenses:[[P.orange,"Trauma Ortho","This pattern confirms the ACL injury mechanism. It does not require treatment and resolves within 2–3 months."],[P.purple,"Pain Medicine","If pain is disproportionate to expectations, your physician can discuss protective weight-bearing modifications."]]},
  ];

  FD.forEach((f,fi) => {
    y = checkPg(d, y, 65);
    const sc = SC[f.sev];

    // Finding header bar
    box(d, ML, y, PW, 8, SBG[f.sev], SBD[f.sev], 1.5);
    txt(d, f.str, ML+4, y+5, {sz:12, st:"bold", c:P.tx});
    txt(d, f.sev.toUpperCase(), W-MR-4, y+5, {sz:8, st:"bold", c:sc, align:"right"});
    y += 10;

    // Pathology
    txt(d, f.path, ML, y, {sz:11, st:"bold", c:sc}); y += 5;

    // Description
    y += txt(d, f.what, ML, y, {sz:9.5, c:P.tx, mw:PW, lh:4}) + 2;

    // What you may feel
    y = checkPg(d, y, 16);
    const feelLines = d.splitTextToSize(f.feel, PW-10);
    const feelH = feelLines.length * 3.8 + 8;
    box(d, ML, y, PW, feelH, P.bg, P.bd, 1.5);
    txt(d, "What you may experience:", ML+4, y+4, {sz:8.5, st:"bold", c:P.tx});
    d.setFontSize(8.5); d.setFont("helvetica","normal"); d.setTextColor(...P.txM);
    d.text(feelLines, ML+4, y+8);
    y += feelH + 3;

    // Specialist perspectives
    y = checkPg(d, y, 8);
    txt(d, "Specialist Perspectives", ML, y, {sz:10, st:"bold", c:P.tx}); y += 5;

    f.lenses.forEach(([color, label, text]) => {
      y = checkPg(d, y, 14);
      circle(d, ML+2, y+1, 1.2, color);
      txt(d, label+":", ML+5, y+2, {sz:8.5, st:"bold", c:color});
      y += 4;
      y += txt(d, text, ML+5, y, {sz:8.5, c:P.txM, mw:PW-8, lh:3.6}) + 2;
    });

    if (fi < FD.length-1) { y += 3; line(d, ML, y, W-MR, y); y += 5; }
  });

  // ═══════════════════════════════════════════
  // QUESTIONS PAGE
  // ═══════════════════════════════════════════
  y = newPg(d);
  box(d, ML, y, 3, 10, P.blue);
  txt(d, "Questions for Your", ML+7, y+4, {sz:20, st:"bold"});
  txt(d, "Appointment", ML+7, y+10, {sz:20, st:"bold"});
  y += 16;
  txt(d, "Check the ones that matter to you. Bring this page to your visit.", ML+7, y, {sz:10, c:P.txM});
  y += 10;

  const QS = [
    ["About Your ACL", P.blue, ["Based on my age and activity level, would you recommend reconstruction or a trial of PT?","If I pursue PT first, what signs would indicate surgery is needed?","What graft type would you recommend, and why?","What's the realistic timeline for returning to [my activity]?","Are there factors that make my case more or less complex than typical?"]],
    ["About Your Meniscus", P.orange, ["Is my meniscal tear contributing to symptoms or could it be managed conservatively?","If you operate on the ACL, will you also address the meniscus?","How does meniscus repair change the rehab timeline?"]],
    ["About Pain Management", P.purple, ["What should I expect for pain levels over the next few weeks?","Are there injections that might help while I decide on treatment?","Is my cartilage finding a pain generator, or incidental?"]],
    ["About Rehabilitation", P.green, ["Can you refer me to a PT experienced with ACL injuries?","Should I start prehab exercises now?","What activities should I avoid right now?"]],
    ["Logistics", P.txM, ["If surgery is recommended, what's the typical wait time?","What do the first few days post-surgery look like?","How much time off work should I plan for?"]],
  ];

  QS.forEach(([sec, color, qs]) => {
    y = checkPg(d, y, 8 + qs.length*5.5);
    circle(d, ML+2, y+1, 1.5, color);
    txt(d, sec, ML+6, y+2, {sz:11, st:"bold", c:P.tx}); y += 6;
    qs.forEach(q => {
      // Checkbox
      box(d, ML+4, y-1.5, 3, 3, null, P.bd);
      txt(d, q, ML+10, y+0.5, {sz:9, c:P.tx}); y += 5.5;
    });
    y += 3;
  });

  // ═══════════════════════════════════════════
  // TREATMENT LANDSCAPE
  // ═══════════════════════════════════════════
  y = newPg(d);
  y = sectionTitle(d, y, "Treatment Landscape", "Overview of pathways — not a recommendation");
  y += 2;
  y += txt(d, "The right path depends on factors only your physician can assess: examination findings, functional demands, health, and goals.", ML, y, {sz:9, c:P.txM, mw:PW, lh:3.6}) + 4;

  const TX = [
    ["Conservative Management (PT Only)", P.green, [["What it involves","Structured PT, 3–6 months, focused on strength and stability without surgery."],["Who it may suit","Straight-line activity patients, older adults, or trial-of-PT-first approach."],["Key point","Trying PT first does not burn bridges — surgery remains an option."]]],
    ["ACL Reconstruction", P.blue, [["What it involves","Outpatient surgery replacing the ACL with a graft + 6–9 months structured rehab."],["Who it may suit","Active individuals wanting to return to cutting/pivoting sports."],["Key point","Multiple graft types exist. Your surgeon will recommend based on your situation."]]],
    ["Reconstruction + Meniscus Repair", P.purple, [["What it involves","ACL reconstruction combined with meniscal suturing in one procedure."],["Who it may suit","Patients whose tear is in a repairable zone with adequate blood supply."],["Key point","Healing rate 80–90% when combined with ACL reconstruction."]]],
    ["Interventional Options", P.orange, [["Corticosteroid injection","May reduce acute inflammation, facilitating earlier rehabilitation."],["PRP (Platelet-Rich Plasma)","Emerging evidence for cartilage and meniscal healing. Discuss with your physician."],["Genicular nerve block","May help persistent pain limiting rehabilitation participation."]]],
  ];

  TX.forEach(([title, color, items]) => {
    y = checkPg(d, y, 10 + items.length*9);
    circle(d, ML+2, y+1.5, 1.5, color);
    txt(d, title, ML+6, y+2.5, {sz:11, st:"bold", c:P.tx}); y += 7;
    items.forEach(([label, desc]) => {
      txt(d, label+":", ML+8, y, {sz:8.5, st:"bold", c:P.tx}); y += 3.5;
      y += txt(d, desc, ML+8, y, {sz:8.5, c:P.txM, mw:PW-12, lh:3.5}) + 2;
    });
    y += 3;
  });

  // ═══════════════════════════════════════════
  // EXERCISE PAGES — ILLUSTRATED
  // ═══════════════════════════════════════════
  Object.values(EXERCISES).forEach(phase => {
    y = newPg(d);

    // Phase header
    box(d, ML, y, PW, 14, phase.color === P.blue ? P.bluePale : phase.color === P.green ? P.greenBg : P.purpleBg, phase.color, 2);
    txt(d, phase.name, ML+5, y+5.5, {sz:14, st:"bold", c:P.tx});
    txt(d, phase.timeline, W-MR-5, y+5.5, {sz:11, st:"bold", c:phase.color, align:"right"});
    txt(d, "Goal: "+phase.goal, ML+5, y+10.5, {sz:8, c:P.txM});
    y += 19;

    // Important notice for Phase 1
    if (phase.color === P.blue) {
      box(d, ML, y, PW, 10, P.tealBg, P.teal, 1.5);
      txt(d, "Discuss all exercises with your PT before beginning. Do not start without clearance.", ML+4, y+4, {sz:8, st:"bold", c:P.teal, mw:PW-8});
      y += 14;
    }

    // Exercise cards — 2 columns, up to 3 rows per page
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

    // Adjust y for last row
    y += cardH + 6;
  });

  // ═══════════════════════════════════════════
  // TIMELINE
  // ═══════════════════════════════════════════
  y = checkPg(d, y, 70);
  if (y > 30) { y = newPg(d); }
  y = sectionTitle(d, y, "Recovery Timeline", "General guide — your timeline depends on treatment path and healing");
  y += 4;

  const TL = [
    ["Week 1–2","Swelling mgmt, ROM, quad activation","Post-surgical recovery, gentle ROM"],
    ["Week 3–6","Progressive strengthening, balance","Weight-bearing, bike, quad strength"],
    ["Month 2–3","Functional strengthening","Single-leg work, gait normalization"],
    ["Month 4–6","Return to most activities","Running program, sport-specific"],
    ["Month 6–9+","Full activity for most","Return-to-sport testing, gradual return"],
  ];

  box(d, ML, y, PW, 6, P.blueLt, P.bd);
  txt(d, "Timeframe", ML+3, y+4, {sz:7.5, st:"bold", c:P.txL});
  txt(d, "Conservative (PT)", ML+35, y+4, {sz:7.5, st:"bold", c:P.txL});
  txt(d, "ACL Reconstruction", ML+105, y+4, {sz:7.5, st:"bold", c:P.txL});
  y += 7;

  TL.forEach(([time,cons,surg],i) => {
    const bg = i%2===0 ? P.sf : P.bg;
    box(d, ML, y, PW, 7, bg, P.bd);
    txt(d, time, ML+3, y+4.5, {sz:8, st:"bold", c:P.tx});
    txt(d, cons, ML+35, y+4.5, {sz:8, c:P.txM});
    txt(d, surg, ML+105, y+4.5, {sz:8, c:P.txM});
    y += 7;
  });

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
  d.save("ClearScan_Knee_MRI_Report.pdf");
}
