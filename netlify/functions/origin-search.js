const SERPER_ENDPOINT = "https://google.serper.dev/search";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  try {
    const { query } = JSON.parse(event.body || "{}");
    if (typeof query !== "string" || !query.trim()) {
      return json(400, { error: "Please provide a search question." });
    }
    if (query.length > 500) {
      return json(400, { error: "Please keep the question under 500 characters." });
    }
    if (!process.env.SERPER_API_KEY) {
      return json(503, { error: "Search is not configured yet. Add SERPER_API_KEY in Netlify environment variables and redeploy." });
    }

    const serperResponse = await fetch(SERPER_ENDPOINT, {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: query.trim(), num: 8 })
    });
    const serperData = await serperResponse.json().catch(() => ({}));
    if (!serperResponse.ok) {
      console.error("Serper request failed:", serperResponse.status);
      return json(502, { error: "Serper search failed. Check the Serper key, account quota, and billing." });
    }

    const organic = Array.isArray(serperData.organic) ? serperData.organic : [];
    const sources = organic.slice(0, 8).map((item) => ({
      title: String(item.title || ""),
      link: safeHttpUrl(item.link),
      snippet: String(item.snippet || ""),
      displayLink: String(item.displayed_link || item.link || "")
    })).filter((item) => item.link);

    let answer = "";
    let aiEnabled = false;
    if (process.env.OPENROUTER_API_KEY && sources.length) {
      const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
      const sourceText = sources.map((s, i) =>
        `[${i + 1}] ${s.title}\nURL: ${s.link}\nSnippet: ${s.snippet}`
      ).join("\n\n");

      const aiResponse = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.SITE_URL || "https://ai-origin.netlify.app",
          "X-Title": "Origin AI"
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            {
              role: "system",
              content: "You are Origin AI. Answer the user's question using the supplied web search results as your primary evidence. Do not invent facts or claim to have read full pages when only snippets are provided. If evidence is insufficient or sources disagree, say so. Cite supporting sources inline using [1], [2], etc., matching the supplied numbered sources. Keep the answer clear and useful."
            },
            {
              role: "user",
              content: `Question: ${query.trim()}\n\nWeb search results:\n${sourceText}\n\nAnswer using these results and cite sources inline.`
            }
          ]
        })
      });
      const aiData = await aiResponse.json().catch(() => ({}));
      if (aiResponse.ok) {
        answer = String(aiData.choices?.[0]?.message?.content || "").trim();
        aiEnabled = Boolean(answer);
      } else {
        console.error("OpenRouter request failed:", aiResponse.status);
      }
    }

    return json(200, { query: query.trim(), answer, aiEnabled, sources });
  } catch (error) {
    console.error("Origin search function error:", error?.message || error);
    return json(500, { error: "The search service encountered an unexpected error." });
  }
};

function safeHttpUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return (u.protocol === "https:" || u.protocol === "http:") ? u.href : "";
  } catch {
    return "";
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.SITE_URL || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function json(statusCode, body) {
  return { statusCode, headers: corsHeaders(), body: JSON.stringify(body) };
}
