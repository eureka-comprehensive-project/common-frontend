let selectedPromptSentimentCode = null;

window.onload = function () {
    fetchPrompts();
};

function fetchPrompts() {
    fetch(`${API_BASE_URL}/chatbot/api/prompt`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#promptTable tbody");
            tbody.innerHTML = "";
            data.data.forEach(prompt => {
                const row = document.createElement("tr");
                row.onclick = () => toggleDetailBox(prompt.sentimentCode);
                row.innerHTML = `
                    <td>${prompt.promptId}</td>
                    <td>${prompt.sentimentCode}</td>
                    <td>${prompt.name}</td>
                    <td>${prompt.scenario.slice(0, 10)}...</td>
                `;
                tbody.appendChild(row);
            });
        });
}

function toggleDetailBox(sentimentCode) {
    const detailBox = document.getElementById("detailBox");
    const createBox = document.getElementById("createBox");

    createBox.classList.add("hidden");

    if (selectedPromptSentimentCode === sentimentCode && !detailBox.classList.contains("hidden")) {
        detailBox.classList.add("hidden");
        selectedPromptSentimentCode = null;
        return;
    }

    fetch(`${API_BASE_URL}/chatbot/api/prompt/${sentimentCode}`)
        .then(res => res.json())
        .then(result => {
            const prompt = result.data;
            selectedPromptSentimentCode = sentimentCode;
            detailBox.classList.remove("hidden");
            document.getElementById("detailId").value = prompt.promptId;
            document.getElementById("detailCode").value = prompt.sentimentCode;
            document.getElementById("detailName").value = prompt.name;
            document.getElementById("detailScenario").value = prompt.scenario;
        });
}

function toggleCreateBox() {
    const createBox = document.getElementById("createBox");
    const detailBox = document.getElementById("detailBox");

    detailBox.classList.add("hidden");
    createBox.classList.toggle("hidden");

    if (!createBox.classList.contains("hidden")) {
        document.getElementById("createCode").value = "";
        document.getElementById("createName").value = "";
        document.getElementById("createScenario").value = "";
    }
}

function updatePrompt() {
    const data = {
        promptId: document.getElementById("detailId").value,
        sentimentCode: Number(document.getElementById("detailCode").value),
        name: document.getElementById("detailName").value,
        scenario: document.getElementById("detailScenario").value
    };

    fetch(`${API_BASE_URL}/chatbot/api/prompt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(res => res.json())
        .then(() => {
            alert("수정 완료!");
            fetchPrompts();
            document.getElementById("detailBox").classList.add("hidden");
        });
}

function deletePrompt() {
    const promptId = document.getElementById("detailId").value;
    fetch(`${API_BASE_URL}/chatbot/api/prompt/${promptId}`, {
        method: "DELETE"
    }).then(() => {
        alert("삭제 완료!");
        fetchPrompts();
        document.getElementById("detailBox").classList.add("hidden");
    });
}

function createPrompt() {
    const data = {
        sentimentCode: Number(document.getElementById("createCode").value),
        name: document.getElementById("createName").value,
        scenario: document.getElementById("createScenario").value
    };

    fetch(`${API_BASE_URL}/chatbot/api/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(res => res.json())
        .then(() => {
            alert("등록 완료!");
            fetchPrompts();
            document.getElementById("createBox").classList.add("hidden");
        });
}
