/**
 * billing.js - 요금제 관리 페이지 (기존 기능 유지)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const elements = {
        // 검색 및 필터
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn'),
        filterBtn: document.getElementById('filterBtn'),
        
        // 버튼
        addNewPlanBtn: document.getElementById('addNewPlanBtn'),
        
        // 테이블
        plansTable: document.getElementById('plansTable'),
        plansTableBody: document.getElementById('plansTableBody'),
        emptyState: document.getElementById('emptyState'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        
        // 메인 모달
        planModal: document.getElementById('planModal'),
        planForm: document.getElementById('planForm'),
        modalTitle: document.getElementById('modalTitle'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalSaveBtn: document.getElementById('modalSaveBtn'),
        
        // 모달 폼 필드
        modalPlanName: document.getElementById('modalPlanName'),
        modalCategory: document.getElementById('modalCategory'),
        modalMonthlyFee: document.getElementById('modalMonthlyFee'),
        modalDataAllowance: document.getElementById('modalDataAllowance'),
        modalDataAllowanceUnit: document.getElementById('modalDataAllowanceUnit'),
        modalDataPeriod: document.getElementById('modalDataPeriod'),
        modalVoiceAllowance: document.getElementById('modalVoiceAllowance'),
        modalAdditionalCallAllowance: document.getElementById('modalAdditionalCallAllowance'),
        modalTetheringDataAmount: document.getElementById('modalTetheringDataAmount'),
        modalTetheringDataUnit: document.getElementById('modalTetheringDataUnit'),
        modalFamilyDataAmount: document.getElementById('modalFamilyDataAmount'),
        modalFamilyDataUnit: document.getElementById('modalFamilyDataUnit'),
        
        // 혜택 관리
        selectBasicBenefit: document.getElementById('selectBasicBenefit'),
        addBasicBenefitBtn: document.getElementById('addBasicBenefitBtn'),
        basicBenefitList: document.getElementById('basicBenefitList'),
        selectPremiumBenefit: document.getElementById('selectPremiumBenefit'),
        addPremiumBenefitBtn: document.getElementById('addPremiumBenefitBtn'),
        premiumBenefitList: document.getElementById('premiumBenefitList'),
        selectMediaBenefit: document.getElementById('selectMediaBenefit'),
        addMediaBenefitBtn: document.getElementById('addMediaBenefitBtn'),
        mediaBenefitList: document.getElementById('mediaBenefitList'),
        
        // 필터 모달
        filterModal: document.getElementById('filterModal'),
        filterModalCloseBtn: document.getElementById('filterModalCloseBtn'),
        clearFiltersBtn: document.getElementById('clearFiltersBtn'),
        applyFiltersBtn: document.getElementById('applyFiltersBtn'),
        benefitFilterContainer: document.getElementById('benefitFilterContainer'),
        
        // 필터 표시
        selectedFilters: document.getElementById('selectedFilters')
    };

    // 상태 관리
    let allPlans = [];
    let currentPlans = [];
    let allBenefits = [];
    let currentSearchValue = '';
    let currentFilters = {
        category: [],
        monthlyFee: [],
        dataAllowance: [],
        benefits: []
    };
    
    // 모달 상태
    let currentModalMode = 'add'; // 'add' or 'edit'
    let currentEditingPlanId = null;

    // 카테고리 매핑
    const categoryMap = {
        '전체': 0, '프리미엄': 1, '유스': 2, '시니어': 3,
        '너겟': 4, '청소년': 5, '복지': 6, '다이렉트': 7, '키즈': 8
    };

    // --- 로딩 상태 관리 ---
    function setLoading(isLoading) {
        if (isLoading) {
            elements.loadingOverlay.style.display = 'flex';
        } else {
            elements.loadingOverlay.style.display = 'none';
        }
    }

    // --- API 함수들 ---
    
    /**
     * 요금제 목록 조회
     */
    async function fetchPlans(searchValue = '', filters = null, forceRefresh = false) {
        try {
            // 캐시 활용 (강제 새로고침이 아닌 경우)
            if (allPlans.length > 0 && !forceRefresh) {
                currentSearchValue = searchValue;
                updateSearchInput(searchValue);
                currentPlans = applyFiltersAndSearch(allPlans, searchValue, filters);
                renderPlansTable();
                return;
            }

            setLoading(true);
            
            let result;
            const hasFilters = filters && (
                filters.category.length > 0 || filters.monthlyFee.length > 0 || 
                filters.dataAllowance.length > 0 || filters.benefits.length > 0
            );
            const hasSearchTerm = searchValue && searchValue.trim().length > 0;

            if (hasSearchTerm && !hasFilters) {
                // 검색만 있는 경우
                result = await window.AdminCommon.apiPost('/plan/search', {
                    planName: searchValue.trim()
                });
            } else if (hasFilters) {
                // 필터가 있는 경우
                const categoryIds = filters.category
                    .map(name => categoryMap[name])
                    .filter(id => id !== undefined);
                
                const filterRequestDto = {
                    categoryIds: categoryIds,
                    allCategoriesSelected: filters.category.length === 0,
                    priceRanges: filters.monthlyFee.length > 0 ? filters.monthlyFee : [],
                    anyPriceSelected: filters.monthlyFee.length === 0,
                    dataOptions: filters.dataAllowance.length > 0 ? filters.dataAllowance : [],
                    anyDataSelected: filters.dataAllowance.length === 0,
                    benefitIds: filters.benefits.length > 0 ? filters.benefits : [],
                    noBenefitsSelected: false
                };
                
                result = await window.AdminCommon.apiPost('/plan/filter/list', filterRequestDto);
            } else {
                // 전체 조회
                result = await window.AdminCommon.apiGet('/plan/');
            }
            
            // 응답 데이터 파싱
            let plans = [];
            if (Array.isArray(result)) {
                plans = result;
            } else if (result.data && Array.isArray(result.data)) {
                plans = result.data;
            }

            // 상태 업데이트
            allPlans = plans;
            currentSearchValue = searchValue;
            updateSearchInput(searchValue);
            currentPlans = applyFiltersAndSearch(allPlans, searchValue, filters);
            
            renderPlansTable();
            
        } catch (error) {
            console.error('요금제 목록 조회 오류:', error);
            alert('요금제 목록을 불러오는데 실패했습니다.');
            allPlans = [];
            currentPlans = [];
            renderPlansTable();
        } finally {
            setLoading(false);
        }
    }

    /**
     * 혜택 목록 조회
     */
    async function fetchBenefits() {
        try {
            const result = await window.AdminCommon.apiGet('/plan/benefit');
            
            if (result.statusCode === 200 && result.data) {
                allBenefits = result.data;
                setupBenefitSelects();
                renderBenefitFilterCards();
                console.log('혜택 목록 로드 완료:', allBenefits.length);
            } else {
                console.error('혜택 목록 조회 실패:', result.message);
                alert('혜택 목록을 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('혜택 목록 조회 오류:', error);
            alert('혜택 목록을 불러오는데 실패했습니다.');
        }
    }

    /**
     * 요금제 등록
     */
    async function createPlan(planData) {
        try {
            const result = await window.AdminCommon.apiPost('/plan/register', planData);
            
            if (result.statusCode === 200) {
                alert('요금제가 성공적으로 등록되었습니다.');
                return true;
            } else {
                alert(`요금제 등록 실패: ${result.message || '알 수 없는 오류'}`);
                return false;
            }
        } catch (error) {
            console.error('요금제 등록 오류:', error);
            alert('요금제 등록 중 오류가 발생했습니다.');
            return false;
        }
    }

    /**
     * 요금제 수정
     */
    async function updatePlan(planId, planData) {
        try {
            const result = await window.AdminCommon.apiPut(`/plan/${planId}`, planData);
            
            if (result.statusCode === 200) {
                alert('요금제가 성공적으로 수정되었습니다.');
                return true;
            } else {
                alert(`요금제 수정 실패: ${result.message || '알 수 없는 오류'}`);
                return false;
            }
        } catch (error) {
            console.error('요금제 수정 오류:', error);
            alert('요금제 수정 중 오류가 발생했습니다.');
            return false;
        }
    }

    /**
     * 요금제 상세 조회
     */
    async function fetchPlanDetails(planId) {
        try {
            const result = await window.AdminCommon.apiGet(`/plan/${planId}`);
            
            if (result.statusCode === 200 && result.data) {
                return result.data;
            } else {
                alert('요금제 정보를 불러오는데 실패했습니다.');
                return null;
            }
        } catch (error) {
            console.error('요금제 상세 조회 오류:', error);
            alert('요금제 정보를 불러오는데 실패했습니다.');
            return null;
        }
    }

    // --- 필터링 및 검색 ---
    
    /**
     * 필터링 및 검색 적용
     */
    function applyFiltersAndSearch(plans, searchValue, filters) {
        let filteredPlans = [...plans];
        
        // 검색어 필터 적용
        if (searchValue && searchValue.trim()) {
            const searchTerm = searchValue.trim().toLowerCase();
            filteredPlans = filteredPlans.filter(p => 
                p.planName && p.planName.toLowerCase().includes(searchTerm)
            );
        }

        // 고급 필터 적용
        if (filters) {
            // 카테고리 필터
            if (filters.category.length > 0) {
                filteredPlans = filteredPlans.filter(p => 
                    filters.category.includes(p.planCategory)
                );
            }
            
            // 가격 필터
            if (filters.monthlyFee.length > 0) {
                filteredPlans = filteredPlans.filter(p => {
                    const fee = p.monthlyFee || 0;
                    return filters.monthlyFee.some(range => {
                        if (range === '~5') return fee <= 50000;
                        if (range === '6~8') return fee >= 60000 && fee <= 80000;
                        if (range === '9~') return fee >= 90000;
                        return false;
                    });
                });
            }
            
            // 데이터 필터
            if (filters.dataAllowance.length > 0) {
                filteredPlans = filteredPlans.filter(p => {
                    return filters.dataAllowance.some(dataType => {
                        if (dataType === '무제한') return p.dataAllowance === 99999;
                        if (dataType === 'large') return p.dataAllowance >= 100 && p.dataAllowance < 99999;
                        if (dataType === 'small') return p.dataAllowance < 100 && p.dataAllowance > 0;
                        return false;
                    });
                });
            }
            
            // 혜택 필터
            if (filters.benefits.length > 0) {
                filteredPlans = filteredPlans.filter(p => {
                    const planBenefits = p.benefitIdList || [];
                    return filters.benefits.some(benefitId => 
                        planBenefits.includes(benefitId)
                    );
                });
            }
        }
        
        return filteredPlans;
    }

    /**
     * 검색 입력 필드 업데이트
     */
    function updateSearchInput(value) {
        if (elements.searchInput.value.trim() !== value) {
            elements.searchInput.value = value;
        }
    }

    // --- 렌더링 함수들 ---
    
    /**
     * 요금제 테이블 렌더링
     */
    function renderPlansTable() {
        const tbody = elements.plansTableBody;
        tbody.innerHTML = '';

        if (!currentPlans || currentPlans.length === 0) {
            elements.plansTable.style.display = 'none';
            elements.emptyState.style.display = 'block';
            return;
        }

        elements.plansTable.style.display = 'table';
        elements.emptyState.style.display = 'none';

        currentPlans.forEach((plan, index) => {
            const row = document.createElement('tr');
            
            // 각 컬럼 데이터 포맷팅
            const dataDisplay = formatDataDisplay(plan);
            const tetheringDisplay = formatTetheringDisplay(plan);
            const voiceDisplay = formatVoiceDisplay(plan);
            const feeDisplay = formatFeeDisplay(plan);
            
            // 혜택 표시
            const benefits = getBenefitsByType(plan.benefitIdList || []);
            
            row.innerHTML = `
                <td>${plan.planId || ''}</td>
                <td>${window.AdminCommon.escapeHtml(plan.planCategory || '')}</td>
                <td class="plan-name" title="${window.AdminCommon.escapeHtml(plan.planName)}">${window.AdminCommon.escapeHtml(plan.planName)}</td>
                <td>${dataDisplay}</td>
                <td>${tetheringDisplay}</td>
                <td>${voiceDisplay}</td>
                <td>${benefits.basic}</td>
                <td>${benefits.premium}</td>
                <td>${benefits.media}</td>
                <td>${feeDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn btn-edit" onclick="handleEditPlan(${plan.planId})" title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * 데이터 표시 포맷팅
     */
    function formatDataDisplay(plan) {
        if (plan.dataAllowance === 99999) {
            return '무제한';
        } else if (plan.dataAllowance && plan.dataAllowanceUnit) {
            let display = `${plan.dataAllowance}${plan.dataAllowanceUnit}`;
            if (plan.dataPeriod) {
                const periodText = plan.dataPeriod === 'DAY' ? '일' : '월';
                display += ` (${periodText})`;
            }
            return display;
        }
        return '정보 없음';
    }

    /**
     * 테더링/공유 표시 포맷팅
     */
    function formatTetheringDisplay(plan) {
        const tethering = (plan.tetheringDataAmount && plan.tetheringDataUnit) ?
            `테더링: ${plan.tetheringDataAmount}${plan.tetheringDataUnit}` : '';
        const sharing = (plan.familyDataAmount && plan.familyDataUnit) ?
            `쉐어링: ${plan.familyDataAmount}${plan.familyDataUnit}` : '';

        if (tethering && sharing) {
            return `${tethering} / ${sharing}`;
        } else if (tethering) {
            return tethering;
        } else if (sharing) {
            return sharing;
        }
        return '없음';
    }

    /**
     * 음성 통화 표시 포맷팅
     */
    function formatVoiceDisplay(plan) {
        if (plan.voiceAllowance === 0) {
            return '무제한';
        } else if (plan.voiceAllowance) {
            let display = `${plan.voiceAllowance}분`;
            if (plan.additionalCallAllowance) {
                display += ` (+${plan.additionalCallAllowance}분)`;
            }
            return display;
        }
        return '정보 없음';
    }

    /**
     * 요금 표시 포맷팅
     */
    function formatFeeDisplay(plan) {
        return plan.monthlyFee != null ? 
            `${plan.monthlyFee.toLocaleString()}원` : '정보 없음';
    }

    /**
     * 혜택을 타입별로 분류하여 반환
     */
    function getBenefitsByType(benefitIds) {
        const planBenefits = benefitIds
            .map(benefitId => allBenefits.find(b => b.benefitId === benefitId))
            .filter(Boolean);

        const basic = planBenefits
            .filter(b => b.benefitType === 'BASIC')
            .map(b => b.benefitName)
            .join(', ') || '없음';
        
        const premium = planBenefits
            .filter(b => b.benefitType === 'PREMIUM')
            .map(b => b.benefitName)
            .join(', ') || '없음';
        
        const media = planBenefits
            .filter(b => b.benefitType === 'MEDIA')
            .map(b => b.benefitName)
            .join(', ') || '없음';

        return { basic, premium, media };
    }

    /**
     * 혜택 선택 드롭다운 설정
     */
    function setupBenefitSelects() {
        setupBenefitManagement('BASIC', 'addBasicBenefitBtn', 'selectBasicBenefit', 'basicBenefitList');
        setupBenefitManagement('PREMIUM', 'addPremiumBenefitBtn', 'selectPremiumBenefit', 'premiumBenefitList');
        setupBenefitManagement('MEDIA', 'addMediaBenefitBtn', 'selectMediaBenefit', 'mediaBenefitList');
    }

    /**
     * 혜택 관리 설정
     */
    function setupBenefitManagement(benefitType, addBtnId, selectId, listId) {
        const addBtn = document.getElementById(addBtnId);
        const selectElement = document.getElementById(selectId);
        const targetListElement = document.getElementById(listId);

        // 선택 옵션 설정
        selectElement.innerHTML = '<option value="">혜택 선택</option>';
        const filteredBenefits = allBenefits.filter(b => b.benefitType === benefitType);
        filteredBenefits.forEach(benefit => {
            const option = document.createElement('option');
            option.value = benefit.benefitId;
            option.textContent = benefit.benefitName;
            selectElement.appendChild(option);
        });

        // 추가 버튼 이벤트
        addBtn.onclick = null;
        addBtn.addEventListener('click', () => {
            const selectedBenefitId = selectElement.value;
            if (selectedBenefitId) {
                const existingBenefitIds = Array.from(targetListElement.children).map(
                    li => li.dataset.benefitId
                );
                if (existingBenefitIds.includes(selectedBenefitId)) {
                    alert('이미 추가된 혜택입니다.');
                    return;
                }

                const selectedBenefit = filteredBenefits.find(
                    b => b.benefitId == selectedBenefitId
                );
                if (selectedBenefit) {
                    addBenefitItemToModal(
                        targetListElement,
                        selectedBenefit.benefitId,
                        selectedBenefit.benefitName,
                        benefitType
                    );
                    selectElement.value = '';
                }
            } else {
                alert('추가할 혜택을 선택해주세요.');
            }
        });
    }

    /**
     * 혜택 아이템을 모달에 추가
     */
    function addBenefitItemToModal(targetListElement, benefitId, benefitName, benefitType) {
        const item = document.createElement('div');
        item.className = 'benefit-item';
        item.dataset.benefitId = benefitId;
        item.dataset.benefitType = benefitType;
        item.innerHTML = `
            <span>${benefitName}</span>
            <button type="button" class="remove-btn" data-benefit-id="${benefitId}">-</button>
        `;
        targetListElement.appendChild(item);

        item.querySelector('.remove-btn').addEventListener('click', (event) => {
            event.target.closest('.benefit-item').remove();
        });
    }

    /**
     * 혜택 필터 카드 렌더링
     */
    function renderBenefitFilterCards() {
        if (!elements.benefitFilterContainer) return;
        
        elements.benefitFilterContainer.innerHTML = '';
        allBenefits.forEach(benefit => {
            const card = document.createElement('div');
            card.className = 'benefit-filter-card';
            card.dataset.benefitId = benefit.benefitId;
            
            const typeClass = benefit.benefitType.toLowerCase();
            card.classList.add(typeClass);
            
            card.innerHTML = `
                <div class="benefit-card-name">${benefit.benefitName}</div>
                <div class="benefit-card-price">${benefit.benefitPrice ? benefit.benefitPrice.toLocaleString() + '원' : '무료'}</div>
            `;
            
            card.addEventListener('click', () => {
                card.classList.toggle('selected');
            });
            
            elements.benefitFilterContainer.appendChild(card);
        });
    }

    /**
     * 선택된 필터 렌더링
     */
    function renderSelectedFilters() {
        if (!elements.selectedFilters) return;
        
        elements.selectedFilters.innerHTML = '';
        
        // 각 필터 타입별로 태그 추가
        Object.entries(currentFilters).forEach(([filterType, values]) => {
            values.forEach(value => {
                if (filterType === 'benefits') {
                    const benefit = allBenefits.find(b => b.benefitId === value);
                    if (benefit) {
                        addSelectedFilterTag(benefit.benefitName, filterType, value);
                    }
                } else {
                    addSelectedFilterTag(value, filterType);
                }
            });
        });
    }

    /**
     * 선택된 필터 태그 추가
     */
    function addSelectedFilterTag(displayValue, filterType, value = null) {
        const tag = document.createElement('span');
        tag.className = 'selected-filter-tag';
        tag.innerHTML = `
            ${displayValue}
            <button type="button" class="remove-btn" data-filter-type="${filterType}" data-value="${value || displayValue}">
                &times;
            </button>
        `;
        
        const removeBtn = tag.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => {
            removeFilter(filterType, value || displayValue);
        });
        
        elements.selectedFilters.appendChild(tag);
    }

    // --- 유틸리티 함수들 ---
    
    /**
     * 필터 제거
     */
    function removeFilter(filterType, value) {
        if (filterType === 'benefits') {
            currentFilters.benefits = currentFilters.benefits.filter(id => id !== parseInt(value));
        } else {
            currentFilters[filterType] = currentFilters[filterType].filter(v => v !== value);
        }
        
        renderSelectedFilters();
        fetchPlans(currentSearchValue, currentFilters, false);
    }

    // --- 전역 이벤트 핸들러 ---
    
    /**
     * 요금제 수정 핸들러
     */
    window.handleEditPlan = async function(planId) {
        const planData = await fetchPlanDetails(planId);
        if (!planData) return;
        
        currentModalMode = 'edit';
        currentEditingPlanId = planId;
        
        // 모달 제목 변경
        elements.modalTitle.innerHTML = '<i class="fas fa-edit"></i> 요금제 수정';
        elements.modalSaveBtn.textContent = '수정';
        
        // 폼 데이터 설정
        elements.modalPlanName.value = planData.planName || '';
        elements.modalCategory.value = planData.planCategory || '';
        elements.modalMonthlyFee.value = planData.monthlyFee || '';
        
        elements.modalDataAllowance.value = planData.dataAllowance === 99999 ? '' : (planData.dataAllowance || '');
        elements.modalDataAllowanceUnit.value = planData.dataAllowanceUnit || 'GB';
        elements.modalDataPeriod.value = planData.dataPeriod || 'MONTH';
        
        elements.modalVoiceAllowance.value = planData.voiceAllowance === 0 ? '' : (planData.voiceAllowance || '');
        elements.modalAdditionalCallAllowance.value = planData.additionalCallAllowance || '';
        
        elements.modalTetheringDataAmount.value = planData.tetheringDataAmount || '';
        elements.modalTetheringDataUnit.value = planData.tetheringDataUnit || 'GB';
        elements.modalFamilyDataAmount.value = planData.familyDataAmount || '';
        elements.modalFamilyDataUnit.value = planData.familyDataUnit || 'GB';
        
        // 혜택 데이터 설정
        elements.basicBenefitList.innerHTML = '';
        elements.premiumBenefitList.innerHTML = '';
        elements.mediaBenefitList.innerHTML = '';
        
        const planBenefits = (planData.benefitIdList || [])
            .map(benefitId => allBenefits.find(b => b.benefitId === benefitId))
            .filter(Boolean);
        
        planBenefits.forEach(benefit => {
            if (benefit.benefitType === 'BASIC') {
                addBenefitItemToModal(elements.basicBenefitList, benefit.benefitId, benefit.benefitName, 'BASIC');
            } else if (benefit.benefitType === 'PREMIUM') {
                addBenefitItemToModal(elements.premiumBenefitList, benefit.benefitId, benefit.benefitName, 'PREMIUM');
            } else if (benefit.benefitType === 'MEDIA') {
                addBenefitItemToModal(elements.mediaBenefitList, benefit.benefitId, benefit.benefitName, 'MEDIA');
            }
        });
        
        // 모달 표시
        window.AdminCommon.showModal(elements.planModal);
    };

    /**
     * 폼 데이터 수집
     */
    function collectFormData() {
        const formData = {
            planName: elements.modalPlanName.value.trim(),
            planCategory: elements.modalCategory.value.trim(),
            monthlyFee: parseFloat(elements.modalMonthlyFee.value) || 0,
            
            dataAllowance: elements.modalDataAllowance.value.trim() === '' || 
                          elements.modalDataAllowance.value.trim() === '무제한' ? 
                          99999 : parseFloat(elements.modalDataAllowance.value) || 0,
            dataAllowanceUnit: elements.modalDataAllowanceUnit.value.trim(),
            dataPeriod: elements.modalDataPeriod.value.trim(),
            
            voiceAllowance: elements.modalVoiceAllowance.value.trim() === '' || 
                           elements.modalVoiceAllowance.value.trim() === '무제한' ? 
                           0 : parseFloat(elements.modalVoiceAllowance.value) || 0,
            additionalCallAllowance: elements.modalAdditionalCallAllowance.value.trim() === '' ? 
                                   null : parseFloat(elements.modalAdditionalCallAllowance.value),
            
            tetheringDataAmount: elements.modalTetheringDataAmount.value.trim() === '' ? 
                               null : parseFloat(elements.modalTetheringDataAmount.value),
            tetheringDataUnit: elements.modalTetheringDataUnit.value.trim(),
            familyDataAmount: elements.modalFamilyDataAmount.value.trim() === '' ? 
                            null : parseFloat(elements.modalFamilyDataAmount.value),
            familyDataUnit: elements.modalFamilyDataUnit.value.trim(),
            
            benefitIdList: []
        };
        
        // 선택된 혜택 ID 수집
        ['basicBenefitList', 'premiumBenefitList', 'mediaBenefitList'].forEach(listId => {
            const listElement = document.getElementById(listId);
            Array.from(listElement.children).forEach(item => {
                formData.benefitIdList.push(parseInt(item.dataset.benefitId));
            });
        });
        
        // 수정 모드인 경우 planStatus 추가
        if (currentModalMode === 'edit') {
            const currentPlan = allPlans.find(p => p.planId === currentEditingPlanId);
            formData.planStatus = currentPlan ? currentPlan.planStatus : 'USE';
        } else {
            formData.planStatus = 'USE';
        }
        
        return formData;
    }

    /**
     * 폼 유효성 검사
     */
    function validateForm(formData) {
        if (!formData.planName) {
            alert('요금제 이름을 입력해주세요.');
            elements.modalPlanName.focus();
            return false;
        }
        
        if (!formData.planCategory) {
            alert('카테고리를 입력해주세요.');
            elements.modalCategory.focus();
            return false;
        }
        
        if (!formData.monthlyFee || formData.monthlyFee <= 0) {
            alert('월정액을 올바르게 입력해주세요.');
            elements.modalMonthlyFee.focus();
            return false;
        }
        
        return true;
    }

    // --- 이벤트 리스너 설정 ---
    
    // 검색 이벤트
    elements.searchBtn.addEventListener('click', () => {
        fetchPlans(elements.searchInput.value.trim(), currentFilters, false);
    });
    
    window.AdminCommon.setupEnterKey(elements.searchInput, () => elements.searchBtn.click());
    
    // 실시간 검색 (입력하면서 바로 검색)
    window.AdminCommon.setupSearchInput(elements.searchInput, (searchValue) => {
        fetchPlans(searchValue, currentFilters, false);
    }, 300); // 300ms 디바운스
    
    // 신규 등록 버튼 이벤트
    elements.addNewPlanBtn.addEventListener('click', () => {
        currentModalMode = 'add';
        currentEditingPlanId = null;
        
        // 모달 초기화
        elements.modalTitle.innerHTML = '<i class="fas fa-plus"></i> 새 요금제 등록';
        elements.modalSaveBtn.textContent = '등록';
        
        // 폼 초기화
        elements.planForm.reset();
        elements.basicBenefitList.innerHTML = '';
        elements.premiumBenefitList.innerHTML = '';
        elements.mediaBenefitList.innerHTML = '';
        
        window.AdminCommon.showModal(elements.planModal);
        elements.modalPlanName.focus();
    });
    
    // 모달 저장 버튼 이벤트
    elements.modalSaveBtn.addEventListener('click', async () => {
        const formData = collectFormData();
        
        if (!validateForm(formData)) return;
        
        let success = false;
        
        if (currentModalMode === 'add') {
            success = await createPlan(formData);
        } else {
            success = await updatePlan(currentEditingPlanId, formData);
        }
        
        if (success) {
            window.AdminCommon.hideModal(elements.planModal);
            fetchPlans(currentSearchValue, currentFilters, true);
        }
    });
    
    // 모달 이벤트 설정
    window.AdminCommon.setupModalEvents(elements.planModal, [
        elements.modalCloseBtn,
        elements.modalCancelBtn
    ]);
    
    // 필터 버튼 이벤트
    elements.filterBtn.addEventListener('click', () => {
        initializeFilterModal();
        window.AdminCommon.showModal(elements.filterModal);
    });
    
    // 필터 모달 이벤트
    window.AdminCommon.setupModalEvents(elements.filterModal, [
        elements.filterModalCloseBtn
    ]);
    
    // 필터 적용 버튼 이벤트
    elements.applyFiltersBtn.addEventListener('click', () => {
        applyFilters();
        window.AdminCommon.hideModal(elements.filterModal);
    });
    
    // 필터 전체 해제 버튼 이벤트
    elements.clearFiltersBtn.addEventListener('click', () => {
        clearAllFilters();
    });

    // --- 필터 관련 함수들 ---
    
    /**
     * 필터 모달 초기화
     */
    function initializeFilterModal() {
        // 모든 필터 태그 초기화
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('selected');
        });
        
        // 모든 혜택 카드 초기화
        document.querySelectorAll('.benefit-filter-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 현재 필터 상태 반영
        Object.entries(currentFilters).forEach(([filterType, values]) => {
            if (filterType === 'benefits') {
                values.forEach(benefitId => {
                    const card = document.querySelector(`[data-benefit-id="${benefitId}"]`);
                    if (card) card.classList.add('selected');
                });
            } else {
                values.forEach(value => {
                    const tag = document.querySelector(`[data-filter-type="${filterType}"] [data-value="${value}"]`);
                    if (tag) tag.classList.add('selected');
                });
            }
        });
        
        // 전체 태그 처리
        Object.keys(currentFilters).forEach(filterType => {
            if (filterType !== 'benefits' && currentFilters[filterType].length === 0) {
                const allTag = document.querySelector(`[data-filter-type="${filterType}"] [data-value="all"]`);
                if (allTag) allTag.classList.add('selected');
            }
        });
        
    // in initializeFilterModal() ...
        // 이벤트 리스너 설정
        document.querySelectorAll('.filter-tag').forEach(tag => {
            // 기존 리스너를 먼저 제거하여 중복 등록을 방지합니다.
            tag.removeEventListener('click', toggleFilterTag);
            tag.addEventListener('click', toggleFilterTag);
        });
    }
    
    /**
     * 필터 태그 토글
     */
        function toggleFilterTag(event) { // 인자를 이벤트 객체로 받도록 변경
            const clickedTag = event.currentTarget; // 클릭된 요소를 event.currentTarget으로 가져옴
            const group = clickedTag.closest('.filter-tag-group');
            const value = clickedTag.dataset.value;
        
        if (value === 'all') {
            // 전체 선택
            group.querySelectorAll('.filter-tag').forEach(tag => {
                tag.classList.remove('selected');
            });
            clickedTag.classList.add('selected');
        } else {
            // 개별 선택
            const allTag = group.querySelector('[data-value="all"]');
            if (allTag) allTag.classList.remove('selected');
            
            clickedTag.classList.toggle('selected');
            
            // 아무것도 선택되지 않았으면 전체 선택
            const hasSelection = group.querySelectorAll('.filter-tag.selected:not([data-value="all"])').length > 0;
            if (!hasSelection && allTag) {
                allTag.classList.add('selected');
            }
        }
    }
    
        /**
     * ✅ [수정] 필터 적용 함수
     * - newFilters 객체에 존재하지 않는 filterType에 대한 예외 처리 추가
     */
    function applyFilters() {
        const newFilters = { category: [], monthlyFee: [], dataAllowance: [], benefits: [] };
        
        document.querySelectorAll('.filter-tag-group').forEach(group => {
            const filterType = group.dataset.filterType;

            // --- 여기부터 수정 ---
            // newFilters 객체에 해당 filterType이 배열로 존재하는지 확인
            if (newFilters[filterType] && Array.isArray(newFilters[filterType])) {
                group.querySelectorAll('.filter-tag.selected:not([data-value="all"])').forEach(tag => {
                    newFilters[filterType].push(tag.dataset.value);
                });
            }
            // --- 여기까지 수정 ---
        });
        
        document.querySelectorAll('.benefit-filter-card.selected').forEach(card => {
            newFilters.benefits.push(parseInt(card.dataset.benefitId));
        });
        
        currentFilters = newFilters;
        renderSelectedFilters();
        
        updateSearchInput('');
        fetchPlans('', currentFilters);
    }
    
    /**
     * 모든 필터 해제
     */
    function clearAllFilters() {
        // 모든 필터 태그 해제
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('selected');
        });
        
        // 모든 전체 태그 선택
        document.querySelectorAll('[data-value="all"]').forEach(tag => {
            tag.classList.add('selected');
        });
        
        // 모든 혜택 카드 해제
        document.querySelectorAll('.benefit-filter-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 필터 상태 초기화
        currentFilters = { category: [], monthlyFee: [], dataAllowance: [], benefits: [] };
        
        // 선택된 필터 표시 업데이트
        renderSelectedFilters();
        
        // 필터 적용
        fetchPlans(currentSearchValue, currentFilters, false);
    }

    // --- 초기화 ---
    
    /**
     * 페이지 초기화
     */
    async function initialize() {
        console.log('요금제 관리 페이지 초기화 시작');
        
        try {
            // 혜택 목록 먼저 로드
            await fetchBenefits();
            
            // 초기 데이터 로드
            await fetchPlans('', null, true);
            
            console.log('요금제 관리 페이지 초기화 완료');
        } catch (error) {
            console.error('페이지 초기화 오류:', error);
            alert('페이지 초기화 중 오류가 발생했습니다.');
        }
    }

    // 페이지 초기화 실행
    initialize();
});