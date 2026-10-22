const {execFile} = require("child_process");
const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

require("dotenv").config({
  path: path.join(__dirname, ".env")
});

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

// ===============================
// AI CLIENTS
// ===============================

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const elevenlabs = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;

// ===============================
// CONVERSATION MEMORY
// ===============================

let conversationHistory = [];

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connected successfully!" });
});

// ===============================
// GEMINI PRIMARY + OPENROUTER BACKUP
// ===============================
app.post("/api/open-app", (req, res) => {
    const appName = String(req.body.app || "").toLowerCase();

    const apps = {
        whatsapp: {
            command: "explorer.exe",
            args: ["shell:AppsFolder"]
        },
        vscode: {
            command: "cmd.exe",
            args: ["/c", "start", "", "code"]
        }
    };

    if (appName === "whatsapp") {
    execFile(
        "cmd.exe",
        ["/c", "start", "", "whatsapp://"],
        (error) => {
            if (error) {
                return res.status(500).json({
                    error: "WhatsApp launch nahi hua. Check karo ki WhatsApp Desktop installed hai."
                });
            }

            return res.json({
                message: "WhatsApp khol raha hoon."
            });
        }
    );

    return;
}

    const app = apps[appName];

    if (!app) {
        return res.status(400).json({ error: "App not supported" });
    }

    execFile(app.command, app.args, (error) => {
        if (error) {
            return res.status(500).json({
                error: "App could not be opened. Check whether it is installed."
            });
        }

        res.json({ message: "Opening " + appName });
    });
});

app.post("/api/ask", async (req, res) => {
  try {
    const question = req.body?.question?.trim();

    if (!question) {
      return res.status(400).json({
        error: "Question is required"
      });
    }

    // Keep memory limited
    conversationHistory.push({
      role: "user",
      text: question
    });

    conversationHistory = conversationHistory.slice(-20);

    const conversation = conversationHistory
      .map(message => `${message.role}: ${message.text}`)
      .join("\n");

    let answer;

    // 1. Try Gemini first
    try {
      if (!ai) {
        throw new Error("GEMINI_API_KEY is missing");
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: conversation
      });

      answer = response.text;

      if (!answer) {
        throw new Error("Gemini returned an empty answer");
      }

      console.log("AI used: Gemini");
    } catch (geminiError) {
      console.error(
        "Gemini failed; trying OpenRouter:",
        geminiError.message
      );

      // 2. Use OpenRouter as backup
      if (
        !process.env.OPENROUTER_API_KEY ||
        !process.env.OPENROUTER_MODEL
      ) {
        throw new Error(
          "OpenRouter settings missing. Check backend/.env"
        );
      }

      const messages = conversationHistory.map(message => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.text
      }));

      const fallbackResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL,
            messages
          })
        }
      );

      const fallbackData = await fallbackResponse.json();

      if (!fallbackResponse.ok) {
        throw new Error(
          fallbackData.error?.message || "OpenRouter request failed"
        );
      }

      answer = fallbackData.choices?.[0]?.message?.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("OpenRouter returned an empty answer");
      }

      console.log("AI used: OpenRouter");
    }

    conversationHistory.push({
      role: "assistant",
      text: answer
    });

    conversationHistory = conversationHistory.slice(-20);

    return res.json({ answer });
  } catch (error) {
    console.error("AI Error:", error.message);

    return res.status(500).json({
      error: "AI request failed. Check server terminal and API settings."
    });
  }
});

// ===============================
// ELEVENLABS TEXT-TO-SPEECH
// ===============================

app.post("/api/speak", async (req, res) => {
  try {
    const text = req.body?.text;

    if (!text) {
      return res.status(400).json({
        error: "Text is required"
      });
    }

    if (!elevenlabs) {
      return res.status(503).json({
        error: "ELEVENLABS_API_KEY is missing"
      });
    }

    const audio = await elevenlabs.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID,
      {
        text,
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128"
      }
    );

    const chunks = [];

    for await (const chunk of audio) {
      chunks.push(Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length
    });

    return res.send(audioBuffer);
  } catch (error) {
    console.error("ElevenLabs Error:", error.message);

    return res.status(500).json({
      error: "ElevenLabs voice generation failed"
    });
  }
});

// ===============================
// CLEAR CONVERSATION MEMORY
// ===============================

app.post("/api/clear-memory", (req, res) => {
  conversationHistory = [];

  console.log("Conversation memory cleared");

  res.json({
    message: "Conversation memory cleared successfully"
  });
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Gemini key:", process.env.GEMINI_API_KEY ? "FOUND" : "MISSING");
  console.log("OpenRouter key:", process.env.OPENROUTER_API_KEY ? "FOUND" : "MISSING");
  console.log("ElevenLabs key:", process.env.ELEVENLABS_API_KEY ? "FOUND" : "MISSING");
});