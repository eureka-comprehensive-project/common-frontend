/**
 * forbidden-words.js - 금칙어 관리 페이지 기능
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const elements = {
        // 검색 및 필터
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn'),
        filterRadios: document.querySelectorAll('input[name="forbiddenFilter"]'),
        
        // 버튼
        addNewWordBtn: document.getElementById('addNewWordBtn'),
        enableSelectedBtn: document.getElementById('enableSelectedBtn'),
        disableSelectedBtn: document.getElementById('disableSelectedBtn'),
        deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
        
        // 테이블
        forbiddenWordsTable: document.getElementById('forbiddenWordsTable'),
        forbiddenWordsTableBody: document.getElementById('forbiddenWordsTableBody'),
        emptyState: document.getElementById('emptyState'),
        selectAllCheckbox: document.getElementById('selectAllCheckbox'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        
        // 통계
        totalWordsCount: document.getElementById('totalWordsCount'),
        activeWordsCount: document.getElementById('activeWordsCount'),
        inactiveWordsCount: document.getElementById('inactiveWordsCount'),
        
        // 모달
        addWordModal: document.getElementById('addWordModal'),
        addWordForm: document.getElementById('addWordForm'),
        modalWordInput: document.getElementById('modalWordInput'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalRegisterBtn: document.getElementById('modalRegisterBtn'),
        
        // Toast 컨테이너
        toastContainer: document.getElementById('toastContainer')
    };

    // 상태 관리
    let allForbiddenWords = [];
    let currentForbiddenWords = [];
    let currentFilter = 'all';
    let currentSearchValue = '';

    // --- Toast 알림 시스템 ---

    /**
     * Toast 알림 표시
     * @param {string} message - 알림 메시지
     * @param {string} type - 알림 타입 (success, error, warning, info)
     * @param {number} duration - 표시 시간 (ms)
     */
    function showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconMap[type]}"></i>
            </div>
            <div class="toast-content">
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        // 닫기 버튼 이벤트
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => hideToast(toast));
        
        // 애니메이션으로 표시
        setTimeout(() => toast.classList.add('show'), 100);
        
        // 자동 제거
        setTimeout(() => hideToast(toast), duration);
        
        return toast;
    }

    /**
     * Toast 알림 숨기기
     * @param {HTMLElement} toast - Toast 요소
     */
    function hideToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // --- 로딩 상태 관리 ---

    /**
     * 로딩 상태 설정
     * @param {boolean} isLoading - 로딩 상태
     */
    function setLoading(isLoading) {
        if (isLoading) {
            elements.loadingOverlay.style.display = 'flex';
        } else {
            elements.loadingOverlay.style.display = 'none';
        }
    }

    // --- API 함수들 ---

    /**
     * 금칙어 목록 조회
     * @param {string} searchValue - 검색어
     * @param {string} filterType - 필터 타입
     * @param {boolean} forceRefresh - 강제 새로고침 여부
     */
    async function fetchForbiddenWords(searchValue = '', filterType = 'all', forceRefresh = false) {
        try {
            // 캐시된 데이터가 있고 강제 새로고침이 아니라면 필터링만 수행
            if (allForbiddenWords.length > 0 && !forceRefresh) {
                currentSearchValue = searchValue;
                currentFilter = filterType;
                updateSearchInput(searchValue);
                currentForbiddenWords = applyFiltersAndSearch(allForbiddenWords, searchValue, filterType);
                renderForbiddenWordsTable();
                updateStatistics();
                return;
            }

            setLoading(true);
            
            // AdminCommon의 apiGet 함수 사용
            const result = await window.AdminCommon.apiGet('/admin/forbidden-words');
            
            // 응답 데이터 파싱
            let forbiddenWords = [];
            if (Array.isArray(result)) {
                forbiddenWords = result;
            } else if (result.data && Array.isArray(result.data)) {
                forbiddenWords = result.data;
            } else if (result.words && Array.isArray(result.words)) {
                forbiddenWords = result.words;
            }

            // 상태 업데이트
            allForbiddenWords = forbiddenWords;
            currentSearchValue = searchValue;
            currentFilter = filterType;
            updateSearchInput(searchValue);
            currentForbiddenWords = applyFiltersAndSearch(allForbiddenWords, searchValue, filterType);
            
            renderForbiddenWordsTable();
            updateStatistics();
            
        } catch (error) {
            console.error('금칙어 목록 조회 오류:', error);
            showToast('금칙어 목록을 불러오는데 실패했습니다.', 'error');
            allForbiddenWords = [];
            currentForbiddenWords = [];
            renderForbiddenWordsTable();
            updateStatistics();
        } finally {
            setLoading(false);
        }
    }

    /**
     * 필터링 및 검색 적용
     * @param {Array} words - 전체 금칙어 목록
     * @param {string} searchValue - 검색어
     * @param {string} filterType - 필터 타입
     * @returns {Array} 필터링된 금칙어 목록
     */
    function applyFiltersAndSearch(words, searchValue, filterType) {
        let filteredWords = [...words];
        
        // 상태 필터 적용
        if (filterType === 'used') {
            filteredWords = filteredWords.filter(w => (w.status ?? w.used) === true);
        } else if (filterType === 'unused') {
            filteredWords = filteredWords.filter(w => (w.status ?? w.used) === false);
        }

        // 검색어 필터 적용
        if (searchValue.trim()) {
            const searchTerm = searchValue.trim().toLowerCase();
            filteredWords = filteredWords.filter(w => 
                w.word && w.word.toLowerCase().includes(searchTerm)
            );
        }
        
        return filteredWords;
    }

    /**
     * 금칙어 추가
     * @param {string} word - 금칙어
     * @param {boolean} isUsed - 사용 여부
     * @returns {boolean} 성공 여부
     */
    async function addForbiddenWord(word, isUsed) {
        try {
            await window.AdminCommon.apiPost('/admin/forbidden-words', {
                word,
                used: isUsed
            });
            
            showToast('금칙어가 성공적으로 추가되었습니다.', 'success');
            return true;
        } catch (error) {
            const message = error.message || '금칙어 추가에 실패했습니다.';
            showToast(`금칙어 추가 실패: ${message}`, 'error');
            return false;
        }
    }

    /**
     * 금칙어 삭제
     * @param {number} wordId - 금칙어 ID
     * @returns {boolean} 성공 여부
     */
    async function deleteForbiddenWord(wordId) {
        try {
            await window.AdminCommon.apiDelete(`/admin/forbidden-words/${wordId}`);
            return true;
        } catch (error) {
            console.error('금칙어 삭제 오류:', error);
            return false;
        }
    }

    /**
     * 금칙어 상태 토글
     * @param {number} wordId - 금칙어 ID
     * @returns {boolean} 성공 여부
     */
    async function toggleWordStatus(wordId) {
        try {
            await window.AdminCommon.apiPatch(`/admin/forbidden-words/${wordId}/status-change`);
            return true;
        } catch (error) {
            console.error('금칙어 상태 변경 오류:', error);
            return false;
        }
    }

    // --- 렌더링 함수들 ---

    /**
     * 금칙어 테이블 렌더링
     */
    function renderForbiddenWordsTable() {
        const tbody = elements.forbiddenWordsTableBody;
        tbody.innerHTML = '';

        if (!currentForbiddenWords || currentForbiddenWords.length === 0) {
            elements.forbiddenWordsTable.style.display = 'none';
            elements.emptyState.style.display = 'block';
            return;
        }

        elements.forbiddenWordsTable.style.display = 'table';
        elements.emptyState.style.display = 'none';

        currentForbiddenWords.forEach((word, index) => {
            const row = document.createElement('tr');
            const isActive = word.status !== undefined ? word.status : word.used;
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusText = isActive ? '사용중' : '미사용';
            
            row.innerHTML = `
                <td>
                    <label class="checkbox-container">
                        <input type="checkbox" class="word-checkbox" data-id="${word.id}">
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td>${index + 1}</td>
                <td class="word-cell" title="${window.AdminCommon.escapeHtml(word.word)}">${window.AdminCommon.escapeHtml(word.word)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <label class="toggle-switch">
                            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="handleToggleStatus(${word.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="icon-btn btn-danger" onclick="handleDeleteWord(${word.id})" title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });

        // 전체 선택 체크박스 초기화
        elements.selectAllCheckbox.checked = false;
        elements.selectAllCheckbox.indeterminate = false;
        
        // 체크박스 변경 이벤트 재설정
        updateCheckboxEvents();
    }

    /**
     * 통계 정보 업데이트
     */
    function updateStatistics() {
        const totalCount = allForbiddenWords.length;
        const activeCount = allForbiddenWords.filter(w => (w.status ?? w.used) === true).length;
        const inactiveCount = totalCount - activeCount;

        elements.totalWordsCount.textContent = totalCount.toLocaleString();
        elements.activeWordsCount.textContent = activeCount.toLocaleString();
        elements.inactiveWordsCount.textContent = inactiveCount.toLocaleString();
    }

    /**
     * 검색 입력 필드 업데이트
     * @param {string} value - 검색어
     */
    function updateSearchInput(value) {
        if (elements.searchInput.value.trim() !== value) {
            elements.searchInput.value = value;
        }
    }

    /**
     * 체크박스 이벤트 업데이트
     */
    function updateCheckboxEvents() {
        // 개별 체크박스 변경 시 전체 선택 체크박스 상태 업데이트
        document.querySelectorAll('.word-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectAllCheckbox);
        });
    }

    /**
     * 전체 선택 체크박스 상태 업데이트
     */
    function updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll('.word-checkbox');
        const checkedCount = document.querySelectorAll('.word-checkbox:checked').length;
        
        elements.selectAllCheckbox.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        elements.selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }

    // --- 유틸리티 함수들 ---

    /**
     * 선택된 금칙어 ID 목록 가져오기
     * @returns {Array} 선택된 금칙어 ID 배열
     */
    function getSelectedWordIds() {
        return Array.from(document.querySelectorAll('.word-checkbox:checked')).map(cb => cb.dataset.id);
    }

    /**
     * 벌크 상태 변경 (깜빡임 방지)
     * @param {boolean} targetStatus - 목표 상태
     */
    async function bulkChangeWordStatus(targetStatus) {
        const selectedIds = getSelectedWordIds();
        if (selectedIds.length === 0) {
            showToast('상태를 변경할 금칙어를 선택해주세요.', 'warning');
            return;
        }
        
        const statusText = targetStatus ? '사용' : '미사용';
        showToast(`${selectedIds.length}개 금칙어의 상태를 ${statusText}으로 변경 중...`, 'info');
        
        let successCount = 0;
        
        for (const id of selectedIds) {
            const word = allForbiddenWords.find(w => w.id == id);
            if (!word) continue;
            
            const currentStatus = word.status ?? word.used;
            if (currentStatus !== targetStatus) {
                if (await toggleWordStatus(id)) {
                    // 개별 행 업데이트 (깜빡임 없이)
                    updateRowStatus(parseInt(id), targetStatus);
                    
                    // 토글 스위치도 업데이트
                    const toggleInput = document.querySelector(`input[onchange*="${id}"]`);
                    if (toggleInput) {
                        toggleInput.checked = targetStatus;
                    }
                    
                    successCount++;
                }
            } else {
                successCount++; // 이미 원하는 상태
            }
        }
        
        if (successCount > 0) {
            showToast(`${successCount}개의 금칙어 상태가 ${statusText}으로 변경되었습니다.`, 'success');
        }
    }

    /**
     * 벌크 삭제 (깜빡임 방지)
     */
    async function bulkDeleteWords() {
        const selectedIds = getSelectedWordIds();
        if (selectedIds.length === 0) {
            showToast('삭제할 금칙어를 선택해주세요.', 'warning');
            return;
        }
        
        if (!confirm(`선택한 ${selectedIds.length}개의 금칙어를 정말 삭제하시겠습니까?`)) {
            return;
        }
        
        showToast(`${selectedIds.length}개 금칙어 삭제 중...`, 'info');
        
        let successCount = 0;
        
        for (const id of selectedIds) {
            if (await deleteForbiddenWord(id)) {
                // 메모리에서 데이터 제거
                const allIndex = allForbiddenWords.findIndex(w => w.id == id);
                if (allIndex !== -1) {
                    allForbiddenWords.splice(allIndex, 1);
                }
                
                const currentIndex = currentForbiddenWords.findIndex(w => w.id == id);
                if (currentIndex !== -1) {
                    currentForbiddenWords.splice(currentIndex, 1);
                }
                
                // 해당 행 제거 (애니메이션 효과)
                const row = document.querySelector(`input[onchange*="${id}"]`)?.closest('tr');
                if (row) {
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        if (row.parentNode) {
                            row.parentNode.removeChild(row);
                            // 번호 다시 매기기
                            updateRowNumbers();
                        }
                    }, 300);
                }
                
                successCount++;
            }
        }
        
        if (successCount > 0) {
            showToast(`${successCount}개의 금칙어가 삭제되었습니다.`, 'success');
            // 통계 및 전체 선택 체크박스 상태 업데이트
            updateStatistics();
            setTimeout(() => {
                updateSelectAllCheckbox();
                
                // 빈 상태 체크
                if (currentForbiddenWords.length === 0) {
                    elements.forbiddenWordsTable.style.display = 'none';
                    elements.emptyState.style.display = 'block';
                    // 전체 선택 체크박스 초기화
                    elements.selectAllCheckbox.checked = false;
                    elements.selectAllCheckbox.indeterminate = false;
                }
            }, 350);
        }
    }

    /**
     * 행 번호 다시 매기기
     */
    function updateRowNumbers() {
        const rows = elements.forbiddenWordsTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const numberCell = row.children[1]; // 두 번째 td가 번호 컬럼
            if (numberCell) {
                numberCell.textContent = index + 1;
            }
        });
    }

    /**
     * 개별 행의 상태만 업데이트 (깜빡임 방지)
     * @param {number} wordId - 금칙어 ID
     * @param {boolean} newStatus - 새로운 상태
     */
    function updateRowStatus(wordId, newStatus) {
        // 메모리의 데이터 업데이트
        const wordInAll = allForbiddenWords.find(w => w.id == wordId);
        const wordInCurrent = currentForbiddenWords.find(w => w.id == wordId);
        
        if (wordInAll) {
            if (wordInAll.status !== undefined) {
                wordInAll.status = newStatus;
            } else {
                wordInAll.used = newStatus;
            }
        }
        
        if (wordInCurrent) {
            if (wordInCurrent.status !== undefined) {
                wordInCurrent.status = newStatus;
            } else {
                wordInCurrent.used = newStatus;
            }
        }
        
        // 해당 행의 상태 배지만 업데이트
        const row = document.querySelector(`input[onchange*="${wordId}"]`).closest('tr');
        if (row) {
            const statusBadge = row.querySelector('.status-badge');
            if (statusBadge) {
                const statusClass = newStatus ? 'status-active' : 'status-inactive';
                const statusText = newStatus ? '사용중' : '미사용';
                
                statusBadge.className = `status-badge ${statusClass}`;
                statusBadge.textContent = statusText;
            }
        }
        
        // 통계만 업데이트 (테이블 재렌더링 없이)
        updateStatistics();
    }

    // --- 전역 이벤트 핸들러 (HTML에서 호출) ---

    /**
     * 단일 금칙어 상태 토글 (깜빡임 방지 버전)
     * @param {number} wordId - 금칙어 ID
     * @param {boolean} isChecked - 토글 체크 상태
     */
    window.handleToggleStatus = async function(wordId, isChecked) {
        // 현재 상태 확인
        const word = allForbiddenWords.find(w => w.id == wordId);
        if (!word) return;
        
        const currentStatus = word.status !== undefined ? word.status : word.used;
        
        // 상태가 실제로 변경되었는지 확인
        if (currentStatus === isChecked) return;
        
        // 토글 버튼 비활성화 (중복 클릭 방지)
        const toggleInput = document.querySelector(`input[onchange*="${wordId}"]`);
        if (toggleInput) {
            toggleInput.disabled = true;
        }
        
        try {
            // API 호출
            if (await toggleWordStatus(wordId)) {
                // 성공: 상태 업데이트 (깜빡임 없이)
                updateRowStatus(wordId, isChecked);
                
                const statusText = isChecked ? '활성화' : '비활성화';
                showToast(`금칙어가 ${statusText}되었습니다.`, 'success');
            } else {
                // 실패: 토글 원래 상태로 복원
                if (toggleInput) {
                    toggleInput.checked = currentStatus;
                }
                showToast('금칙어 상태 변경에 실패했습니다.', 'error');
            }
        } catch (error) {
            // 오류: 토글 원래 상태로 복원
            if (toggleInput) {
                toggleInput.checked = currentStatus;
            }
            showToast('금칙어 상태 변경 중 오류가 발생했습니다.', 'error');
        } finally {
            // 토글 버튼 다시 활성화
            if (toggleInput) {
                toggleInput.disabled = false;
            }
        }
    };

    /**
     * 단일 금칙어 삭제 (깜빡임 방지)
     * @param {number} wordId - 금칙어 ID
     */
    window.handleDeleteWord = async function(wordId) {
        if (!confirm('이 금칙어를 정말 삭제하시겠습니까?')) {
            return;
        }
        
        // 삭제 버튼 비활성화
        const deleteBtn = document.querySelector(`button[onclick*="handleDeleteWord(${wordId})"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.6';
        }
        
        try {
            if (await deleteForbiddenWord(wordId)) {
                // 메모리에서 데이터 제거
                const allIndex = allForbiddenWords.findIndex(w => w.id == wordId);
                if (allIndex !== -1) {
                    allForbiddenWords.splice(allIndex, 1);
                }
                
                const currentIndex = currentForbiddenWords.findIndex(w => w.id == wordId);
                if (currentIndex !== -1) {
                    currentForbiddenWords.splice(currentIndex, 1);
                }
                
                // 해당 행 제거 (애니메이션 효과)
                const row = deleteBtn?.closest('tr');
                if (row) {
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-20px)';
                    
                    setTimeout(() => {
                        if (row.parentNode) {
                            row.parentNode.removeChild(row);
                            updateRowNumbers();
                            updateSelectAllCheckbox(); // 전체 선택 상태 업데이트
                            
                            // 빈 상태 체크
                            if (currentForbiddenWords.length === 0) {
                                elements.forbiddenWordsTable.style.display = 'none';
                                elements.emptyState.style.display = 'block';
                                // 전체 선택 체크박스 초기화
                                elements.selectAllCheckbox.checked = false;
                                elements.selectAllCheckbox.indeterminate = false;
                            }
                        }
                    }, 300);
                }
                
                showToast('금칙어가 삭제되었습니다.', 'success');
                updateStatistics();
            } else {
                showToast('금칙어 삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            showToast('금칙어 삭제 중 오류가 발생했습니다.', 'error');
        } finally {
            // 삭제 버튼 다시 활성화 (만약 삭제 실패한 경우)
            if (deleteBtn && deleteBtn.parentNode) {
                deleteBtn.disabled = false;
                deleteBtn.style.opacity = '1';
            }
        }
    };

    // --- 이벤트 리스너 설정 ---

    // 검색 관련 이벤트
    elements.searchBtn.addEventListener('click', () => {
        fetchForbiddenWords(elements.searchInput.value.trim(), currentFilter, false);
    });

    // Enter 키 이벤트
    window.AdminCommon.setupEnterKey(elements.searchInput, () => elements.searchBtn.click());
    
    // 검색 입력 이벤트 (디바운싱)
    window.AdminCommon.setupSearchInput(elements.searchInput, (value) => {
        fetchForbiddenWords(value, currentFilter, false);
    });

    // 필터 라디오 버튼 이벤트
    elements.filterRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                currentFilter = radio.value;
                fetchForbiddenWords(currentSearchValue, currentFilter, false);
            }
        });
    });

    // 전체 선택 체크박스 이벤트
    elements.selectAllCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.word-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });

    // 벌크 액션 버튼 이벤트
    elements.enableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(true));
    elements.disableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(false));
    elements.deleteSelectedBtn.addEventListener('click', bulkDeleteWords);

    // 신규 등록 버튼 이벤트
    elements.addNewWordBtn.addEventListener('click', () => {
        window.AdminCommon.showModal(elements.addWordModal);
        elements.modalWordInput.focus();
    });

    // 모달 등록 버튼 이벤트
    elements.modalRegisterBtn.addEventListener('click', async () => {
        const formData = window.AdminCommon.getFormData(elements.addWordForm);
        const word = formData.word.trim();
        
        if (!word) {
            showToast('금칙어를 입력해주세요.', 'warning');
            elements.modalWordInput.focus();
            return;
        }
        
        const isUsed = formData.status === 'use';
        
        if (await addForbiddenWord(word, isUsed)) {
            window.AdminCommon.hideModal(elements.addWordModal);
            window.AdminCommon.resetForm(elements.addWordForm);
            await fetchForbiddenWords(currentSearchValue, currentFilter, true);
        }
    });

    // 모달 이벤트 설정
    window.AdminCommon.setupModalEvents(elements.addWordModal, [
        elements.modalCloseBtn,
        elements.modalCancelBtn
    ]);

    // --- 초기화 ---
    
    /**
     * 페이지 초기화
     */
    function initialize() {
        console.log('금칙어 관리 페이지 초기화 시작');
        
        // 초기 데이터 로드
        fetchForbiddenWords('', 'all', true);
        
        console.log('금칙어 관리 페이지 초기화 완료');
    }

    // 페이지 초기화 실행
    initialize();
});