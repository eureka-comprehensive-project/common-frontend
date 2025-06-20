// 전역 변수
let currentChatId = null;
let chatHistory = [];
let userId = null;
let accessToken = null;

let chatRoomStates = {};
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

// 부가 혜택 정보를 저장할 Map
let allBenefitsMap = new Map();

// 초기화
document.addEventListener('DOMContentLoaded', function () {
    // 토큰 검증 후 초기화 진행
    validateToken();

    // 메시지 내역 스크롤 리스너 (상단)
    const chatContent = document.getElementById('chatContent');
    chatContent.addEventListener('scroll', () => {
        const currentState = chatRoomStates[currentChatId];
        if (chatContent.scrollTop === 0 && currentState && !currentState.isLoadingMoreMessages && !currentState.allHistoryLoaded && currentChatId) {
            loadMoreChatContent();
        }
    });

    // 채팅방 목록 스크롤 리스너 (하단)
    const chatListContainer = document.getElementById('chatList');
    chatListContainer.addEventListener('scroll', () => {
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

// 서버에서 모든 부가 혜택 정보를 가져오는 함수
async function loadAllBenefits() {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/plan/benefit', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`부가 혜택 목록 로드 실패: ${response.status}`);
        }

        const result = await response.json();
        if (result && result.data) {
            allBenefitsMap.clear();
            result.data.forEach(benefit => {
                allBenefitsMap.set(benefit.benefitId, benefit.benefitName);
            });
            console.log('전체 부가 혜택 목록 로드 완료:', allBenefitsMap);
        }
    } catch (error) {
        console.error('전체 부가 혜택 목록 로드 중 오류 발생:', error);
    }
}

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

        await loadAllBenefits();
        loadChatList();
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

function updateUserProfileDisplay(name) {
    const userProfileNameElement = document.getElementById('userProfileName');
    if (userProfileNameElement && name) {
        userProfileNameElement.textContent = name;
    }
}

function updateChatHeader(title) {
    const chatHeader = document.querySelector('.chat-main .chat-header');
    if (chatHeader) {
        chatHeader.textContent = title;
    }
}

// 채팅 목록 로드 (API 호출)
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
            renderChatList(chatRooms, false);

            if (chatRooms.length > 0) {
                lastChatRoomId = chatRooms[chatRooms.length - 1].chatRoomId;
            }
            if (chatRooms.length < CHAT_LIST_PAGE_SIZE) {
                allChatRoomsLoaded = true;
            }
        } else {
            renderChatList([], false);
            allChatRoomsLoaded = true;
        }
    } catch (error) {
        console.error('채팅 목록 로드 중 오류 발생:', error);
        chatListContainer.innerHTML = '<div class="no-chats">목록을 불러올 수 없습니다.</div>';
    } finally {
        isLoadingMoreChatRooms = false;
    }
}

// 추가 채팅 목록 로드 (스크롤 하단)
async function loadMoreChatRooms() {
    if (isLoadingMoreChatRooms || allChatRoomsLoaded || !userId) return;

    isLoadingMoreChatRooms = true;

    try {
        const response = await fetch('https://www.visiblego.com/gateway/chatbot/chat-room-list', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                chatRoomId: lastChatRoomId,
                size: CHAT_LIST_PAGE_SIZE
            })
        });

        if (!response.ok) {
            throw new Error(`추가 채팅 목록 로드 실패: ${response.status}`);
        }

        const result = await response.json();

        if (result && result.data && result.data.chatRooms && result.data.chatRooms.length > 0) {
            const chatRooms = result.data.chatRooms;
            renderChatList(chatRooms, true);

            const newLastChatRoomId = chatRooms[chatRooms.length - 1].chatRoomId;

            if (newLastChatRoomId === lastChatRoomId) {
                allChatRoomsLoaded = true;
                return;
            }
            lastChatRoomId = newLastChatRoomId;

            if (chatRooms.length < CHAT_LIST_PAGE_SIZE) {
                allChatRoomsLoaded = true;
            }
        } else {
            allChatRoomsLoaded = true;
        }
    } catch (error) {
        console.error('추가 채팅 목록 로드 중 오류 발생:', error);
        allChatRoomsLoaded = true;
    } finally {
        isLoadingMoreChatRooms = false;
    }
}

