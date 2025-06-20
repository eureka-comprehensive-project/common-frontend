// 전역 변수 선언
let accessToken = null;
let userId = null;
let currentPlanId = null;
let allAvailableBenefits = [];
let currentPricingData = []; // 현재 로드된 요금제 데이터 저장
let allPlansData = [];       // [추가] 모든 요금제 원본 데이터를 저장할 변수

// 카테고리 ID 매핑 (업데이트된 버전)
const categoryMap = {
  'all': 0,           // 전체
  'premium': 1,       // 프리미엄
  'youth': 2,         // 유스
  'senior': 3,        // 시니어
  'direct': 4,        // 다이렉트
  'nugget': 5,        // 너겟
  'welfare': 6,       // 복지
  'teen': 7,          // 청소년
};

// 혜택 데이터 저장 변수
let benefitsData = [];

// 데이터 용량 분류 함수
function classifyDataSize(dataAllowance) {
  if (!dataAllowance || !dataAllowance.dataAmount) {
    return 'unknown';
  }

  let monthlyDataAmount = dataAllowance.dataAmount;
  
  // 일 단위인 경우 월 환산 (30일 기준)
  if (dataAllowance.dataPeriod === 'DAY') {
    monthlyDataAmount = dataAllowance.dataAmount * 30;
  }
  
  // 무제한 (99999 이상)
  if (monthlyDataAmount >= 99999) {
    return 'unlimited';
  }
  
  // 10GB 기준으로 대용량/소용량 분류
  if (monthlyDataAmount <= 10) {
    return 'small';  // 소용량
  } else {
    return 'large';  // 대용량
  }
}

// 클라이언트 사이드에서 데이터 분류가 필요한 경우를 위한 함수
function filterDataBySize(pricingData, sizeFilter) {
  if (!sizeFilter || sizeFilter === 'all') {
    return pricingData;
  }
  
  return pricingData.filter(plan => {
    const dataClassification = classifyDataSize(plan.dataAllowance);
    
    switch (sizeFilter) {
      case 'small':
        return dataClassification === 'small';
      case 'large':
        return dataClassification === 'large';
      case 'unlimited':
        return dataClassification === 'unlimited';
      default:
        return true;
    }
  });
}

// 데이터 용량별 요금제 개수 확인 함수
function getDataSizeStats(pricingData) {
  const stats = {
    small: 0,
    large: 0,
    unlimited: 0,
    unknown: 0
  };
  
  pricingData.forEach(plan => {
    const classification = classifyDataSize(plan.dataAllowance);
    stats[classification]++;
  });
  
  return stats;
}

// 토큰 검증 및 사용자 정보 로드
async function validateTokenAndLoadUser() {
  console.log('🔍 토큰 검증 및 사용자 정보 로드 시작');
  
  try {
    accessToken = sessionStorage.getItem('accessToken');
    
    if (!accessToken) {
      console.log('❌ 토큰 없음 - 로그인 필요 표시');
      document.getElementById('profile-email').textContent = '로그인 필요';
      document.getElementById('userAvatar').textContent = '?';
      return;
    }

    // 토큰 검증
    const response = await fetch('https://www.visiblego.com/auth/validate', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ 토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.');
      sessionStorage.removeItem('accessToken');
      redirectToLogin();
      return;
    }

    const result = await response.json();
    console.log('✅ 토큰 검증 성공:', result);

    let resultData = result.data;
    userId = resultData.userId;
    console.log('사용자 ID:', userId);

    // 사용자 상세 정보 로드
    await fetchUserProfileDetailForEmailOnly();

  } catch (error) {
    console.error('❌ 토큰 검증 중 오류 발생:', error);
    redirectToLogin();
  }
}

// 사용자 상세 정보 불러오기 (이메일만)
async function fetchUserProfileDetailForEmailOnly() {
  try {
    const response = await fetch('https://www.visiblego.com/gateway/user/profileDetail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: userId })
    });

    const result = await response.json();

    if (result.message === 'fail') {
      console.warn(`${result.data.statusCode} ${result.data.detailMessage}`);
      return;
    }

    const email = result.data.email;
    document.getElementById('profile-email').textContent = email;

    // 아바타에 이메일 첫 글자 표시
    if (email) {
      const emailInitial = email.charAt(0).toUpperCase();
      document.getElementById('userAvatar').textContent = emailInitial;
    }

    showToast(`환영합니다! 🎉`, 'success');

  } catch (error) {
    console.error('이메일 불러오기 실패:', error);
    document.getElementById('profile-email').textContent = '사용자님';
    document.getElementById('userAvatar').textContent = '👤';
  }
}

// 로그인 페이지로 이동
function redirectToLogin() {
  window.location.href = '/page/login';
}

// 챗봇 페이지로 이동
function goToChatbot() {
  // 부드러운 페이지 전환 효과
  document.body.style.opacity = '0.8';
  setTimeout(() => {
    window.location.href = '/page/chatbot';
  }, 300);
}

// 프로필 메뉴 토글
function toggleProfileMenu() {
  const popup = document.getElementById('profilePopup');
  popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
}

// 프로필 팝업 닫기
function closeProfilePopup() {
  const popup = document.getElementById('profilePopup');
  popup.style.display = 'none';
}

// 마이페이지로 이동
async function goToMyPage() {
  try {
    if (accessToken) {
      closeProfilePopup();
      // 로딩 표시
      showToast('마이페이지로 이동중...', 'info');
      setTimeout(() => {
        window.location.href = '/page/mypage';
      }, 500);
    } else {
      showToast('로그인이 필요합니다', 'warning');
      setTimeout(() => {
        window.location.href = '/page/login';
      }, 1000);
    }
  } catch (error) {
    console.error('마이페이지 이동 중 오류 발생:', error);
    showToast('페이지 이동 중 오류가 발생했습니다', 'error');
  }
}

// 로그아웃 확인
async function confirmLogout() {
  // 커스텀 확인 모달 표시
  if (await showConfirmModal('로그아웃', '정말 로그아웃 하시겠습니까?', '로그아웃', '취소')) {
    try {
      showToast('로그아웃 중...', 'info');
      
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
      accessToken = '';
      closeProfilePopup();
      
      showToast('로그아웃되었습니다', 'success');
      setTimeout(() => {
        window.location.href = '/page/login';
      }, 1000);

    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      sessionStorage.removeItem('accessToken');
      accessToken = '';
      closeProfilePopup();
      showToast('로그아웃되었습니다', 'success');
      setTimeout(() => {
        window.location.href = '/page/login';
      }, 1000);
    }
  }
}

