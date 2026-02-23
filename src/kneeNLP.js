/* ═══════════════════════════════════════════════════════════════
   KNEE MRI DETERMINISTIC PARSER
   
   Extracts structured findings from radiology impression text
   using pattern matching. Zero API calls. Runs client-side.
   
   Output schema matches what kneeContentLibrary.mapToVisualization() expects:
   { structure, pathology, severity, location, details, associated, equivocal }
   ═══════════════════════════════════════════════════════════════ */

/* ─── Structure Recognition Patterns ─── */
const STRUCTURE_PATTERNS = [
  [/\b(?:anterior cruciate|ACL)\b/i,                          "acl"],
  [/\b(?:posterior cruciate|PCL)\b/i,                          "pcl"],
  [/\b(?:medial collateral|MCL)\b/i,                           "mcl"],
  [/\b(?:lateral collateral|LCL|fibular collateral)\b/i,      "lcl"],
  [/\b(?:medial meniscus|medial meniscal)\b/i,                 "meniscus_medial"],
  [/\b(?:lateral meniscus|lateral meniscal)\b/i,               "meniscus_lateral"],
  [/\bmeniscus\b(?!.*(?:lateral|medial))/i,                    "meniscus_medial"],
  [/\b(?:(?:medial|inner)\s+(?:femoral|femur)\s*(?:condyle|condylar)?)\b.*?(?:cartilage|chondral|chondromalacia)/i, "cartilage_medial"],
  [/\b(?:cartilage|chondral|chondromalacia)\b.*?(?:medial\s+(?:femoral|femur|compartment))/i, "cartilage_medial"],
  [/\b(?:(?:lateral|outer)\s+(?:femoral|femur)\s*(?:condyle|condylar)?)\b.*?(?:cartilage|chondral|chondromalacia)/i, "cartilage_lateral"],
  [/\b(?:cartilage|chondral|chondromalacia)\b.*?(?:lateral\s+(?:femoral|femur|compartment))/i, "cartilage_lateral"],
  [/\b(?:patellar?|trochle\w+|patellofemoral)\b.*?(?:cartilage|chondral|chondromalacia)/i, "cartilage_patella"],
  [/\b(?:cartilage|chondral|chondromalacia)\b.*?(?:patellar?|trochle\w+|patellofemoral)/i, "cartilage_patella"],
  [/\b(?:tibial?\s*plateau)\b.*?(?:cartilage|chondral|chondromalacia)/i, "cartilage_tibial"],
  [/\bchondromalacia\b(?!.*(?:lateral|patell|trochle|tibial))/i, "cartilage_medial"],
  [/\b(?:medial\s+(?:femoral|femur)\s*(?:condyle|condylar)?)\b.*?(?:bone\s*(?:bruise|contusion|edema|marrow)|(?:marrow|osseous)\s*edema)/i, "bone_femoral_medial"],
  [/\b(?:bone\s*(?:bruise|contusion|edema|marrow)|(?:marrow|osseous)\s*edema)\b.*?(?:medial\s+(?:femoral|femur|condyle))/i, "bone_femoral_medial"],
  [/\b(?:lateral\s+(?:femoral|femur)\s*(?:condyle|condylar)?)\b.*?(?:bone\s*(?:bruise|contusion|edema|marrow)|(?:marrow|osseous)\s*edema)/i, "bone_femoral_lateral"],
  [/\b(?:bone\s*(?:bruise|contusion|edema|marrow)|(?:marrow|osseous)\s*edema)\b.*?(?:lateral\s+(?:femoral|femur|condyle))/i, "bone_femoral_lateral"],
  [/\b(?:(?:postero)?lateral\s+tibial?\s*plateau)\b.*?(?:bone|bruise|contusion|edema|marrow)/i, "bone_tibial_lateral"],
  [/\b(?:bone|bruise|contusion|marrow\s*edema)\b.*?(?:(?:postero)?lateral\s+tibial?\s*plateau)/i, "bone_tibial_lateral"],
  [/\b(?:medial\s+tibial?\s*plateau)\b.*?(?:bone|bruise|contusion|edema|marrow)/i, "bone_tibial_medial"],
  [/\b(?:patella|patellar)\b.*?(?:bone|bruise|contusion|edema|marrow)/i, "bone_patella"],
  [/\b(?:bone\s*(?:bruise|bruising|contusion)|(?:marrow|osseous)\s*edema)\b/i, "_bone_generic"],
  [/\b(?:joint\s*)?(?:effusion)\b/i, "effusion"],
  [/\bhydrarthrosis\b/i, "effusion"],
  [/\bsuprapatellar\s+(?:effusion|fluid)\b/i, "effusion"],
  [/\b(?:patellar?\s*tendon|infrapatellar)\b.*?(?:tear|tendin|patholog|thicken|signal)/i, "patella_tendon"],
  [/\b(?:quadriceps?\s*tendon|quad\s*tendon)\b.*?(?:tear|tendin|patholog|thicken|signal)/i, "quad_tendon"],
  [/\b(?:baker'?s?\s*cyst|popliteal\s*cyst)\b/i, "bakers_cyst"],
  [/\b(?:loose\s*bod|free\s*fragment|intra-?articular\s*bod)/i, "loose_body"],
  [/\bplica\b.*?(?:thicken|syndrome|inflam)/i, "plica"],
];

/* ─── Tear Types (meniscus) ─── */
const TEAR_TYPES = [
  [/\bhorizontal\s*(?:cleavage\s*)?tear/i, "Horizontal Tear"],
  [/\bradial\s*tear/i, "Radial Tear"],
  [/\bcomplex\s*tear/i, "Complex Tear"],
  [/\bbucket[\s-]*handle/i, "Bucket-Handle Tear"],
  [/\blongitudinal\s*tear/i, "Longitudinal Tear"],
  [/\bflap\s*tear/i, "Flap Tear"],
  [/\broot\s*tear/i, "Root Tear"],
  [/\bdegenerative[\s-]*(?:type\s*)?tear/i, "Degenerative Tear"],
  [/\btear\b/i, "Tear"],
];

/* ─── Severity ─── */
const SEV = {
  severe: [
    /\bcomplete(?:\s+\w+)*\s*(?:tear|rupture|disruption|avulsion)/i,
    /\bfull[\s-]*thickness\s*tear/i, /\brupture[d]?\b/i,
    /\bdisrupt(?:ed|ion)\b/i, /\babsent\s+\w+\s*(?:fibers?|ligament)/i,
    /\bdiscontinuit/i, /\bavuls(?:ed|ion)\b/i, /\bbucket[\s-]*handle/i,
    /\bdisplaced\s*(?:fragment|tear)/i, /\bgrade\s*(?:4|IV)\b/i,
    /\blarge\s+(?:tear|effusion|defect)/i,
  ],
  moderate: [
    /\bpartial[\s-]*(?:thickness\s*)?tear/i, /\bhigh[\s-]*grade/i,
    /\bmoderate\b/i, /\bgrade\s*(?:2|3|II|III)\b/i,
    /\binterstitial/i, /\bintrasubstance/i, /\bcomplex\s*tear/i,
    /\bunstable\b/i, /\bsublux/i,
  ],
  mild: [
    /\b(?:small|minor|tiny|minimal)\b/i, /\bgrade\s*(?:1|I)\b(?!\s*[IV])/i,
    /\blow[\s-]*grade/i, /\bmild\b/i, /\bsuperficial\b/i, /\bstable\b/i,
    /\bsignal\s*(?:abnormality|change)/i, /\bsprain\b/i, /\bstrain\b/i,
    /\bedema\b/i, /\btendinosis\b/i, /\btendinopathy\b/i, /\bmucoid/i,
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

const LOCATIONS = [
  [/\bposterior\s*horn/i, "posterior horn"], [/\banterior\s*horn/i, "anterior horn"],
  [/\bbody\b/i, "body"], [/\bmidsubstance/i, "midsubstance"],
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

function resolveBoneGeneric(line) {
  const locs = [];
  if (/(?:lateral\s+(?:femoral|femur)|lateral\s+condyle)/i.test(line)) locs.push("bone_femoral_lateral");
  if (/(?:medial\s+(?:femoral|femur)|medial\s+condyle)/i.test(line)) locs.push("bone_femoral_medial");
  if (/(?:(?:postero)?lateral\s+tibial)/i.test(line)) locs.push("bone_tibial_lateral");
  if (/(?:medial\s+tibial)/i.test(line)) locs.push("bone_tibial_medial");
  if (/patellar?\b/i.test(line)) locs.push("bone_patella");
  return locs.length > 0 ? locs : ["bone_femoral_lateral"];
}

function detectPathology(line, sid) {
  if (sid.startsWith("meniscus")) {
    for (const [re, label] of TEAR_TYPES) { if (re.test(line)) return label; }
    if (/\bdegenerat/i.test(line)) return "Degenerative Signal";
    return "Meniscal Pathology";
  }
  if (["acl","pcl","mcl","lcl"].includes(sid)) {
    if (/\bcomplete|full[\s-]*thickness|rupture[d]?|disrupt|absent|discontinuit/i.test(line)) return "Complete Tear";
    if (/\bhigh[\s-]*grade\s*partial/i.test(line)) return "High-Grade Partial Tear";
    if (/\bpartial/i.test(line)) return "Partial Tear";
    if (/\bsprain/i.test(line)) return "Sprain";
    if (/\btear\b/i.test(line)) return "Tear";
    if (/\bthicken/i.test(line)) return "Thickening";
    return "Tear";
  }
  if (sid.startsWith("cartilage")) {
    const g = line.match(/grade\s*(\d|[IV]+)/i);
    if (g) return `Grade ${g[1]} Chondromalacia`;
    if (/\bchondromalacia/i.test(line)) return "Chondromalacia";
    if (/\bfull[\s-]*thickness/i.test(line)) return "Grade 4 Cartilage Loss";
    if (/\bthinning/i.test(line)) return "Cartilage Thinning";
    if (/\bdefect/i.test(line)) return "Cartilage Defect";
    return "Cartilage Changes";
  }
  if (sid.startsWith("bone")) {
    if (/\bfracture/i.test(line)) return "Fracture";
    if (/\bstress/i.test(line)) return "Stress Reaction";
    if (/\bcontusion/i.test(line)) return "Bone Contusion";
    return "Bone Bruise";
  }
  if (sid === "effusion") {
    if (/\blarge/i.test(line)) return "Large Effusion";
    if (/\bmoderate/i.test(line)) return "Moderate Effusion";
    if (/\bsmall/i.test(line)) return "Small Effusion";
    if (/\btrace|minimal/i.test(line)) return "Trace Effusion";
    return "Joint Effusion";
  }
  if (sid === "patella_tendon" || sid === "quad_tendon") {
    if (/\btear\b/i.test(line)) return "Tendon Tear";
    if (/\btendinosis|tendinopathy/i.test(line)) return "Tendinosis";
    return "Tendon Pathology";
  }
  if (sid === "bakers_cyst") return /\bruptur/i.test(line) ? "Ruptured Baker's Cyst" : "Baker's Cyst";
  if (sid === "loose_body") return "Loose Body";
  if (sid === "plica") return "Plica Syndrome";
  return "Finding";
}

function detectSeverity(line, sid) {
  for (const re of EQUIVOCAL) { if (re.test(line)) return "equivocal"; }
  for (const re of SEV.severe) { if (re.test(line)) return "severe"; }
  for (const re of SEV.moderate) { if (re.test(line)) return "moderate"; }
  for (const re of SEV.mild) { if (re.test(line)) return "mild"; }
  // Structure-based defaults
  if (sid === "acl" || sid === "pcl") {
    return (/\btear\b/i.test(line) && !/\bpartial/i.test(line)) ? "severe" : "moderate";
  }
  if (sid.startsWith("meniscus") || sid === "effusion" || sid === "mcl" || sid === "lcl") return "moderate";
  return "mild";
}

function isNormal(line) {
  for (const re of NORMAL) {
    if (re.test(line) && !/tear|rupture|disrupt|torn|fracture|effusion|edema|chondromalacia/i.test(line)) return true;
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

    // Split compound sentences: "ACL tear with associated bone bruising..."
    // Primary part gets full severity; associated part gets its own severity
    const assocSplit = line.match(/^(.+?)\s+with\s+(?:associated\s+)?(.+)$/i);
    const primaryText = assocSplit ? assocSplit[1] : line;
    const assocText = assocSplit ? assocSplit[2] : null;

    // Process primary part
    let primaryStructs = detectStructures(primaryText);
    if (primaryStructs.length === 0 && !assocText) {
      // Try full line if primary text alone didn't match
      primaryStructs = detectStructures(line);
    }

    const expanded = [];
    for (const s of primaryStructs) {
      if (s === "_bone_generic") expanded.push(...resolveBoneGeneric(primaryText));
      else expanded.push(s);
    }
    primaryStructs = [...new Set(expanded)];

    for (const sid of primaryStructs) {
      const pathology = detectPathology(primaryText, sid);
      const severity = detectSeverity(primaryText, sid);
      let location = "";
      for (const [re, loc] of LOCATIONS) { if (re.test(primaryText)) { location = loc; break; } }

      all.push({
        structure: sid, pathology, severity, location,
        details: line, associated: [], equivocal: severity === "equivocal",
      });
    }

    // Process associated part separately with its own severity context
    if (assocText) {
      let assocStructs = detectStructures(assocText);
      const assocExpanded = [];
      for (const s of assocStructs) {
        if (s === "_bone_generic") assocExpanded.push(...resolveBoneGeneric(assocText));
        else assocExpanded.push(s);
      }
      assocStructs = [...new Set(assocExpanded)];

      for (const sid of assocStructs) {
        if (all.find(f => f.structure === sid)) continue; // skip if already added
        const pathology = detectPathology(assocText, sid);
        const severity = detectSeverity(assocText, sid);
        all.push({
          structure: sid, pathology, severity, location: "",
          details: assocText, associated: [], equivocal: false,
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
