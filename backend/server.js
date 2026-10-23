const db = require("./db");
const { execFile } = require("child_process");
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

// ===============================
// HOME + TEST ROUTES
// ===============================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend connected successfully!"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

    res.json({
      success: true,
      message: "Ava AI MySQL connected successfully!",
      database: "ava_ai",
      result: rows[0]
    });
  } catch (error) {
    console.error("Database error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

// ===============================
// CHAT HISTORY APIs
// ===============================

// Get the latest 100 saved conversations
app.get("/api/history", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, user_input, assistant_reply,
             command_type, created_at
      FROM command_history
      ORDER BY id DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      history: rows
    });
  } catch (error) {
    console.error("Load history error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load chat history"
    });
  }
});

// Manually save a conversation if needed
app.post("/api/history", async (req, res) => {
  try {
    const { user_input, assistant_reply, command_type } =
      req.body || {};

    if (
      typeof user_input !== "string" ||
      !user_input.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "user_input is required"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO command_history
       (user_input, assistant_reply, command_type)
       VALUES (?, ?, ?)`,
      [
        user_input.trim(),
        typeof assistant_reply === "string"
          ? assistant_reply
          : null,
        typeof command_type === "string"
          ? command_type.slice(0, 50)
          : "general"
      ]
    );

    res.status(201).json({
      success: true,
      message: "Chat saved successfully",
      id: result.insertId
    });
  } catch (error) {
    console.error("Save history error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not save chat history"
    });
  }
});

// ===============================
// NOTES APIs
// ===============================

// Get saved notes
app.get("/api/notes", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT id, title, content, created_at, updated_at
      FROM notes
      ORDER BY id DESC
      LIMIT 200
    `);

    res.json({
      success: true,
      notes: rows
    });
  } catch (error) {
    console.error("Load notes error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load notes"
    });
  }
});

// Create a note
app.post("/api/notes", async (req, res) => {
  try {
    const { title, content } = req.body || {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Both title and content are required"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO notes (title, content)
       VALUES (?, ?)`,
      [title.trim(), content.trim()]
    );

    res.status(201).json({
      success: true,
      message: "Note saved successfully",
      id: result.insertId
    });
  } catch (error) {
    console.error("Save note error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not save note"
    });
  }
});

// Update a note
app.put("/api/notes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, content } = req.body || {};

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid id, title and content are required"
      });
    }

    const [result] = await db.execute(
      `UPDATE notes
       SET title = ?, content = ?
       WHERE id = ?`,
      [title.trim(), content.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    res.json({
      success: true,
      message: "Note updated successfully"
    });
  } catch (error) {
    console.error("Update note error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not update note"
    });
  }
});

// Delete a note
app.delete("/api/notes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid note id"
      });
    }

    const [result] = await db.execute(
      "DELETE FROM notes WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found"
      });
    }

    res.json({
      success: true,
      message: "Note deleted successfully"
    });
  } catch (error) {
    console.error("Delete note error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not delete note"
    });
  }
});

// ===============================
// OPEN DESKTOP APPS
// ===============================

app.post("/api/open-app", (req, res) => {
  const appName = String(req.body?.app || "").toLowerCase();

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

  const appConfig = apps[appName];

  if (!appConfig) {
    return res.status(400).json({
      error: "App not supported"
    });
  }

  execFile(appConfig.command, appConfig.args, (error) => {
    if (error) {
      return res.status(500).json({
        error: "App could not be opened. Check whether it is installed."
      });
    }

    res.json({
      message: "Opening " + appName
    });
  });
});

// ===============================
// GEMINI PRIMARY + OPENROUTER BACKUP
// ===============================

app.post("/api/ask", async (req, res) => {
  try {
    const question =
      typeof req.body?.question === "string"
        ? req.body.question.trim()
        : "";

    if (!question) {
      return res.status(400).json({
        error: "Question is required"
      });
    }

    // Add user message to temporary conversation memory
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

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("Gemini returned an empty answer");
      }

      answer = answer.trim();

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
        role: message.role,
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
          fallbackData.error?.message ||
          "OpenRouter request failed"
        );
      }

      answer = fallbackData.choices?.[0]?.message?.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("OpenRouter returned an empty answer");
      }

      answer = answer.trim();

      console.log("AI used: OpenRouter");
    }

    // Add AI reply to temporary conversation memory
    conversationHistory.push({
      role: "assistant",
      text: answer
    });

    conversationHistory = conversationHistory.slice(-20);

    // Automatically save this conversation to MySQL.
    // A database error must not prevent the AI reply.
    try {
      await db.execute(
        `INSERT INTO command_history
         (user_input, assistant_reply, command_type)
         VALUES (?, ?, ?)`,
        [question, answer, "general"]
      );
    } catch (dbError) {
      console.error(
        "Chat could not be saved:",
        dbError.message
      );
    }

    return res.json({
      answer
    });
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

    if (typeof text !== "string" || !text.trim()) {
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
        text: text.trim(),
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
// CLEAR TEMPORARY CONVERSATION MEMORY
// ===============================

app.post("/api/clear-memory", (req, res) => {
  conversationHistory = [];

  console.log("Conversation memory cleared");

  res.json({
    message: "Conversation memory cleared successfully"
  });
});

// ===============================
// START SERVER + LOAD RECENT MEMORY
// ===============================

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Load recent saved chats as AI context on startup.
  // Server still starts if MySQL is temporarily unavailable.
  try {
    const [rows] = await db.execute(`
      SELECT user_input, assistant_reply
      FROM command_history
      ORDER BY id DESC
      LIMIT 10
    `);

    conversationHistory = rows.reverse().flatMap(row => {
      const messages = [];

      if (row.user_input) {
        messages.push({
          role: "user",
          text: row.user_input
        });
      }

      if (row.assistant_reply) {
        messages.push({
          role: "assistant",
          text: row.assistant_reply
        });
      }

      return messages;
    }).slice(-20);

    console.log("Recent chat history loaded from MySQL");
  } catch (error) {
    console.error(
      "Could not load saved chat history:",
      error.message
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(
      "Gemini key:",
      process.env.GEMINI_API_KEY ? "FOUND" : "MISSING"
    );
    console.log(
      "OpenRouter key:",
      process.env.OPENROUTER_API_KEY ? "FOUND" : "MISSING"
    );
    console.log(
      "ElevenLabs key:",
      process.env.ELEVENLABS_API_KEY ? "FOUND" : "MISSING"
    );
  });
}

startServer();