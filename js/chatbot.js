// 전역 변수
let currentChatId = null;
let chatHistory = [];
let userId = null;
let accessToken = null;

// 음성 인식 관련 변수
let recognition = null;
let isRecognizing = false;
let finalTranscript = "";
let interimMessageDiv = null;

// 초기화
document.addEventListener('DOMContentLoaded', function () {
    // 토큰 검증 후 초기화 진행
    validateToken();
});

// 토큰 검증
async function validateToken() {
    try {
        accessToken = sessionStorage.getItem('accessToken');

        if (!accessToken) {
            console.log('토큰이 없습니다. 로그인 페이지로 이동합니다.');
            redirectToLogin();
            return;
        }

        const response = await fetch('https://www.visiblego.com/auth/validate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.log('토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.');
            sessionStorage.removeItem('accessToken'); // 무효한 토큰 제거
            redirectToLogin();
            return;
        }

        const result = await response.json();
        console.log('토큰 검증 성공:', result);

        let resultData = result.data
        userId = resultData.userId;

        // 토큰이 유효하면 채팅 목록 로드
        loadChatList();

    } catch (error) {
        console.error('토큰 검증 중 오류 발생:', error);
        redirectToLogin();
    }
}

// 로그인 페이지로 리다이렉트
function redirectToLogin() {
    window.location.href = '/page/login'; // 또는 로그인 페이지 URL
}

// 채팅 목록 로드 (API 호출 예정)
// 채팅 목록 로드 (API 호출 예정)
async function loadChatList() {
    try {
        // TODO: 실제 API 호출로 대체
        // const response = await fetch('/api/chat-list');
        // const chatList = await response.json();

        // 임시 데이터
        const chatList = [
        ];

        renderChatList(chatList);
    } catch (error) {
        console.error('채팅 목록 로드 실패:', error);
    }
}

// 채팅 목록 렌더링
function renderChatList(chatList) {
    const chatListContainer = document.getElementById('chatList');
    chatListContainer.innerHTML = '';

    chatList.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.active ? 'active' : ''}`;
        chatItem.onclick = () => selectChat(chat.id);

        chatItem.innerHTML = `<span>${chat.name}</span>`;

        chatListContainer.appendChild(chatItem);
    });
};

// 채팅 선택
function selectChat(chatId) {
    currentChatId = chatId;

    // 활성 상태 업데이트
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // 채팅 내용 로드
    loadChatContent(chatId);
}

// 채팅 내용 로드 (API 호출 예정)
async function loadChatContent(chatId) {
    try {
        // TODO: 실제 API 호출로 대체
        // const response = await fetch(`/api/chat/${chatId}`);
        // const chatData = await response.json();

        console.log(`채팅 ${chatId} 내용 로드`);
        // 채팅 내용을 UI에 표시하는 로직 추가
    } catch (error) {
        console.error('채팅 내용 로드 실패:', error);
    }
}

// 새 채팅 생성
function createNewChat() {
    console.log('새 채팅 생성');
    // TODO: 새 채팅 생성 API 호출
}

// 메시지 전송
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    // 사용자 메시지 먼저 화면에 추가
    addMessageToChat('user', message);

    // 입력 필드 초기화
    messageInput.value = '';

    // 로딩 메시지 표시
    const loadingMessageId = addMessageToChat('bot', '응답을 처리중입니다...');

    try {
        // 실제 API 호출
        const response = await fetch("https://www.visiblego.com/gateway/chatbot/api/chat", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API 응답:', result);

        // 로딩 메시지 제거
        removeMessage(loadingMessageId);

        // 실제 응답 추가
        if (result && result.response) {
            addMessageToChat('bot', result.response);
        } else if (result && result.message) {
            addMessageToChat('bot', result.message);
        } else if (typeof result === 'string') {
            addMessageToChat('bot', result);
        } else {
            addMessageToChat('bot', '응답을 받을 수 없습니다.');
        }

    } catch (error) {
        console.error('메시지 전송 실패:', error);

        // 로딩 메시지 제거
        removeMessage(loadingMessageId);

        // 에러 메시지 표시
        addMessageToChat('bot', '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// STT로부터 메시지 입력 (전송하지 않고 입력창에만 넣기)
function setMessageFromSTT(message) {
    if (!message) return;

    // 입력 필드에 텍스트 설정
    const messageInput = document.getElementById('messageInput');
    messageInput.value = message;
    messageInput.focus(); // 포커스 이동
}

// 채팅에 메시지 추가
function addMessageToChat(sender, message) {
    const chatContent = document.getElementById('chatContent');

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;

    // 고유 ID 생성 (로딩 메시지 제거용)
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    messageElement.id = messageId;

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.textContent = message;

    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString();

    messageElement.appendChild(messageBubble);
    messageElement.appendChild(messageTime);
    chatContent.appendChild(messageElement);

    // 스크롤을 맨 아래로
    chatContent.scrollTop = chatContent.scrollHeight;

    return messageId;
}

// 임시 메시지 표시 (음성 인식 중)
function displayMessage(sender, message) {
    const chatContent = document.getElementById('chatContent');

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender} interim`;

    // 고유 ID 생성
    const messageId = 'interim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    messageElement.id = messageId;

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.textContent = message;

    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString();

    messageElement.appendChild(messageBubble);
    messageElement.appendChild(messageTime);
    chatContent.appendChild(messageElement);

    // 스크롤을 맨 아래로
    chatContent.scrollTop = chatContent.scrollHeight;

    return messageElement;
}

