const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

console.log(
    "GEMINI ENV:",
    process.env.GEMINI_API_KEY ? "FOUND" : "NOT FOUND"
);

console.log(
    "ELEVENLABS ENV:",
    process.env.ELEVENLABS_API_KEY ? "FOUND" : "NOT FOUND"
);

const app = express();

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);


// -----------------------------
// GEMINI AI
// -----------------------------

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// -----------------------------
// ELEVENLABS AI VOICE
// -----------------------------

const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
});


// -----------------------------
// CONVERSATION MEMORY
// -----------------------------

let conversationHistory = [];


// -----------------------------
// HOME PAGE
// -----------------------------

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../frontend/index.html"
        )
    );

});


// -----------------------------
// BACKEND TEST
// -----------------------------

app.get("/api/test", (req, res) => {

    res.json({
        message:
            "Backend connected successfully!"
    });

});


// -----------------------------
// GEMINI AI
// -----------------------------

app.post("/api/ask", async (req, res) => {

    try {

        const question =
            req.body.question;


        if (!question) {

            return res.status(400).json({
                error:
                    "Question is required"
            });

        }


        // -----------------------------
        // ADD USER MESSAGE TO MEMORY
        // -----------------------------

        conversationHistory.push({
            role: "user",
            text: question
        });


        // -----------------------------
        // CREATE CONVERSATION PROMPT
        // -----------------------------

        const conversation =
            conversationHistory
                .map(message => {

                    return (
                        message.role +
                        ": " +
                        message.text
                    );

                })
                .join("\n");


        // -----------------------------
        // SEND TO GEMINI
        // -----------------------------

        const response =
            await ai.models.generateContent({

                model:
                    "gemini-3.8-flash",

                contents:
                    conversation

            });


        const answer =
            response.text;


        // -----------------------------
        // ADD AI RESPONSE TO MEMORY
        // -----------------------------

        conversationHistory.push({
            role: "assistant",
            text: answer
        });


        // -----------------------------
        // SEND RESPONSE
        // -----------------------------

        res.json({
            answer: answer
        });


    } catch (error) {

        console.error(
            "Gemini Error:",
            error
        );


        res.status(500).json({
            error:
                error.message
        });

    }

});


// -----------------------------
// ELEVENLABS TEXT TO SPEECH
// -----------------------------

app.post("/api/speak", async (req, res) => {

    try {

        const text = req.body.text;


        if (!text) {

            return res.status(400).json({
                error:
                    "Text is required"
            });

        }


        console.log(
            "ElevenLabs speaking:",
            text
        );


        const audio =
            await elevenlabs.textToSpeech.convert(

                // Voice ID
                process.env.ELEVENLABS_VOICE_ID,

                {
                    text: text,

                    modelId:
                        "eleven_multilingual_v2",

                    outputFormat:
                        "mp3_44100_128"
                }

            );


        const chunks = [];


        for await (const chunk of audio) {

            chunks.push(chunk);

        }


        const audioBuffer =
            Buffer.concat(chunks);


        res.set({
            "Content-Type":
                "audio/mpeg",

            "Content-Length":
                audioBuffer.length
        });


        res.send(audioBuffer);


    } catch (error) {

        console.error(
            "ElevenLabs Error:",
            error
        );


        res.status(500).json({
            error:
                "ElevenLabs voice generation failed"
        });

    }

});


// -----------------------------
// CLEAR MEMORY
// -----------------------------

app.post(
    "/api/clear-memory",
    (req, res) => {

        conversationHistory = [];


        console.log(
            "Conversation memory cleared"
        );


        res.json({
            message:
                "Conversation memory cleared successfully"
        });

    }
);


// -----------------------------
// SERVER
// -----------------------------

const PORT =
    process.env.PORT || 5000;


app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);
app.post("/api/speak", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                error: "Text is required"
            });
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
            {
                method: "POST",
                headers: {
                    "xi-api-key": process.env.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2"
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.log("ElevenLabs Error:", error);

            return res.status(response.status).json({
                error: "ElevenLabs request failed"
            });
        }

        const audioBuffer = Buffer.from(
            await response.arrayBuffer()
        );

        res.set("Content-Type", "audio/mpeg");
        res.send(audioBuffer);

    } catch (error) {
        console.error("Speech Error:", error);

        res.status(500).json({
            error: "Failed to generate speech"
        });
    }
});