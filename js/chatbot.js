let currentUserId = null;
let recognition = null;
let isRecognizing = false;
let finalTranscript = "";
let interimMessageDiv = null;

function setUserId() {
    const input = document.getElementById("userId").value;
    if (!input) {
        alert("userId를 입력하세요.");
        return;
    }
    currentUserId = parseInt(input);
    document.getElementById("chat-section").style.display = "flex";
    document.getElementById("userId").disabled = true;
}

async function sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();
    if (!message) return;
    displayMessage("user", message);
    messageInput.value = "";
    await sendToServer(message);
}

async function sendMessageFromSTT(message) {
    if (interimMessageDiv) {
        interimMessageDiv.querySelector("span").textContent = message;
        interimMessageDiv = null;
    } else {
        displayMessage("user", message);
    }
    await sendToServer(message);
}

function displayMessage(sender, message) {
    const chatBox = document.getElementById("chat-box");
    const alignClass = sender === "user" ? "user" : "bot";
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${alignClass}`;
    msgDiv.innerHTML = `<span>${message}</span>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv;
}

async function sendToServer(message) {
    try {
        const response = await fetch("https://visiblego.com/chatbot/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, message })
        });

        if (response.status === 400) {
            displayMessage("bot", "부적절한 표현이 감지되어 답변할 수 없습니다.");
        } else if (!response.ok) {
            displayMessage("bot", "오류가 발생했습니다. 다시 시도해주세요.");
        } else {
            const data = await response.json();
            displayMessage("bot", data.response);
        }
    } catch (error) {
        displayMessage("bot", "서버에 연결할 수 없습니다.");
    }
}

function toggleSTT() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("이 브라우저는 음성 인식을 지원하지 않습니다 (크롬에서만 작동).");
        return;
    }

    const button = document.getElementById("sttButton");

    if (!recognition) {
        recognition = new webkitSpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            finalTranscript = event.results[0][0].transcript.trim();
        };

        recognition.onerror = (event) => {
            alert("음성 인식 오류: " + event.error);
            removeInterimMessage();
            stopRecognition();
        };

        recognition.onend = () => {
            if (finalTranscript !== "") {
                sendMessageFromSTT(finalTranscript);
                finalTranscript = "";
            } else {
                removeInterimMessage();
                alert("음성 인식 결과가 없습니다.");
            }
            stopRecognition();
        };
    }

    if (!isRecognizing) {
        finalTranscript = "";
        recognition.start();
        isRecognizing = true;
        button.textContent = "🛑 음성 중지";
        interimMessageDiv = displayMessage("user", "음성 인식 중...");
    } else {
        recognition.stop();
    }
}

function stopRecognition() {
    isRecognizing = false;
    document.getElementById("sttButton").textContent = "🎤 음성 입력";
}

function removeInterimMessage() {
    if (interimMessageDiv && interimMessageDiv.parentNode) {
        interimMessageDiv.parentNode.removeChild(interimMessageDiv);
        interimMessageDiv = null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("messageInput").addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.isComposing) {
            e.preventDefault();
            sendMessage();
        }
    });
});
