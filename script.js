// DOM references
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatArea = document.getElementById("chat-area");

// Your Cloudflare Worker URL
const WORKER_URL = "https://09-prj-loreal-routine-builder.alexisbentley564.workers.dev/";

// Add message to chat
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.classList.add("message", sender);
    div.textContent = text;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Handle form submit
chatForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    userInput.value = "";

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userMessage: message })
        });

        const data = await response.json();
        addMessage(data.reply, "assistant");

    } catch (error) {
        addMessage("Network error. Please try again.", "assistant");
    }
});
