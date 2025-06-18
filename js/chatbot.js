// 전역 변수
let currentChatId = null;
let chatHistory = [];
let userId = null;
let accessToken = null;

// 메시지 내역 페이징 관련 변수
let oldestMessageId = null;
let isLoadingMoreMessages = false;
let allHistoryLoaded = false;
const CHAT_PAGE_SIZE = 20;

// 채팅방 목록 페이징 관련 변수
let lastChatRoomId = null;
let isLoadingMoreChatRooms = false;
let allChatRoomsLoaded = false;
const CHAT_LIST_PAGE_SIZE = 20;

// 음성 인식 관련 변수
let recognition = null;
let isRecognizing = false;
let finalTranscript = "";
let interimMessageDiv = null;

// 초기화
document.addEventListener('DOMContentLoaded', function () {
    // 토큰 검증 후 초기화 진행
    validateToken();

    // 메시지 내역 스크롤 리스너 (상단)
    const chatContent = document.getElementById('chatContent');
    chatContent.addEventListener('scroll', () => {
        if (chatContent.scrollTop === 0 && !isLoadingMoreMessages && !allHistoryLoaded && currentChatId) {
            loadMoreChatContent();
        }
    });

    // 채팅방 목록 스크롤 리스너 (하단)
    const chatListContainer = document.getElementById('chatList');
    chatListContainer.addEventListener('scroll', () => {
        // 스크롤이 하단에 거의 닿았고, 로딩 중이 아니며, 모든 목록을 불러오지 않았을 때
        if (chatListContainer.scrollTop + chatListContainer.clientHeight >= chatListContainer.scrollHeight - 10 && !isLoadingMoreChatRooms && !allChatRoomsLoaded) {
            loadMoreChatRooms();
        }
    });

    // 전역 클릭 이벤트로 드롭다운 닫기
    document.addEventListener('click', function (event) {
        const profileDropdown = document.getElementById('profileDropdown');
        const userProfile = document.querySelector('.user-profile');

        if (profileDropdown && !userProfile.contains(event.target)) {
            profileDropdown.classList.remove('show');
        }
    });
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
            sessionStorage.removeItem('accessToken');
            redirectToLogin();
            return;
        }

        const result = await response.json();
        console.log('토큰 검증 성공:', result);

        let resultData = result.data;
        userId = resultData.userId;
        const userEmail = resultData.email;

        updateUserProfileDisplay(userEmail);

        // 토큰이 유효하면 채팅 목록 로드
        loadChatList();
        
        // ※※※ 변경점: 로그인 후 첫 화면은 항상 새 채팅(환영 메시지) 화면이 되도록 수정 ※※※
        displayWelcomeMessage();

    } catch (error) {
        console.error('토큰 검증 중 오류 발생:', error);
        redirectToLogin();
    }
}

// 로그인 페이지로 리다이렉트
function redirectToLogin() {
    window.location.href = '/page/login';
}

/**
 * 사용자 프로필 UI를 업데이트합니다.
 * @param {string} name - 표시할 사용자 이름 또는 이메일
 */
function updateUserProfileDisplay(name) {
    // 참고: 이 ID를 가진 HTML 요소가 프로필 이름 표시 영역에 있어야 합니다.
    const userProfileNameElement = document.getElementById('userProfileName');
    if (userProfileNameElement && name) {
        userProfileNameElement.textContent = name;
    }
}

/**
 * 채팅 메인 헤더의 제목을 업데이트합니다.
 * @param {string} title - 표시할 새로운 제목
 */
function updateChatHeader(title) {
    const chatHeader = document.querySelector('.chat-main .chat-header');
    if (chatHeader) {
        chatHeader.textContent = title;
    }
}