function renderChatList(chatList, append = false) {
    const chatListContainer = document.getElementById('chatList');

    if (!append) {
        chatListContainer.innerHTML = '';
    } else {
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

        if (chat.chatRoomId === currentChatId) {
            chatItem.classList.add('active');
        }

        chatItem.onclick = () => selectChat(chat.chatRoomId);

        const title = chat.firstMessage || '새로운 대화';

        const creationDate = new Date(chat.createdAt);
        const year = creationDate.getFullYear();
        const month = String(creationDate.getMonth() + 1).padStart(2, '0');
        const day = String(creationDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}/${month}/${day}`;
        
        chatItem.innerHTML = `
            <div class="chat-item-content">
                <span class="chat-item-title">${title}</span>
                <span class="chat-item-date">${formattedDate}</span>
            </div>
        `;
        
        chatListContainer.appendChild(chatItem);
    });
};

function selectChat(chatId) {
    const currentLoadingState = chatRoomStates[currentChatId];
    if (currentLoadingState && currentLoadingState.isLoadingMoreMessages) {
        console.log('이전 메시지를 로딩 중이므로 채팅방을 변경할 수 없습니다.');
        return;
    }

    if (currentChatId === chatId) {
        return;
    }
    
    currentChatId = chatId;
    console.log(`채팅방 선택: ${chatId}`);

    if (!chatRoomStates[currentChatId]) {
        chatRoomStates[currentChatId] = {
            oldestMessageId: null,
            allHistoryLoaded: false,
            isLoadingMoreMessages: false
        };
    }

    document.querySelectorAll('.chat-item.active').forEach(item => {
        item.classList.remove('active');
    });

    const selectedChatItem = document.querySelector(`.chat-item[data-chat-id='${chatId}']`);
    if(selectedChatItem) {
        selectedChatItem.classList.add('active');
        const titleElement = selectedChatItem.querySelector('.chat-item-title');
        if (titleElement) {
             updateChatHeader(titleElement.textContent.trim());
        }
    }

    loadChatContent(chatId);
}

// 채팅 내용 로드 (API 호출)
async function loadChatContent(chatId) {
    const chatContent = document.getElementById('chatContent');
    document.getElementById('suggestionContainer').classList.remove('show');
    
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
            result.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            chatRoomStates[currentChatId].oldestMessageId = result.data[0].messageId;

            if (result.data.length < CHAT_PAGE_SIZE) {
                chatRoomStates[currentChatId].allHistoryLoaded = true;
            } else {
                chatRoomStates[currentChatId].allHistoryLoaded = false;
            }

            result.data.forEach(msg => {
                if (msg.bot) {
                    if (msg.planShow === true) {
                        let messageContent = msg.content;
                        if (messageContent.startsWith('[')) {
                            messageContent = messageContent.substring(1);
                        }
                        const { intro, plans } = parseDtoPlans(messageContent);
                        renderDtoPlanCards(intro, plans, false);
                    } 
                    else if (msg.isRecommended === true || msg.content.includes('고객님의 통신 성향을 바탕으로') || msg.content.includes('고객님께 다음 요금제들을')) {
                        let messageContent = msg.content;
                        if (messageContent.startsWith('[')) {
                            messageContent = messageContent.substring(1);
                        }
                        const { intro, plans } = parseTextPlans(messageContent);
                        renderTextPlanCards(intro, plans, false, false);
                    } else {
                        addMessageToChat('bot', msg.content, msg.timestamp);
                    }
                } else {
                    addMessageToChat('user', msg.content, msg.timestamp);
                }
            });

            chatContent.scrollTop = chatContent.scrollHeight;
        } else {
            addMessageToChat('system', '이전 대화 내용이 없습니다.');
            if(chatRoomStates[currentChatId]) chatRoomStates[currentChatId].allHistoryLoaded = true;
        }

    } catch (error) {
        console.error('대화 내용 로드 중 오류 발생:', error);
        chatContent.innerHTML = '';
        addMessageToChat('system', '대화 내용을 불러오는 중 오류가 발생했습니다.');
    }
}

// 이전 대화 내역 추가 로드 (스크롤 상단 도달 시)
async function loadMoreChatContent() {
    const currentState = chatRoomStates[currentChatId];

    if (!currentState || currentState.isLoadingMoreMessages || currentState.allHistoryLoaded || !currentState.oldestMessageId) {
        return;
    }
    currentState.isLoadingMoreMessages = true;

    const chatContent = document.getElementById('chatContent');
    const oldScrollHeight = chatContent.scrollHeight;

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
                lastMessageId: currentState.oldestMessageId,
                pageSize: CHAT_PAGE_SIZE
            })
        });

        loadingIndicator.remove();

        if (!response.ok) {
            throw new Error(`이전 대화 내용 로드 실패: ${response.status}`);
        }

        const result = await response.json();

        if (result && result.data && result.data.length > 0) {
            result.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            const newOldestMessageId = result.data[0].messageId;

            if (newOldestMessageId === currentState.oldestMessageId) {
                currentState.allHistoryLoaded = true;
                console.warn("서버로부터 중복된 데이터가 수신되어 이전 대화 로드를 중지합니다.");
                return;
            }

            currentState.oldestMessageId = newOldestMessageId;

            if (result.data.length < CHAT_PAGE_SIZE) {
                currentState.allHistoryLoaded = true;
            }

            for (let i = result.data.length - 1; i >= 0; i--) {
                const msg = result.data[i];

                if (msg.bot) {
                    if (msg.planShow === true) {
                        let messageContent = msg.content;
                        if (messageContent.startsWith('[')) {
                            messageContent = messageContent.substring(1);
                        }
                        const { intro, plans } = parseDtoPlans(messageContent);
                        renderDtoPlanCards(intro, plans, true);
                    }
                    else if (msg.isRecommended === true || msg.content.includes('고객님의 통신 성향을 바탕으로') || msg.content.includes('고객님께 다음 요금제들을')) {
                        let messageContent = msg.content;
                        if (messageContent.startsWith('[')) {
                            messageContent = messageContent.substring(1);
                        }
                        const { intro, plans } = parseTextPlans(messageContent);
                        renderTextPlanCards(intro, plans, true, false);
                    } else {
                        prependMessageToChat('bot', msg.content, msg.timestamp);
                    }
                } else {
                    prependMessageToChat('user', msg.content, msg.timestamp);
                }
            }

            const newScrollHeight = chatContent.scrollHeight;
            chatContent.scrollTop = newScrollHeight - oldScrollHeight;

        } else {
            currentState.allHistoryLoaded = true;
        }

    } catch (error) {
        console.error('이전 대화 내용 로드 중 오류 발생:', error);
        if(loadingIndicator) loadingIndicator.remove();
        if (chatRoomStates[currentChatId]) chatRoomStates[currentChatId].allHistoryLoaded = true;
    } finally {
        if (chatRoomStates[currentChatId]) chatRoomStates[currentChatId].isLoadingMoreMessages = false;
    }
}


// 새 채팅 생성
function createNewChat() {
    currentChatId = null;

    displayWelcomeMessage();

    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });

    console.log('새 채팅을 시작합니다. 다음 메시지는 새 채팅방을 생성합니다.');
}

// 환영 메시지 표시 함수
function displayWelcomeMessage() {
    const chatContent = document.getElementById('chatContent');
    const suggestionContainer = document.getElementById('suggestionContainer');
    const messageInput = document.getElementById('messageInput');

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
            <p class="start-prompt">아래 입력창에 궁금한 점을 직접 입력하거나 추천 질문을 눌러보세요!</p>
        </div>
    `;

    suggestionContainer.innerHTML = '';
    const suggestions = ['요금제 추천', '요금제 조회', '내 정보 확인', '심심풀이'];

    suggestions.forEach(text => {
        const button = document.createElement('div');
        button.className = 'suggestion-item';
        button.textContent = text;
        
        button.onclick = () => {
            messageInput.value = text;
            messageInput.focus();
        };
        
        suggestionContainer.appendChild(button);
    });

    suggestionContainer.classList.add('show');
    updateChatHeader('새로운 대화');
}

// [MODIFIED] 메시지 전송 함수
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

                if (!chatRoomStates[currentChatId]) {
                    chatRoomStates[currentChatId] = {
                        oldestMessageId: null,
                        allHistoryLoaded: false,
                        isLoadingMoreMessages: false
                    };
                }
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
        removeMessage(loadingMessageId);

        if (result && result.data) {
            const botResponse = result.data;

            if (botResponse.isPlanShow === true) {
                let messageContent = botResponse.message;
                if (messageContent.startsWith('[')) {
                    messageContent = messageContent.substring(1);
                }
                const { intro, plans } = parseDtoPlans(messageContent);
                renderDtoPlanCards(intro, plans, false);
            }
            else if (botResponse.isRecommended === true) {
                let messageContent = botResponse.message;
                if (messageContent.startsWith('[')) {
                    messageContent = messageContent.substring(1);
                }
                const { intro, plans } = parseTextPlans(messageContent);
                renderTextPlanCards(intro, plans, false, true);
            } else {
                addMessageToChat('bot', botResponse.message);
            }
        } else {
             addMessageToChat('bot', '응답을 받을 수 없습니다.');
        }

        if (isNewChat) {
            const chatListContainer = document.getElementById('chatList');
            const noChatsMessage = chatListContainer.querySelector('.no-chats');
            if (noChatsMessage) {
                noChatsMessage.remove();
            }
            
            document.querySelectorAll('.chat-item.active').forEach(item => item.classList.remove('active'));

            // [FIX] 클로저(closure) 문제 해결을 위해 새로운 채팅방 ID를 지역 상수에 할당
            const newChatRoomId = currentChatId;

            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item active';
            chatItem.dataset.chatId = newChatRoomId; // 지역 상수 사용
            chatItem.onclick = () => selectChat(newChatRoomId); // 지역 상수 사용

            const creationDate = new Date();
            const year = creationDate.getFullYear();
            const month = String(creationDate.getMonth() + 1).padStart(2, '0');
            const day = String(creationDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}/${month}/${day}`;
            
            chatItem.innerHTML = `
                <div class="chat-item-content">
                    <span class="chat-item-title">${message}</span>
                    <span class="chat-item-date">${formattedDate}</span>
                </div>
            `;
            
            chatListContainer.prepend(chatItem);
            updateChatHeader(message);
        }

    } catch (error) {
        console.error('메시지 전송 실패:', error);
        removeMessage(loadingMessageId);
        addMessageToChat('bot', '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.');
        if (isNewChat) {
            currentChatId = null;
            updateChatHeader('새로운 대화');
        }
    }
}

// STT로부터 메시지 입력
function setMessageFromSTT(message) {
    if (!message) return;

    const messageInput = document.getElementById('messageInput');
    messageInput.value = message;
    messageInput.focus();
}

// 채팅에 메시지 추가
function addMessageToChat(sender, message, timestamp) {
    const chatContent = document.getElementById('chatContent');

    if (sender === 'system') {
        const welcomeMessage = chatContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    } else {
        const welcomeMessage = chatContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            chatContent.innerHTML = '';
            document.getElementById('suggestionContainer').classList.remove('show');
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
        const date = timestamp ? new Date(timestamp) : new Date();
        messageTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.appendChild(messageTime);
    }

    chatContent.appendChild(messageElement);
    chatContent.scrollTop = chatContent.scrollHeight;

    return messageId;
}

// 채팅에 메시지 앞에 추가 (이전 대화 로드용)
function prependMessageToChat(sender, message, timestamp) {
    const chatContent = document.getElementById('chatContent');

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.textContent = message;

    messageElement.appendChild(messageBubble);

    if (timestamp) {
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        const date = new Date(timestamp);
        messageTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.appendChild(messageTime);
    }

    const loadingIndicator = chatContent.querySelector('.loading-indicator');
    if(loadingIndicator) {
         loadingIndicator.insertAdjacentElement('afterend', messageElement);
    } else {
        chatContent.prepend(messageElement);
    }
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

// 음성 녹음 시작
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

function parseTextPlans(text) {
    const plans = [];
    const parts = text.split("요금제:").filter(p => p.trim() !== '');

    if (parts.length === 0) {
        return { intro: text, plans: [], outro: '' };
    }

    const intro = parts.shift().trim();
    let outro = '';

    const outroMarker = '또 저랑 무엇을 하길 원하나요?';

    if (parts.length > 0) {
        const lastPartIndex = parts.length - 1;
        let lastPart = parts[lastPartIndex];

        if (lastPart.includes(outroMarker)) {
            const splitLastPart = lastPart.split(outroMarker);
            parts[lastPartIndex] = splitLastPart[0];
            outro = splitLastPart[1] ? splitLastPart[1].trim() : '';
        }
    }

    parts.forEach(part => {
        const lines = part.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length < 1) return;

        const plan = { '요금제': lines.shift().replace(/-|'/g, '').trim() };

        lines.forEach(line => {
            const detail = line.split(':');
            if (detail.length === 2) {
                const key = detail[0].replace(/-|'/g, '').trim();
                const value = detail[1].replace(/-|'/g, '').trim();
                plan[key] = value;
            }
        });

        if (plan['요금제']) {
            plans.push(plan);
        }
    });

    return { intro, plans, outro };
}

function parseDtoPlans(messageContent) {
    const plans = [];
    let intro = messageContent;

    const planRegex = /FilterListResponseDto\(([^)]+)\)/g;
    const planStrings = messageContent.match(planRegex);

    if (!planStrings) {
        return { intro: messageContent, plans: [] };
    }

    const firstMatchIndex = messageContent.indexOf(planStrings[0]);
    intro = messageContent.substring(0, firstMatchIndex).trim();

    planStrings.forEach(planString => {
        const plan = {};
        const fieldsString = planString.substring(22, planString.length - 1); 
        
        const pairs = fieldsString.split(/, (?=\w+=)/);

        pairs.forEach(pair => {
            const [key, ...valueParts] = pair.split('=');
            let value = valueParts.join('=');

            if (value === 'null') {
                value = null;
            } else if (value === 'true' || value === 'false') {
                value = (value === 'true');
            } else if (value.startsWith('[')) {
                // Keep as string
            }
            else if (!isNaN(value) && value.trim() !== '' && !value.includes('-')) {
                if (!/\D/.test(value)) {
                    value = Number(value);
                }
            }
            
            plan[key.trim()] = value;
        });
        plans.push(plan);
    });

    return { intro, plans };
}

function handleFeedbackClick(buttonElement, feedbackText, displayText) {
    const feedbackContainer = buttonElement.closest('.feedback-buttons');
    if (feedbackContainer) {
        feedbackContainer.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
        buttonElement.classList.add('selected');
    }
    addMessageToChat('user', displayText);
    sendFeedbackToServer(feedbackText);
}

async function sendFeedbackToServer(feedbackMessage) {
    if (!feedbackMessage || !currentChatId) return;

    const loadingMessageId = addMessageToChat('bot', '응답을 처리중입니다...');

    try {
        const response = await fetch('https://www.visiblego.com/gateway/chatbot/api/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                chatRoomId: currentChatId,
                message: feedbackMessage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        removeMessage(loadingMessageId);

        if (result && result.data && result.data.message) {
            const botResponse = result.data;
            
            if (botResponse.isPlanShow === true) {
                let messageContent = botResponse.message;
                if (messageContent.startsWith('[')) {
                    messageContent = messageContent.substring(1);
                }
                const { intro, plans } = parseDtoPlans(messageContent);
                renderDtoPlanCards(intro, plans, false);
            }
            else if (botResponse.isRecommended === true) {
                let messageContent = botResponse.message;
                if (messageContent.startsWith('[')) {
                    messageContent = messageContent.substring(1);
                }
                const { intro, plans } = parseTextPlans(messageContent);
                renderTextPlanCards(intro, plans, false, true);
            }
            else {
                addMessageToChat('bot', botResponse.message);
            }
        } else {
            addMessageToChat('bot', '피드백에 대한 응답을 받지 못했습니다.');
        }

    } catch (error) {
        console.error('피드백 전송 실패:', error);
        removeMessage(loadingMessageId);
        addMessageToChat('bot', '죄송합니다. 피드백 처리 중 오류가 발생했습니다.');
    }
}

function renderTextPlanCards(intro, plans, prepend = false, showFeedback = false) {
    const chatContent = document.getElementById('chatContent');
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'message bot';
    let cardsHTML = `<div class="message-bubble">`;

    if (intro) {
        cardsHTML += `<p class="plan-intro-text">${intro}</p>`;
    }
    cardsHTML += `<div class="plan-cards-container">`;
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
    cardsHTML += `</div>`;

    if (showFeedback) {
        cardsHTML += `
            <div class="feedback-section">
                <div class="feedback-section-title">더 나은 추천을 위해 피드백을 남겨주세요!</div>
                <div class="feedback-buttons">
                    <button onclick="handleFeedbackClick(this, '데이터 부족', '데이터가 부족해요.')">데이터 부족</button>
                    <button onclick="handleFeedbackClick(this, '데이터 너무 많음', '데이터가 너무 많아요.')">데이터 많음</button>
                    <button onclick="handleFeedbackClick(this, '가격 비쌈', '가격이 비싸요.')">가격 비쌈</button>
                    <button onclick="handleFeedbackClick(this, '가격 너무 저렴', '가격이 너무 저렴해요.')">가격 저렴</button>
                    <button onclick="handleFeedbackClick(this, '부가 혜택 부족', '부가 혜택이 부족해요.')">혜택 부족</button>
                    <button onclick="handleFeedbackClick(this, '끝', '만족스러워요.')" class="btn-positive">만족해요</button>
                </div>
            </div>
        `;
    }
    cardsHTML += `</div>`;
    cardsContainer.innerHTML = cardsHTML;

    if (prepend) {
        const loadingIndicator = chatContent.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.insertAdjacentElement('afterend', cardsContainer);
        } else {
             chatContent.prepend(cardsContainer);
        }
    } else {
        const welcomeMessage = chatContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            chatContent.innerHTML = '';
        }
        chatContent.appendChild(cardsContainer);
        chatContent.scrollTop = chatContent.scrollHeight;
    }
};

function requestPlanChange(planId, benefitIdListString) {
    try {
        const benefitIds = JSON.parse(benefitIdListString);
        alert(`'요금제 변경하기' 기능은 현재 개발 중입니다.\n\n선택된 요금제 ID: ${planId}\n선택된 혜택 ID 목록: ${benefitIds.join(', ') || '없음'}`);
        console.log("요금제 변경 요청 (API 미연결):", { planId, benefitIds });
    } catch(e) {
        alert(`'요금제 변경하기' 기능은 현재 개발 중입니다.\n\n선택된 요금제 ID: ${planId}`);
        console.log("요금제 변경 요청 (API 미연결):", { planId });
    }
}

function renderDtoPlanCards(intro, plans, prepend = false) {
    const chatContent = document.getElementById('chatContent');
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'message bot';
    let cardsHTML = `<div class="message-bubble">`;
    
    if (intro) {
        const introP = document.createElement('p');
        introP.className = 'plan-intro-text';
        introP.innerText = intro;
        cardsHTML += introP.outerHTML;
    }

    cardsHTML += `<div class="plan-cards-container">`;

    plans.forEach(plan => {
        const dataDisplay = plan.dataAllowance === 99999 ? '무제한' : 
                            (plan.dataAllowance != null ? `${plan.dataAllowance}${plan.dataAllowanceUnit || 'GB'}` : '정보 없음');
        
        const tetheringDisplay = plan.tetheringDataAmount != null ? `${plan.tetheringDataAmount}${plan.tetheringDataUnit || 'GB'}` : '정보 없음';
        const voiceDisplay = plan.voiceAllowance != null ? (plan.voiceAllowance === 0 ? '기본제공' : `${plan.voiceAllowance}분`) : '기본제공';
        const additionalCallDisplay = plan.additionalCallAllowance != null ? `${plan.additionalCallAllowance}분` : '정보 없음';
        const monthlyFeeDisplay = plan.monthlyFee != null ? `${plan.monthlyFee.toLocaleString()}원` : '정보 없음';

        // [MODIFIED] 부가 혜택 표시 HTML 생성 로직
        let benefitsHTML = '';
        if (allBenefitsMap.size > 0 && plan.benefitIdList && plan.benefitIdList.length > 2) { // length > 2는 '[]' 케이스 방지
            try {
                const benefitIds = JSON.parse(plan.benefitIdList);
                if (Array.isArray(benefitIds) && benefitIds.length > 0) {
                    
                    const benefitNames = benefitIds
                        .map(id => allBenefitsMap.get(id)) // ID를 이름으로 변환
                        .filter(name => name); // 이름이 없는 경우(null, undefined) 필터링
                    
                    if (benefitNames.length > 0) {
                        benefitsHTML = `
                            <div class="plan-benefits">
                                <div class="benefits-title">✨ 주요 혜택</div>
                                <div class="benefits-tags">
                                    ${benefitNames.map(name => `<span class="benefit-tag">${name}</span>`).join('')}
                                </div>
                            </div>
                        `;
                    }
                }
            } catch (e) {
                console.error("benefitIdList 파싱 오류:", plan.benefitIdList, e);
            }
        }
        
        cardsHTML += `
            <div class="plan-card">
                <div class="plan-card-header">
                    ${plan.planCategory ? `<span class="plan-category">${plan.planCategory}</span>` : ''}
                    <h3 class="plan-name">${plan.planName || '이름 없는 요금제'}</h3>
                </div>
                <div class="plan-card-body">
                    <p class="plan-fee"><strong>월 요금:</strong> ${monthlyFeeDisplay}</p>
                    <p class="plan-data"><strong>데이터:</strong> ${dataDisplay}</p>
                    <p class="plan-tethering"><strong>테더링/쉐어링:</strong> ${tetheringDisplay}</p>
                    <p class="plan-calls"><strong>음성통화:</strong> ${voiceDisplay}</p>
                    <p class="plan-additional-calls"><strong>부가통화:</strong> ${additionalCallDisplay}</p>
                </div>
                ${benefitsHTML}
                <div class="plan-card-footer">
                    <button class="change-plan-btn" onclick="requestPlanChange(${plan.planId}, '${plan.benefitIdList}')">요금제 변경하기</button>
                </div>
            </div>
        `;
    });
    
    cardsHTML += `</div></div>`;
    cardsContainer.innerHTML = cardsHTML;
    
    if (prepend) {
        const loadingIndicator = chatContent.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.insertAdjacentElement('afterend', cardsContainer);
        } else {
             chatContent.prepend(cardsContainer);
        }
    } else {
        const welcomeMessage = chatContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            chatContent.innerHTML = '';
        }
        chatContent.appendChild(cardsContainer);
        chatContent.scrollTop = chatContent.scrollHeight;
    }
}