// 탭 전환 함수
function switchTab(tabElement, tabType) {
  // 탭 전환 애니메이션
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  tabElement.classList.add('active');
  
  // 로딩 표시
  showLoadingCards();
  
  console.log('Selected tab:', tabType);
  showToast(`${getCategoryDisplayName(tabType)} 요금제를 불러오는 중...`, 'info');

  // 해당 카테고리 요금제 데이터 로드
  setTimeout(() => {
    loadPricingData(tabType);
  }, 300);
}

// 로딩 카드 표시
function showLoadingCards() {
  const pricingCardsContainer = document.querySelector('.pricing-cards');
  pricingCardsContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-icon">🔄</div>
      <p>요금제 정보를 불러오는 중...</p>
    </div>
  `;
}

// 요금제 데이터 로드 함수 (API 연동)
async function loadPricingData(category = 'all') {
  console.log('Loading pricing data for category:', category);

  try {
    // 카테고리 ID 가져오기
    const categoryId = categoryMap[category];
    const apiUrl = `https://www.visiblego.com/gateway/plan/category/${categoryId}`;

    console.log('Category:', category);
    console.log('Category ID:', categoryId);
    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const apiResponse = await response.json();
    console.log('API response received:', apiResponse);

    // API 응답에서 data 배열 추출
    const pricingData = apiResponse.data || [];

    // 화면에 요금제 목록 표시
    displayPricingCards(pricingData);
    
    // 성공 메시지
    showToast(`${pricingData.length}개의 요금제를 찾았습니다`, 'success');

  } catch (error) {
    console.error('요금제 데이터 로드 중 오류 발생:', error);
    
    // 에러 발생 시 빈 배열로 표시
    displayPricingCards([]);
    showToast('요금제 정보를 불러오는데 실패했습니다', 'error');
  }
}

// 혜택 데이터 로드 함수 (개선된 버전)
async function loadBenefitsData() {
  console.log('📊 혜택 데이터 로딩 시작...');

  try {
    const response = await fetch('https://www.visiblego.com/gateway/plan/benefit', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`혜택 API 호출 실패: ${response.status}`);
    }

    const apiResponse = await response.json();
    console.log('혜택 API 응답:', apiResponse);

    if (apiResponse.statusCode === 200 && apiResponse.data) {
      benefitsData = apiResponse.data;
      console.log('✅ 혜택 데이터 로드 성공:', benefitsData.length, '개');
      updateBenefitsInFilter();
      return true;
    } else {
      throw new Error(apiResponse.message || 'API 응답 에러');
    }

  } catch (error) {
    console.error('❌ 혜택 데이터 로드 실패:', error);
    
    // 에러 발생 시 기본 혜택 데이터 사용
    benefitsData = [
      { benefitId: 1, benefitName: "넷플릭스", benefitType: "PREMIUM" },
      { benefitId: 2, benefitName: "디즈니+", benefitType: "PREMIUM" },
      { benefitId: 3, benefitName: "쿠팡플레이", benefitType: "PREMIUM" },
      { benefitId: 4, benefitName: "티빙", benefitType: "PREMIUM" },
      { benefitId: 5, benefitName: "멜론", benefitType: "MEDIA" },
      { benefitId: 6, benefitName: "유튜브뮤직", benefitType: "MEDIA" },
      { benefitId: 7, benefitName: "애플뮤직", benefitType: "MEDIA" },
      { benefitId: 8, benefitName: "스포티파이", benefitType: "MEDIA" }
    ];
    
    updateBenefitsInFilter();
    return false;
  }
}

// 필터 팝업의 혜택 섹션 업데이트 (개선된 버전)
function updateBenefitsInFilter() {
  const benefitsContainer = document.querySelector('.filter-brands');

  if (!benefitsContainer) {
    console.warn('혜택 필터 컨테이너(.filter-brands)를 찾을 수 없습니다.');
    return;
  }

  if (!benefitsData || benefitsData.length === 0) {
    benefitsContainer.innerHTML = `
      <div style="
        grid-column: 1 / -1; 
        text-align: center; 
        padding: 20px; 
        color: #6c757d; 
        font-size: 14px;
        border: 2px dashed #dee2e6;
        border-radius: 12px;
        background: #f8f9fa;
      ">
        혜택 정보를 불러올 수 없습니다
      </div>
    `;
    return;
  }

  // 혜택 타입별로 그룹핑
  const premiumBenefits = benefitsData.filter(benefit => benefit.benefitType === 'PREMIUM');
  const mediaBenefits = benefitsData.filter(benefit => benefit.benefitType === 'MEDIA');
  const basicBenefits = benefitsData.filter(benefit => benefit.benefitType === 'BASIC');
  const allBenefits = [...premiumBenefits, ...mediaBenefits, ...basicBenefits];

  console.log('혜택 타입별 분류:', {
    premium: premiumBenefits.length,
    media: mediaBenefits.length,
    basic: basicBenefits.length,
    total: allBenefits.length
  });

  const benefitsHTML = allBenefits.map(benefit => {
    const iconColor = getBenefitIconColor(benefit.benefitName);
    const initial = getBenefitInitial(benefit.benefitName);

    return `
      <div class="brand-item" onclick="toggleBenefit(this)" data-benefit-id="${benefit.benefitId}">
        <div class="brand-icon" style="background-color: ${iconColor};">
          ${initial}
        </div>
        <div class="brand-name">${benefit.benefitName}</div>
      </div>
    `;
  }).join('');
  
  benefitsContainer.innerHTML = benefitsHTML;
  console.log('✅ 혜택 필터 섹션 업데이트 완료');
}