// 채팅 목록 로드 (API 호출) (수정됨)
async function loadChatList() {
    if (!userId) return;

    isLoadingMoreChatRooms = true;
    lastChatRoomId = null;
    allChatRoomsLoaded = false;

    const chatListContainer = document.getElementById('chatList');
    chatListContainer.innerHTML = '<div class="loading-indicator">채팅 목록을 불러오는 중...</div>';

    try {
        const response = await fetch('https://www.visiblego.com/gateway/chatbot/chat-room-list', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                size: CHAT_LIST_PAGE_SIZE
            })
        });

        if (!response.ok) {
            throw new Error(`채팅 목록 로드 실패: ${response.status}`);
        }

        const result = await response.json();
        
        if (result && result.data && result.data.chatRooms && result.data.chatRooms.length > 0) {
            const chatRooms = result.data.chatRooms;
            renderChatList(chatRooms, false); // 새로 렌더링

            if (chatRooms.length > 0) {
                lastChatRoomId = chatRooms[chatRooms.length - 1].chatRoomId;
                // 자동 선택 로직 제거됨
            }
            if (chatRooms.length < CHAT_LIST_PAGE_SIZE) {
                allChatRoomsLoaded = true;
            }
        } else {
             renderChatList([], false);
             allChatRoomsLoaded = true;
             // 환영 메시지 호출 로직 제거 (validateToken에서 일괄 처리)
        }
    } catch (error) {
        console.error('채팅 목록 로드 중 오류 발생:', error);
        chatListContainer.innerHTML = '<div class="no-chats">목록을 불러올 수 없습니다.</div>';
    } finally {
        isLoadingMoreChatRooms = false;
    }
}

// 추가 채팅 목록 로드 (스크롤 하단) (추가된 함수)
async function loadMoreChatRooms() {
    if (isLoadingMoreChatRooms || allChatRoomsLoaded || !userId) return;

    isLoadingMoreChatRooms = true;
    // 로딩 인디케이터를 목록 하단에 추가할 수 있습니다.

    try {
        const response = await fetch('https://www.visiblego.com/gateway/chatbot/chat-room-list', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                chatRoomId: lastChatRoomId, // 마지막 채팅방 ID를 커서로 사용
                size: CHAT_LIST_PAGE_SIZE
            })
        });

        if (!response.ok) {
            throw new Error(`추가 채팅 목록 로드 실패: ${response.status}`);
        }

        const result = await response.json();

        if (result && result.data && result.data.chatRooms && result.data.chatRooms.length > 0) {
            const chatRooms = result.data.chatRooms;
            renderChatList(chatRooms, true); // 기존 목록에 추가

            const newLastChatRoomId = chatRooms[chatRooms.length - 1].chatRoomId;
            
            // 중복 데이터 수신 시 무한 루프 방지
            if (newLastChatRoomId === lastChatRoomId) {
                allChatRoomsLoaded = true;
                return;
            }
            lastChatRoomId = newLastChatRoomId;

            if (chatRooms.length < CHAT_LIST_PAGE_SIZE) {
                allChatRoomsLoaded = true;
            }
        } else {
            allChatRoomsLoaded = true; // 더 이상 데이터가 없음
        }
    } catch (error) {
        console.error('추가 채팅 목록 로드 중 오류 발생:', error);
        allChatRoomsLoaded = true; // 오류 발생 시 더 이상 시도하지 않음
    } finally {
        isLoadingMoreChatRooms = false;
    }
}

// 채팅 목록 렌더링 (수정됨)
function renderChatList(chatList, append = false) {
    const chatListContainer = document.getElementById('chatList');
    
    if (!append) {
        chatListContainer.innerHTML = ''; // 새로 렌더링 시 기존 목록 초기화
    } else {
        // 추가 렌더링 시 로딩 인디케이터가 있다면 제거
        const indicator = chatListContainer.querySelector('.loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    if (!chatList || chatList.length === 0) {
        if (!append) {
            chatListContainer.innerHTML = '<div class="no-chats">대화 기록이 없습니다.</div>';
        }
        return;
    }

    chatList.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chat.chatRoomId;

        // 현재 선택된 채팅 ID와 비교하여 'active' 클래스를 부여합니다.
        if (chat.chatRoomId === currentChatId) {
            chatItem.classList.add('active');
        }

        chatItem.onclick = () => selectChat(chat.chatRoomId);
        chatItem.innerHTML = `<span>${chat.firstMessage || '새로운 대화'}</span>`;
        chatListContainer.appendChild(chatItem);
    });
};

