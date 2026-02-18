// netlify/functions/generate.js
// Uses Anthropic Messages API. Expects env var: ANTHROPIC_API_KEY
// Optional env vars: ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS

export async function handler(event) {
  // Basic CORS (adjust origin if you want to lock it down)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing ANTHROPIC_API_KEY env var" }),
    };
  }

  // Per Anthropic docs (Feb 2026): claude-sonnet-4-6 is a valid Claude API ID
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS || 1400);

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const userPrompt = (payload && payload.prompt ? String(payload.prompt) : "").trim();
  if (!userPrompt) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing 'prompt' in request body" }),
    };
  }

  const systemPrompt = `
You are an assistant that converts a plain-language weekly update into a structured "Team Focus Board".
Return ONLY JSON (no markdown). The JSON must match this exact schema:

{
  "leadersMessage": "string",
  "topPriorities": [
    {"title":"string","status":"IN_PROGRESS|ON_TRACK|AT_RISK|DONE","ask":"string"},
    {"title":"string","status":"IN_PROGRESS|ON_TRACK|AT_RISK|DONE","ask":"string"},
    {"title":"string","status":"IN_PROGRESS|ON_TRACK|AT_RISK|DONE","ask":"string"}
  ],
  "wins": ["string","string","string"],
  "risks": ["string","string","string"],
  "asks": ["string","string","string"]
}

Rules:
- Keep each string concise (<= 180 chars).
- If info is missing, make reasonable business-safe assumptions (no confidential data).
- Use realistic supply-chain language.
`.trim();

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Anthropic API request failed",
          status: resp.status,
          details: data,
        }),
      };
    }

    // IMPORTANT: index_updated.html expects the raw Anthropic Messages response
    // with a `content` array like: [{ type: "text", text: "..." }]
    if (!data || !Array.isArray(data.content)) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Unexpected Anthropic response shape",
          details: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Server error",
        message: err && err.message ? err.message : String(err),
      }),
    };
  }
}
