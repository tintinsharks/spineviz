/* ═══════════════════════════════════════════════════════════════
   SHOULDER MRI DETERMINISTIC PARSER
   
   Same architecture as kneeNLP.js — pattern matching, zero API.
   Output: { structure, pathology, severity, location, details, associated, equivocal }
   ═══════════════════════════════════════════════════════════════ */

const STRUCTURE_PATTERNS = [
  // Rotator cuff tendons
  [/\bsupraspinatus\b/i,                                       "supraspinatus"],
  [/\binfraspinatus\b/i,                                       "infraspinatus"],
  [/\bsubscapularis\b/i,                                       "subscapularis"],
  [/\bteres\s*minor\b/i,                                       "teres_minor"],
  [/\brotator\s*cuff\b(?!.*(?:intact|normal))/i,              "_rc_generic"],

  // Labrum
  [/\bsuperior\s*labr/i,                                       "labrum_superior"],
  [/\bSLAP\b/i,                                                "labrum_superior"],
  [/\banterior\s*(?:inferior\s*)?labr/i,                       "labrum_anterior"],
  [/\bbankart/i,                                                "labrum_anterior"],
  [/\bposterior\s*labr/i,                                      "labrum_posterior"],
  [/\binferior\s*labr/i,                                       "labrum_inferior"],
  [/\blabr(?:um|al)\b(?!.*(?:superior|anterior|posterior|inferior))/i, "labrum_anterior"],

  // Biceps
  [/\bbiceps?\s*(?:tendon|anchor|pulley|long\s*head)/i,       "biceps_tendon"],
  [/\blong\s*head\s*(?:of\s*)?(?:the\s*)?biceps/i,            "biceps_tendon"],

  // Glenoid / bone
  [/\bhill[\s-]*sachs/i,                                       "bone_humeral_head"],
  [/\bhumeral\s*head\b.*?(?:defect|fracture|edema|bruise|impaction|impression)/i, "bone_humeral_head"],
  [/\bglenoid\b.*?(?:fracture|defect|bone\s*loss|edema)/i,    "bone_glenoid"],
  [/\bbony\s*bankart/i,                                        "bone_glenoid"],

  // AC joint
  [/\b(?:acromioclavicular|AC\s*joint)\b/i,                   "ac_joint"],
  [/\bdistal\s*clavicle/i,                                     "ac_joint"],

  // Subacromial
  [/\bsubacromial\s*(?:burs|impinge|spur)/i,                  "subacromial"],
  [/\bacromion\b.*?(?:type|spur|hook|down[\s-]*slop)/i,       "subacromial"],
  [/\bimpingement/i,                                            "subacromial"],
  [/\bbursitis\b/i,                                             "subacromial"],

  // Effusion
  [/\b(?:joint\s*)?effusion/i,                                 "effusion"],
  [/\bglenohumeral\s*(?:effusion|fluid)/i,                     "effusion"],

  // Cartilage
  [/\b(?:glenoid|humeral)\b.*?(?:cartilage|chondral)/i,       "cartilage"],
  [/\b(?:cartilage|chondral)\b.*?(?:glenoid|humeral)/i,       "cartilage"],

  // Capsule
  [/\bcapsul(?:e|ar)\b.*?(?:thicken|adhesive|frozen|contract)/i, "capsule"],
  [/\badhesive\s*capsulitis/i,                                 "capsule"],
  [/\bfrozen\s*shoulder/i,                                     "capsule"],
];

const TEAR_PATTERNS = [
  [/\bfull[\s-]*thickness\s*tear/i,         "Full-Thickness Tear"],
  [/\bhigh[\s-]*grade\s*partial/i,          "High-Grade Partial Tear"],
  [/\bpartial[\s-]*(?:thickness\s*)?tear/i, "Partial Tear"],
  [/\barticular[\s-]*(?:side|surface)\s*(?:partial\s*)?tear/i, "Articular-Side Partial Tear"],
  [/\bbursal[\s-]*(?:side|surface)\s*(?:partial\s*)?tear/i,    "Bursal-Side Partial Tear"],
  [/\bintrasubstance\s*tear/i,              "Intrasubstance Tear"],
  [/\bmassive\s*(?:rotator\s*cuff\s*)?tear/i, "Massive Tear"],
  [/\btear\b/i,                              "Tear"],
];

const SEV = {
  severe: [
    /\bcomplete|full[\s-]*thickness|rupture[d]?|massive|retract/i,
    /\bdislocat/i, /\bavuls/i, /\bdisplaced/i,
    /\bbony\s*bankart/i, /\bhill[\s-]*sachs/i,
  ],
  moderate: [
    /\bpartial[\s-]*(?:thickness)?/i, /\bhigh[\s-]*grade/i,
    /\bmoderate\b/i, /\bSLAP\b/i, /\bbankart/i,
    /\btendinosis\b/i, /\btendinopathy\b/i,
    /\bsublux/i, /\bunstable\b/i,
  ],
  mild: [
    /\b(?:small|minor|tiny|minimal)\b/i, /\bmild\b/i,
    /\bsignal\s*(?:abnormality|change)/i, /\bfraying/i,
    /\btendinosis\b/i, /\bedema\b/i, /\bsuperficial/i,
    /\bstable\b/i, /\bdegenerative/i,
  ],
};

