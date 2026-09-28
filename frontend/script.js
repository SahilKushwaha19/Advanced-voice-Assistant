// =====================================================
// AVA AI - V3
// STEP 5 + STEP 6 + STEP 7
// Tools + Natural Voice + Wake Word
// =====================================================


// =====================================================
// ELEMENTS
// =====================================================

const micBtn =
    document.getElementById("micBtn");

const sendBtn =
    document.getElementById("sendBtn");

const commandInput =
    document.getElementById("commandInput");

const userText =
    document.getElementById("userText");

const assistantText =
    document.getElementById("assistantText");

const status =
    document.getElementById("status");


// =====================================================
// SPEECH RECOGNITION
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition;

let isListening = false;
let isSpeaking = false;


// =====================================================
// CONVERSATION STATE
// =====================================================

let conversationActive = false;


// =====================================================
// STEP 7
// WAKE WORD
// =====================================================

const wakeWord =
    "hey ava";

let wakeWordEnabled = true;


// When true, Ava is waiting for "Hey Ava"
let waitingForWakeWord = true;


// =====================================================
// CREATE SPEECH RECOGNITION
// =====================================================

if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "en-IN";

    recognition.continuous =
        true;

    recognition.interimResults =
        true;

} else {

    alert(
        "Speech Recognition is not supported in this browser."
    );

}


// =====================================================
// START LISTENING
// =====================================================

function startListening() {

    if (!recognition) {
        return;
    }


    if (isListening) {
        return;
    }


    try {

        status.innerText =
            conversationActive
                ? "Listening... 🎤"
                : "Waiting for Hey Ava... 🎤";


        micBtn.innerText =
            conversationActive
                ? "Stop Listening"
                : "Wake Word Active";


        isListening = true;


        recognition.start();

    } catch (error) {

        console.log(
            "Recognition start error:",
            error
        );

    }

}


// =====================================================
// STOP LISTENING
// =====================================================

function stopListening() {

    if (!recognition) {
        return;
    }


    try {

        recognition.stop();

    } catch (error) {

        console.log(
            "Recognition stop error:",
            error
        );

    }


    isListening = false;


    micBtn.innerText =
        "🎤 Start Listening";

}


// =====================================================
// ACTIVATE AVA
// =====================================================

function activateAva() {

    conversationActive =
        true;

    waitingForWakeWord =
        false;


    status.innerText =
        "Ava activated 🎤";


    micBtn.innerText =
        "Stop Listening";

}


// =====================================================
// DEACTIVATE AVA
// =====================================================

function deactivateAva() {

    conversationActive =
        false;

    waitingForWakeWord =
        wakeWordEnabled;


    stopListening();


    status.innerText =
        wakeWordEnabled
            ? "Waiting for Hey Ava..."
            : "Conversation stopped";

}


// =====================================================
// MICROPHONE BUTTON
// =====================================================

micBtn.addEventListener(
    "click",
    () => {

        if (!recognition) {
            return;
        }


        // ---------------------------------------------
        // BARGE-IN
        // ---------------------------------------------

       if (isSpeaking) {

    if (currentAudio) {

        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;

    }

    isSpeaking = false;

}

        // ---------------------------------------------
        // STOP ACTIVE CONVERSATION
        // ---------------------------------------------

        if (conversationActive) {

            deactivateAva();

            return;

        }


        // ---------------------------------------------
        // MANUAL ACTIVATION
        // ---------------------------------------------

        activateAva();

        startListening();

    }
);


// =====================================================
// SPEECH RESULT
// =====================================================

