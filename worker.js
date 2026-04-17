export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const userMessage = body.userMessage;

      const systemPrompt = `
You are a helpful beauty assistant for L’Oréal.
Only answer questions about:
- L’Oréal products
- Skincare, makeup, haircare, fragrances
- Beauty routines and recommendations
Politely refuse anything unrelated.
`;

      const ai = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ]
        })
      });

      const data = await ai.json();

      return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
