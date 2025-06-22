/**
 * forbidden-words.js - 금칙어 관리 페이지 기능 (v2.0 - 커스텀 모달 적용)
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- [추가] 커스텀 모달 HTML 동적 삽입 ---
    // 페이지 로드 시 확인/알림용 모달의 HTML을 body의 끝에 추가합니다.
    const confirmationModalHTML = `
        <div id="confirmationModal" class="modal">
            <div class="modal-backdrop"></div>
            <div class="modal-content" style="max-width: 440px;">
                <div class="modal-header">
                    <h3 id="confirmationModalTitle">확인</h3>
                    <button id="confirmationModalCloseBtn" class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirmationModalMessage"></p>
                </div>
                <div class="modal-footer">
                    <button id="confirmationModalCancelBtn" class="btn btn-secondary">취소</button>
                    <button id="confirmationModalOkBtn" class="btn btn-primary">확인</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', confirmationModalHTML);


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
        
        // 등록 모달
        addWordModal: document.getElementById('addWordModal'),
        addWordForm: document.getElementById('addWordForm'),
        modalWordInput: document.getElementById('modalWordInput'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalRegisterBtn: document.getElementById('modalRegisterBtn'),
        
        // Toast 컨테이너
        toastContainer: document.getElementById('toastContainer'),

        // [추가] 확인/알림 모달
        confirmationModal: document.getElementById('confirmationModal'),
        confirmationModalTitle: document.getElementById('confirmationModalTitle'),
        confirmationModalMessage: document.getElementById('confirmationModalMessage'),
        confirmationModalCloseBtn: document.getElementById('confirmationModalCloseBtn'),
        confirmationModalCancelBtn: document.getElementById('confirmationModalCancelBtn'),
        confirmationModalOkBtn: document.getElementById('confirmationModalOkBtn'),
    };

    // 상태 관리
    let allForbiddenWords = [];
    let currentForbiddenWords = [];
    let currentFilter = 'all';
    let currentSearchValue = '';

    // --- [신규] 커스텀 확인/알림 모달 함수 ---

    /**
     * 사용자 정의 모달을 표시합니다. (Alert 및 Confirm 공용)
     * @param {string} message - 표시할 메시지 (HTML 사용 가능)
     * @param {object} options - 옵션 객체
     * @param {string} [options.title='알림'] - 모달 제목
     * @param {'alert'|'confirm'} [options.type='alert'] - 모달 타입
     * @param {string} [options.okText='확인'] - 확인 버튼 텍스트
     * @param {string} [options.cancelText='취소'] - 취소 버튼 텍스트
     * @param {string} [options.okClass='btn-primary'] - 확인 버튼에 적용할 CSS 클래스
     * @returns {Promise<boolean>} 사용자가 확인 버튼을 누르면 true, 그 외에는 false를 반환
     */
    function showModalDialog(message, options = {}) {
        const {
            title = '알림',
            type = 'alert',
            okText = '확인',
            cancelText = '취소',
            okClass = 'btn-primary'
        } = options;

        return new Promise(resolve => {
            elements.confirmationModalTitle.textContent = title;
            elements.confirmationModalMessage.innerHTML = message;

            // AbortController를 사용하여 이벤트 리스너를 한 번에 정리
            const controller = new AbortController();
            const signal = controller.signal;

            const cleanupAndResolve = (result) => {
                window.AdminCommon.hideModal(elements.confirmationModal);
                controller.abort(); // 연결된 모든 이벤트 리스너 제거
                resolve(result);
            };

            elements.confirmationModalOkBtn.textContent = okText;
            elements.confirmationModalOkBtn.className = `btn ${okClass}`;
            elements.confirmationModalOkBtn.addEventListener('click', () => cleanupAndResolve(true), { signal });

            if (type === 'confirm') {
                elements.confirmationModalCancelBtn.style.display = 'inline-flex';
                elements.confirmationModalCancelBtn.textContent = cancelText;
                elements.confirmationModalCancelBtn.addEventListener('click', () => cleanupAndResolve(false), { signal });
            } else {
                elements.confirmationModalCancelBtn.style.display = 'none';
            }
            
            elements.confirmationModalCloseBtn.addEventListener('click', () => cleanupAndResolve(false), { signal });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cleanupAndResolve(false);
                }
            }, { signal });

            window.AdminCommon.showModal(elements.confirmationModal);
        });
    }

    // --- Toast 알림 시스템 ---
    function showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const iconMap = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
        toast.innerHTML = `<div class="toast-icon"><i class="${iconMap[type]}"></i></div><div class="toast-content"><p class="toast-message">${message}</p></div><button class="toast-close"><i class="fas fa-times"></i></button>`;
        elements.toastContainer.appendChild(toast);
        toast.querySelector('.toast-close').addEventListener('click', () => hideToast(toast));
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => hideToast(toast), duration);
        return toast;
    }

    function hideToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.remove('show');
        setTimeout(() => toast.parentNode.removeChild(toast), 300);
    }

    // --- 로딩 상태 관리 ---
    function setLoading(isLoading) {
        elements.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }

    // --- API 함수들 ---
    async function fetchForbiddenWords(searchValue = '', filterType = 'all', forceRefresh = false) {
        try {
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
            const result = await window.AdminCommon.apiGet('/admin/forbidden-words');
            let forbiddenWords = [];
            if (Array.isArray(result)) forbiddenWords = result;
            else if (result.data && Array.isArray(result.data)) forbiddenWords = result.data;
            else if (result.words && Array.isArray(result.words)) forbiddenWords = result.words;
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

    function applyFiltersAndSearch(words, searchValue, filterType) {
        let filteredWords = [...words];
        if (filterType === 'used') {
            filteredWords = filteredWords.filter(w => (w.status ?? w.used) === true);
        } else if (filterType === 'unused') {
            filteredWords = filteredWords.filter(w => (w.status ?? w.used) === false);
        }
        if (searchValue.trim()) {
            const searchTerm = searchValue.trim().toLowerCase();
            filteredWords = filteredWords.filter(w => w.word && w.word.toLowerCase().includes(searchTerm));
        }
        return filteredWords;
    }

    async function addForbiddenWord(word, isUsed) {
        try {
            await window.AdminCommon.apiPost('/admin/forbidden-words', { word, used: isUsed });
            showToast('금칙어가 성공적으로 추가되었습니다.', 'success');
            return true;
        } catch (error) {
            if (error && error.message && error.message.includes('500')) {
                showToast('이미 등록된 금칙어 입니다.', 'error');
            } else {
                const message = error.message || '금칙어 추가에 실패했습니다.';
                showToast(`금칙어 추가 실패: ${message}`, 'error');
            }
            return false;
        }
    }

    async function deleteForbiddenWord(wordId) {
        try {
            await window.AdminCommon.apiDelete(`/admin/forbidden-words/${wordId}`);
            return true;
        } catch (error) {
            console.error('금칙어 삭제 오류:', error);
            return false;
        }
    }

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
            const isActive = word.status ?? word.used;
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusText = isActive ? '사용중' : '미사용';
            row.innerHTML = `
                <td><label class="checkbox-container"><input type="checkbox" class="word-checkbox" data-id="${word.id}"><span class="checkmark"></span></label></td>
                <td>${index + 1}</td>
                <td class="word-cell" title="${window.AdminCommon.escapeHtml(word.word)}">${window.AdminCommon.escapeHtml(word.word)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <label class="toggle-switch">
                            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="handleToggleStatus(${word.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="icon-btn btn-danger" onclick="handleDeleteWord(${word.id})" title="삭제"><i class="fas fa-trash"></i></button>
                    </div>
                </td>`;
            tbody.appendChild(row);
        });
        elements.selectAllCheckbox.checked = false;
        elements.selectAllCheckbox.indeterminate = false;
        updateCheckboxEvents();
    }

    function updateStatistics() {
        const totalCount = allForbiddenWords.length;
        const activeCount = allForbiddenWords.filter(w => (w.status ?? w.used) === true).length;
        const inactiveCount = totalCount - activeCount;
        elements.totalWordsCount.textContent = totalCount.toLocaleString();
        elements.activeWordsCount.textContent = activeCount.toLocaleString();
        elements.inactiveWordsCount.textContent = inactiveCount.toLocaleString();
    }

    function updateSearchInput(value) {
        if (elements.searchInput.value.trim() !== value) {
            elements.searchInput.value = value;
        }
    }

    function updateCheckboxEvents() {
        document.querySelectorAll('.word-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectAllCheckbox);
        });
    }

    function updateSelectAllCheckbox() {
        const checkboxes = document.querySelectorAll('.word-checkbox');
        const checkedCount = document.querySelectorAll('.word-checkbox:checked').length;
        elements.selectAllCheckbox.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        elements.selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }

    // --- 유틸리티 함수들 ---
    function getSelectedWordIds() {
        return Array.from(document.querySelectorAll('.word-checkbox:checked')).map(cb => cb.dataset.id);
    }

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
                    updateRowStatus(parseInt(id), targetStatus);
                    const toggleInput = document.querySelector(`input[onchange*="${id}"]`);
                    if (toggleInput) toggleInput.checked = targetStatus;
                    successCount++;
                }
            } else {
                successCount++;
            }
        }
        if (successCount > 0) {
            showToast(`${successCount}개의 금칙어 상태가 ${statusText}으로 변경되었습니다.`, 'success');
        }
    }

    async function bulkDeleteWords() {
        const selectedIds = getSelectedWordIds();
        if (selectedIds.length === 0) {
            showToast('삭제할 금칙어를 선택해주세요.', 'warning');
            return;
        }
        
        // [수정] confirm을 커스텀 모달로 변경
        const confirmed = await showModalDialog(
            `선택한 <strong>${selectedIds.length}개</strong>의 금칙어를 정말 삭제하시겠습니까?`, {
                title: '금칙어 일괄 삭제',
                type: 'confirm',
                okText: '삭제',
                okClass: 'btn-danger'
            }
        );

        if (!confirmed) return;

        showToast(`${selectedIds.length}개 금칙어 삭제 중...`, 'info');
        let successCount = 0;
        for (const id of selectedIds) {
            if (await deleteForbiddenWord(id)) {
                const allIndex = allForbiddenWords.findIndex(w => w.id == id);
                if (allIndex !== -1) allForbiddenWords.splice(allIndex, 1);
                const currentIndex = currentForbiddenWords.findIndex(w => w.id == id);
                if (currentIndex !== -1) currentForbiddenWords.splice(currentIndex, 1);
                const row = document.querySelector(`input.word-checkbox[data-id="${id}"]`)?.closest('tr');
                if (row) {
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        if (row.parentNode) {
                            row.parentNode.removeChild(row);
                            updateRowNumbers();
                        }
                    }, 300);
                }
                successCount++;
            }
        }
        if (successCount > 0) {
            showToast(`${successCount}개의 금칙어가 삭제되었습니다.`, 'success');
            updateStatistics();
            setTimeout(() => {
                updateSelectAllCheckbox();
                if (currentForbiddenWords.length === 0) {
                    elements.forbiddenWordsTable.style.display = 'none';
                    elements.emptyState.style.display = 'block';
                    elements.selectAllCheckbox.checked = false;
                    elements.selectAllCheckbox.indeterminate = false;
                }
            }, 350);
        }
    }

    function updateRowNumbers() {
        const rows = elements.forbiddenWordsTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const numberCell = row.children[1];
            if (numberCell) numberCell.textContent = index + 1;
        });
    }

    function updateRowStatus(wordId, newStatus) {
        const wordInAll = allForbiddenWords.find(w => w.id == wordId);
        if (wordInAll) wordInAll.status !== undefined ? (wordInAll.status = newStatus) : (wordInAll.used = newStatus);
        const wordInCurrent = currentForbiddenWords.find(w => w.id == wordId);
        if (wordInCurrent) wordInCurrent.status !== undefined ? (wordInCurrent.status = newStatus) : (wordInCurrent.used = newStatus);
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
        updateStatistics();
    }

    // --- 전역 이벤트 핸들러 (HTML에서 호출) ---
    window.handleToggleStatus = async function(wordId, isChecked) {
        const word = allForbiddenWords.find(w => w.id == wordId);
        if (!word) return;
        const currentStatus = word.status !== undefined ? word.status : word.used;
        if (currentStatus === isChecked) return;
        const toggleInput = document.querySelector(`input[onchange*="${wordId}"]`);
        if (toggleInput) toggleInput.disabled = true;
        try {
            if (await toggleWordStatus(wordId)) {
                updateRowStatus(wordId, isChecked);
                const statusText = isChecked ? '활성화' : '비활성화';
                showToast(`금칙어가 ${statusText}되었습니다.`, 'success');
            } else {
                if (toggleInput) toggleInput.checked = currentStatus;
                showToast('금칙어 상태 변경에 실패했습니다.', 'error');
            }
        } catch (error) {
            if (toggleInput) toggleInput.checked = currentStatus;
            showToast('금칙어 상태 변경 중 오류가 발생했습니다.', 'error');
        } finally {
            if (toggleInput) toggleInput.disabled = false;
        }
    };

    window.handleDeleteWord = async function(wordId) {
        // [수정] confirm을 커스텀 모달로 변경
        const confirmed = await showModalDialog(
            '이 금칙어를 정말 삭제하시겠습니까?', {
                title: '금칙어 삭제',
                type: 'confirm',
                okText: '삭제',
                okClass: 'btn-danger'
            }
        );

        if (!confirmed) return;

        const deleteBtn = document.querySelector(`button[onclick*="handleDeleteWord(${wordId})"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.6';
        }
        try {
            if (await deleteForbiddenWord(wordId)) {
                const allIndex = allForbiddenWords.findIndex(w => w.id == wordId);
                if (allIndex !== -1) allForbiddenWords.splice(allIndex, 1);
                const currentIndex = currentForbiddenWords.findIndex(w => w.id == wordId);
                if (currentIndex !== -1) currentForbiddenWords.splice(currentIndex, 1);
                const row = deleteBtn?.closest('tr');
                if (row) {
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        if (row.parentNode) {
                            row.parentNode.removeChild(row);
                            updateRowNumbers();
                            updateSelectAllCheckbox();
                            if (currentForbiddenWords.length === 0) {
                                elements.forbiddenWordsTable.style.display = 'none';
                                elements.emptyState.style.display = 'block';
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
            if (deleteBtn && deleteBtn.parentNode) {
                deleteBtn.disabled = false;
                deleteBtn.style.opacity = '1';
            }
        }
    };

    // --- 이벤트 리스너 설정 ---
    elements.searchBtn.addEventListener('click', () => fetchForbiddenWords(elements.searchInput.value.trim(), currentFilter, false));
    window.AdminCommon.setupEnterKey(elements.searchInput, () => elements.searchBtn.click());
    window.AdminCommon.setupSearchInput(elements.searchInput, (value) => fetchForbiddenWords(value, currentFilter, false));
    elements.filterRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                currentFilter = radio.value;
                fetchForbiddenWords(currentSearchValue, currentFilter, false);
            }
        });
    });
    elements.selectAllCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = e.target.checked);
    });
    elements.enableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(true));
    elements.disableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(false));
    elements.deleteSelectedBtn.addEventListener('click', bulkDeleteWords);
    elements.addNewWordBtn.addEventListener('click', () => {
        window.AdminCommon.showModal(elements.addWordModal);
        elements.modalWordInput.focus();
    });
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
    window.AdminCommon.setupModalEvents(elements.addWordModal, [elements.modalCloseBtn, elements.modalCancelBtn]);

    // --- 페이지 초기화 ---
    function initialize() {
        console.log('금칙어 관리 페이지 초기화 시작');
        fetchForbiddenWords('', 'all', true);
        console.log('금칙어 관리 페이지 초기화 완료');
    }
    initialize();
});