if (recognition) {

    recognition.onresult =
        (event) => {

            let transcript = "";

            let finalTranscript = "";


            // -----------------------------------------
            // GET TRANSCRIPT
            // -----------------------------------------

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {

                const result =
                    event.results[i];

                const text =
                    result[0].transcript;

                transcript += text;


                if (result.isFinal) {

                    finalTranscript +=
                        text;

                }

            }


            transcript =
                transcript.trim();

            finalTranscript =
                finalTranscript.trim();


            // -----------------------------------------
            // SHOW LIVE TEXT
            // -----------------------------------------

            if (transcript) {

                commandInput.value =
                    transcript;

                userText.innerText =
                    transcript;

            }


            // -----------------------------------------
            // STATUS
            // -----------------------------------------

            if (conversationActive) {

                status.innerText =
                    "Listening... 🎤";

            } else {

                status.innerText =
                    "Waiting for Hey Ava... 🎤";

            }


            // -----------------------------------------
            // NO FINAL COMMAND
            // -----------------------------------------

            if (!finalTranscript) {
                return;
            }


            console.log(
                "Final Speech:",
                finalTranscript
            );


            // =================================================
            // WAKE WORD MODE
            // =================================================

            if (
                wakeWordEnabled &&
                waitingForWakeWord
            ) {

                const lowerText =
                    finalTranscript
                        .toLowerCase()
                        .trim();


                // -----------------------------------------
                // CHECK WAKE WORD
                // -----------------------------------------

                const wakeIndex =
                    lowerText.indexOf(
                        wakeWord
                    );


                // -----------------------------------------
                // WAKE WORD NOT FOUND
                // -----------------------------------------

                if (wakeIndex === -1) {

                    console.log(
                        "Wake word not detected."
                    );


                    return;

                }


                // -----------------------------------------
                // WAKE WORD FOUND
                // -----------------------------------------

                console.log(
                    "Wake word detected!"
                );


                // Text after "hey ava"
                let commandAfterWake =
                    lowerText
                        .substring(
                            wakeIndex +
                            wakeWord.length
                        )
                        .trim();


                // Remove comma
                commandAfterWake =
                    commandAfterWake
                        .replace(
                            /^[,.\s]+/,
                            ""
                        );


                // -----------------------------------------
                // ACTIVATE AVA
                // -----------------------------------------

                activateAva();


                // Stop current recognition
                try {

                    recognition.stop();

                } catch (error) {

                    console.log(error);

                }


                isListening =
                    false;


                // -----------------------------------------
                // ONLY "HEY AVA"
                // -----------------------------------------

                if (
                    commandAfterWake === ""
                ) {

                    speak(
                        "Yes, how can I help you?"
                    );


                    return;

                }


                // -----------------------------------------
                // "HEY AVA + COMMAND"
                // -----------------------------------------

                processCommand(
                    commandAfterWake
                );


                return;

            }


            // =================================================
            // NORMAL ACTIVE CONVERSATION
            // =================================================

            try {

                recognition.stop();

            } catch (error) {

                console.log(error);

            }


            isListening =
                false;


            processCommand(
                finalTranscript
            );

        };


    // =================================================
    // SPEECH ERROR
    // =================================================

    recognition.onerror =
        (event) => {

            console.log(
                "Speech Recognition Error:",
                event.error
            );


            isListening =
                false;


            if (
                event.error === "aborted"
            ) {

                return;

            }


            if (
                event.error === "not-allowed"
            ) {

                status.innerText =
                    "Microphone permission required.";

                return;

            }


            status.innerText =
                conversationActive
                    ? "Sorry, I couldn't understand."
                    : "Waiting for Hey Ava...";

        };


    // =================================================
    // SPEECH END
    // =================================================

    recognition.onend =
        () => {

            isListening =
                false;


            // -----------------------------------------
            // CONTINUE LISTENING
            // -----------------------------------------

            if (
                wakeWordEnabled ||
                conversationActive
            ) {

                if (!isSpeaking) {

                    setTimeout(
                        () => {

                            startListening();

                        },
                        300
                    );

                }

            }

        };

}


// =====================================================
// STEP 5
// TOOLS & ACTIONS
// =====================================================


// =====================================================
// COMMAND PROCESSOR
// =====================================================

