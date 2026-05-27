import { Orchestrator } from "./core/orchestrator/index.js";
import { HealerSDK } from "./sdk/healer.js";
import { logger } from "./utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

// If the API key is a placeholder, mock the HealerSDK completion for the demo
const hasRealKey = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("placeholder");

if (!hasRealKey) {
  logger.info("------------------------------------------------------------------------");
  logger.info("ℹ️ INFO: GROQ_API_KEY is not set or is still a placeholder.");
  logger.info("ℹ️ Running in Agent-Simulation Mode to demonstrate the validation loop.");
  logger.info("------------------------------------------------------------------------");

  // Mock standard LLM completions for demo cases
  HealerSDK.prototype.generateCompletion = async function (systemPrompt, userPrompt, jsonMode) {
    // Handle Case 1: checkout place order button
    if (userPrompt.includes("submit-btn")) {
      return JSON.stringify({
        suggestions: [
          {
            locator: "button[data-testid=\"place-order-button\"]",
            confidence: 0.98,
            reasoning: "The button ID changed from 'submit-btn' to 'place-order-new', but it contains a highly stable test attribute 'data-testid=\"place-order-button\"'."
          },
          {
            locator: "button#place-order-new",
            confidence: 0.90,
            reasoning: "Alternative CSS selector using tag and the updated ID."
          }
        ]
      });
    }

    // Handle Case 2: login authentication link
    if (userPrompt.includes("btn-login")) {
      return JSON.stringify({
        suggestions: [
          {
            locator: "a[href=\"/login\"]",
            confidence: 0.95,
            reasoning: "The link class changed from 'btn-login' to 'nav-link auth-btn', but the target endpoint href='/login' and text 'Sign In / Log In' are stable."
          }
        ]
      });
    }

    // Fallback default mock
    return JSON.stringify({
      suggestions: [
        {
          locator: ".main-action",
          confidence: 0.85,
          reasoning: "Healed by targeting the generic main-action class."
        }
      ]
    });
  };
} else {
  logger.info("------------------------------------------------------------------------");
  logger.info(`🔥 RUNNING LIVE DEMO against Google Gemma-2 on Groq API (${process.env.GROQ_MODEL})`);
  logger.info("------------------------------------------------------------------------");
}

async function runDemo() {
  const orchestrator = new Orchestrator();

  // ==========================================
  // CASE 1: Place Order Button ID / Text Shift
  // ==========================================
  const htmlContext1 = `
  <!DOCTYPE html>
  <html>
  <head><title>Mock Checkout Page</title></head>
  <body>
    <div class="checkout-container">
      <h1>Checkout Page</h1>
      <div class="cart-items">
        <p>Item 1: Modern Laptop - $1200</p>
      </div>
      <div class="actions">
        <a href="/cart" class="btn btn-secondary back-btn">Go Back</a>
        <!-- The button below used to be: <button id="submit-btn" class="btn btn-primary">Place Order</button> -->
        <!-- It has now shifted to: -->
        <button id="place-order-new" class="btn btn-primary main-action" data-testid="place-order-button" name="checkout_submit">Complete Purchase</button>
      </div>
    </div>
  </body>
  </html>
  `;

  logger.info("\n🚀 RUNNING CASE 1: Place Order Button healing...");
  const result1 = await orchestrator.heal(
    "button#submit-btn",
    {
      tagName: "BUTTON",
      text: "Place Order",
      attributes: {
        id: "submit-btn",
        class: "btn btn-primary"
      }
    },
    htmlContext1
  );

  console.log("\n🎯 CASE 1 RESULT:");
  console.log(JSON.stringify(result1, null, 2));


  // ==========================================
  // CASE 2: Login Link Class & Text shift
  // ==========================================
  const htmlContext2 = `
  <!DOCTYPE html>
  <html>
  <head><title>Mock Home Page</title></head>
  <body>
    <nav class="navbar">
      <div class="logo">Self-Healer App</div>
      <div class="nav-links">
        <a href="/" class="nav-link">Home</a>
        <a href="/about" class="nav-link">About</a>
        <!-- The link below used to be: <a href="/login" class="btn btn-login">Sign In</a> -->
        <!-- It has now shifted to: -->
        <a href="/login" class="nav-link auth-btn">Sign In / Log In</a>
      </div>
    </nav>
  </body>
  </html>
  `;

  logger.info("\n🚀 RUNNING CASE 2: Login Authentication Link healing...");
  const result2 = await orchestrator.heal(
    "a.btn-login",
    {
      tagName: "A",
      text: "Sign In",
      attributes: {
        class: "btn btn-login",
        href: "/login"
      }
    },
    htmlContext2
  );

  console.log("\n🎯 CASE 2 RESULT:");
  console.log(JSON.stringify(result2, null, 2));
}

runDemo().catch(err => {
  logger.error(`Demo execution crashed: ${err.message}`);
});
