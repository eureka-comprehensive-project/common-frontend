// 전역 변수 선언
let accessToken = null;
let userId = null;

// 카테고리 ID 매핑 (하드코딩)
const categoryMap = {
  'all': 0,           // 전체
  'premium': 1,       // 프리미엄
  'youth': 2,         // 유스
  'senior': 3,        // 시니어
  'nugget': 4,        // 너겟
  'teen': 5,          // 청소년
  'welfare': 6,       // 복지
  'direct': 7,        // 다이렉트
  'kids': 8           // 키즈
};

// 혜택 데이터 저장 변수
let benefitsData = [];

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

// 혜택 데이터 로드 함수
async function loadBenefitsData() {
  console.log('Loading benefits data...');

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
    console.log('Benefits API response:', apiResponse);

    if (apiResponse.statusCode === 200 && apiResponse.data) {
      benefitsData = apiResponse.data;
      console.log('Benefits data loaded:', benefitsData);
      updateBenefitsInFilter();
    } else {
      console.error('혜택 데이터 로드 실패:', apiResponse.message);
      throw new Error('API 응답 에러');
    }

  } catch (error) {
    console.error('혜택 데이터 로드 중 오류 발생:', error);

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
  }
}

// 필터 팝업의 혜택 섹션 업데이트
function updateBenefitsInFilter() {
  const benefitsContainer = document.querySelector('.filter-brands');

  if (!benefitsContainer) {
    console.warn('혜택 필터 컨테이너(.filter-brands)를 찾을 수 없습니다.');
    return;
  }

  // 혜택 타입별로 그룹핑
  const premiumBenefits = benefitsData.filter(benefit => benefit.benefitType === 'PREMIUM');
  const mediaBenefits = benefitsData.filter(benefit => benefit.benefitType === 'MEDIA');
  const allBenefits = [...premiumBenefits, ...mediaBenefits];

  const benefitsHTML = allBenefits.map(benefit => {
    // 혜택별 아이콘 색상 설정
    const getIconColor = (benefitName) => {
      const colorMap = {
        '넷플릭스': '#e50914',
        '디즈니+': '#1f3a93',
        '쿠팡플레이': '#ff6b35',
        '티빙': '#e74c3c',
        '멜론': '#00cd3c',
        '유튜브뮤직': '#ff0000',
        '애플뮤직': '#000000',
        '스포티파이': '#1ed760'
      };
      return colorMap[benefitName] || '#adb5bd';
    };

    // 혜택 이름의 첫 글자 추출
    const getInitial = (name) => {
      if (name === '유튜브뮤직') return 'Y';
      if (name === '애플뮤직') return 'A';
      if (name === '스포티파이') return 'S';
      return name.charAt(0);
    };

    return `
      <div class="brand-item" onclick="toggleBenefit(this)" data-benefit-id="${benefit.benefitId}">
        <div class="brand-icon" style="background-color: ${getIconColor(benefit.benefitName)};">
          ${getInitial(benefit.benefitName)}
        </div>
        <div class="brand-name">${benefit.benefitName}</div>
      </div>
    `;
  }).join('');

  benefitsContainer.innerHTML = benefitsHTML;
  console.log('혜택 필터 섹션이 업데이트되었습니다.');
}