// 혜택 아이콘 색상 가져오기
function getBenefitIconColor(benefitName) {
  const colorMap = {
    '넷플릭스': '#e50914',
    '디즈니+': '#1f3a93',
    '쿠팡플레이': '#ff6b35',
    '티빙': '#e74c3c',
    '멜론': '#00cd3c',
    '유튜브뮤직': '#ff0000',
    '애플뮤직': '#000000',
    '스포티파이': '#1ed760',
    'U+ 모바일tv 기본': '#e91e63'
  };
  return colorMap[benefitName] || '#6c757d';
}

// 혜택 이름의 첫 글자 가져오기
function getBenefitInitial(name) {
  if (name === '유튜브뮤직') return 'Y';
  if (name === '애플뮤직') return 'A';
  if (name === '스포티파이') return 'S';
  if (name === 'U+ 모바일tv 기본') return 'U';
  return name.charAt(0);
}

// 음성통화 표시 로직 수정
const getVoiceCallDisplay = (voiceCall) => {
  if (!voiceCall) return '정보없음';
  
  const basicCallAmount = voiceCall.voiceAllowance || 0;
  const additionalCallAmount = voiceCall.additionalCallAllowance || 0;
  
  // 0이거나 99999 이상인 경우 무제한으로 표시
  if (basicCallAmount === 0 || basicCallAmount >= 99999) {
    return additionalCallAmount > 0 
      ? `집/이동전화 무제한 (부가통화 ${additionalCallAmount}분)`
      : '집/이동전화 무제한';
  } else {
    // 실제 분수가 있는 경우 표시
    const basicText = `집/이동전화 ${basicCallAmount}분`;
    const additionalText = additionalCallAmount > 0 ? `부가통화 ${additionalCallAmount}분` : '';
    
    if (additionalText) {
      return `${basicText}, ${additionalText}`;
    } else {
      return basicText;
    }
  }
};

