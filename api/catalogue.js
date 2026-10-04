// Vercel Serverless Function for global cross-device catalogue synchronization
const CLOUD_BIN_URL = "https://api.npoint.io/c8a32a6fa58a8a725178";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST" || req.method === "PUT") {
    try {
      const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (Array.isArray(data)) {
        try {
          await fetch(CLOUD_BIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
        } catch {}
        return res.status(200).json({ success: true, count: data.length });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid payload" });
    }
  }

  // GET: Fetch shared catalogue
  try {
    const cloudRes = await fetch(CLOUD_BIN_URL, { cache: "no-store" });
    if (cloudRes.ok) {
      const cloudData = await cloudRes.json();
      if (Array.isArray(cloudData) && cloudData.length > 0) {
        return res.status(200).json(cloudData);
      }
    }
  } catch {}

  return res.status(200).json([]);
}