// 요금제 카드 화면에 표시 - 다크 테마 + 푸터 고정
function displayPricingCards(pricingData) {
  const pricingCardsContainer = document.querySelector('.pricing-cards');

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

  // 요금제 카드들 생성
  pricingCardsContainer.innerHTML = pricingData.map((plan, index) => {
    // 애니메이션 지연 시간
    const animationDelay = index * 0.1;
    
    // 데이터 용량 표시 로직
    const getDataDisplay = (dataAllowance) => {
      if (!dataAllowance) return '정보없음';
      const amount = dataAllowance.dataAmount;
      const unit = dataAllowance.dataUnit || 'GB';

      if (amount >= 99999) return '무제한';
      return `${amount}${unit}`;
    };

    // 테더링+쉐어링 데이터 표시
    const getTetheringShareDisplay = (sharedData) => {
      if (!sharedData) return '0GB';

      const tetheringAmount = sharedData.tetheringDataAmount || 0;
      const familyAmount = sharedData.familyDataAmount || 0;
      const totalShared = tetheringAmount + familyAmount;

      if (totalShared === 0) return '0GB';
      return `${totalShared}GB`;
    };

    // 월 요금 포맷팅
    const getPriceDisplay = (price) => {
      if (!price && price !== 0) return '정보없음';
      return new Intl.NumberFormat('ko-KR').format(price);
    };

    // 카테고리 태그 색상
    const getCategoryTagStyle = (categoryName) => {
      const tagStyles = {
        '프리미엄': { bg: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)', text: '#fff' },
        '유스': { bg: 'linear-gradient(135deg, #4285f4 0%, #5a9fd4 100%)', text: '#fff' },
        '시니어': { bg: 'linear-gradient(135deg, #34a853 0%, #4caf64 100%)', text: '#fff' },
        '청소년': { bg: 'linear-gradient(135deg, #9c27b0 0%, #ab47bc 100%)', text: '#fff' },
        '너겟': { bg: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)', text: '#fff' },
        '복지': { bg: 'linear-gradient(135deg, #607d8b 0%, #78909c 100%)', text: '#fff' },
        '다이렉트': { bg: 'linear-gradient(135deg, #795548 0%, #8d6e63 100%)', text: '#fff' },
        '키즈': { bg: 'linear-gradient(135deg, #e91e63 0%, #ec407a 100%)', text: '#fff' }
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

    // 혜택 목록 표시
    const getBenefitsList = (benefits) => {
      if (!benefits || !Array.isArray(benefits) || benefits.length === 0) {
        return [];
      }

      const uniqueBenefits = benefits.filter((benefit, index, self) =>
        index === self.findIndex(b => b.benefitId === benefit.benefitId)
      );

      return uniqueBenefits.map(benefit => benefit.benefitName || '혜택');
    };

    // 혜택 표시
    const getBenefitInfo = (benefits) => {
      if (!benefits || !Array.isArray(benefits) || benefits.length === 0) {
        return '혜택 없음';
      }

      const uniqueBenefits = [...new Set(benefits.map(b => b.benefitId))];
      return `${uniqueBenefits.length}개 혜택 💎`;
    };

    const categoryStyle = getCategoryTagStyle(plan.categoryName);
    const specialFeatures = getSpecialFeatures(plan);
    const benefitsList = getBenefitsList(plan.benefits);
    const benefitInfo = getBenefitInfo(plan.benefits);

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
                ${specialFeatures.map(feature => `<span class="feature-tag">⚡ ${feature}</span>`).join('')}
              </div>
            ` : ''}
            
            ${benefitsList.length > 0 ? `
              <div class="benefits-list">
                <div class="benefits-title">🎁 혜택</div>
                <div class="benefits-items">
                  ${benefitsList.map(benefit => `<span class="benefit-item">${benefit}</span>`).join('')}
                </div>
              </div>
            ` : `
              <div class="benefits-list">
                <div class="benefits-title">🎁 혜택</div>
                <div class="benefits-items">
                  <span class="benefit-item">기본 서비스</span>
                </div>
              </div>
            `}
          </div>
          
          <div class="plan-actions">
            <div class="price-info">
              <div class="current-price">월 ${getPriceDisplay(plan.monthlyFee)}원</div>
            </div>
            
            <div class="action-buttons">
              <button class="btn-change" onclick="editPlan(${plan.planId || 0})">
                ✨ 변경하기
              </button>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <div class="additional-info">
            <span>📞 음성통화</span>
            <span>집/이동전화 무제한${plan.voiceCall && plan.voiceCall.additionalCallAllowance ? `(부가통화 ${plan.voiceCall.additionalCallAllowance}분)` : ''}</span>
          </div>
          <div class="additional-info">
            <span>💬 문자메시지</span>
            <span>기본제공</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 카드 애니메이션 CSS 추가
  if (!document.getElementById('card-animations')) {
    const style = document.createElement('style');
    style.id = 'card-animations';
    style.textContent = `
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// 요금제 편집 함수
function editPlan(planId) {
  showToast(`요금제 ${planId} 변경 페이지로 이동합니다 ✨`, 'info');
  // 실제 편집 페이지로 이동하는 로직 추가 필요
}

// 필터 팝업 열기
async function openFilterPopup() {
  const popup = document.getElementById('filterPopup');
  popup.style.display = 'block';
  
  // 부드러운 애니메이션
  setTimeout(() => {
    popup.style.opacity = '1';
  }, 10);

  // 혜택 데이터 로드
  setTimeout(async () => {
    if (benefitsData.length === 0) {
      await loadBenefitsData();
    } else {
      updateBenefitsInFilter();
    }
  }, 100);
}

// 필터 팝업 닫기
function closeFilterPopup() {
  const popup = document.getElementById('filterPopup');
  popup.style.opacity = '0';
  setTimeout(() => {
    popup.style.display = 'none';
  }, 200);
}

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
  // 혜택 필터 수집
  const selectedBenefits = Array.from(document.querySelectorAll('.brand-item.selected')).map(brand => brand.querySelector('.brand-name').textContent.trim());

  // 필터링된 항목들 (상관없어요, 전체 제외)
  const allFilters = [...selectedCategories, ...selectedPriceRange, ...selectedDataType, ...selectedBenefits].filter(filterText =>
    filterText && filterText !== '상관없어요' && filterText !== '전체'
  );

  // 선택된 필터들을 표시
  allFilters.forEach(filterText => {
    const filterTag = document.createElement('div');
    filterTag.className = 'selected-filter-tag';
    filterTag.innerHTML = `✨ ${filterText}`;
    selectedFiltersContainer.appendChild(filterTag);
  });

  // 필터가 있을 때만 전체삭제 버튼 생성
  if (allFilters.length > 0) {
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'clear-all-filters';
    clearAllBtn.textContent = '🗑️ 전체삭제';
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

  // 기본 선택 상태로 복원
  document.querySelectorAll('.filter-section-popup').forEach((section, index) => {
    const defaultTag = section.querySelector('.filter-tag[onclick*="상관없어요"], .filter-tag[onclick*="전체"]');
    if (defaultTag) {
      defaultTag.classList.add('selected');
    }
  });

  // 화면 업데이트
  updateSelectedFilters();

  // 전체 요금제 다시 로드  
  loadPricingData('all');
  showToast('모든 필터가 삭제되었습니다 🧹', 'info');
}

// 태그 토글 함수 수정
function toggleTag(tagElement) {
  const section = tagElement.closest('.filter-section-popup');
  const clickedText = tagElement.textContent.trim();

  // 상관없어요를 클릭한 경우
  if (clickedText === '상관없어요' || clickedText === '전체') {
    const allTags = section.querySelectorAll('.filter-tag');
    allTags.forEach(tag => {
      tag.classList.remove('selected');
    });
    tagElement.classList.add('selected');
  }
  // 다른 옵션을 클릭한 경우
  else {
    const allTags = section.querySelectorAll('.filter-tag');
    allTags.forEach(tag => {
      const tagText = tag.textContent.trim();
      if (tagText === '상관없어요' || tagText === '전체') {
        tag.classList.remove('selected');
      }
    });
    tagElement.classList.toggle('selected');
  }

  updateSelectedFilters();
}

// 혜택 토글 함수
function toggleBenefit(benefitElement) {
  benefitElement.classList.toggle('selected');
  updateSelectedFilters();
}

// 브랜드 토글 (하위 호환성 유지)
function toggleBrand(brandElement) {
  brandElement.classList.toggle('selected');
  updateSelectedFilters();
}

// 필터 적용 함수
async function applyFilter() {
  showToast('필터를 적용하는 중... 🔍', 'info');
  
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
  const noBenefitsSelected = selectedBenefits.length === 0;

  // 카테고리 ID 변환
  const categoryIds = allCategoriesSelected ? [] : selectedCategories
    .filter(category => category !== '상관없어요' && category !== '전체')
    .map(category => {
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
      if (range.includes('~5만원대')) return '~5';
      if (range.includes('6~8만원대')) return '6~8';
      if (range.includes('9만원대~')) return '9~';
      return null;
    })
    .filter(range => range !== null);

  // 데이터 옵션 변환
  const dataOptions = anyDataSelected ? [] : selectedDataType
    .filter(type => type !== '상관없어요')
    .map(type => {
      if (type.includes('무제한')) return '99999';
      if (type.includes('대용량')) return 'large';
      if (type.includes('소용량')) return 'small';
      return type;
    })
    .filter(type => type !== null);

  // API 요청 바디 구성
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

      showToast(`🎉 ${filteredData.length}개의 요금제를 찾았습니다!`, 'success');

    } else {
      throw new Error(apiResponse.message || '필터 API 응답 오류');
    }

  } catch (error) {
    console.error('필터 적용 중 오류 발생:', error);
    showToast('필터 적용 중 오류가 발생했습니다 😥', 'error');
  }
}

// 카테고리 이름 표시용 헬퍼 함수
function getCategoryDisplayName(categoryKey) {
  const displayNames = {
    'all': '전체',
    'premium': '프리미엄',
    'youth': '유스',
    'senior': '시니어',
    'nugget': '너겟',
    'teen': '청소년',
    'welfare': '복지',
    'direct': '다이렉트',
    'kids': '키즈'
  };
  return displayNames[categoryKey] || categoryKey;
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

// 확인 모달 표시 함수
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

    modal.innerHTML = `
      <div style="
        background: #343a40;
        border-radius: 20px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        font-family: 'Pretendard-Regular', sans-serif;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid #6c757d;
      ">
        <h3 style="
          font-family: 'Pretendard-Bold', sans-serif;
          color: #f8f9fa;
          margin-bottom: 16px;
          font-size: 18px;
        ">${title}</h3>
        <p style="
          color: #adb5bd;
          margin-bottom: 24px;
          line-height: 1.5;
        ">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="cancel-btn" style="
            padding: 12px 24px;
            border: 2px solid #6c757d;
            background: #343a40;
            color: #adb5bd;
            border-radius: 999px;
            cursor: pointer;
            font-family: 'Pretendard-Medium', sans-serif;
            transition: all 0.3s ease;
          ">${cancelText}</button>
          <button class="confirm-btn" style="
            padding: 12px 24px;
            border: none;
            background: linear-gradient(135deg, #ad1457 0%, #880e4f 100%);
            color: white;
            border-radius: 999px;
            cursor: pointer;
            font-family: 'Pretendard-Medium', sans-serif;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(173, 20, 87, 0.4);
          ">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 이벤트 리스너
    modal.querySelector('.cancel-btn').onclick = () => {
      modal.remove();
      resolve(false);
    };

    modal.querySelector('.confirm-btn').onclick = () => {
      modal.remove();
      resolve(true);
    };

    // 외부 클릭 시 닫기
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    };
  });
}

// 프로필 팝업 외부 클릭 시 닫기
document.addEventListener('click', function (e) {
  const profilePopup = document.getElementById('profilePopup');
  const filterPopup = document.getElementById('filterPopup');
  const profile = document.querySelector('.sidebar-profile');

  if (profilePopup && profile && !profile.contains(e.target) && profilePopup.style.display === 'block') {
    closeProfilePopup();
  }
  if (e.target === filterPopup) {
    closeFilterPopup();
  }
});

// 초기화
document.addEventListener('DOMContentLoaded', function () {
  console.log('🎉 요기U+ 요금제 관리 페이지가 로드되었습니다!');

  // 토큰 검증 및 사용자 정보 로드
  validateTokenAndLoadUser();

  // 환영 메시지
  showToast('요기U+에 오신 것을 환영합니다! 🎉', 'success');

  // 초기 전체 요금제 데이터 로드
  setTimeout(() => {
    loadPricingData('all');
  }, 1000);

  // 혜택 데이터 미리 로드
  setTimeout(() => {
    loadBenefitsData();
  }, 1500);
});