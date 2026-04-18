/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");

/* Put your deployed Worker URL here */
const CLOUDFLARE_WORKER_URL =
  "https://09-prj-loreal-routine-builder.alexisbentley564.workers.dev/api";

/* Store products and selections in memory while the page is open */
let allProducts = [];
let currentFilteredProducts = [];
let selectedProducts = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  currentFilteredProducts = products;

  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found in this category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${isProductSelected(product.id) ? "selected" : ""}" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `,
    )
    .join("");
}

/* Return true if a product is already in the selected list */
function isProductSelected(productId) {
  return selectedProducts.some((product) => product.id === productId);
}

/* Draw selected items below the grid */
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="placeholder-message small">No products selected yet.</p>
    `;
    generateRoutineButton.disabled = true;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-pill">
        <span>${product.name}</span>
        <button type="button" class="remove-selected" data-remove-id="${product.id}" aria-label="Remove ${product.name}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `,
    )
    .join("");

  generateRoutineButton.disabled = false;
}

/* Toggle one product on/off when a card is clicked */
function toggleProductSelection(productId) {
  const product = allProducts.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  if (isProductSelected(productId)) {
    selectedProducts = selectedProducts.filter((item) => item.id !== productId);
  } else {
    selectedProducts.push(product);
  }

  renderSelectedProducts();
  displayProducts(currentFilteredProducts);
}

/* Add one message line into the chat window */
function addMessage(role, text) {
  const message = document.createElement("p");

  if (role === "user") {
    message.innerHTML = `<strong>You:</strong> ${text}`;
  } else {
    message.innerHTML = `<strong>AI:</strong> ${text}`;
  }

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Build a beginner-friendly summary of selected products for prompting */
function formatSelectedProductsForPrompt() {
  return selectedProducts
    .map((product, index) => {
      return `${index + 1}. ${product.brand} - ${product.name} (${product.category})\nDescription: ${product.description}`;
    })
    .join("\n\n");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

/* Handle clicking on product cards */
productsContainer.addEventListener("click", (e) => {
  const productCard = e.target.closest(".product-card");
  if (!productCard) {
    return;
  }

  const productId = Number(productCard.dataset.productId);
  toggleProductSelection(productId);
});

/* Handle removing products from selected list */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-selected");
  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.removeId);
  selectedProducts = selectedProducts.filter((item) => item.id !== productId);
  renderSelectedProducts();
  displayProducts(currentFilteredProducts);
});

/* Chat form submission handler with OpenAI API call */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) {
    return;
  }

  if (CLOUDFLARE_WORKER_URL.includes("YOUR_WORKER_URL")) {
    addMessage(
      "assistant",
      "Add your deployed Cloudflare Worker URL in script.js first.",
    );
    return;
  }

  addMessage("user", question);
  userInput.value = "";

  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: question,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.error?.message || data.error || "OpenAI request failed.";
      addMessage("assistant", `Error: ${errorMessage}`);
      return;
    }

    const aiReply = data.reply || "No reply returned from Worker.";
    addMessage("assistant", aiReply);
  } catch (error) {
    addMessage("assistant", "Network error. Check internet and try again.");
    console.error("Cloudflare Worker fetch error:", error);
  }
});

/* Create an AI routine from selected products */
generateRoutineButton.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addMessage("assistant", "Select at least one product first.");
    return;
  }

  if (CLOUDFLARE_WORKER_URL.includes("YOUR_WORKER_URL")) {
    addMessage(
      "assistant",
      "Add your deployed Cloudflare Worker URL in script.js first.",
    );
    return;
  }

  const routinePrompt = `I selected these L'Oréal products:\n\n${formatSelectedProductsForPrompt()}\n\nPlease create a simple personalized beauty routine using ONLY these products.\nFormat it with:\n- Morning Routine\n- Evening Routine\n- 2 short safety tips (patch test, sunscreen, etc.)\nKeep it concise and beginner-friendly.`;

  addMessage("user", "Generate a routine from my selected products.");

  generateRoutineButton.disabled = true;
  generateRoutineButton.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: routinePrompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data.error?.message || data.error || "OpenAI request failed.";
      addMessage("assistant", `Error: ${errorMessage}`);
      return;
    }

    const aiReply = data.reply || "No routine returned from Worker.";
    addMessage("assistant", aiReply);
  } catch (error) {
    addMessage("assistant", "Network error. Check internet and try again.");
    console.error("Routine generation fetch error:", error);
  } finally {
    generateRoutineButton.innerHTML =
      '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine';
    generateRoutineButton.disabled = selectedProducts.length === 0;
  }
});

/* Initialize selected area and disable routine button until at least one product is selected */
renderSelectedProducts();