// displayPricingCards 함수의 완전한 수정 버전
function displayPricingCards(pricingData) {
  const pricingCardsContainer = document.querySelector('.pricing-cards');
  
  // 현재 요금제 데이터 저장
  currentPricingData = pricingData || [];

  if (!pricingData || pricingData.length === 0) {
    pricingCardsContainer.innerHTML = `
      <div class="loading-state">
        <div class="loading-icon">😔</div>
        <p>해당 조건에 맞는 요금제가 없습니다.</p>
        <p style="font-size: 14px; color: #6c757d; margin-top: 8px;">다른 조건으로 검색해보세요</p>
      </div>
    `;
    return;
  }

  // 데이터 표시 함수 (수정된 버전)
  const getDataDisplay = (dataAllowance) => {
    if (!dataAllowance) return '정보없음';
    
    const amount = dataAllowance.dataAmount;
    const unit = dataAllowance.dataUnit || 'GB';
    const period = dataAllowance.dataPeriod || 'MONTH';
    
    // 무제한 처리
    if (amount >= 99999) return '무제한';
    
    // 일 단위인 경우 표시 방식
    if (period === 'DAY') {
      const monthlyAmount = amount * 30;
      return `일 ${amount}${unit} (월 약 ${monthlyAmount}${unit})`;
    }
    
    // 월 단위인 경우
    return `${amount}${unit}`;
  };

  pricingCardsContainer.innerHTML = pricingData.map((plan, index) => {
    const animationDelay = index * 0.1;

    // 테더링+쉐어링 데이터 표시
    const getTetheringShareDisplay = (sharedData) => {
      if (!sharedData) return '0GB';
      const tetheringAmount = sharedData.tetheringDataAmount || 0;
      const familyAmount   = sharedData.familyDataAmount   || 0;
      const totalShared    = tetheringAmount + familyAmount;
      if (totalShared === 0) return '0GB';
      return `${totalShared}GB`;
    };

    // 월 요금 포맷팅
    const getPriceDisplay = (price) => {
      if (!price && price !== 0) return '정보없음';
      return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 카테고리 태그 스타일 (업데이트된 버전)
    const getCategoryTagStyle = (categoryName) => {
      const tagStyles = {
        '프리미엄': { bg: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', text: '#fff' },
        '유스':     { bg: 'linear-gradient(135deg, #4285f4 0%, #5a9fd4 100%)', text: '#fff' },
        '시니어':   { bg: 'linear-gradient(135deg, #34a853 0%, #4caf64 100%)', text: '#fff' },
        '다이렉트': { bg: 'linear-gradient(135deg, #795548 0%, #8d6e63 100%)', text: '#fff' },
        '너겟':     { bg: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)', text: '#fff' },
        '복지':     { bg: 'linear-gradient(135deg, #607d8b 0%, #78909c 100%)', text: '#fff' },
        '청소년':   { bg: 'linear-gradient(135deg, #9c27b0 0%, #ab47bc 100%)', text: '#fff' }
      };
      return tagStyles[categoryName] || { bg: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)', text: '#fff' };
    };

    // 특이사항 표시
    const getSpecialFeatures = (plan) => {
      const features = [];
      if (plan.dataAllowance && plan.dataAllowance.dataAmount < 99999) {
        features.push('다 쓰면 최대 5Mbps');
      }
      if (plan.voiceCall && plan.voiceCall.additionalCallAllowance > 0) {
        features.push(`부가통화 ${plan.voiceCall.additionalCallAllowance}분`);
      }
      return features;
    };

    // 혜택 이름 리스트
    const getBenefitsList = (benefits) => {
      if (!benefits || !Array.isArray(benefits) || benefits.length === 0) return [];
      const unique = benefits.filter((b, i, arr) =>
        i === arr.findIndex(x => x.benefitId === b.benefitId)
      );
      return unique.map(b => b.benefitName || '혜택');
    };

    // 혜택 개수 정보
    const getBenefitInfo = (benefits) => {
      if (!benefits || !Array.isArray(benefits) || benefits.length === 0) {
        return '혜택 없음';
      }
      const count = new Set(benefits.map(b => b.benefitId)).size;
      return `${count}개 혜택 💎`;
    };

    const categoryStyle   = getCategoryTagStyle(plan.categoryName);
    const specialFeatures = getSpecialFeatures(plan);
    const benefitsList    = getBenefitsList(plan.benefits);
    const benefitInfo     = getBenefitInfo(plan.benefits);

    return `
      <div class="new-pricing-card" style="animation: slideInUp 0.6s ease-out ${animationDelay}s both;">
        <div class="card-header">
          <div class="category-tag" style="background: ${categoryStyle.bg}; color: ${categoryStyle.text};">
            ${plan.categoryName || '기본'}
          </div>
          <div class="benefit-info">
            ${benefitInfo}
          </div>
        </div>

        <div class="card-body">
          <div class="plan-info">
            <h3 class="plan-name">${plan.planName || '요금제 이름'}</h3>
            <div class="data-info">
              <div class="data-main">📱 데이터 ${getDataDisplay(plan.dataAllowance)}</div>
              <div class="data-sub">🔗 테더링+쉐어링 ${getTetheringShareDisplay(plan.sharedData)}</div>
            </div>
            ${specialFeatures.length > 0 ? `
              <div class="special-features">
                ${specialFeatures.map(f => `<span class="feature-tag">⚡ ${f}</span>`).join('')}
              </div>
            ` : ''}
            ${benefitsList.length > 0 ? `
              <div class="benefits-list">
                <div class="benefits-title">🎁 혜택</div>
                <div class="benefits-items">
                  ${benefitsList.map(b => `<span class="benefit-item">${b}</span>`).join('')}
                </div>
              </div>
            ` : `
              <div class="benefits-list">
                <div class="benefits-title">🎁 혜택</div>
                <div class="benefits-items">
                  <span class="benefit-item">없음</span>
                </div>
              </div>
            `}
          </div>

          <div class="plan-actions">
            <div class="price-info">
              <div class="current-price">월 ${getPriceDisplay(plan.monthlyFee)}원</div>
            </div>
            <div class="action-buttons">
              <button class="btn-change" onclick="openBenefitSelectionModal('${plan.planId}')">
                ✨ 변경하기
              </button>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="additional-info">
            <span>📞 음성통화</span>
            <span>${getVoiceCallDisplay(plan.voiceCall)}</span>
          </div>
          <div class="additional-info">
            <span>💬 문자메시지</span>
            <span>기본제공</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 애니메이션 스타일 한 번만 추가
  if (!document.getElementById('card-animations')) {
    const style = document.createElement('style');
    style.id = 'card-animations';
    style.textContent = `
      @keyframes slideInUp {
        from { opacity: 0; transform: translateY(30px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

// 혜택 선택 모달 열기
function openBenefitSelectionModal(planId) {
  // planId를 숫자로 변환 (문자열로 들어올 수 있음)
  currentPlanId = parseInt(planId);
  
  console.log('🎯 혜택 선택 모달 열기 - Plan ID:', currentPlanId);
  
  if (!currentPlanId || currentPlanId === 'null') {
    showToast('요금제 정보를 찾을 수 없습니다', 'error');
    return;
  }

  // 현재 요금제 데이터에서 해당 planId 찾기
  const currentPlan = currentPricingData.find(plan => plan.planId === currentPlanId);
  
  if (!currentPlan) {
    showToast('선택한 요금제 정보를 찾을 수 없습니다', 'error');
    return;
  }

  console.log('📋 선택된 요금제:', currentPlan);

  // 해당 요금제의 혜택들에서 중복 제거
  const planBenefits = currentPlan.benefits || [];
  const uniqueBenefits = [];
  const seenBenefitIds = new Set();

  planBenefits.forEach(benefit => {
    if (!seenBenefitIds.has(benefit.benefitId)) {
      seenBenefitIds.add(benefit.benefitId);
      uniqueBenefits.push(benefit);
    }
  });

  console.log('🔧 중복 제거된 혜택들:', uniqueBenefits);

  // 타입별로 혜택 분류
  const premiumBenefits = uniqueBenefits.filter(b => b.benefitType === 'PREMIUM');
  const mediaBenefits = uniqueBenefits.filter(b => b.benefitType === 'MEDIA');
  const basicBenefits = uniqueBenefits.filter(b => b.benefitType === 'BASIC');

  console.log('📊 타입별 혜택 분류:');
  console.log('- 프리미엄:', premiumBenefits);
  console.log('- 미디어:', mediaBenefits);
  console.log('- 베이직:', basicBenefits);

  // 각 섹션에 혜택 옵션 생성
  populateBenefitOptions('premiumBenefits', premiumBenefits);
  populateBenefitOptions('mediaBenefits', mediaBenefits);
  populateBenefitOptions('basicBenefits', basicBenefits);

  // 모달 표시
  const modal = document.getElementById('benefitSelectionModal');
  modal.style.display = 'block';
}

// 혜택 옵션 생성
function populateBenefitOptions(containerId, benefits) {
  const container = document.getElementById(containerId);
  
  // 혜택이 없는 경우 처리
  if (!benefits || benefits.length === 0) {
    container.innerHTML = `
      <div style="
        text-align: center; 
        padding: 20px; 
        color: #6c757d; 
        font-size: 14px;
        border: 2px dashed #dee2e6;
        border-radius: 12px;
        background: #f8f9fa;
      ">
        이 요금제에는 해당 타입의 혜택이 없습니다
      </div>
    `;
    return;
  }
  
  container.innerHTML = benefits.map(benefit => `
    <div class="benefit-option" onclick="selectBenefitOption(this, '${containerId}')" data-benefit-id="${benefit.benefitId}">
      <div class="benefit-option-icon" style="background-color: ${getBenefitIconColor(benefit.benefitName)};">
        ${getBenefitInitial(benefit.benefitName)}
      </div>
      <div class="benefit-option-name">${benefit.benefitName}</div>
      <div class="benefit-option-type">${benefit.benefitType}</div>
    </div>
  `).join('');
}

// 혜택 옵션 선택
function selectBenefitOption(element, containerId) {
  // 같은 타입 내에서 다른 선택 해제
  const container = document.getElementById(containerId);
  container.querySelectorAll('.benefit-option').forEach(option => {
    option.classList.remove('selected');
  });

  // 현재 선택 활성화
  element.classList.add('selected');
}

// 혜택 선택 모달 닫기
function closeBenefitSelectionModal() {
  const modal = document.getElementById('benefitSelectionModal');
  modal.style.display = 'none';
  currentPlanId = null;
}

// 혜택 선택 확인 (최종 확인 모달 추가)
async function confirmBenefitSelection() {
  // 각 타입별로 선택된 혜택 수집
  const selectedPremium = document.querySelector('#premiumBenefits .benefit-option.selected');
  const selectedMedia = document.querySelector('#mediaBenefits .benefit-option.selected');
  const selectedBasic = document.querySelector('#basicBenefits .benefit-option.selected');

  // 각 타입별로 혜택이 있는지 확인
  const hasPremiumOptions = document.querySelectorAll('#premiumBenefits .benefit-option').length > 0;
  const hasMediaOptions = document.querySelectorAll('#mediaBenefits .benefit-option').length > 0;
  const hasBasicOptions = document.querySelectorAll('#basicBenefits .benefit-option').length > 0;

  console.log('🔍 혜택 선택 상태 확인:');
  console.log('- 프리미엄 옵션 있음:', hasPremiumOptions, '선택됨:', !!selectedPremium);
  console.log('- 미디어 옵션 있음:', hasMediaOptions, '선택됨:', !!selectedMedia);
  console.log('- 베이직 옵션 있음:', hasBasicOptions, '선택됨:', !!selectedBasic);

  const selectedBenefitIds = [];

  // 각 타입별로 혜택이 있고 선택되지 않은 경우 경고
  const unselectedTypes = [];
  
  if (hasPremiumOptions && !selectedPremium) {
    unselectedTypes.push('프리미엄');
  } else if (selectedPremium) {
    selectedBenefitIds.push(parseInt(selectedPremium.getAttribute('data-benefit-id')));
  }

  if (hasMediaOptions && !selectedMedia) {
    unselectedTypes.push('미디어');
  } else if (selectedMedia) {
    selectedBenefitIds.push(parseInt(selectedMedia.getAttribute('data-benefit-id')));
  }

  if (hasBasicOptions && !selectedBasic) {
    unselectedTypes.push('베이직');
  } else if (selectedBasic) {
    selectedBenefitIds.push(parseInt(selectedBasic.getAttribute('data-benefit-id')));
  }

  // 선택되지 않은 타입이 있으면 경고
  if (unselectedTypes.length > 0) {
    showToast(`${unselectedTypes.join(', ')} 혜택을 선택해주세요`, 'warning');
    return;
  }

  // 혜택이 하나도 없는 요금제인 경우
  if (selectedBenefitIds.length === 0 && !hasPremiumOptions && !hasMediaOptions && !hasBasicOptions) {
    showToast('이 요금제에는 선택 가능한 혜택이 없습니다', 'info');
    // 혜택 없이도 진행 가능하도록 빈 배열로 처리
  }

  console.log('✅ 최종 선택된 혜택 IDs:', selectedBenefitIds);

  // 현재 요금제 정보 가져오기
  const currentPlan = currentPricingData.find(plan => plan.planId === currentPlanId);
  if (!currentPlan) {
    showToast('요금제 정보를 찾을 수 없습니다', 'error');
    return;
  }

  // 선택된 혜택 이름들 가져오기
  const selectedBenefitNames = [];
  if (selectedPremium) selectedBenefitNames.push(selectedPremium.querySelector('.benefit-option-name').textContent);
  if (selectedMedia) selectedBenefitNames.push(selectedMedia.querySelector('.benefit-option-name').textContent);
  if (selectedBasic) selectedBenefitNames.push(selectedBasic.querySelector('.benefit-option-name').textContent);

  // ✨ 최종 확인 모달 표시
  const benefitsText = selectedBenefitNames.length > 0 
    ? `\n\n선택한 혜택: ${selectedBenefitNames.join(', ')}`
    : '\n\n선택한 혜택: 없음';

  const confirmed = await showConfirmModal(
    '요금제 변경 최종 확인', 
    `정말로 "${currentPlan.planName}" 요금제로 변경하시겠습니까?${benefitsText}\n\n변경 후에는 즉시 적용되며, 기존 요금제는 해지됩니다.`, 
    '네, 변경할게요', 
    '아니요, 다시 선택할게요'
  );

  // 사용자가 취소를 선택한 경우
  if (!confirmed) {
    showToast('요금제 변경이 취소되었습니다', 'info');
    return; // 모달을 닫지 않고 사용자가 다시 선택할 수 있도록 함
  }

  // --- 💡 핵심 수정 사항 ---
  // 전역 변수 currentPlanId가 null로 바뀌기 전에 지역 변수에 값을 저장합니다.
  const planIdToChange = currentPlanId;

  // 모달을 닫습니다. (이 함수는 여전히 currentPlanId를 null로 만듭니다)
  closeBenefitSelectionModal();

  // 저장해둔 지역 변수(planIdToChange)를 사용하여 요금제 변경을 실행합니다.
  editPlan(planIdToChange, selectedBenefitIds);
}

/**
 * 요금제 변경을 위한 3단계 API 호출을 처리하는 함수
 * @param {number} planId - 변경할 요금제의 ID
 * @param {number[]} benefitIds - 선택된 혜택 ID 배열 (각 타입에서 1개씩)
 */
async function editPlan(planId, benefitIds) {
  console.log(`🚀 요금제 변경 프로세스 시작: planId=${planId}, benefitIds=${JSON.stringify(benefitIds)}`);

  // --- 0. 사전 확인 ---
  if (!accessToken || !userId) {
    showToast('요금제를 변경하려면 로그인이 필요합니다.', 'warning');
    setTimeout(() => redirectToLogin(), 1500);
    return;
  }

  showToast('요금제 변경을 준비 중입니다...', 'info');

  try {
    // --- 1단계: 혜택 모음 ID(benefitGroupId) 조회 ---
    console.log('➡️ 1단계: 혜택 모음 ID 조회 시작');
    const benefitGroupResponse = await fetch('https://www.visiblego.com/gateway/plan/benefit-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ benefitIds })
    });

    const benefitGroupResult = await benefitGroupResponse.json();

    if (!benefitGroupResponse.ok || benefitGroupResult.statusCode !== 200) {
      console.error('❌ 1단계 실패:', benefitGroupResult);
      throw new Error(benefitGroupResult.message || '혜택 그룹 조회에 실패했습니다.');
    }

    const benefitGroupId = benefitGroupResult.data.id;
    console.log(`✅ 1단계 성공: benefitGroupId = ${benefitGroupId}`);
    showToast('혜택 정보 확인 완료', 'info');


    // --- 2단계: 요금제혜택 ID(planBenefitId) 조회 ---
    console.log('➡️ 2단계: 요금제혜택 ID 조회 시작');
    const findPlanResponse = await fetch('https://www.visiblego.com/gateway/plan/findPlanBenefitGroupId', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ planId: String(planId), benefitGroupId: String(benefitGroupId) })
    });

    const findPlanResult = await findPlanResponse.json();

    if (!findPlanResponse.ok || findPlanResult.statusCode !== 200) {
      console.error('❌ 2단계 실패:', findPlanResult);
      throw new Error(findPlanResult.message || '요금제-혜택 연결 정보 조회에 실패했습니다.');
    }

    const planBenefitId = findPlanResult.data.id;
    console.log(`✅ 2단계 성공: planBenefitId = ${planBenefitId}`);
    showToast('요금제 정보 확인 완료', 'info');

    // --- 3단계: 사용자 요금제 변경 기록 ---
    console.log('➡️ 3단계: 사용자 요금제 변경 기록 시작');
    const userPlanRecordResponse = await fetch('https://www.visiblego.com/gateway/user/user-plan-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ userId: String(userId), planBenefitId: String(planBenefitId) })
    });

    const userPlanRecordResult = await userPlanRecordResponse.json();

    if (!userPlanRecordResponse.ok || userPlanRecordResult.statusCode !== 200) {
      console.error('❌ 3단계 실패:', userPlanRecordResult);
      throw new Error(userPlanRecordResult.message || '최종 요금제 변경에 실패했습니다.');
    }

    console.log('✅ 3단계 성공: 요금제 변경 기록 완료');

    // --- 최종 성공 처리 ---
    showToast('요금제가 성공적으로 변경되었습니다! 🎉', 'success');
    setTimeout(() => {
        window.location.href = '/page/mypage'; // 성공 후 마이페이지로 이동
    }, 2000);

  } catch (error) {
    console.error('❌ 요금제 변경 프로세스 중 오류 발생:', error);
    showToast(error.message || '요금제 변경 중 오류가 발생했습니다. 😥', 'error');
  }
}

// 필터 팝업 열기
async function openFilterPopup() {
  document.getElementById('filterPopup').style.display = 'block';

  // 팝업이 열린 후 혜택 데이터 로드 및 업데이트
  setTimeout(async () => {
    // 혜택 데이터가 없으면 먼저 로드
    if (benefitsData.length === 0) {
      await loadBenefitsData();
    } else {
      // 이미 있으면 바로 업데이트
      updateBenefitsInFilter();
    }
  }, 100); // 팝업이 완전히 렌더링된 후 실행
}

// 필터 팝업 닫기
function closeFilterPopup() {
  document.getElementById('filterPopup').style.display = 'none';
}

// 프로필 팝업 외부 클릭 시 닫기
document.addEventListener('click', function (e) {
  const profilePopup = document.getElementById('profilePopup');
  const filterPopup = document.getElementById('filterPopup');

  if (e.target === profilePopup) {
    closeProfilePopup();
  }
  if (e.target === filterPopup) {
    closeFilterPopup();
  }
});

// 선택된 필터 업데이트
function updateSelectedFilters() {
  const selectedFiltersContainer = document.getElementById('selectedFilters');
  selectedFiltersContainer.innerHTML = '';

  // 요금제별 필터 수집
  const selectedCategories = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(1) .filter-tag.selected')).map(tag => tag.textContent.trim());
  // 요금범위 필터 수집
  const selectedPriceRange = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(2) .filter-tag.selected')).map(tag => tag.textContent.trim());
  // 데이터 필터 수집
  const selectedDataType = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(3) .filter-tag.selected')).map(tag => tag.textContent.trim());
  // 혜택 필터 수집 (기존 .brand-item 대신 .brand-item 사용)
  const selectedBenefits = Array.from(document.querySelectorAll('.brand-item.selected')).map(brand => brand.querySelector('.brand-name').textContent.trim());

  // 필터링된 항목들 (상관없어요, 전체 제외)
  const allFilters = [...selectedCategories, ...selectedPriceRange, ...selectedDataType, ...selectedBenefits].filter(filterText =>
    filterText && filterText !== '상관없어요' && filterText !== '전체'
  );

  // 선택된 필터들을 표시
  allFilters.forEach(filterText => {
    const filterTag = document.createElement('div');
    filterTag.className = 'selected-filter-tag';
    filterTag.textContent = filterText;
    selectedFiltersContainer.appendChild(filterTag);
  });

  // 필터가 있을 때만 전체삭제 버튼 생성
  if (allFilters.length > 0) {
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'clear-all-filters';
    clearAllBtn.textContent = '전체삭제';
    clearAllBtn.onclick = clearAllFilters;
    selectedFiltersContainer.appendChild(clearAllBtn);
  }
}

// 전체 필터 삭제
function clearAllFilters() {
  // 모든 선택된 필터 해제
  const allSelectedTags = document.querySelectorAll('.filter-tag.selected, .brand-item.selected');
  allSelectedTags.forEach(tag => {
    tag.classList.remove('selected');
  });

  // 화면 업데이트
  updateSelectedFilters();

  // 전체 요금제 다시 로드
  loadPricingData('all');
  console.log('모든 필터가 삭제되었습니다.');
}

// 태그 토글 함수 수정 - 상관없어요 독점 선택 로직 추가
function toggleTag(tagElement) {
  const section = tagElement.closest('.filter-section-popup');
  const clickedText = tagElement.textContent.trim();

  // 상관없어요를 클릭한 경우
  if (clickedText === '상관없어요' || clickedText === '전체') {
    // 해당 섹션의 모든 태그 선택 해제
    const allTags = section.querySelectorAll('.filter-tag');
    allTags.forEach(tag => {
      tag.classList.remove('selected');
    });

    // 상관없어요만 활성화
    tagElement.classList.add('selected');
  }
  // 다른 옵션을 클릭한 경우
  else {
    // 해당 섹션에서 상관없어요/전체가 선택되어 있으면 해제
    const allTags = section.querySelectorAll('.filter-tag');
    allTags.forEach(tag => {
      const tagText = tag.textContent.trim();
      if (tagText === '상관없어요' || tagText === '전체') {
        tag.classList.remove('selected');
      }
    });

    // 클릭한 태그 토글
    tagElement.classList.toggle('selected');
  }

  updateSelectedFilters();
}

// 혜택 토글 함수는 기존과 동일 (혜택은 상관없어요가 없으므로)
function toggleBenefit(benefitElement) {
  benefitElement.classList.toggle('selected');
  updateSelectedFilters();
}

// 브랜드 토글 (하위 호환성 유지)
function toggleBrand(brandElement) {
  brandElement.classList.toggle('selected');
  updateSelectedFilters();
}

// 필터 적용 함수 수정 - POST API 연동 및 '전체' 탭 활성화
async function applyFilter() {
  // 필터 조건 수집
  const selectedCategories = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(1) .filter-tag.selected')).map(tag => tag.textContent.trim());
  const selectedPriceRange = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(2) .filter-tag.selected')).map(tag => tag.textContent.trim());
  const selectedDataType = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(3) .filter-tag.selected')).map(tag => tag.textContent.trim());
  const selectedBenefits = Array.from(document.querySelectorAll('.brand-item.selected')).map(brand => {
    const benefitId = brand.getAttribute('data-benefit-id');
    return parseInt(benefitId);
  });

  // "상관없어요" 선택 여부 체크
  const allCategoriesSelected = selectedCategories.includes('상관없어요') || selectedCategories.includes('전체');
  const anyPriceSelected = selectedPriceRange.includes('상관없어요');
  const anyDataSelected = selectedDataType.includes('상관없어요');
  const noBenefitsSelected = false; // 혜택이 선택되지 않았으면 true

  // 카테고리 ID 변환 (상관없어요가 아닌 경우만)
  const categoryIds = allCategoriesSelected ? [] : selectedCategories
    .filter(category => category !== '상관없어요' && category !== '전체')
    .map(category => {
      // 카테고리 이름을 categoryMap의 키로 변환
      const categoryKey = Object.keys(categoryMap).find(key => {
        const mappedName = getCategoryDisplayName(key);
        return mappedName === category;
      });
      return categoryKey ? categoryMap[categoryKey] : null;
    })
    .filter(id => id !== null);

  // 가격 범위 변환
  const priceRanges = anyPriceSelected ? [] : selectedPriceRange
    .filter(range => range !== '상관없어요')
    .map(range => {
      if (range.includes('~5만원대') || range.includes('5만원 이하')) return '~5';
      if (range.includes('6~8만원대') || range.includes('6-8만원')) return '6~8';
      if (range.includes('9만원대~') || range.includes('9만원 이상')) return '9~';
      return null;
    })
    .filter(range => range !== null);

  // 데이터 옵션 변환
  const dataOptions = anyDataSelected ? [] : selectedDataType
    .filter(type => type !== '상관없어요')
    .map(type => {
      if (type.includes('완전 무제한') || type.includes('무제한')) return 'unlimited';
      if (type.includes('10GB 이상') || type.includes('대용량')) return 'large';
      if (type.includes('소용량')) return 'small';
      return type; // 그대로 반환
    })
    .filter(type => type !== null);

  // API 요청 바디 구성 (모든 필드 필수)
  const filterRequestBody = {
    categoryIds: categoryIds,
    allCategoriesSelected: allCategoriesSelected,
    priceRanges: priceRanges,
    anyPriceSelected: anyPriceSelected,
    dataOptions: dataOptions,
    anyDataSelected: anyDataSelected,
    benefitIds: selectedBenefits,
    noBenefitsSelected: noBenefitsSelected
  };

  console.log('Filter request body:', filterRequestBody);

  try {
    // 필터링 API 호출
    const response = await fetch('https://www.visiblego.com/gateway/plan/filter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(filterRequestBody)
    });

    if (!response.ok) {
      throw new Error(`필터 API 호출 실패: ${response.status}`);
    }

    const apiResponse = await response.json();
    console.log('Filter API response:', apiResponse);

    // API 응답 처리
    if (apiResponse.statusCode === 200 && apiResponse.data) {
      const filteredData = apiResponse.data;

      // 필터링된 결과 화면에 표시
      displayPricingCards(filteredData);

      // 선택된 필터 표시 업데이트
      updateSelectedFilters();

      // 팝업 닫기
      closeFilterPopup();
      
      // --- ✨ 요청하신 수정사항: 필터 적용 시 '전체' 탭 활성화 ---
      // 1. 모든 탭의 'active' 클래스를 제거합니다.
      document.querySelectorAll('.tab').forEach(tab => {
          tab.classList.remove('active');
      });

      // 2. '전체' 탭을 찾아서 'active' 클래스를 추가합니다.
      //    (안정적인 동작을 위해 '전체' 탭에 data-category="all" 속성을 부여하는 것이 좋습니다.)
      const allTabs = document.querySelectorAll('.tab');
      const allCategoryTab = Array.from(allTabs).find(tab => tab.textContent.trim() === '전체');
      
      if (allCategoryTab) {
          allCategoryTab.classList.add('active');
          console.log("필터가 적용되어 '전체' 탭이 활성화되었습니다.");
      }
      // --- 수정사항 끝 ---

      showToast(`${filteredData.length}개의 요금제를 찾았습니다`, 'success');

    } else {
      throw new Error(apiResponse.message || '필터 API 응답 오류');
    }

  } catch (error) {
    console.error('필터 적용 중 오류 발생:', error);
    showToast('필터 적용 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');

    // 오류 발생 시 팝업은 닫지 않고 사용자가 다시 시도할 수 있도록 함
  }
}

// 카테고리 텍스트에서 키 찾기 (업데이트된 버전)
function getCategoryKey(categoryText) {
  const categoryTextMap = {
    '프리미엄': 'premium',
    '유스': 'youth',
    '시니어': 'senior',
    '다이렉트': 'direct',
    '너겟': 'nugget',
    '복지': 'welfare',
    '청소년': 'teen'
  };
  return categoryTextMap[categoryText] || null;
}

// 카테고리 이름 표시용 헬퍼 함수 (업데이트된 버전)
function getCategoryDisplayName(categoryKey) {
  const displayNames = {
    'all': '전체',
    'premium': '프리미엄',
    'youth': '유스',
    'senior': '시니어',
    'direct': '다이렉트',
    'nugget': '너겟',
    'welfare': '복지',
    'teen': '청소년'
  };
  return displayNames[categoryKey] || categoryKey;
}

// 브랜드 토글 (하위 호환성 유지)
function toggleBrand(brandElement) {
  if (!brandElement) {
    console.warn('brandElement가 없습니다.');
    return;
  }
  
  console.log('브랜드 토글:', brandElement.querySelector('.brand-name')?.textContent.trim());
  brandElement.classList.toggle('selected');
  updateSelectedFilters();
}

// 토스트 메시지 표시 함수
function showToast(message, type = 'info') {
  // 기존 토스트 제거
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const colors = {
    info: '#ad1457',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  };

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 16px 24px;
    border-radius: 999px;
    font-family: 'Pretendard-Medium', sans-serif;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;

  toast.textContent = message;
  document.body.appendChild(toast);

  // 애니메이션
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);

  // 자동 제거
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
}

// 확인 모달 표시 함수 (개선된 버전)
function showConfirmModal(title, message, confirmText = '확인', cancelText = '취소') {
  return new Promise((resolve) => {
    // 기존 모달 제거
    const existingModal = document.querySelector('.confirm-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(8px);
    `;

    // 메시지의 줄바꿈 처리
    const formattedMessage = message.replace(/\n/g, '<br>');

    modal.innerHTML = `
      <div style="
        background: #343a40;
        border-radius: 20px;
        padding: 32px;
        max-width: 460px;
        width: 90%;
        text-align: center;
        font-family: 'Pretendard-Regular', sans-serif;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid #6c757d;
      ">
        <h3 style="
          font-family: 'Pretendard-Bold', sans-serif;
          color: #f8f9fa;
          margin-bottom: 20px;
          font-size: 20px;
        ">${title}</h3>
        <p style="
          color: #adb5bd;
          margin-bottom: 28px;
          line-height: 1.6;
          font-size: 15px;
        ">${formattedMessage}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="cancel-btn" style="
            padding: 14px 28px;
            border: 2px solid #6c757d;
            background: #343a40;
            color: #adb5bd;
            border-radius: 999px;
            cursor: pointer;
            font-family: 'Pretendard-Medium', sans-serif;
            transition: all 0.3s ease;
            font-size: 14px;
          ">${cancelText}</button>
          <button class="confirm-btn" style="
            padding: 14px 28px;
            border: none;
            background: linear-gradient(135deg, #ad1457 0%, #880e4f 100%);
            color: white;
            border-radius: 999px;
            cursor: pointer;
            font-family: 'Pretendard-Medium', sans-serif;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(173, 20, 87, 0.4);
            font-size: 14px;
          ">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 호버 효과 추가
    const cancelBtn = modal.querySelector('.cancel-btn');
    const confirmBtn = modal.querySelector('.confirm-btn');

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.borderColor = '#adb5bd';
      cancelBtn.style.color = '#f8f9fa';
      cancelBtn.style.background = '#495057';
    });

    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.borderColor = '#6c757d';
      cancelBtn.style.color = '#adb5bd';
      cancelBtn.style.background = '#343a40';
    });

    confirmBtn.addEventListener('mouseenter', () => {
      confirmBtn.style.transform = 'translateY(-2px)';
      confirmBtn.style.boxShadow = '0 6px 16px rgba(173, 20, 87, 0.5)';
    });

    confirmBtn.addEventListener('mouseleave', () => {
      confirmBtn.style.transform = 'translateY(0)';
      confirmBtn.style.boxShadow = '0 4px 12px rgba(173, 20, 87, 0.4)';
    });

    // 이벤트 리스너
    cancelBtn.onclick = () => {
      modal.remove();
      resolve(false);
    };

    confirmBtn.onclick = () => {
      modal.remove();
      resolve(true);
    };

    // 외부 클릭 시 닫기 (취소로 처리)
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };

    // ESC 키로 닫기
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

// 프로필 팝업 외부 클릭 시 닫기
document.addEventListener('click', function (e) {
  const profilePopup = document.getElementById('profilePopup');
  const filterPopup = document.getElementById('filterPopup');
  const benefitModal = document.getElementById('benefitSelectionModal');
  const profile = document.querySelector('.sidebar-profile');

  if (profilePopup && profile && !profile.contains(e.target) && profilePopup.style.display === 'block') {
    closeProfilePopup();
  }
  if (e.target === filterPopup) {
    closeFilterPopup();
  }
  if (e.target === benefitModal) {
    closeBenefitSelectionModal();
  }
});

// 초기화
document.addEventListener('DOMContentLoaded', async function () {
  console.log('🎉 요기U+ 요금제 관리 페이지가 로드되었습니다!');

  // 토큰 검증 및 사용자 정보 로드
  await validateTokenAndLoadUser();

  showToast('요기U+에 오신 것을 환영합니다! 🎉', 'success');

  // 요금제 데이터와 혜택 데이터를 병렬로 로드
  await Promise.all([
    loadPricingData('all'),
    loadBenefitsData()
  ]);

  // 필터 관련 요소들 확인
  setTimeout(() => {
    console.log('🔧 초기화 후 필터 요소 상태 확인:');
    debugFilterElements();
  }, 1000);
});

// 필터 요소들 디버깅 함수
function debugFilterElements() {
  console.log('🔧 필터 요소 디버깅 시작:');
  
  const filterTags = document.querySelectorAll('.filter-tag');
  console.log(`- .filter-tag 요소 개수: ${filterTags.length}`);
  
  const brandItems = document.querySelectorAll('.brand-item');
  console.log(`- .brand-item 요소 개수: ${brandItems.length}`);
  
  const selectedFiltersContainer = document.getElementById('selectedFilters');
  console.log(`- selectedFilters 컨테이너 존재: ${!!selectedFiltersContainer}`);
  
  const filterBrands = document.querySelector('.filter-brands');
  console.log(`- .filter-brands 컨테이너 존재: ${!!filterBrands}`);

  if (filterTags.length > 0) {
    console.log('📝 첫 번째 필터 태그 텍스트:', filterTags[0].textContent.trim());
  }
}