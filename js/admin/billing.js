/**
 * billing.js - 요금제 관리 페이지 기능
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const elements = {
        // 통계 요소
        totalUsers: $('#totalUsers'),
        premiumUsers: $('#premiumUsers'),
        monthlyRevenue: $('#monthlyRevenue'),
        conversionRate: $('#conversionRate'),
        
        // 요금제 관련
        plansGrid: $('#plansGrid'),
        addPlanBtn: $('#addPlanBtn'),
        
        // 구독 관련
        subscriptionSearchInput: $('#subscriptionSearchInput'),
        subscriptionSearchBtn: $('#subscriptionSearchBtn'),
        statusFilterRadios: $$('input[name="statusFilter"]'),
        subscriptionTableBody: $('#subscriptionTableBody'),
        
        // 요금제 모달
        planModal: $('#planModal'),
        planForm: $('#planForm'),
        modalTitle: $('#modalTitle'),
        planModalCloseBtn: $('#planModalCloseBtn'),
        planModalCancelBtn: $('#planModalCancelBtn'),
        planModalSaveBtn: $('#planModalSaveBtn'),
        
        // 구독 상세 모달
        subscriptionDetailModal: $('#subscriptionDetailModal'),
        subscriptionDetailContent: $('#subscriptionDetailContent'),
        subscriptionDetailCloseBtn: $('#subscriptionDetailCloseBtn'),
        subscriptionDetailCloseBtn2: $('#subscriptionDetailCloseBtn2')
    };

    // 상태 관리
    let currentPlans = [];
    let currentSubscriptions = [];
    let currentFilter = 'all';
    let editingPlanId = null;

    // --- API 함수들 ---

    /**
     * 대시보드 통계 조회
     */
    async function fetchDashboardStats() {
        try {
            // 실제 API 엔드포인트에 맞게 수정 필요
            const stats = await apiGet('/admin/billing/stats');
            
            // 통계 업데이트
            elements.totalUsers.textContent = stats.totalUsers?.toLocaleString() || '0';
            elements.premiumUsers.textContent = stats.premiumUsers?.toLocaleString() || '0';
            elements.monthlyRevenue.textContent = stats.monthlyRevenue ? 
                `₩${stats.monthlyRevenue.toLocaleString()}` : '₩0';
            elements.conversionRate.textContent = stats.conversionRate ? 
                `${stats.conversionRate}%` : '0%';
            
        } catch (error) {
            console.error('통계 조회 오류:', error);
            // 기본값 설정
            elements.totalUsers.textContent = '0';
            elements.premiumUsers.textContent = '0';
            elements.monthlyRevenue.textContent = '₩0';
            elements.conversionRate.textContent = '0%';
        }
    }

    /**
     * 요금제 목록 조회
     */
    async function fetchPlans() {
        try {
            setLoading(elements.plansGrid, true);
            
            const result = await apiGet('/admin/billing/plans');
            
            let plans = [];
            if (Array.isArray(result)) {
                plans = result;
            } else if (result.data && Array.isArray(result.data)) {
                plans = result.data;
            }
            
            currentPlans = plans;
            renderPlansGrid(plans);
            
        } catch (error) {
            console.error('요금제 목록 조회 오류:', error);
            showNotification('요금제 목록을 불러오는데 실패했습니다.', 'error');
            currentPlans = [];
            renderPlansGrid([]);
        } finally {
            setLoading(elements.plansGrid, false);
        }
    }

    /**
     * 요금제 추가/수정
     */
    async function savePlan(planData) {
        try {
            if (editingPlanId) {
                // 수정
                await apiPut(`/admin/billing/plans/${editingPlanId}`, planData);
                showNotification('요금제가 수정되었습니다.', 'success');
            } else {
                // 추가
                await apiPost('/admin/billing/plans', planData);
                showNotification('요금제가 추가되었습니다.', 'success');
            }
            return true;
        } catch (error) {
            console.error('요금제 저장 오류:', error);
            const message = error.message || '요금제 저장에 실패했습니다.';
            showNotification(message, 'error');
            return false;
        }
    }

    /**
     * 요금제 삭제
     */
    async function deletePlan(planId) {
        try {
            await apiDelete(`/admin/billing/plans/${planId}`);
            return true;
        } catch (error) {
            console.error('요금제 삭제 오류:', error);
            return false;
        }
    }

    /**
     * 요금제 상태 토글
     */
    async function togglePlanStatus(planId) {
        try {
            await apiPatch(`/admin/billing/plans/${planId}/toggle-status`);
            return true;
        } catch (error) {
            console.error('요금제 상태 변경 오류:', error);
            return false;
        }
    }

    /**
     * 구독 목록 검색
     */
    async function searchSubscriptions(searchTerm = '', statusFilter = 'all') {
        try {
            setLoading(elements.subscriptionTableBody.closest('.card'), true);
            
            const params = {
                search: searchTerm,
                status: statusFilter === 'all' ? undefined : statusFilter
            };
            
            // 실제 API 엔드포인트에 맞게 수정 필요
            const result = await apiPost('/admin/billing/subscriptions/search', params);
            
            let subscriptions = [];
            if (Array.isArray(result)) {
                subscriptions = result;
            } else if (result.data && Array.isArray(result.data)) {
                subscriptions = result.data;
            }
            
            currentSubscriptions = subscriptions;
            renderSubscriptionTable(subscriptions);
            
        } catch (error) {
            console.error('구독 검색 오류:', error);
            showNotification('구독 정보 검색에 실패했습니다.', 'error');
            currentSubscriptions = [];
            renderSubscriptionTable([]);
        } finally {
            setLoading(elements.subscriptionTableBody.closest('.card'), false);
        }
    }

    /**
     * 구독 상세 정보 조회
     */
    async function getSubscriptionDetails(subscriptionId) {
        try {
            const result = await apiGet(`/admin/billing/subscriptions/${subscriptionId}`);
            return result;
        } catch (error) {
            console.error('구독 상세 정보 조회 오류:', error);
            return null;
        }
    }

    /**
     * 구독 취소
     */
    async function cancelSubscription(subscriptionId) {
        try {
            await apiPatch(`/admin/billing/subscriptions/${subscriptionId}/cancel`);
            return true;
        } catch (error) {
            console.error('구독 취소 오류:', error);
            return false;
        }
    }

    // --- 렌더링 함수들 ---

    /**
     * 요금제 그리드 렌더링
     */
    function renderPlansGrid(plans) {
        const grid = elements.plansGrid;
        grid.innerHTML = '';

        if (!plans || plans.length === 0) {
            grid.innerHTML = `
                <div class="empty-plans">
                    <i class="fas fa-credit-card"></i>
                    <h3>등록된 요금제가 없습니다</h3>
                    <p>새 요금제를 추가해보세요</p>
                </div>
            `;
            return;
        }

        plans.forEach(plan => {
            const planCard = document.createElement('div');
            planCard.className = `plan-card ${plan.featured ? 'featured' : ''}`;
            
            const statusClass = plan.status === 'active' ? 'active' : 'inactive';
            const statusText = plan.status === 'active' ? '활성' : '비활성';
            
            planCard.innerHTML = `
                <div class="plan-status ${statusClass}">${statusText}</div>
                <div class="plan-header">
                    <div class="plan-name">${escapeHtml(plan.name)}</div>
                    <div class="plan-price">
                        <span class="currency">₩</span>${plan.price?.toLocaleString() || '0'}
                    </div>
                    <div class="plan-period">${plan.duration || 30}일</div>
                </div>
                <div class="plan-description">
                    ${escapeHtml(plan.description || '요금제 설명이 없습니다.')}
                </div>
                <ul class="plan-features">
                    <li>프리미엄 기능 사용</li>
                    <li>무제한 채팅</li>
                    <li>우선 고객 지원</li>
                    <li>광고 제거</li>
                </ul>
                <div class="plan-stats">
                    <div class="plan-stat">
                        <div class="plan-stat-number">${plan.subscriberCount || 0}</div>
                        <div class="plan-stat-label">구독자</div>
                    </div>
                    <div class="plan-stat">
                        <div class="plan-stat-number">₩${(plan.monthlyRevenue || 0).toLocaleString()}</div>
                        <div class="plan-stat-label">월 수익</div>
                    </div>
                </div>
                <div class="plan-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editPlan(${plan.id})">
                        <i class="fas fa-edit"></i>
                        편집
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="togglePlanStatusHandler(${plan.id})">
                        <i class="fas fa-toggle-${plan.status === 'active' ? 'off' : 'on'}"></i>
                        ${plan.status === 'active' ? '비활성화' : '활성화'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deletePlanHandler(${plan.id})">
                        <i class="fas fa-trash"></i>
                        삭제
                    </button>
                </div>
            `;
            
            grid.appendChild(planCard);
        });
    }

    /**
     * 구독 테이블 렌더링
     */
    function renderSubscriptionTable(subscriptions) {
        const tbody = elements.subscriptionTableBody;
        tbody.innerHTML = '';

        if (!subscriptions || subscriptions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>검색된 구독이 없습니다</h3>
                            <p>다른 검색어로 시도해보세요</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        subscriptions.forEach((subscription, index) => {
            const row = document.createElement('tr');
            const statusClass = getSubscriptionStatusClass(subscription.status);
            const statusText = getSubscriptionStatusText(subscription.status);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="user-info">
                        <div class="user-name">${escapeHtml(subscription.userName || '-')}</div>
                        <div class="user-id">ID: ${subscription.userId || '-'}</div>
                    </div>
                </td>
                <td class="user-email">${escapeHtml(subscription.userEmail || '-')}</td>
                <td>
                    <div class="plan-info">
                        <div class="plan-name-cell">${escapeHtml(subscription.planName || '-')}</div>
                        <div class="plan-duration">${subscription.planDuration || 30}일</div>
                    </div>
                </td>
                <td>
                    <span class="subscription-status ${statusClass}">${statusText}</span>
                </td>
                <td class="date-cell">${formatDate(subscription.startDate)}</td>
                <td class="date-cell">${formatDate(subscription.endDate)}</td>
                <td class="amount-cell">₩${(subscription.amount || 0).toLocaleString()}</td>
                <td>
                    <button class="btn action-btn" onclick="showSubscriptionDetail('${subscription.id}')">
                        <i class="fas fa-eye"></i>
                        상세
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * 구독 상태별 CSS 클래스 반환
     */
    function getSubscriptionStatusClass(status) {
        const statusMap = {
            'active': 'active',
            'cancelled': 'cancelled',
            'expired': 'expired',
            'pending': 'pending'
        };
        return statusMap[status] || 'pending';
    }

    /**
     * 구독 상태별 텍스트 반환
     */
    function getSubscriptionStatusText(status) {
        const statusMap = {
            'active': '활성',
            'cancelled': '취소',
            'expired': '만료',
            'pending': '대기'
        };
        return statusMap[status] || '알 수 없음';
    }

    // --- 전역 이벤트 핸들러 (HTML에서 호출) ---

    /**
     * 요금제 편집
     */
    window.editPlan = function(planId) {
        const plan = currentPlans.find(p => p.id === planId);
        if (!plan) return;

        editingPlanId = planId;
        elements.modalTitle.textContent = '요금제 편집';
        
        // 폼에 데이터 채우기
        $('#planName').value = plan.name || '';
        $('#planPrice').value = plan.price || '';
        $('#planDuration').value = plan.duration || '';
        $('#planDescription').value = plan.description || '';
        
        // 상태 라디오 버튼 설정
        const statusRadio = document.querySelector(`input[name="status"][value="${plan.status || 'active'}"]`);
        if (statusRadio) statusRadio.checked = true;
        
        showModal(elements.planModal);
    };

    /**
     * 요금제 상태 토글
     */
    window.togglePlanStatusHandler = async function(planId) {
        if (await togglePlanStatus(planId)) {
            showNotification('요금제 상태가 변경되었습니다.', 'success');
            await fetchPlans();
        } else {
            showNotification('요금제 상태 변경에 실패했습니다.', 'error');
        }
    };

    /**
     * 요금제 삭제
     */
    window.deletePlanHandler = async function(planId) {
        if (!confirm('이 요금제를 정말 삭제하시겠습니까?')) return;
        
        if (await deletePlan(planId)) {
            showNotification('요금제가 삭제되었습니다.', 'success');
            await fetchPlans();
        } else {
            showNotification('요금제 삭제에 실패했습니다.', 'error');
        }
    };

    /**
     * 구독 상세 정보 표시
     */
    window.showSubscriptionDetail = async function(subscriptionId) {
        elements.subscriptionDetailContent.innerHTML = '<div class="loading-spinner"></div>';
        showModal(elements.subscriptionDetailModal);
        
        const details = await getSubscriptionDetails(subscriptionId);
        
        if (details) {
            elements.subscriptionDetailContent.innerHTML = `
                <div class="subscription-detail">
                    <div class="detail-section">
                        <h4>구독 정보</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>구독 ID:</label>
                                <span>${details.id}</span>
                            </div>
                            <div class="detail-item">
                                <label>사용자:</label>
                                <span>${escapeHtml(details.userName || '-')}</span>
                            </div>
                            <div class="detail-item">
                                <label>이메일:</label>
                                <span>${escapeHtml(details.userEmail || '-')}</span>
                            </div>
                            <div class="detail-item">
                                <label>요금제:</label>
                                <span>${escapeHtml(details.planName || '-')}</span>
                            </div>
                            <div class="detail-item">
                                <label>상태:</label>
                                <span class="subscription-status ${getSubscriptionStatusClass(details.status)}">
                                    ${getSubscriptionStatusText(details.status)}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>시작일:</label>
                                <span>${formatDate(details.startDate)}</span>
                            </div>
                            <div class="detail-item">
                                <label>만료일:</label>
                                <span>${formatDate(details.endDate)}</span>
                            </div>
                            <div class="detail-item">
                                <label>결제 금액:</label>
                                <span class="amount-cell">₩${(details.amount || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    ${details.status === 'active' ? `
                        <div class="detail-actions">
                            <button class="btn btn-danger" onclick="cancelSubscriptionHandler('${details.id}')">
                                <i class="fas fa-times"></i>
                                구독 취소
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            elements.subscriptionDetailContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>구독 정보를 불러올 수 없습니다</h3>
                </div>
            `;
        }
    };

    /**
     * 구독 취소
     */
    window.cancelSubscriptionHandler = async function(subscriptionId) {
        if (!confirm('이 구독을 정말 취소하시겠습니까?')) return;
        
        if (await cancelSubscription(subscriptionId)) {
            showNotification('구독이 취소되었습니다.', 'success');
            hideModal(elements.subscriptionDetailModal);
            // 현재 검색 결과 새로고침
            const searchTerm = elements.subscriptionSearchInput.value.trim();
            await searchSubscriptions(searchTerm, currentFilter);
        } else {
            showNotification('구독 취소에 실패했습니다.', 'error');
        }
    };

    // --- 이벤트 리스너 설정 ---

    // 요금제 추가 버튼
    elements.addPlanBtn.addEventListener('click', () => {
        editingPlanId = null;
        elements.modalTitle.textContent = '새 요금제 추가';
        resetForm(elements.planForm);
        showModal(elements.planModal);
    });

    // 요금제 저장 버튼
    elements.planModalSaveBtn.addEventListener('click', async () => {
        const formData = getFormData(elements.planForm);
        
        // 유효성 검사
        if (!formData.name.trim()) {
            showNotification('요금제 이름을 입력해주세요.', 'warning');
            return;
        }
        
        if (!formData.price || formData.price < 0) {
            showNotification('올바른 가격을 입력해주세요.', 'warning');
            return;
        }
        
        if (!formData.duration || formData.duration < 1) {
            showNotification('올바른 기간을 입력해주세요.', 'warning');
            return;
        }
        
        const planData = {
            name: formData.name.trim(),
            price: parseInt(formData.price),
            duration: parseInt(formData.duration),
            description: formData.description.trim(),
            status: formData.status
        };
        
        if (await savePlan(planData)) {
            hideModal(elements.planModal);
            await fetchPlans();
        }
    });

    // 구독 검색
    elements.subscriptionSearchBtn.addEventListener('click', () => {
        const searchTerm = elements.subscriptionSearchInput.value.trim();
        searchSubscriptions(searchTerm, currentFilter);
    });

    setupEnterKey(elements.subscriptionSearchInput, () => elements.subscriptionSearchBtn.click());

    // 상태 필터 변경
    elements.statusFilterRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                currentFilter = radio.value;
                const searchTerm = elements.subscriptionSearchInput.value.trim();
                searchSubscriptions(searchTerm, currentFilter);
            }
        });
    });

    // 모달 이벤트 설정
    setupModalEvents(elements.planModal, [
        elements.planModalCloseBtn,
        elements.planModalCancelBtn
    ]);

    setupModalEvents(elements.subscriptionDetailModal, [
        elements.subscriptionDetailCloseBtn,
        elements.subscriptionDetailCloseBtn2
    ]);

    // --- 초기화 ---

    /**
     * 페이지 초기화
     */
    async function initialize() {
        // 통계 및 요금제 데이터 로드
        await Promise.all([
            fetchDashboardStats(),
            fetchPlans()
        ]);
        
        console.log('요금제 관리 페이지가 초기화되었습니다.');
    }

    // 페이지 초기화 실행
    initialize();
});