// /api/places.js — Vercel serverless function
// Proxies Google Places Text Search to keep API key server-side
// Usage: GET /api/places?query=orthopedic+surgeon+near+10001&type=doctor

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query parameter" });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Fallback: return empty results with a message
    return res.status(200).json({
      results: [],
      fallback: true,
      message: "Google Places API key not configured. Set GOOGLE_PLACES_API_KEY in Vercel environment variables.",
    });
  }

  try {
    // Use Places Text Search (New) API
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=doctor&key=${apiKey}`;
    const gRes = await fetch(url);
    const data = await gRes.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return res.status(200).json({ results: [], error: data.status, message: data.error_message || "" });
    }

    // Shape results — return top 10 sorted by rating (desc), then review count (desc)
    const results = (data.results || [])
      .filter(p => p.rating != null)
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
      })
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        address: p.formatted_address,
        rating: p.rating,
        reviews: p.user_ratings_total || 0,
        open: p.opening_hours?.open_now ?? null,
        placeId: p.place_id,
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
        types: p.types || [],
      }));

    return res.status(200).json({ results });
  } catch (e) {
    console.error("Places API error:", e);
    return res.status(500).json({ results: [], error: "fetch_failed" });
  }
}