// 채팅 선택 (수정됨)
function selectChat(chatId) {
    if (isLoadingMoreMessages) {
        return;
    }
    
    currentChatId = chatId;
    console.log(`채팅방 선택: ${chatId}`);

    // 메시지 내역 페이징 상태 초기화
    oldestMessageId = null;
    allHistoryLoaded = false;
    isLoadingMoreMessages = false;

    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedChatItem = document.querySelector(`.chat-item[data-chat-id='${chatId}']`);
    if(selectedChatItem) {
        selectedChatItem.classList.add('active');
        updateChatHeader(selectedChatItem.textContent.trim());
    }

    loadChatContent(chatId);
}

// 채팅 내용 로드 (API 호출) (수정됨)
async function loadChatContent(chatId) {
    const chatContent = document.getElementById('chatContent');
    chatContent.innerHTML = ''; 
    addMessageToChat('system', '대화 내용을 불러오는 중입니다...');

    try {
        const response = await fetch(`https://www.visiblego.com/gateway/chatbot/api/chat/history`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatRoomId: chatId,
                userId: userId,
                pageSize: CHAT_PAGE_SIZE
            })
        });

        if (!response.ok) {
            throw new Error(`대화 내용 로드 실패: ${response.status}`);
        }

        const result = await response.json();
        chatContent.innerHTML = '';

        if (result && result.data && result.data.length > 0) {
            oldestMessageId = result.data[result.data.length - 1].chatMessageId;
            if (result.data.length < CHAT_PAGE_SIZE) {
                allHistoryLoaded = true;
            }
                result.data.reverse().forEach(msg => {       

                    if (msg.bot && (msg.isRecommended === true || msg.content.includes('고객님의 통신 성향을 바탕으로'))) {
                        // isRecommend: true 이면 카드로 렌더링
                        const { intro, plans } = parsePlanData(msg.content);
                        renderPlanCards(intro, plans);
                    } else {
                        // 일반 메시지는 기존 방식으로 추가
                        const sender = msg.bot ? 'bot' : 'user';
                        addMessageToChat(sender, msg.content);
                    }
                });

            chatContent.scrollTop = chatContent.scrollHeight;
        } else {
            addMessageToChat('system', '이전 대화 내용이 없습니다.');
            allHistoryLoaded = true;
        }

    } catch (error) {
        console.error('대화 내용 로드 중 오류 발생:', error);
        chatContent.innerHTML = '';
        addMessageToChat('system', '대화 내용을 불러오는 중 오류가 발생했습니다.');
    }
}

// 이전 대화 내역 추가 로드 (스크롤 상단 도달 시) (최종 수정)
async function loadMoreChatContent() {
    if (isLoadingMoreMessages || allHistoryLoaded) {
        return;
    }

    isLoadingMoreMessages = true;
    const chatContent = document.getElementById('chatContent');
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = '이전 대화 불러오는 중...';
    chatContent.prepend(loadingIndicator);

    try {
        const response = await fetch(`https://www.visiblego.com/gateway/chatbot/api/chat/history`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatRoomId: currentChatId,
                userId: userId,
                lastMessageId: oldestMessageId,
                pageSize: CHAT_PAGE_SIZE
            })
        });

        loadingIndicator.remove();

        if (!response.ok) {
            throw new Error(`이전 대화 내용 로드 실패: ${response.status}`);
        }

        const result = await response.json();
        
        if (result && result.data && result.data.length > 0) {
            const newOldestMessageId = result.data[result.data.length - 1].chatMessageId;
            if (newOldestMessageId === oldestMessageId) {
                allHistoryLoaded = true;
                console.warn("서버로부터 중복된 데이터가 수신되어 이전 대화 로드를 중지합니다.");
                return;
            }
            
            const oldScrollHeight = chatContent.scrollHeight;
            oldestMessageId = newOldestMessageId;

            if (result.data.length < CHAT_PAGE_SIZE) {
                allHistoryLoaded = true;
            }

            result.data.reverse().forEach(msg => {
                if (msg.bot && msg.isRecommended === true) {
                    const { intro, plans } = parsePlanData(msg.content);
                    renderPlanCards(intro, plans, true); 
                } else {
                    const sender = msg.bot ? 'bot' : 'user';
                    prependMessageToChat(sender, msg.content);
                }
            });

            const newScrollHeight = chatContent.scrollHeight;
            chatContent.scrollTop = newScrollHeight - oldScrollHeight;

        } else {
            allHistoryLoaded = true;
        }

    } catch (error) {
        console.error('이전 대화 내용 로드 중 오류 발생:', error);
        if(loadingIndicator) loadingIndicator.remove();
        allHistoryLoaded = true;
    } finally {
        isLoadingMoreMessages = false;
    }
}

