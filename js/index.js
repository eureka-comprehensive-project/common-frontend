// 챗봇 상태 관리
let chatStep = 'welcome';
let userInfo = {
  name: '',
  age: '',
  dataUsage: '',
  budget: '',
  needs: []
};

// 요금제 데이터
const plans = [
  {
    id: '1',
    name: '5G 프리미엄',
    price: 89000,
    data: '무제한',
    call: '무제한',
    features: ['5G 무제한', '넷플릭스 포함', '유튜브 프리미엄', '해외로밍 30일']
  },
  {
    id: '2',
    name: '5G 스탠다드',
    price: 69000,
    data: '100GB',
    call: '무제한',
    features: ['5G 100GB', '넷플릭스 베이직', '유튜브 뮤직', '해외로밍 7일']
  },
  {
    id: '3',
    name: '5G 라이트',
    price: 49000,
    data: '50GB',
    call: '무제한',
    features: ['5G 50GB', '기본 통화', '문자 무제한', '와이파이 존']
  },
  {
    id: '4',
    name: '4G 베이직',
    price: 29000,
    data: '20GB',
    call: '무제한',
    features: ['4G 20GB', '기본 통화', '문자 무제한']
  }
];

// 챗봇 열기
function openChatbot() {
  document.getElementById('chatbotOverlay').style.display = 'block';
  if (chatStep === 'welcome') {
    initWelcomeStep();
  }
}

// 챗봇 닫기
function closeChatbot() {
  document.getElementById('chatbotOverlay').style.display = 'none';
}

