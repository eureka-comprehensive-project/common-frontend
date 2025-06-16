
// 전역 변수로 accessToken 설정
let accessToken = sessionStorage.getItem('accessToken') || '';

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

// 챗봇 페이지로 이동
function goToChatbot() {
  window.location.href = '/page/chatbot';
}

// 프로필 팝업 열기
function openProfilePopup() {
  document.getElementById('profilePopup').style.display = 'block';
}

// 프로필 팝업 닫기
function closeProfilePopup() {
  document.getElementById('profilePopup').style.display = 'none';
}

// 마이페이지로 이동
async function goToMyPage() {
  try {
    if (accessToken) {
      // const response = await fetch('/api/user/profile/check', {
      //     method: 'GET',
      //     headers: {
      //         'Authorization': `Bearer ${accessToken}`,
      //         'Content-Type': 'application/json'
      //     }
      // });

      closeProfilePopup();
      window.location.href = '/page/mypage';
    } else {
      alert('로그인이 필요합니다.');
      window.location.href = '/page/login';
    }
  } catch (error) {
    console.error('마이페이지 이동 중 오류 발생:', error);
    alert('페이지 이동 중 오류가 발생했습니다.');
  }
}

// 로그아웃 확인
async function confirmLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
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
      accessToken = ''; // 전역변수도 초기화
      closeProfilePopup();
      window.location.href = '/page/login';

    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
      sessionStorage.removeItem('accessToken');
      accessToken = ''; // 전역변수도 초기화
      closeProfilePopup();
      window.location.href = '/page/login';
    }
  }
}

// 탭 전환 함수
function switchTab(tabElement, tabType) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  tabElement.classList.add('active');
  console.log('Selected tab:', tabType);

  // 해당 카테고리 요금제 데이터 로드
  loadPricingData(tabType);
}

// 요금제 데이터 로드 함수 (API 연동)
// 요금제 데이터 로드 함수 (API 연동)
async function loadPricingData(category = 'all') {
  console.log('Loading pricing data for category:', category);

  try {
    // 카테고리 ID 가져오기
    const categoryId = categoryMap[category];

    // 모든 요청을 /category/{categoryId} 형태로 통일
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

  } catch (error) {
    console.error('요금제 데이터 로드 중 오류 발생:', error);
    console.error('Category:', category);
    console.error('Category ID:', categoryMap[category]);

    // 카테고리별 필터링 (샘플 데이터용)
    let filteredData = sampleData;
    if (category !== 'all') {
      filteredData = sampleData.filter(plan =>
        plan.planCategory && plan.planCategory.toLowerCase() === category.toLowerCase()
      );
    }

    displayPricingCards(filteredData);
  }
}