const EQUIVOCAL = [
  /\bcannot\s+(?:be\s+)?(?:exclude|rule\s*out)/i,
  /\bmay\s+represent/i, /\bpossible\b/i, /\bquestionable\b/i,
  /\bsuspected\b/i, /\bequivocal\b/i,
];

const NORMAL = [
  /\b(?:intact|normal|unremarkable|preserved|no\s+(?:evidence|tear|abnormality|significant))\b/i,
  /\bwithout\s+(?:tear|evidence|abnormality)/i,
];

/* ═══════════════════ HELPERS ═══════════════════ */

function splitFindings(text) {
  let c = text.replace(/^(IMPRESSION|FINDINGS|CONCLUSION)[:\s]*/im, '').replace(/\r\n/g, '\n').trim();
  const numbered = c.match(/(?:^|\n)\s*\d+[\.\)]\s*.+/g);
  if (numbered?.length > 0) return numbered.map(l => l.replace(/^\s*\d+[\.\)]\s*/, '').trim()).filter(Boolean);
  const bulleted = c.match(/(?:^|\n)\s*[-•–]\s*.+/g);
  if (bulleted?.length > 0) return bulleted.map(l => l.replace(/^\s*[-•–]\s*/, '').trim()).filter(Boolean);
  const sentences = c.split(/\.\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length > 1) return sentences;
  const lines = c.split(/\n+/).map(l => l.trim()).filter(l => l.length > 10);
  if (lines.length > 1) return lines;
  return [c];
}

function detectStructures(line) {
  const found = [];
  for (const [re, id] of STRUCTURE_PATTERNS) { if (re.test(line)) found.push(id); }
  return [...new Set(found)];
}

function resolveRCGeneric(line) {
  // "rotator cuff tear" without specifying which tendon — default to supraspinatus (most common)
  return ["supraspinatus"];
}

function detectPathology(line, sid) {
  // Rotator cuff tendons
  if (["supraspinatus","infraspinatus","subscapularis","teres_minor"].includes(sid)) {
    for (const [re, label] of TEAR_PATTERNS) { if (re.test(line)) return label; }
    if (/\btendinosis|tendinopathy/i.test(line)) return "Tendinosis";
    if (/\btendinitis/i.test(line)) return "Tendinitis";
    if (/\bretract/i.test(line)) return "Retracted Tear";
    if (/\batrophy/i.test(line)) return "Muscle Atrophy";
    if (/\bfatty\s*(?:infiltrat|replac|degenerat)/i.test(line)) return "Fatty Infiltration";
    return "Tendon Pathology";
  }
  // Labrum
  if (sid.startsWith("labrum")) {
    if (/\bSLAP\b/i.test(line)) { const t = line.match(/type\s*(\d|[IV]+)/i); return t ? `SLAP Type ${t[1]}` : "SLAP Tear"; }
    if (/\bbankart/i.test(line)) return "Bankart Lesion";
    if (/\btear\b/i.test(line)) return "Labral Tear";
    if (/\bfray/i.test(line)) return "Labral Fraying";
    if (/\bdegenerat/i.test(line)) return "Labral Degeneration";
    if (/\bdetach/i.test(line)) return "Labral Detachment";
    return "Labral Pathology";
  }
  // Biceps
  if (sid === "biceps_tendon") {
    if (/\bsublux/i.test(line)) return "Biceps Subluxation";
    if (/\bdislocat/i.test(line)) return "Biceps Dislocation";
    if (/\btear\b/i.test(line)) return "Biceps Tendon Tear";
    if (/\btendinosis|tendinopathy|tendinitis/i.test(line)) return "Biceps Tendinosis";
    return "Biceps Tendon Pathology";
  }
  // Bone
  if (sid === "bone_humeral_head") {
    if (/\bhill[\s-]*sachs/i.test(line)) return "Hill-Sachs Lesion";
    if (/\bfracture/i.test(line)) return "Fracture";
    return "Bone Lesion";
  }
  if (sid === "bone_glenoid") {
    if (/\bbony\s*bankart/i.test(line)) return "Bony Bankart";
    if (/\bbone\s*loss/i.test(line)) return "Glenoid Bone Loss";
    if (/\bfracture/i.test(line)) return "Glenoid Fracture";
    return "Glenoid Bone Lesion";
  }
  // AC joint
  if (sid === "ac_joint") {
    if (/\barthr/i.test(line)) return "AC Joint Arthropathy";
    if (/\bseparation/i.test(line)) return "AC Separation";
    if (/\bosteolysis/i.test(line)) return "Distal Clavicle Osteolysis";
    return "AC Joint Pathology";
  }
  // Subacromial
  if (sid === "subacromial") {
    if (/\bbursitis/i.test(line)) return "Subacromial Bursitis";
    if (/\bimpingement/i.test(line)) return "Subacromial Impingement";
    if (/\bspur/i.test(line)) return "Acromial Spur";
    if (/\btype\s*(?:2|3|II|III)/i.test(line)) return "Hooked Acromion";
    return "Subacromial Pathology";
  }
  // Effusion
  if (sid === "effusion") {
    if (/\blarge/i.test(line)) return "Large Effusion";
    if (/\bmoderate/i.test(line)) return "Moderate Effusion";
    if (/\bsmall/i.test(line)) return "Small Effusion";
    return "Joint Effusion";
  }
  // Cartilage
  if (sid === "cartilage") {
    if (/\bdefect/i.test(line)) return "Cartilage Defect";
    if (/\bthinning/i.test(line)) return "Cartilage Thinning";
    return "Cartilage Changes";
  }
  // Capsule
  if (sid === "capsule") {
    if (/\badhesive|frozen/i.test(line)) return "Adhesive Capsulitis";
    if (/\bthicken/i.test(line)) return "Capsular Thickening";
    return "Capsular Pathology";
  }
  return "Finding";
}

