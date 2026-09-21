const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

console.log("ENV:", process.env.GEMINI_API_KEY ? "FOUND" : "NOT FOUND");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});


// Backend test
app.get("/api/test", (req, res) => {
    res.json({
        message: "Backend connected successfully!"
    });
});


// Gemini AI
app.post("/api/ask", async (req, res) => {

    try {

        const question = req.body.question;

        if (!question) {
            return res.status(400).json({
                error: "Question is required"
            });
        }

        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: question
        });

        res.json({
            answer: response.text
        });

    } catch (error) {

        console.error("Gemini Error:", error);

        res.status(500).json({
            error: error.message
        });

    }

});


// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});