function processCommand(command) {
    console.log("Voice command:", command);

    command =
        command.toLowerCase()
        .replace(/[.,!?]/g, "")
        .trim();


    // =================================================
    // GOOGLE SEARCH
    // =================================================

    if (
        command.startsWith(
            "search google for"
        ) ||
        command.startsWith(
            "google search for"
        ) ||
        command.startsWith(
            "search for"
        )
    ) {

        let query =
            command
                .replace(
                    "search google for",
                    ""
                )
                .replace(
                    "google search for",
                    ""
                )
                .replace(
                    "search for",
                    ""
                )
                .trim();


        if (!query) {

            speak(
                "What should I search for?"
            );

            return;

        }


        speak(
            "Searching Google for " +
            query
        );


        window.open(
            "https://www.google.com/search?q=" +
            encodeURIComponent(query),
            "_blank"
        );


        return;

    }


    // =================================================
    // YOUTUBE SEARCH
    // =================================================

    if (
        command.startsWith(
            "search youtube for"
        ) ||
        command.startsWith(
            "youtube search for"
        ) ||
        command.startsWith(
            "search on youtube for"
        )
    ) {

        let query =
            command
                .replace(
                    "search youtube for",
                    ""
                )
                .replace(
                    "youtube search for",
                    ""
                )
                .replace(
                    "search on youtube for",
                    ""
                )
                .trim();


        if (!query) {

            speak(
                "What should I search on YouTube?"
            );

            return;

        }


        speak(
            "Searching YouTube for " +
            query
        );


        window.open(
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query),
            "_blank"
        );


        return;

    }


    // =================================================
    // OPEN YOUTUBE
    // =================================================

    if (
        command === "open youtube" ||
        command === "open the youtube"
    ) {

        speak(
            "Opening YouTube"
        );


        window.location.href = 
            "https://www.youtube.com";


        return;

    }


    // =================================================
    // OPEN WHATSAPP
    // =================================================

    if (
        command === "open whatsapp" ||
        command === "open the whatsapp"
    ) {

        speak(
            "Opening WhatsApp"
        );


        window.open(
            "https://web.whatsapp.com",
            "_blank"
        );


        return;

    }


    // =================================================
    // OPEN GOOGLE
    // =================================================

    if (
        command === "open google" ||
        command === "open the google"
    ) {

        speak(
            "Opening Google"
        );


        window.open(
            "https://www.google.com",
            "_blank"
        );


        return;

    }


    // =================================================
    // TIME
    // =================================================

    if (
        command === "time" ||
        command.includes("what time") ||
        command.includes("current time")
    ) {

        const now =
            new Date();


        const time =
            now.toLocaleTimeString(
                "en-IN",
                {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                }
            );


        speak(
            "The current time is " +
            time
        );


        return;

    }


    // =================================================
    // DATE
    // =================================================

    if (
        command === "date" ||
        command.includes("today's date") ||
        command.includes("todays date") ||
        command.includes("what is the date")
    ) {

        const now =
            new Date();


        const date =
            now.toLocaleDateString(
                "en-IN",
                {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );


        speak(
            "Today's date is " +
            date
        );


        return;

    }


    // =================================================
    // HELLO
    // =================================================

    if (
        command === "hello" ||
        command === "hi" ||
        command.includes("hello ava") ||
        command.includes("hi ava")
    ) {

        speak(
            "Hello! How can I help you?"
        );


        return;

    }


    // =================================================
    // AVA NAME
    // =================================================

    if (
        command.includes(
            "what is your name"
        ) ||
        command.includes(
            "what's your name"
        )
    ) {

        speak(
            "My name is Ava, your personal voice assistant."
        );


        return;

    }


    // =================================================
    // CLEAR MEMORY
    // =================================================

    if (
        command.includes(
            "clear memory"
        ) ||
        command.includes(
            "forget everything"
        ) ||
        command.includes(
            "forget our conversation"
        )
    ) {

        clearMemory();


        return;

    }


    // =================================================
    // STOP AVA
    // =================================================

    if (
        command === "stop listening" ||
        command === "stop ava" ||
        command === "goodbye ava"
    ) {

        speak(
            "Okay, I will stop listening."
        );


        conversationActive =
            false;

        waitingForWakeWord =
            wakeWordEnabled;


        return;

    }


    // =================================================
    // GEMINI FALLBACK
    // =================================================

    askGemini(command);

}


// =====================================================
// GEMINI AI
// =====================================================

async function askGemini(question) {

    status.innerText =
        "Thinking... 🤖";


    try {

        const response =
            await fetch(
                "/api/ask",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        question:
                            question
                    })

                }
            );


        const data =
            await response.json();


        console.log(
            "Gemini Response:",
            data
        );


        if (data.answer) {

            status.innerText =
                "Answer ready";


            speak(
                data.answer
            );

        } else {

            status.innerText =
                "Gemini Error";


            speak(
                data.error ||
                "Gemini did not return an answer."
            );

        }

    } catch (error) {

        console.error(
            "Gemini Error:",
            error
        );


        status.innerText =
            "Connection error";


        speak(
            "Sorry, there was a problem connecting to Gemini."
        );

    }

}


// =====================================================
// CLEAR CONVERSATION MEMORY
// =====================================================

