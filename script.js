// -----------------------------
// ELEMENTS
// -----------------------------

const micBtn = document.getElementById("micBtn");
const sendBtn = document.getElementById("sendBtn");

const commandInput = document.getElementById("commandInput");

const userText = document.getElementById("userText");
const assistantText = document.getElementById("assistantText");

const status = document.getElementById("status");


// -----------------------------
// SPEECH RECOGNITION
// -----------------------------

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.continuous = false;

    recognition.interimResults = false;

} else {

    alert("Speech Recognition is not supported in this browser.");

}


// -----------------------------
// MICROPHONE BUTTON
// -----------------------------

micBtn.addEventListener("click", () => {

    if (!recognition) {
        return;
    }

    status.innerText = "Listening... 🎤";

    micBtn.innerText = "Listening...";

    recognition.start();

});


// -----------------------------
// SPEECH RESULT
// -----------------------------

if (recognition) {

    recognition.onresult = (event) => {

        const command =
            event.results[0][0].transcript;

        userText.innerText = command;

        micBtn.innerText = "🎤 Start Listening";

        status.innerText = "Command received";

        processCommand(command);

    };


    recognition.onerror = (event) => {

        console.log(event.error);

        status.innerText =
            "Sorry, I couldn't understand.";

        micBtn.innerText =
            "🎤 Start Listening";

    };


    recognition.onend = () => {

        micBtn.innerText =
            "🎤 Start Listening";

    };

}


// -----------------------------
// COMMAND PROCESSOR
// -----------------------------

function processCommand(command) {

    command = command.toLowerCase().trim();


    // YouTube
    if (command.includes("open the youtube")) {

        speak("Opening YouTube");

        window.open(
            "https://www.youtube.com",
            "_blank"
        );

    }


    // Google
    else if (command.includes("open whatsapp")) {

        speak("Opening whatsapp");
        speak("Opening whatsapp")

        window.open(
            "https://web.whatsapp.com",
            "_blank"
        );

    }


    // Time
    else if (command.includes("time")) {

        const now = new Date();

        const time =
            now.toLocaleTimeString();

        speak(
            "The current time is " + time
        );

    }


    // Date
    else if (command.includes("date") ) {

        const now = new Date();

        const date =
            now.toLocaleDateString();

        speak(
            "Today's date is " + date
        );

    }


    // Hello
    else if (
        command.includes("hello") ||
        command.includes("hi")
    ) {

        speak(
            "Hello! How can I help you?"
        );

    }

    else if (
        command.includes("what is your name") || 
        command.includes("what's your name") 
 
        
    ) {
        speak("My name is Ayva , your personal voice assistant");
    }


    // Unknown command
    else {
        askGemini(command);

    }

}
// -----------------------------
// GEMINI AI
// -----------------------------

async function askGemini(question) {

    status.innerText = "Thinking... 🤖";

    try {

        const response = await fetch("/api/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question
            })
        });

        const data = await response.json();

        console.log("Gemini Response:", data);

        if (data.answer) {
            status.innerText = "Answer ready";
            speak(data.answer);
        } else {
            status.innerText = "Gemini Error";
            speak(data.error || "Gemini did not return an answer.");
        }

    } catch (error) {

        console.error("Gemini Error:", error);

        speak("Sorry, there was a problem connecting to Gemini.");

    }
}


// -----------------------------
// TEXT COMMAND
// -----------------------------

sendBtn.addEventListener("click", () => {

    const command =
        commandInput.value.trim();

    if (command === "") {
        return;
    }

    userText.innerText = command;

    processCommand(command);

    commandInput.value = "";

});


// -----------------------------
// TEXT TO SPEECH
// -----------------------------

function speak(text) {

    assistantText.innerText = text;

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-IN";
    speech.rate = 0.95;
    speech.pitch = 1.2;

    const voices = window.speechSynthesis.getVoices();

    const femaleVoice = voices.find(voice =>
        voice.lang.startsWith("en") &&
        /female|zira|samantha|google uk english female/i.test(voice.name)
    );

    if (femaleVoice) {
        speech.voice = femaleVoice;
    }

    window.speechSynthesis.speak(speech);
}


// -----------------------------
// BACKEND CONNECTION TEST
// -----------------------------

fetch("/api/test")
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
    })
    .catch(error => {
        console.error("Backend connection failed:", error);
    });
    