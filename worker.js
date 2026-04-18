export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    /* Friendly browser check so students can open the URL and see status */
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          message:
            'Worker is running. Send a POST request to this URL with JSON: { "message": "..." }',
          route: url.pathname,
          openAiKeyConfigured: Boolean(env.OPENAI_API_KEY),
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: { message: "Use POST requests only." } }),
        { status: 405, headers: corsHeaders },
      );
    }

    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              "Missing OPENAI_API_KEY secret in Cloudflare Worker settings.",
          },
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    try {
      let payload;

      try {
        payload = await request.json();
      } catch {
        return new Response(
          JSON.stringify({
            error: { message: "Request body must be valid JSON." },
          }),
          { status: 400, headers: corsHeaders },
        );
      }

      const { userMessage, message } = payload;
      const finalUserMessage = userMessage || message;

      if (!finalUserMessage) {
        return new Response(
          JSON.stringify({ error: { message: "Missing user message." } }),
          { status: 400, headers: corsHeaders },
        );
      }

      const systemPrompt = `
You are a helpful beauty assistant for L’Oréal.
You ONLY answer questions about:
- L’Oréal products
- Makeup, skincare, haircare, fragrances
- Beauty routines and recommendations

If a user asks anything unrelated to beauty or L’Oréal, politely refuse.
`;

      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: finalUserMessage },
            ],
          }),
        },
      );

      let data;

      try {
        data = await openaiRes.json();
      } catch {
        return new Response(
          JSON.stringify({
            error: { message: "OpenAI returned invalid JSON." },
          }),
          { status: 502, headers: corsHeaders },
        );
      }

      if (!openaiRes.ok) {
        return new Response(
          JSON.stringify({
            error: {
              message: data.error?.message || "OpenAI request failed.",
            },
          }),
          { status: openaiRes.status, headers: corsHeaders },
        );
      }

      const reply = data.choices?.[0]?.message?.content;

      if (!reply) {
        return new Response(
          JSON.stringify({
            error: { message: "No AI reply returned from OpenAI." },
          }),
          { status: 502, headers: corsHeaders },
        );
      }

      return new Response(JSON.stringify({ reply }), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: err.message } }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
