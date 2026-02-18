// netlify/functions/generate.js
// Netlify Serverless Function: calls Anthropic Messages API.
// Make sure you set ANTHROPIC_API_KEY in Netlify Environment variables.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// Use an API-supported model id (Claude app names ≠ API model ids).
// Supported example: "claude-sonnet-4-6" (see Anthropic docs).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error:
          "Missing ANTHROPIC_API_KEY. Add it in Netlify: Site settings → Environment variables.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const system = payload.system || "";
  // Support both {messages:[...]} and simple {prompt:"..."} shapes
  const messages = payload.messages && payload.messages.length
    ? payload.messages
    : payload.prompt
      ? [{ role: "user", content: payload.prompt }]
      : [];
  const max_tokens = Number(payload.max_tokens || 900);

  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        system,
        messages,
        temperature: typeof payload.temperature === "number" ? payload.temperature : 0.5,
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      // Forward a clean error back to the UI
      return {
        statusCode: resp.status,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "Anthropic API request failed",
          details: data,
          model: MODEL,
        }),
      };
    }

    // Anthropic returns content blocks. We extract combined text for convenience.
    const text =
      Array.isArray(data.content)
        ? data.content
            .filter((b) => b && b.type === "text" && typeof b.text === "string")
            .map((b) => b.text)
            .join("\n")
        : "";

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ text, raw: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: "Server error calling Anthropic API",
        message: err?.message || String(err),
        model: MODEL,
      }),
    };
  }
};      headers: corsHeaders(),
      body: JSON.stringify({
        error:
          "Missing ANTHROPIC_API_KEY. Add it in Netlify: Site settings → Environment variables.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const system = payload.system || "";
  const messages = payload.messages || [];
  const max_tokens = Number(payload.max_tokens || 900);

  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        system,
        messages,
        temperature: typeof payload.temperature === "number" ? payload.temperature : 0.5,
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      // Forward a clean error back to the UI
      return {
        statusCode: resp.status,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: "Anthropic API request failed",
          details: data,
          model: MODEL,
        }),
      };
    }

    // Anthropic returns content blocks. We extract combined text for convenience.
    const text =
      Array.isArray(data.content)
        ? data.content
            .filter((b) => b && b.type === "text" && typeof b.text === "string")
            .map((b) => b.text)
            .join("\n")
        : "";

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ text, raw: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: "Server error calling Anthropic API",
        message: err?.message || String(err),
        model: MODEL,
      }),
    };
  }
};
