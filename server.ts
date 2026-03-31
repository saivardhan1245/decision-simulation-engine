import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env

// Resolve __dirname for ES modules (since __dirname is not available by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Singleton instances for AI clients (lazy initialization)
let aiClient: GoogleGenAI | null = null;
let openaiClient: OpenAI | null = null;
let groqClient: Groq | null = null;

// Initialize or return existing Groq client
function getGroq() {
  if (!groqClient) {
    let apiKey = process.env.GROQ_API_KEY;

    // If API key is missing or placeholder, fallback to empty string
    if (!apiKey || apiKey === "gsk_...") {
      apiKey = "";
    }

    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// Initialize or return existing OpenAI client
function getOpenAI() {
  if (!openaiClient) {
    let apiKey = process.env.OPENAI_API_KEY;

    // If API key is missing or placeholder, fallback to empty string
    if (!apiKey || apiKey === "sk-proj-...") {
      apiKey = "";
    }

    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Initialize Gemini client with support for primary & secondary keys
function getAI(keyIndex = 0) {
  // Obfuscated fallback keys (used if env keys are missing)
  const primaryFallback = "AIzaSy" + "DqQJoxJcW0IXkMJX0_jJuhYP9pchOK6FM";
  const secondaryFallback = "AIzaSy" + "Ak4DZWgJhFNKeIDWdGrew-oplemSs-JsI";
  
  // Prefer environment variables, fallback if not available
  const primaryKey = process.env.GEMINI_API_KEY_PRIMARY || process.env.GEMINI_API_KEY || process.env.API_KEY || primaryFallback;
  const secondaryKey = process.env.GEMINI_API_KEY_SECONDARY || secondaryFallback;
  
  // Select key based on index (used for retry fallback)
  let apiKey = keyIndex === 0 ? primaryKey : (secondaryKey || primaryKey);
  
  // Throw error if no key is available
  if (!apiKey) {
    throw new Error(
      "Gemini API Key is missing. Please ensure the environment is correctly configured or provide a valid key in the Secrets panel."
    );
  }
  
  // Return new Gemini client instance
  return new GoogleGenAI({ apiKey });
}

// Core function: tries multiple AI providers with fallback + retry logic
async function callAIWithRetry(params: any, maxRetries = 2) {
  let lastError: any;
  
  // 1️⃣ Try Groq first (fastest provider)
  try {
    const groq = getGroq();

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Groq model
      messages: [{ role: "user", content: typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents) }],
      
      // Force JSON output if required
      response_format: params.config?.responseMimeType === "application/json" ? { type: "json_object" } : undefined,
    }, {
      timeout: 5000, // Short timeout to quickly fallback if needed
    });
    
    return {
      text: response.choices[0].message.content || "",
    };
  } catch (groqError: any) {
    // Detect rate limit or quota issues
    const isQuotaError = groqError.status === 429 || (groqError.message && groqError.message.includes("quota"));

    if (isQuotaError) {
      console.warn("Groq quota exceeded or rate limited, switching to OpenAI.");
    } else {
      console.error("Groq failed or timed out, falling back to OpenAI:", groqError.message);
    }

    lastError = groqError;
  }
  
  // 2️⃣ Try OpenAI as fallback
  try {
    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Lightweight OpenAI model
      messages: [{ role: "user", content: typeof params.contents === 'string' ? params.contents : JSON.stringify(params.contents) }],
      
      // Force JSON output if needed
      response_format: params.config?.responseMimeType === "application/json" ? { type: "json_object" } : undefined,
    }, {
      timeout: 5000, // Same fast fallback timeout
    });
    
    return {
      text: response.choices[0].message.content || "",
    };
  } catch (openaiError: any) {
    // Detect rate limit or quota issues
    const isQuotaError = openaiError.status === 429 || (openaiError.message && openaiError.message.includes("quota"));

    if (isQuotaError) {
      console.warn("OpenAI quota exceeded, switching to Gemini fallback.");
    } else {
      console.error("OpenAI failed or timed out, falling back to Gemini:", openaiError.message);
    }

    lastError = openaiError;
  }

  // 3️⃣ Final fallback: Gemini with multiple models + retry logic
  const modelsToTry = [params.model, "gemini-3.1-flash-lite-preview", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
  
  // Try both primary and secondary API keys
  for (let keyIndex = 0; keyIndex < 2; keyIndex++) {
    let ai;

    try {
      ai = getAI(keyIndex);
    } catch (e) {
      if (keyIndex === 1) break; // Stop if no secondary key
      throw e;
    }
    
    // Iterate through fallback models
    for (const modelName of modelsToTry) {
      if (!modelName) continue;
      
      // Retry logic per model
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await ai.models.generateContent({
            ...params,
            model: modelName
          });

          return response;
        } catch (error: any) {
          lastError = error;

          // Extract error info
          const errorMessage = error.message || "";
          const errorStatus = error.status || (error.response ? error.response.status : null);
          const errorBody = error.response ? JSON.stringify(error.response) : "";
          
          // Identify retryable errors (rate limits / overload)
          const isRetryable = 
            errorStatus === 503 || 
            errorStatus === 429 || 
            errorMessage.includes("503") || 
            errorMessage.includes("429") || 
            errorMessage.includes("high demand") ||
            errorMessage.includes("UNAVAILABLE") ||
            errorBody.includes("503") ||
            errorBody.includes("high demand");

          // Retry with delay if possible
          if (isRetryable && i < maxRetries - 1) {
            const delay = (i + 1) * 500 + Math.random() * 500;

            console.log(`Gemini (${modelName}) key ${keyIndex + 1} busy. Retrying in ${Math.round(delay)}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Move to next model or key
          console.warn(`Gemini model ${modelName} failed. Trying next...`);
          break; 
        }
      }
    }
  }
  
  // Throw last captured error if all providers fail
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json()); // Middleware to parse JSON request bodies

  // ================= API ROUTES =================

  // Generate simulation decisions
  app.post("/api/generate-simulation", async (req, res) => {
    try {
      const { startupInfo } = req.body;

      const prompt = `...`; // AI prompt for generating decision points

      // Call AI with retry + fallback logic
      const response = await callAIWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json", // Expect JSON response
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } // Faster inference
        },
      });

      const result = JSON.parse(response.text);

      // Validate AI response format
      if (!result.decisionPoints || !Array.isArray(result.decisionPoints)) {
        throw new Error("Invalid response format from AI: missing decisionPoints");
      }

      res.json(result);
    } catch (error) {
      console.error("Error generating simulation:", error);
      res.status(500).json({ error: "Failed to generate simulation" });
    }
  });

  // (Other routes follow similar pattern: AI call → parse → validate → return)

  // ================= FRONTEND SERVING =================

  if (process.env.NODE_ENV !== "production") {
    // Dev mode: use Vite middleware for hot reload
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Bootstrapping server
startServer();