function detectSeverity(line, sid) {
  for (const re of EQUIVOCAL) { if (re.test(line)) return "equivocal"; }
  for (const re of SEV.severe) { if (re.test(line)) return "severe"; }
  for (const re of SEV.moderate) { if (re.test(line)) return "moderate"; }
  for (const re of SEV.mild) { if (re.test(line)) return "mild"; }
  // Structure-based defaults
  if (sid === "supraspinatus" && /\btear\b/i.test(line)) return /\bpartial/i.test(line) ? "moderate" : "severe";
  if (sid.startsWith("labrum")) return "moderate";
  if (sid === "effusion") return "moderate";
  if (sid === "subacromial") return "mild";
  if (sid === "ac_joint") return "mild";
  return "mild";
}

function isNormal(line) {
  for (const re of NORMAL) {
    if (re.test(line) && !/tear|rupture|disrupt|torn|fracture|effusion|tendinosis|lesion|sublux/i.test(line)) return true;
  }
  return false;
}

/* ═══════════════════ PUBLIC API ═══════════════════ */

export async function extractFindings(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = splitFindings(trimmed);
  const all = [];

  for (const line of lines) {
    if (isNormal(line) || line.length < 5) continue;

    const assocSplit = line.match(/^(.+?)\s+with\s+(?:associated\s+)?(.+)$/i);
    const primaryText = assocSplit ? assocSplit[1] : line;
    const assocText = assocSplit ? assocSplit[2] : null;

    let primaryStructs = detectStructures(primaryText);
    if (primaryStructs.length === 0 && !assocText) primaryStructs = detectStructures(line);

    const expanded = [];
    for (const s of primaryStructs) {
      if (s === "_rc_generic") expanded.push(...resolveRCGeneric(primaryText));
      else expanded.push(s);
    }
    primaryStructs = [...new Set(expanded)];

    for (const sid of primaryStructs) {
      all.push({
        structure: sid,
        pathology: detectPathology(primaryText, sid),
        severity: detectSeverity(primaryText, sid),
        location: "",
        details: line,
        associated: [],
        equivocal: detectSeverity(primaryText, sid) === "equivocal",
      });
    }

    if (assocText) {
      let assocStructs = detectStructures(assocText);
      const assocExp = [];
      for (const s of assocStructs) {
        if (s === "_rc_generic") assocExp.push(...resolveRCGeneric(assocText));
        else assocExp.push(s);
      }
      assocStructs = [...new Set(assocExp)];
      for (const sid of assocStructs) {
        if (all.find(f => f.structure === sid)) continue;
        all.push({
          structure: sid,
          pathology: detectPathology(assocText, sid),
          severity: detectSeverity(assocText, sid),
          location: "",
          details: assocText,
          associated: [],
          equivocal: false,
        });
      }
    }
  }

  return all;
}

export function dedupeFindings(findings) {
  const map = new Map();
  const RANK = { mild: 0, equivocal: 0, moderate: 1, severe: 2 };
  for (const f of findings) {
    const key = f.structure;
    if (map.has(key)) {
      const ex = map.get(key);
      if ((RANK[f.severity] || 0) > (RANK[ex.severity] || 0)) {
        f.details = `${f.details}. Also: ${ex.pathology}`;
        map.set(key, f);
      }
    } else {
      map.set(key, f);
    }
  }
  return Array.from(map.values());
}