// 메시지 추가
function addMessage(message, isBot = false) {
  const chatContent = document.getElementById('chatbotContent');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isBot ? 'bot' : 'user'}`;
  messageDiv.innerHTML = `<div class="message-bubble">${message}</div>`;
  chatContent.appendChild(messageDiv);
  chatContent.scrollTop = chatContent.scrollHeight;
}

// 환영 단계 초기화
function initWelcomeStep() {
  const chatContent = document.getElementById('chatbotContent');
  chatContent.innerHTML = '';

  addMessage('안녕하세요! U+ 상담봇입니다. 😊', true);
  addMessage('고객님께 최적의 요금제를 추천해드리겠습니다.', true);
  addMessage("'요금제 추천'을 입력해주세요!", true);

  const inputDiv = document.createElement('div');
  inputDiv.innerHTML = `
                <input type="text" class="input-field" placeholder="요금제 추천" 
                       onkeypress="handleWelcomeInput(event)" id="welcomeInput">
            `;
  chatContent.appendChild(inputDiv);
}

// 환영 단계 입력 처리
function handleWelcomeInput(event) {
  if (event.key === 'Enter') {
    const input = event.target.value;
    if (input.includes('요금제')) {
      addMessage(input, false);
      chatStep = 'info-form';
      showInfoForm();
    }
  }
}

// 정보 수집 폼 표시
function showInfoForm() {
  addMessage('요금제 추천을 위해 몇 가지 정보를 알려주세요!', true);

  const chatContent = document.getElementById('chatbotContent');
  const formDiv = document.createElement('div');
  formDiv.innerHTML = `
                <div style="background: #F9FAFB; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
                    <div class="form-group">
                        <label for="userName">성함</label>
                        <input type="text" id="userName" placeholder="홍길동">
                    </div>
                    
                    <div class="form-group">
                        <label for="userAge">연령대</label>
                        <select id="userAge">
                            <option value="">연령대 선택</option>
                            <option value="20s">20대</option>
                            <option value="30s">30대</option>
                            <option value="40s">40대</option>
                            <option value="50s">50대 이상</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="dataUsage">데이터 사용량</label>
                        <select id="dataUsage">
                            <option value="">사용량 선택</option>
                            <option value="light">적게 사용 (20GB 이하)</option>
                            <option value="medium">보통 사용 (20-100GB)</option>
                            <option value="heavy">많이 사용 (100GB 이상)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="budget">월 예산</label>
                        <select id="budget">
                            <option value="">예산 선택</option>
                            <option value="30000">3만원 이하</option>
                            <option value="50000">5만원 이하</option>
                            <option value="70000">7만원 이하</option>
                            <option value="100000">10만원 이하</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>필요한 서비스 (중복 선택 가능)</label>
                        <div class="needs-tags">
                            <span class="need-tag" onclick="toggleNeed('streaming')">스트리밍</span>
                            <span class="need-tag" onclick="toggleNeed('roaming')">해외로밍</span>
                            <span class="need-tag" onclick="toggleNeed('unlimited')">무제한</span>
                            <span class="need-tag" onclick="toggleNeed('gaming')">게임</span>
                        </div>
                    </div>
                    
                    <button class="btn" style="width: 100%; margin-top: 1rem;" onclick="generateRecommendations()">
                        요금제 추천받기
                    </button>
                </div>
            `;
  chatContent.appendChild(formDiv);
}

// 필요 서비스 토글
function toggleNeed(need) {
  const tag = event.target;
  if (userInfo.needs.includes(need)) {
    userInfo.needs = userInfo.needs.filter(n => n !== need);
    tag.classList.remove('selected');
  } else {
    userInfo.needs.push(need);
    tag.classList.add('selected');
  }
}

// 추천 생성
function generateRecommendations() {
  // 사용자 정보 수집
  userInfo.name = document.getElementById('userName').value;
  userInfo.age = document.getElementById('userAge').value;
  userInfo.dataUsage = document.getElementById('dataUsage').value;
  userInfo.budget = document.getElementById('budget').value;

  if (!userInfo.name || !userInfo.age || !userInfo.dataUsage || !userInfo.budget) {
    alert('모든 정보를 입력해주세요.');
    return;
  }

  // 추천 알고리즘
  const scoredPlans = plans.map(plan => {
    let score = 0;

    // 예산 기반 점수
    const budget = parseInt(userInfo.budget);
    if (plan.price <= budget) score += 30;
    else if (plan.price <= budget * 1.2) score += 15;

    // 데이터 사용량 기반 점수
    if (userInfo.dataUsage === 'heavy' && plan.data === '무제한') score += 25;
    if (userInfo.dataUsage === 'medium' && (plan.data === '100GB' || plan.data === '무제한')) score += 25;
    if (userInfo.dataUsage === 'light' && plan.data !== '무제한') score += 25;

    // 나이대 기반 점수
    if (userInfo.age === '20s' && plan.features.some(f => f.includes('넷플릭스') || f.includes('유튜브'))) score += 20;
    if (userInfo.age === '30s' && plan.name.includes('스탠다드')) score += 15;
    if (userInfo.age === '40s' && plan.name.includes('라이트')) score += 15;

    // 필요 기능 기반 점수
    userInfo.needs.forEach(need => {
      if (need === 'streaming' && plan.features.some(f => f.includes('넷플릭스') || f.includes('유튜브'))) score += 15;
      if (need === 'roaming' && plan.features.some(f => f.includes('로밍'))) score += 15;
      if (need === 'unlimited' && plan.data === '무제한') score += 15;
    });

    return { ...plan, score };
  });

  scoredPlans.sort((a, b) => b.score - a.score);
  const recommendedPlans = scoredPlans.slice(0, 3);

  showRecommendations(recommendedPlans);
}

// 추천 결과 표시
function showRecommendations(recommendedPlans) {
  chatStep = 'recommendations';
  addMessage(`${userInfo.name}님께 추천하는 요금제입니다! 🎉`, true);

  const chatContent = document.getElementById('chatbotContent');

  recommendedPlans.forEach((plan, index) => {
    const planDiv = document.createElement('div');
    planDiv.className = `plan-card ${index === 0 ? 'recommended' : ''}`;
    planDiv.innerHTML = `
                    <div class="plan-header">
                        <div class="plan-name">${plan.name}</div>
                        ${index === 0 ? '<div class="recommended-badge">최고 추천</div>' : ''}
                    </div>
                    <div class="plan-price">월 ${plan.price.toLocaleString()}원</div>
                    <div class="plan-details">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>데이터:</span>
                            <span style="font-weight: 600;">${plan.data}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>통화:</span>
                            <span style="font-weight: 600;">${plan.call}</span>
                        </div>
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <div style="font-size: 0.75rem; color: #6B7280; margin-bottom: 0.5rem;">포함 서비스:</div>
                        <div class="plan-features">
                            ${plan.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                        </div>
                    </div>
                    <button class="plan-btn">가입하기</button>
                `;
    chatContent.appendChild(planDiv);
  });

  // 다시 추천받기 버튼
  const resetDiv = document.createElement('div');
  resetDiv.innerHTML = `
                <div style="text-align: center; margin-top: 1rem;">
                    <button class="btn" onclick="resetChat()" style="background: white; color: #8B5CF6; border: 1px solid #8B5CF6;">
                        다시 추천받기
                    </button>
                </div>
            `;
  chatContent.appendChild(resetDiv);
}

// 채팅 리셋
function resetChat() {
  chatStep = 'welcome';
  userInfo = {
    name: '',
    age: '',
    dataUsage: '',
    budget: '',
    needs: []
  };
  initWelcomeStep();
}