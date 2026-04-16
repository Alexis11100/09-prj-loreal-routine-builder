export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle chat requests from the frontend.
    if (url.pathname === "/api/chat" && request.method === "POST") {
      return handleChatRequest(request, env);
    }

    // Serve static files for all other routes.
    return env.ASSETS.fetch(request);
  },
};

async function handleChatRequest(request, env) {
  try {
    const body = await request.json();
    const userMessage = (body.message || "").trim();

    if (!userMessage) {
      return jsonResponse(
        { reply: "Please ask a beauty question first." },
        400,
      );
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse(
        { reply: "OPENAI_API_KEY is not set in Worker secrets." },
        500,
      );
    }

    // Load product data so recommendations stay grounded in your catalog.
    const products = await loadProducts(env);
    const catalogText = products
      .slice(0, 30)
      .map(
        (p) =>
          `- ${p.name} (${p.brand || "L'Oreal"}): ${p.description || "No description provided."}`,
      )
      .join("\n");

    const systemMessage = `You are a helpful L'Oreal beauty routine assistant.
Use beginner-friendly language.
Prefer recommending products from this catalog when relevant:
${catalogText}`;

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
        }),
      },
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      return jsonResponse(
        { reply: "I had trouble generating your routine. Please try again." },
        502,
      );
    }

    const data = await openAIResponse.json();
    const reply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "I could not generate a response right now.";

    return jsonResponse({ reply });
  } catch (error) {
    console.error("Worker error:", error);
    return jsonResponse(
      { reply: "Server error while building your routine." },
      500,
    );
  }
}

async function loadProducts(env) {
  try {
    const productsRequest = new Request("https://local/products.json");
    const response = await env.ASSETS.fetch(productsRequest);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