// 요금제 카드 화면에 표시
function displayPricingCards(pricingData) {
  const pricingCardsContainer = document.querySelector('.pricing-cards');

  if (!pricingData || pricingData.length === 0) {
    pricingCardsContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>해당 조건에 맞는 요금제가 없습니다.</p>
                    </div>
                `;
    return;
  }

  // API 응답 데이터 구조 확인을 위한 로깅
  console.log('Pricing data sample:', pricingData[0]);

  // 요금제 카드들 생성
  pricingCardsContainer.innerHTML = pricingData.map(plan => {
    // 데이터 용량 표시 로직
    const getDataDisplay = (dataAllowance) => {
      if (!dataAllowance) return '정보없음';
      const amount = dataAllowance.dataAmount;
      const unit = dataAllowance.dataUnit || 'GB';

      if (amount >= 99999) return '무제한';
      return `${amount}${unit}`;
    };

    // 테더링 데이터 표시
    const getTetheringDisplay = (sharedData) => {
      if (!sharedData) return '정보없음';
      const amount = sharedData.tetheringDataAmount;
      const unit = sharedData.tetheringDataUnit || 'GB';

      if (amount === 0) return '제공안함';
      return `${amount}${unit}`;
    };

    // 가족 공유 데이터 표시
    const getFamilyDataDisplay = (sharedData) => {
      if (!sharedData) return '정보없음';
      const available = sharedData.familyDataAvailable;
      const amount = sharedData.familyDataAmount;
      const unit = sharedData.familyDataUnit || 'GB';

      if (!available || amount === 0) return '제공안함';
      return `${amount}${unit}`;
    };

    // 월 요금 포맷팅
    const getPriceDisplay = (price) => {
      if (!price && price !== 0) return '정보없음';
      return new Intl.NumberFormat('ko-KR').format(price) + '원';
    };

    // 혜택 표시
    const getBenefitDisplay = (benefits) => {
      if (!benefits || !Array.isArray(benefits) || benefits.length === 0) {
        return { title: '기본 서비스', info: '제공', count: '기본혜택' };
      }

      // 중복 제거된 혜택 개수
      const uniqueBenefits = [...new Set(benefits.map(b => b.benefitId))];

      return {
        title: `혜택 ${uniqueBenefits.length}개`,
        info: '제공',
        count: `${uniqueBenefits.length}개 혜택`
      };
    };

    // 부가통화 표시
    const getVoiceCallDisplay = (voiceCall) => {
      if (!voiceCall || !voiceCall.additionalCallAllowance) return '';
      return `<li>부가통화: ${voiceCall.additionalCallAllowance}분</li>`;
    };

    const benefitInfo = getBenefitDisplay(plan.benefits);

    return `
                    <div class="pricing-card">
                        <div class="card-content">
                            <div class="card-left">
                                <div class="plan-title">${plan.planName || '요금제 이름'}</div>
                                <ul class="plan-features">
                                    <li>데이터: ${getDataDisplay(plan.dataAllowance)}</li>
                                    <li>테더링: ${getTetheringDisplay(plan.sharedData)}</li>
                                    <li>가족공유: ${getFamilyDataDisplay(plan.sharedData)}</li>
                                    <li>월 요금: ${getPriceDisplay(plan.monthlyFee)}</li>
                                    ${getVoiceCallDisplay(plan.voiceCall)}
                                </ul>
                            </div>
                            <div class="card-center">
                                <div class="sync-status">
                                    <div class="sync-title">${plan.categoryName || '카테고리'}</div>
                                    <div class="message-info">
                                        ${benefitInfo.title}<br>${benefitInfo.info}
                                    </div>
                                </div>
                            </div>
                            <div class="card-right">
                                <div>${benefitInfo.count}</div>
                                <button class="edit-btn" onclick="editPlan(${plan.planId || 0})">변경하기</button>
                            </div>
                        </div>
                    </div>
                `;
  }).join('');
}

// 요금제 편집 함수
function editPlan(planId) {
  alert(`요금제 ${planId} 편집 페이지로 이동합니다.`);
}

// 필터 팝업 열기
function openFilterPopup() {
  document.getElementById('filterPopup').style.display = 'block';
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

// 태그 토글 (기존 함수 수정)
function toggleTag(tagElement) {
  tagElement.classList.toggle('selected');
  updateSelectedFilters();
}

// 브랜드 토글 (기존 함수 수정)
function toggleBrand(brandElement) {
  brandElement.classList.toggle('selected');
  updateSelectedFilters();
}

// 필터 적용
async function applyFilter() {
  const selectedPriceRange = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(1) .filter-tag.selected')).map(tag => tag.textContent);
  const selectedDataType = Array.from(document.querySelectorAll('.filter-section-popup:nth-child(2) .filter-tag.selected')).map(tag => tag.textContent);
  const selectedBenefits = Array.from(document.querySelectorAll('.brand-item.selected')).map(brand => brand.querySelector('.brand-name').textContent);

  const filterData = {
    priceRange: selectedPriceRange,
    dataType: selectedDataType,
    benefits: selectedBenefits
  };

  console.log('Filter data:', filterData);

  try {
    // 필터 조건과 함께 요금제 데이터 다시 로드
    const response = await fetch('https://www.visiblego.com/gateway/plan/', {
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
    const allPricingData = apiResponse.data || [];

    // 클라이언트 사이드에서 필터링 적용
    let filteredData = allPricingData;

    // 요금범위 필터링
    if (selectedPriceRange.length > 0 && !selectedPriceRange.includes('상관 없어요')) {
      filteredData = filteredData.filter(plan => {
        const price = plan.monthlyFee || 0;
        return selectedPriceRange.some(range => {
          if (range.includes('~5만원대')) return price <= 50000;
          if (range.includes('6~8만원대')) return price >= 60000 && price <= 80000;
          if (range.includes('9만원대~')) return price >= 90000;
          return true;
        });
      });
    }

    // 데이터 타입 필터링
    if (selectedDataType.length > 0 && !selectedDataType.includes('상관 없어요')) {
      filteredData = filteredData.filter(plan => {
        return selectedDataType.some(type => {
          if (type.includes('완전 무제한')) return plan.dataAllowance >= 99999;
          if (type.includes('다쓰면 속도제한')) return plan.dataAllowance < 99999;
          return true;
        });
      });
    }

    // 혜택 필터링 (benefitIdList 기반)
    if (selectedBenefits.length > 0) {
      filteredData = filteredData.filter(plan => {
        // 혜택이 있는 요금제만 필터링
        return plan.benefitIdList && plan.benefitIdList.length > 0;
      });
    }

    updateSelectedFilters(); // 선택된 필터 표시 업데이트
    closeFilterPopup();
    displayPricingCards(filteredData); // 필터링된 결과 표시

  } catch (error) {
    console.error('Filter API error:', error);
    alert('필터 적용 중 오류가 발생했습니다.');
  }
}

// 초기화
document.addEventListener('DOMContentLoaded', function () {
  console.log('요금제 관리 페이지가 로드되었습니다.');
  console.log('Access Token:', accessToken ? '토큰 존재' : '토큰 없음');
  console.log('Category Map:', categoryMap);

  // 초기 전체 요금제 데이터 로드
  loadPricingData('all');
});
