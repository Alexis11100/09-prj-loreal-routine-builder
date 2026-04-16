const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatWindow = document.getElementById("chat-window");

// Replace with your deployed Cloudflare Worker URL
const WORKER_URL = "https://YOUR_WORKER_URL_HERE";

function appendMessage(role, text) {
  const msg = document.createElement("div");
  msg.classList.add("message");
  msg.classList.add(role === "user" ? "user" : "assistant");
  msg.textContent = text;
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessageToWorker(message) {
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      console.error("Worker error:", response.status, response.statusText);
      return "Sorry, I’m having trouble reaching the beauty assistant right now.";
    }

    const data = await response.json();
    return data.reply || "Sorry, I couldn’t generate a response.";
  } catch (error) {
    console.error("Network error:", error);
    return "Sorry, something went wrong while contacting the beauty assistant.";
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  // Show user message
  appendMessage("user", message);
  userInput.value = "";

  // Temporary assistant "typing" message
  const typingMsg = document.createElement("div");
  typingMsg.classList.add("message", "assistant");
  typingMsg.textContent = "Thinking about the best L'Oréal recommendation for you...";
  chatWindow.appendChild(typingMsg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Get AI reply from Worker
  const reply = await sendMessageToWorker(message);

  // Replace typing message with real reply
  chatWindow.removeChild(typingMsg);
  appendMessage("assistant", reply);
});
