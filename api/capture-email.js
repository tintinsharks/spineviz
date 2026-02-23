// /api/capture-email.js — Vercel serverless function
// Captures email + context (joint type, findings, goals) for remarketing
//
// Supports multiple backends (configure via env vars):
//   1. GOOGLE_SHEETS_ID + GOOGLE_SERVICE_ACCOUNT_KEY → append to Google Sheet
//   2. MAILCHIMP_API_KEY + MAILCHIMP_LIST_ID → add to Mailchimp audience
//   3. Neither → logs to Vercel function logs (viewable in dashboard)
//
// All backends are attempted independently — if one fails, others still run.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, joint, findings, goals, painLevel, paid, timestamp } = req.body || {};

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const record = {
    email,
    joint: joint || "unknown",
    findingCount: findings?.length || 0,
    findingSummary: (findings || []).map(f => `${f.str}: ${f.path} [${f.sev}]`).join("; ").slice(0, 500),
    goals: (goals || []).join(", "),
    painLevel: painLevel ?? "",
    paid: !!paid,
    timestamp: timestamp || new Date().toISOString(),
    source: "clearscan_assessment",
  };

  const results = { logged: false, sheets: false, mailchimp: false };

  // ─── 1. Always log to Vercel function logs ───
  console.log("📧 EMAIL_CAPTURE:", JSON.stringify(record));
  results.logged = true;

  // ─── 2. Google Sheets (if configured) ───
  const sheetsId = process.env.GOOGLE_SHEETS_ID;
  const serviceKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (sheetsId && serviceKey) {
    try {
      const key = JSON.parse(serviceKey);
      const jwt = await getGoogleJWT(key);

      const row = [
        record.timestamp,
        record.email,
        record.joint,
        record.findingCount,
        record.findingSummary,
        record.goals,
        record.painLevel,
        record.paid ? "Yes" : "No",
      ];

      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/Sheet1!A:H:append?valueInputOption=USER_ENTERED`;
      const sheetsRes = await fetch(sheetsUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      });

      results.sheets = sheetsRes.ok;
      if (!sheetsRes.ok) console.error("Sheets error:", await sheetsRes.text());
    } catch (e) {
      console.error("Sheets error:", e.message);
    }
  }

  // ─── 3. Mailchimp (if configured) ───
  const mcKey = process.env.MAILCHIMP_API_KEY;
  const mcList = process.env.MAILCHIMP_LIST_ID;

  if (mcKey && mcList) {
    try {
      const dc = mcKey.split("-").pop(); // extract datacenter from key
      const mcUrl = `https://${dc}.api.mailchimp.com/3.0/lists/${mcList}/members`;

      const mcRes = await fetch(mcUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa("anystring:" + mcKey)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          status: "subscribed",
          merge_fields: {
            JOINT: record.joint,
            FINDINGS: String(record.findingCount),
            GOALS: record.goals.slice(0, 255),
            PAIN: String(record.painLevel),
          },
          tags: [
            `joint_${record.joint}`,
            record.paid ? "paid" : "free",
            "clearscan",
          ],
        }),
      });

      // 200 = new subscriber, 400 with "already a list member" = fine
      const mcData = await mcRes.json();
      results.mailchimp = mcRes.ok || mcData?.title === "Member Exists";
      if (!mcRes.ok && mcData?.title !== "Member Exists") {
        console.error("Mailchimp error:", mcData);
      }
    } catch (e) {
      console.error("Mailchimp error:", e.message);
    }
  }

  return res.status(200).json({ ok: true, ...results });
}

// ─── Google JWT helper (service account auth) ───
async function getGoogleJWT(key) {
  // For Vercel Edge/Node 18+, we use the Web Crypto API
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${enc(header)}.${enc(claim)}`;

  // Import the private key
  const pemBody = key.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");
  const binaryKey = Buffer.from(pemBody, "base64");

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await globalThis.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${Buffer.from(signature).toString("base64url")}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}