// 새 채팅 생성
function createNewChat() {
    currentChatId = null; 
    oldestMessageId = null;
    allHistoryLoaded = false;
    isLoadingMoreMessages = false;

    displayWelcomeMessage();

    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    console.log('새 채팅을 시작합니다. 다음 메시지는 새 채팅방을 생성합니다.');
}

// 환영 메시지 표시 함수
function displayWelcomeMessage() {
    const chatContent = document.getElementById('chatContent');

    chatContent.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-header">
                <h2>안녕하세요! 요기U+ 입니다.</h2>
                <p>무엇을 도와드릴까요?</p>
            </div>
            <div class="welcome-body">
                <h3>챗봇 사용 방법</h3>
                <ul class="capabilities-list">
                    <li>
                        <strong>요금제 추천</strong>
                        <p>고객님의 통신 사용 패턴에 꼭 맞는 요금제를 찾아 추천해 드려요.</p>
                    </li>
                    <li>
                        <strong>사용자 정보 확인</strong>
                        <p>현재 사용 중인 요금제, 남은 데이터 등 나의 정보를 간편하게 확인할 수 있어요.</p>
                    </li>
                    <li>
                        <strong>간단한 심심풀이</strong>
                        <p>일상적인 대화나 궁금한 점에 대해 편하게 이야기 나눠요.</p>
                    </li>
                </ul>
            </div>
            <p class="start-prompt">아래 입력창에 궁금한 점을 입력해 보세요!</p>
        </div>
    `;
    
    updateChatHeader('새로운 대화');
}

// 메시지 전송
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    addMessageToChat('user', message);
    messageInput.value = '';

    const loadingMessageId = addMessageToChat('bot', '응답을 처리중입니다...');
    let isNewChat = false;

    try {
        if (!currentChatId) {
            isNewChat = true;
            console.log("새 채팅방 생성을 요청합니다.");
            const createRoomResponse = await fetch('https://www.visiblego.com/gateway/chatbot/create-chat-room', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId })
            });

            if (!createRoomResponse.ok) {
                throw new Error(`채팅방 생성 실패: ${createRoomResponse.status}`);
            }

            const createRoomResult = await createRoomResponse.json();
            if (createRoomResult && createRoomResult.data && createRoomResult.data.chatRoomId) {
                currentChatId = createRoomResult.data.chatRoomId;
                console.log(`새 채팅방 생성 완료: ID = ${currentChatId}`);
            } else {
                throw new Error('채팅방 ID를 받아오지 못했습니다.');
            }
        }

        const response = await fetch('https://www.visiblego.com/gateway/chatbot/api/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                chatRoomId: currentChatId,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API 응답:', result);

        removeMessage(loadingMessageId);
        
        console.log(result);

        if (result && result.data && result.data.isRecommended === true) {
            const botMessage = result.data.message;
            const { intro, plans } = parsePlanData(botMessage);
            renderPlanCards(intro, plans);
        } else {
            let botMessage = '응답을 받을 수 없습니다.';
            if (result && result.data && result.data.message) {
                botMessage = result.data.message;
            }
            addMessageToChat('bot', botMessage);
        }

        if (isNewChat) {
            console.log("새 채팅이 생성되었으므로 목록을 새로고침합니다.");
            updateChatHeader(message);
            await loadChatList();
            
            // 새 채팅 생성 후, 방 목록에서 해당 방을 활성화 상태로 만듭니다.
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            const newChatItem = document.querySelector(`.chat-item[data-chat-id='${currentChatId}']`);
            if(newChatItem) {
                newChatItem.classList.add('active');
            }
        }

    } catch (error) {
        console.error('메시지 전송 실패:', error);
        removeMessage(loadingMessageId);
        addMessageToChat('bot', '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.');
        if (isNewChat) {
            updateChatHeader('새로운 대화');
        }
    }
}

// STT로부터 메시지 입력 (전송하지 않고 입력창에만 넣기)
function setMessageFromSTT(message) {
    if (!message) return;

    const messageInput = document.getElementById('messageInput');
    messageInput.value = message;
    messageInput.focus();
}

// 채팅에 메시지 추가
function addMessageToChat(sender, message) {
    const chatContent = document.getElementById('chatContent');

    // "대화 내용을 불러오는 중입니다..." 또는 "이전 대화 내용이 없습니다." 같은 시스템 메시지는 welcome-message를 덮어쓰지 않도록 처리
    if (sender === 'system') {
        const welcomeMessage = chatContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    } else {
        // 실제 사용자나 봇의 메시지가 추가될 때 welcome-message가 있다면 제거
        const welcomeMessage = chatContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            chatContent.innerHTML = '';
        }
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;

    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    messageElement.id = messageId;

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.textContent = message;

     messageElement.appendChild(messageBubble);

    if (sender !== 'system') {
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.appendChild(messageTime);
    }

    chatContent.appendChild(messageElement);
    chatContent.scrollTop = chatContent.scrollHeight;

    return messageId;
}

// 채팅에 메시지 앞에 추가 (이전 대화 로드용)
function prependMessageToChat(sender, message) {
    const chatContent = document.getElementById('chatContent');

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.textContent = message;

    messageElement.appendChild(messageBubble);
    chatContent.prepend(messageElement);
}

// 임시 메시지 표시 (음성 인식 중)
function displayMessage(sender, message) {
    const chatContent = document.getElementById('chatContent');
    const welcomeMessage = chatContent.querySelector('.welcome-message');
    if (welcomeMessage) {
        chatContent.innerHTML = '';
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender} interim`;

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
            if (event.results.length > 0) {
                finalTranscript = event.results[0][0].transcript.trim();
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
                setMessageFromSTT(finalTranscript);
                sendMessage();
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

// 프로필 메뉴 토글
function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

// 마이페이지로 이동
function goToMyPage(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.remove('show');

    window.location.href = '/page/mypage';
}

// 로그아웃
function logout(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }

    showLogoutModal();
}

// 로그아웃 모달 표시
function showLogoutModal() {
    const modal = document.createElement('div');
    modal.className = 'logout-modal-overlay';
    modal.innerHTML = `
        <div class="logout-modal">
            <div class="modal-header">
                <h3>로그아웃</h3>
            </div>
            <div class="modal-body">
                <p>정말 로그아웃 하시겠습니까?</p>
            </div>
            <div class="modal-footer">
                <button class="modal-btn cancel-btn" onclick="closeLogoutModal()">취소</button>
                <button class="modal-btn confirm-btn" onclick="confirmLogout()">로그아웃</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// 로그아웃 모달 닫기
function closeLogoutModal() {
    const modal = document.querySelector('.logout-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 로그아웃 확인
async function confirmLogout() {
    try {
        const accessToken = sessionStorage.getItem('accessToken');

        if (accessToken) {
            const response = await fetch('https://www.visiblego.com/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.warn('로그아웃 API 호출 실패:', response.status);
            }
        }

        sessionStorage.removeItem('accessToken');
        window.location.href = '/page/login';

    } catch (error) {
        console.error('로그아웃 중 오류 발생:', error);
        sessionStorage.removeItem('accessToken');
        window.location.href = '/page/login';
    }
}

function movePlanPage() {
    window.location.href = '/page/plan'
}


function parsePlanData(text) {
    const plans = [];
    // "요금제:"를 기준으로 텍스트를 나눕니다. 
    // split 후 생길 수 있는 빈 문자열을 filter로 제거하여 안정성을 높입니다.
    const parts = text.split("요금제:").filter(p => p.trim() !== '');

    if (parts.length === 0) {
        // 파싱할 데이터가 없는 경우
        return { intro: text, plans: [], outro: '' };
    }

    // 첫 번째 부분은 소개 문구로 간주합니다.
    const intro = parts.shift().trim();
    let outro = '';

    const outroMarker = '또 저랑 무엇을 하길 원하나요?';
    
    // parts 배열에 아직 처리할 데이터가 남아 있는지 확인합니다.
    if (parts.length > 0) {
        // 마지막 부분에 outro 텍스트가 포함되어 있는지 확인합니다.
        const lastPartIndex = parts.length - 1;
        let lastPart = parts[lastPartIndex];

        if (lastPart.includes(outroMarker)) {
            const splitLastPart = lastPart.split(outroMarker);
            // 요금제 정보 부분만 남기고 업데이트합니다.
            parts[lastPartIndex] = splitLastPart[0]; 
            // outro 텍스트를 저장합니다.
            outro = splitLastPart[1] ? splitLastPart[1].trim() : '';
        }
    }

    parts.forEach(part => {
        const lines = part.trim().split('\n').filter(line => line.trim() !== ''); // 빈 줄은 무시
        if (lines.length < 1) return;

        // 요금제 이름 파싱
        const plan = { '요금제': lines.shift().replace(/-|'/g, '').trim() };

        // 요금제 세부 정보 파싱
        lines.forEach(line => {
            const detail = line.split(':');
            if (detail.length === 2) {
                const key = detail[0].replace(/-|'/g, '').trim();
                const value = detail[1].replace(/-|'/g, '').trim();
                plan[key] = value;
            }
        });

        // 유효한 요금제 객체만 배열에 추가
        if (plan['요금제']) {
            plans.push(plan);
        }
    });

    return { intro, plans, outro };
}


function renderPlanCards(intro, plans, prepend = false) {
    const chatContent = document.getElementById('chatContent');

    // 카드들을 감싸는 컨테이너 생성
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'message bot';
    
    let cardsHTML = `<div class="message-bubble">`;

    // 소개 문구가 있다면 추가
    if (intro) {
        cardsHTML += `<p class="plan-intro-text">${intro}</p>`;
    }
    
    cardsHTML += `<div class="plan-cards-container">`;

    // 각 요금제에 대한 카드 생성
    plans.forEach(plan => {
        cardsHTML += `
            <div class="plan-card">
                <h3>${plan['요금제']}</h3>
                <p><strong>월정액:</strong> ${plan['월정액'] || '정보 없음'}</p>
                <p><strong>데이터:</strong> ${plan['제공량'] || '정보 없음'}</p>
                <p><strong>테더링:</strong> ${plan['테더링 데이터'] || '정보 없음'}</p>
                <p><strong>음성통화:</strong> ${plan['추가 통화 허용량'] || '정보 없음'}</p>
                <p><strong>가족결합:</strong> ${plan['가족 결합 가능'] || '정보 없음'}</p>
            </div>
        `;
    });

    cardsHTML += `</div></div>`; // plan-cards-container, message-bubble 닫기
    cardsContainer.innerHTML = cardsHTML;
    
    if (prepend) {
        // prepend가 true이면 앞에 추가
        chatContent.prepend(cardsContainer);
    } else {
        // 아니면 뒤에 추가하고 스크롤을 맨 아래로 이동
        const welcomeMessage = chatContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            chatContent.innerHTML = '';
        }
        chatContent.appendChild(cardsContainer);
        chatContent.scrollTop = chatContent.scrollHeight;
    }
}