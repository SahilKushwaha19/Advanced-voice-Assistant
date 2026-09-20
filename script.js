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
    else if (command.includes("open google")) {

        speak("Opening Google");

        window.open(
            "https://www.google.com",
            "_blank"
        );

    }


    // WhatsApp
    else if (command.includes("open whatsapp")) {

        speak("Opening WhatsApp");

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
        command.includes("what's your name") || 
        command.includes("tumhara name") 
        
    ) {
        speak("My name is Ayva , your personal voice assistant");
    }


    // Unknown command
    else {

        speak(
            "Sorry, I don't understand this command yet."
        );

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

    const speech =
        new SpeechSynthesisUtterance(text);

    speech.lang = "en-IN";

    speech.rate = 1;

    speech.pitch = 1;

    window.speechSynthesis.speak(
        speech
    );

}