async function clearMemory() {

    try {

        const response =
            await fetch(
                "/api/clear-memory",
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        console.log(
            "Memory:",
            data.message
        );


        assistantText.innerText =
            "Conversation memory cleared.";


        status.innerText =
            "Memory cleared 🧠";


        speak(
            "Okay, I have cleared our conversation memory."
        );

    } catch (error) {

        console.error(
            "Clear memory error:",
            error
        );


        status.innerText =
            "Could not clear memory.";

    }

}


// =====================================================
// TEXT COMMAND
// =====================================================

sendBtn.addEventListener(
    "click",
    () => {

        const command =
            commandInput.value.trim();


        if (command === "") {

            return;

        }


        userText.innerText =
            command;


        processCommand(
            command
        );


        commandInput.value = "";

    }
);


// =====================================================
// STEP 6
// NATURAL VOICE
// =====================================================


// =====================================================
// AVAILABLE VOICES
// =====================================================

let availableVoices = [];


// =====================================================
// LOAD VOICES
// =====================================================

function loadVoices() {

    availableVoices =
        window.speechSynthesis.getVoices();

}


loadVoices();


window.speechSynthesis.onvoiceschanged =
    () => {

        loadVoices();

    };


// =====================================================
// FIND AVA VOICE
// =====================================================

function getAvaVoice() {

    if (
        availableVoices.length === 0
    ) {

        loadVoices();

    }


    // ---------------------------------------------
    // Indian English female voice
    // ---------------------------------------------

    let voice =
        availableVoices.find(
            voice =>
                voice.lang === "en-IN" &&
                /female|google|heera/i
                    .test(voice.name)
        );


    // ---------------------------------------------
    // Any Indian English voice
    // ---------------------------------------------

    if (!voice) {

        voice =
            availableVoices.find(
                voice =>
                    voice.lang === "en-IN"
            );

    }


    // ---------------------------------------------
    // Female English voice
    // ---------------------------------------------

    if (!voice) {

        voice =
            availableVoices.find(
                voice =>
                    voice.lang.startsWith("en") &&
                    /female|zira|samantha|google/i
                        .test(voice.name)
            );

    }


    // ---------------------------------------------
    // Any English voice
    // ---------------------------------------------

    if (!voice) {

        voice =
            availableVoices.find(
                voice =>
                    voice.lang.startsWith("en")
            );

    }


    return voice;

}


// =====================================================
// CLEAN SPEECH TEXT
// =====================================================

function cleanSpeechText(text) {

    return text

        .replace(/\*\*/g, "")

        .replace(/\*/g, "")

        .replace(/#/g, "")

        .replace(/_/g, "")

        .replace(/`/g, "")

        .replace(/[{}[\]]/g, "")

        .replace(/\s+/g, " ")

        .trim();

}


// =====================================================
// SPEAK
// =====================================================

// =====================================================
// ELEVENLABS VOICE
// =====================================================

let currentAudio = null;

async function speak(text) {

    assistantText.innerText =
        text;

    status.innerText =
        "Ava is speaking... 🔊";

    try {

        isSpeaking = true;

        const response =
            await fetch(
                "/api/speak",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        text: text
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                "ElevenLabs request failed"
            );

        }

        const audioBlob =
            await response.blob();

        const audioURL =
            URL.createObjectURL(
                audioBlob
            );

        currentAudio =
            new Audio(audioURL);

        currentAudio.onended =
            () => {

                isSpeaking =
                    false;

                URL.revokeObjectURL(
                    audioURL
                );

                currentAudio =
                    null;

                if (
                    conversationActive ||
                    wakeWordEnabled
                ) {

                    status.innerText =
                        conversationActive
                            ? "Listening... 🎤"
                            : "Waiting for Hey Ava... 🎤";

                    startListening();

                } else {

                    status.innerText =
                        "Ready";

                }

            };

        currentAudio.onerror =
            () => {

                isSpeaking =
                    false;

                currentAudio =
                    null;

                status.innerText =
                    "Voice playback failed.";

            };

        await currentAudio.play();

    } catch (error) {

        console.error(
            "ElevenLabs Error:",
            error
        );

        isSpeaking =
            false;

        status.innerText =
            "Voice generation failed.";

    }

}




// =====================================================
// BACKEND CONNECTION TEST
// =====================================================

fetch("/api/test")

    .then(
        response =>
            response.json()
    )

    .then(
        data => {

            console.log(
                data.message
            );

        }
    )

    .catch(
        error => {

            console.error(
                "Backend connection failed:",
                error
            );

        }
    );


// =====================================================
// STEP 7 START
// WAKE WORD LISTENING
// =====================================================

if (
    recognition &&
    wakeWordEnabled
) {

    status.innerText =
        "Waiting for Hey Ava... 🎤";

    startListening();

}