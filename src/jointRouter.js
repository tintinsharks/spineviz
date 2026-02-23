/* ═══════════════════════════════════════════════════════════════
   JOINT ROUTER
   
   Detects which joint an MRI report describes, then routes to
   the correct parser + content library.
   
   Supported: knee, shoulder, hip (hip stubbed for future)
   ═══════════════════════════════════════════════════════════════ */

import { extractFindings as kneeExtract, dedupeFindings as kneeDedupe } from "./kneeNLP";
import { mapToVisualization as kneeMap } from "./kneeContentLibrary";
import { extractFindings as shoulderExtract, dedupeFindings as shoulderDedupe } from "./shoulderNLP";
import { mapToVisualization as shoulderMap } from "./shoulderContentLibrary";

const JOINT_PATTERNS = [
  { joint: "knee", patterns: [
    /\bknee\b/i, /\bACL\b/, /\bPCL\b/, /\bMCL\b/, /\bLCL\b/,
    /\bmeniscus\b/i, /\bmeniscal\b/i, /\bpatellar?\b/i, /\btibial\s*plateau/i,
    /\bfemoral\s*condyle/i, /\bintercondylar/i, /\bpopliteal/i,
    /\bbaker'?s?\s*cyst/i, /\bquadriceps?\s*tendon/i,
  ]},
  { joint: "shoulder", patterns: [
    /\bshoulder\b/i, /\brotator\s*cuff/i, /\bsupraspinatus/i,
    /\binfraspinatus/i, /\bsubscapularis/i, /\bteres\s*minor/i,
    /\blabr(?:um|al)\b/i, /\bglenoid\b/i, /\bglenohumeral/i,
    /\bbiceps?\s*(?:tendon|anchor|pulley)/i, /\bacromio/i,
    /\bsubacromial/i, /\bhumeral\s*head/i, /\bSLAP\b/,
    /\bbankart/i, /\bhill[\s-]*sachs/i,
  ]},
  { joint: "hip", patterns: [
    /\bhip\b/i, /\bacetabul/i, /\bfemoral\s*(?:head|neck)\b/i,
    /\blabr(?:um|al)\b.*(?:hip|acetab)/i, /\bgluteus\s*(?:medius|minimus)/i,
    /\biliopsoas/i, /\bpiriformis/i, /\bhamstring\s*(?:origin|tendon)/i,
    /\bgreater\s*trochanter/i, /\bfemoro[\s-]*acetabular/i,
  ]},
];

/**
 * Detect which joint an MRI report is describing.
 * @param {string} text - Full MRI report text
 * @returns {"knee"|"shoulder"|"hip"|null}
 */
export function detectJoint(text) {
  const scores = {};
  for (const { joint, patterns } of JOINT_PATTERNS) {
    scores[joint] = 0;
    for (const re of patterns) {
      const matches = text.match(new RegExp(re.source, re.flags + "g"));
      if (matches) scores[joint] += matches.length;
    }
  }

  // Return the joint with the highest score, or null if no matches
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0) return best[0];
  return null;
}

/**
 * Route to the correct parser pipeline.
 * @param {string} text - MRI impression text
 * @param {string} joint - Joint type
 * @returns {Promise<{findings: Array, joint: string}>}
 */
export async function parseReport(text, joint) {
  switch (joint) {
    case "knee": {
      const raw = await kneeExtract(text);
      const deduped = kneeDedupe(raw);
      const mapped = kneeMap(deduped);
      return { findings: mapped, joint: "knee" };
    }
    case "shoulder": {
      const raw = await shoulderExtract(text);
      const deduped = shoulderDedupe(raw);
      const mapped = shoulderMap(deduped);
      return { findings: mapped, joint: "shoulder" };
    }
    case "hip":
      // TODO: implement hip parser
      throw new Error("Hip MRI parsing coming soon. Currently supported: knee and shoulder.");
    default:
      throw new Error("Could not identify joint type. Please paste a knee or shoulder MRI impression.");
  }
}

/** Joint display info */
export const JOINT_INFO = {
  knee:     { label: "Knee",     icon: "🦵", model: "knee" },
  shoulder: { label: "Shoulder", icon: "💪", model: "shoulder" },
  hip:      { label: "Hip",      icon: "🦴", model: "hip" },
};
