import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Game State
  const sessions: Record<string, any> = {};
  const users: Record<string, { id: string; role: string; name: string; sessionId?: string }> = {};

  // AI Integration
  const geminiKeyPrimary = process.env.GEMINI_API_KEY_PRIMARY;
  const geminiKeySecondary = process.env.GEMINI_API_KEY_SECONDARY;
  const openAIKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKeyPrimary && !geminiKeySecondary && !openAIKey && !groqKey) {
    console.warn("No AI API keys (Gemini, OpenAI, or Groq) are configured. AI evaluation will not work.");
  } else {
    const configured = [];
    if (groqKey) configured.push("Groq");
    if (openAIKey) configured.push("OpenAI");
    if (geminiKeyPrimary || geminiKeySecondary) configured.push("Gemini (Multi-key)");
    console.log(`AI configured for multiplayer: ${configured.join(", ")}`);
  }

  const genAIPrimary = geminiKeyPrimary ? new GoogleGenAI({ apiKey: geminiKeyPrimary }) : null;
  const genAISecondary = geminiKeySecondary ? new GoogleGenAI({ apiKey: geminiKeySecondary }) : null;
  const openai = new OpenAI({ apiKey: openAIKey || "dummy_key" });
  const groq = new Groq({ apiKey: groqKey || "dummy_key" });

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/ai-status", (req, res) => {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGeminiPrimary = !!process.env.GEMINI_API_KEY_PRIMARY;
    const hasGeminiSecondary = !!process.env.GEMINI_API_KEY_SECONDARY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    
    const configured = [];
    if (hasGroq) configured.push("Groq");
    if (hasOpenAI) configured.push("OpenAI");
    if (hasGeminiPrimary) configured.push("Gemini Primary");
    if (hasGeminiSecondary) configured.push("Gemini Secondary");

    res.json({ 
      connected: hasOpenAI || hasGeminiPrimary || hasGeminiSecondary || hasGroq,
      message: configured.length > 0 
        ? `${configured.join(", ")} Ready` 
        : "AI API key is missing"
    });
  });

  // Socket.IO Logic
  io.on("connection", (socket) => {
    console.log("Multiplayer User connected:", socket.id);

    socket.on("join_lobby", ({ name, role }) => {
      users[socket.id] = { id: socket.id, name, role };
      socket.emit("lobby_joined", { id: socket.id, name, role });
      io.emit("update_players", Object.values(users));
    });

    socket.on("create_session", ({ problem }) => {
      const sessionId = `session_${Date.now()}`;
      sessions[sessionId] = {
        id: sessionId,
        problem,
        founder: null,
        customer: socket.id,
        investor: null,
        pitch: "",
        feedback: [],
        deal: null,
        proposedDeal: null,
        proposerId: null,
        reviews: [],
        status: "pitching", // pitching, funding, launched, evaluated
        logs: [],
      };
      users[socket.id].sessionId = sessionId;
      socket.join(sessionId);
      socket.emit("session_created", sessions[sessionId]);
      io.emit("update_sessions", Object.values(sessions));
    });

    socket.on("join_session", ({ sessionId, role }) => {
      const session = sessions[sessionId];
      if (!session) return;

      if (role === "founder" && !session.founder) {
        session.founder = socket.id;
      } else if (role === "investor" && !session.investor) {
        session.investor = socket.id;
      }

      users[socket.id].sessionId = sessionId;
      socket.join(sessionId);
      io.to(sessionId).emit("session_updated", session);
      io.emit("update_sessions", Object.values(sessions));
    });

    socket.on("send_message", ({ sessionId, message }) => {
      const session = sessions[sessionId];
      if (!session) return;

      const user = users[socket.id];
      const logEntry = { sender: user.name, role: user.role, text: message, timestamp: Date.now() };
      session.logs.push(logEntry);
      io.to(sessionId).emit("new_message", logEntry);
    });

    socket.on("submit_pitch", ({ sessionId, pitch }) => {
      const session = sessions[sessionId];
      if (session && session.founder === socket.id) {
        session.pitch = pitch;
        session.status = "funding";
        session.logs.push({ sender: "System", role: "system", text: `Founder submitted pitch: ${pitch}`, timestamp: Date.now() });
        io.to(sessionId).emit("session_updated", session);
      }
    });

    socket.on("propose_deal", ({ sessionId, deal }) => {
      const session = sessions[sessionId];
      if (session && (session.founder === socket.id || session.investor === socket.id)) {
        session.proposedDeal = deal;
        session.proposerId = socket.id;
        const user = users[socket.id];
        session.logs.push({ 
          sender: "System", 
          role: "system", 
          text: `${user.name} proposed a deal: Valuation $${deal.valuation.toLocaleString()}, Equity ${deal.equity}%`, 
          timestamp: Date.now() 
        });
        io.to(sessionId).emit("session_updated", session);
      }
    });

    socket.on("accept_deal", ({ sessionId }) => {
      const session = sessions[sessionId];
      if (session && session.proposedDeal && session.proposerId !== socket.id) {
        if (socket.id === session.founder || socket.id === session.investor) {
          session.deal = session.proposedDeal;
          session.status = "launched";
          const user = users[socket.id];
          session.logs.push({ 
            sender: "System", 
            role: "system", 
            text: `${user.name} accepted the deal! Startup is launched.`, 
            timestamp: Date.now() 
          });
          io.to(sessionId).emit("session_updated", session);
        }
      }
    });

    socket.on("submit_review", ({ sessionId, review }) => {
      const session = sessions[sessionId];
      if (session) {
        session.reviews.push({ reviewer: users[socket.id].name, ...review });
        if (session.reviews.length >= 1) {
          session.status = "evaluating";
          io.to(sessionId).emit("session_updated", session);
          evaluateSession(sessionId);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      delete users[socket.id];
      io.emit("update_players", Object.values(users));
    });
  });

  async function evaluateSession(sessionId: string) {
    const session = sessions[sessionId];
    if (!session) return;

    try {
      const prompt = `
        Evaluate this startup journey simulation.
        Problem: ${session.problem}
        Pitch: ${session.pitch}
        Deal: ${JSON.stringify(session.deal)}
        Reviews: ${JSON.stringify(session.reviews)}
        Chat Logs: ${JSON.stringify(session.logs)}

        Return a JSON report with:
        - founderScore (0-100)
        - customerScore (0-100)
        - investorScore (0-100)
        - analysis (Detailed breakdown)
        - result (Success/Failure)
      `;

      let report;
      let usedFallback = false;

      // Try Groq first
      if (process.env.GROQ_API_KEY) {
        try {
          console.log("Evaluating with Groq...");
          const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          });
          report = JSON.parse(completion.choices[0].message.content || "{}");
        } catch (groqError: any) {
          console.error("Groq Evaluation failed, falling back:", groqError.message);
          usedFallback = true;
        }
      } else {
        usedFallback = true;
      }

      // Try OpenAI as first fallback
      if (usedFallback && process.env.OPENAI_API_KEY) {
        try {
          console.log("Evaluating with OpenAI...");
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          });
          report = JSON.parse(completion.choices[0].message.content || "{}");
          usedFallback = false;
        } catch (openaiError: any) {
          console.error("OpenAI Evaluation failed, falling back to Gemini:", openaiError.message);
          usedFallback = true;
        }
      }

      // Try Gemini as final fallback (with its own internal fallback)
      if (usedFallback) {
        const tryGemini = async (key: string, label: string) => {
          console.log(`Evaluating with ${label}...`);
          const genAI = new GoogleGenAI({ apiKey: key });
          const result = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          
          let text = result.text;
          if (text.startsWith("```json")) {
            text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
          } else if (text.startsWith("```")) {
            text = text.replace(/^```\n?/, "").replace(/\n?```$/, "");
          }
          return JSON.parse(text);
        };

        if (geminiKeyPrimary) {
          try {
            report = await tryGemini(geminiKeyPrimary, "Gemini Primary");
            usedFallback = false;
          } catch (e: any) {
            console.error("Gemini Primary failed:", e.message);
            if (geminiKeySecondary) {
              report = await tryGemini(geminiKeySecondary, "Gemini Secondary");
              usedFallback = false;
            } else {
              throw e;
            }
          }
        } else if (geminiKeySecondary) {
          report = await tryGemini(geminiKeySecondary, "Gemini Secondary");
          usedFallback = false;
        } else {
          throw new Error("All AI providers (OpenAI, Groq, Gemini) failed or were not configured.");
        }
      }

      if (!report || typeof report !== "object") {
        throw new Error("AI returned an invalid report format.");
      }

      session.report = report;
      session.status = "evaluated";
      io.to(sessionId).emit("session_updated", session);
    } catch (error: any) {
      console.error("AI Evaluation failed:", error);
      session.status = "error";
      session.error = error.message || "Unknown evaluation error";
      io.to(sessionId).emit("session_updated", session);
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