// 임시 메시지 제거
function removeInterimMessage() {
    if (interimMessageDiv) {
        interimMessageDiv.remove();
        interimMessageDiv = null;
    }
}

// 메시지 제거 (로딩 메시지 제거용)
function removeMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        messageElement.remove();
    }
}

// 음성 인식 토글
function toggleSTT() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("이 브라우저는 음성 인식을 지원하지 않습니다 (크롬에서만 작동).");
        return;
    }

    const button = document.querySelector('.mic-button');

    if (!recognition) {
        // 브라우저 호환성 체크
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        recognition.lang = "ko-KR";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onstart = () => {
            console.log('음성 인식 시작됨');
            isRecognizing = true;
            button.innerHTML = "🛑";
            interimMessageDiv = displayMessage("user", "🎤 음성 인식 중...");
        };

        recognition.onresult = (event) => {
            console.log('음성 인식 결과:', event.results);
            if (event.results.length > 0) {
                finalTranscript = event.results[0][0].transcript.trim();
                console.log('인식된 텍스트:', finalTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            removeInterimMessage();
            stopRecognition();

            let errorMessage = "음성 인식 오류가 발생했습니다.";
            switch (event.error) {
                case 'no-speech':
                    errorMessage = "음성이 감지되지 않았습니다.";
                    break;
                case 'audio-capture':
                    errorMessage = "마이크에 접근할 수 없습니다.";
                    break;
                case 'not-allowed':
                    errorMessage = "마이크 권한이 거부되었습니다.";
                    break;
            }
            alert(errorMessage);
        };

        recognition.onend = () => {
            console.log('음성 인식 종료');
            removeInterimMessage();

            if (finalTranscript !== "") {
                console.log('입력창에 텍스트 설정:', finalTranscript);
                setMessageFromSTT(finalTranscript); // 전송하지 않고 입력창에만 설정
                finalTranscript = "";
            }
            stopRecognition();
        };
    }

    if (!isRecognizing) {
        finalTranscript = "";
        try {
            recognition.start();
        } catch (error) {
            console.error('음성 인식 시작 실패:', error);
            alert('음성 인식을 시작할 수 없습니다.');
        }
    } else {
        recognition.stop();
    }
}

// 음성 인식 중지
function stopRecognition() {
    isRecognizing = false;
    const button = document.querySelector('.mic-button');
    button.innerHTML = "🎤";
}

// 키보드 이벤트 처리
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// 음성 녹음 시작 (기존 함수 대체)
function startRecording() {
    toggleSTT();
}