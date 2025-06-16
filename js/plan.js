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

// 혜택 데이터 저장 변수
let benefitsData = [];

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

// 혜택 데이터 로드 함수
async function loadBenefitsData() {
  console.log('Loading benefits data...');

  try {
    const response = await fetch('https://www.visiblego.com/gateway/plan/benefit/', {
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

      // 필터 팝업의 혜택 섹션 업데이트
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

  console.log('혜택 컨테이너 찾음:', benefitsContainer.className);

  // 혜택 타입별로 그룹핑
  const premiumBenefits = benefitsData.filter(benefit => benefit.benefitType === 'PREMIUM');
  const mediaBenefits = benefitsData.filter(benefit => benefit.benefitType === 'MEDIA');

  let benefitsHTML = '';

  // 모든 혜택을 하나의 그리드로 표시 (기존 HTML 구조 유지)
  const allBenefits = [...premiumBenefits, ...mediaBenefits];

  benefitsHTML = allBenefits.map(benefit => {
    // 혜택별 아이콘 색상 설정 (기본값)
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
      return colorMap[benefitName] || '#9e9e9e';
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

// 필터 적용 함수 수정 - POST API 연동
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
  const noBenefitsSelected = selectedBenefits.length === 0; // 혜택이 선택되지 않았으면 true

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
      if (type.includes('완전 무제한') || type.includes('무제한')) return '99999';
      if (type.includes('10GB 이상') || type.includes('대용량')) return 'large';
      if (type.includes('소용량')) return 'small';
      // if (type.includes('다쓰면 속도제한')) return '다쓰면 속도제한';
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

      console.log(`필터 적용 완료: ${filteredData.length}개의 요금제가 조회되었습니다.`);

    } else {
      throw new Error(apiResponse.message || '필터 API 응답 오류');
    }

  } catch (error) {
    console.error('필터 적용 중 오류 발생:', error);
    alert('필터 적용 중 오류가 발생했습니다. 다시 시도해주세요.');

    // 오류 발생 시 팝업은 닫지 않고 사용자가 다시 시도할 수 있도록 함
  }
}

// 카테고리 이름 표시용 헬퍼 함수 (필요시 사용)
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

// 기존 필터 초기화 함수도 수정 (필터 삭제 후 전체 데이터 로드)
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
  console.log('모든 필터가 삭제되고 전체 데이터를 로드했습니다.');
}

// 초기화
document.addEventListener('DOMContentLoaded', function () {
  console.log('요금제 관리 페이지가 로드되었습니다.');
  console.log('Access Token:', accessToken ? '토큰 존재' : '토큰 없음');
  console.log('Category Map:', categoryMap);

  // 초기 전체 요금제 데이터 로드
  loadPricingData('all');

  // 혜택 데이터 미리 로드 (필터 팝업 열기 전에 준비)
  loadBenefitsData();
});