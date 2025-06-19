/**
 * forbidden-words.js - 금칙어 관리 페이지 기능
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const elements = {
        // 검색 및 필터
        searchInput: $('#searchInput'),
        searchBtn: $('#searchBtn'),
        filterRadios: $$('input[name="forbiddenFilter"]'),
        
        // 버튼
        addNewWordBtn: $('#addNewWordBtn'),
        enableSelectedBtn: $('#enableSelectedBtn'),
        disableSelectedBtn: $('#disableSelectedBtn'),
        deleteBtn: $('#deleteBtn'),
        
        // 테이블
        forbiddenWordsTable: $('#forbiddenWordsTable'),
        forbiddenWordsTableBody: $('#forbiddenWordsTableBody'),
        emptyState: $('#emptyState'),
        selectAllCheckbox: $('#selectAllCheckbox'),
        
        // 모달
        addWordModal: $('#addWordModal'),
        addWordForm: $('#addWordForm'),
        modalWordInput: $('#modalWordInput'),
        modalCloseBtn: $('#modalCloseBtn'),
        modalCancelBtn: $('#modalCancelBtn'),
        modalRegisterBtn: $('#modalRegisterBtn')
    };

    // 상태 관리
    let allForbiddenWords = [];
    let currentForbiddenWords = [];
    let currentFilter = 'all';
    let currentSearchValue = '';

    // --- API 함수들 ---

    /**
     * 금칙어 목록 조회
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
                return;
            }

            setLoading(elements.forbiddenWordsTable, true);
            
            const result = await apiGet('/admin/forbidden-words');
            
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
            
        } catch (error) {
            console.error('금칙어 목록 조회 오류:', error);
            showNotification('금칙어 목록을 불러오는데 실패했습니다.', 'error');
            allForbiddenWords = [];
            currentForbiddenWords = [];
            renderForbiddenWordsTable();
        } finally {
            setLoading(elements.forbiddenWordsTable, false);
        }
    }

    /**
     * 필터링 및 검색 적용
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
     */
    async function addForbiddenWord(word, isUsed) {
        try {
            await apiPost('/admin/forbidden-words', {
                word,
                used: isUsed
            });
            
            showNotification('금칙어가 성공적으로 추가되었습니다.', 'success');
            return true;
        } catch (error) {
            const message = error.message || '금칙어 추가에 실패했습니다.';
            showNotification(`금칙어 추가 실패: ${message}`, 'error');
            return false;
        }
    }

    /**
     * 금칙어 삭제
     */
    async function deleteForbiddenWord(wordId) {
        try {
            await apiDelete(`/admin/forbidden-words/${wordId}`);
            return true;
        } catch (error) {
            console.error('금칙어 삭제 오류:', error);
            return false;
        }
    }

    /**
     * 금칙어 상태 토글
     */
    async function toggleWordStatus(wordId) {
        try {
            await apiPatch(`/admin/forbidden-words/${wordId}/status-change`);
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
                <td class="word-cell">${escapeHtml(word.word)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-warning btn-sm status-toggle-btn ${isActive ? 'btn-deactivate' : 'btn-activate'}" 
                                onclick="handleToggleStatus(${word.id})">
                            <i class="fas fa-toggle-${isActive ? 'off' : 'on'}"></i>
                            ${isActive ? '비활성화' : '활성화'}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="handleDeleteWord(${word.id})">
                            <i class="fas fa-trash"></i>
                            삭제
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });

        // 전체 선택 체크박스 초기화
        elements.selectAllCheckbox.checked = false;
        
        // 체크박스 변경 이벤트 재설정
        updateCheckboxEvents();
    }

    /**
     * 검색 입력 필드 업데이트
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
        $$('.word-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectAllCheckbox);
        });
    }

    /**
     * 전체 선택 체크박스 상태 업데이트
     */
    function updateSelectAllCheckbox() {
        const checkboxes = $$('.word-checkbox');
        const checkedCount = $$('.word-checkbox:checked').length;
        
        elements.selectAllCheckbox.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        elements.selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }

    // --- 유틸리티 함수들 ---

    /**
     * 선택된 금칙어 ID 목록 가져오기
     */
    function getSelectedWordIds() {
        return Array.from($$('.word-checkbox:checked')).map(cb => cb.dataset.id);
    }

    /**
     * 벌크 상태 변경
     */
    async function bulkChangeWordStatus(targetStatus) {
        const selectedIds = getSelectedWordIds();
        if (selectedIds.length === 0) {
            showNotification('상태를 변경할 금칙어를 선택해주세요.', 'warning');
            return;
        }
        
        let successCount = 0;
        
        for (const id of selectedIds) {
            const word = allForbiddenWords.find(w => w.id == id);
            if (!word) continue;
            
            const currentStatus = word.status ?? word.used;
            if (currentStatus !== targetStatus) {
                if (await toggleWordStatus(id)) {
                    successCount++;
                }
            } else {
                successCount++; // 이미 원하는 상태
            }
        }
        
        if (successCount > 0) {
            showNotification(`${successCount}개의 금칙어 상태가 변경되었습니다.`, 'success');
            await fetchForbiddenWords(currentSearchValue, currentFilter, true);
        }
    }

    /**
     * 벌크 삭제
     */
    async function bulkDeleteWords() {
        const selectedIds = getSelectedWordIds();
        if (selectedIds.length === 0) {
            showNotification('삭제할 금칙어를 선택해주세요.', 'warning');
            return;
        }
        
        if (!confirm(`선택한 ${selectedIds.length}개의 금칙어를 정말 삭제하시겠습니까?`)) {
            return;
        }
        
        let successCount = 0;
        
        for (const id of selectedIds) {
            if (await deleteForbiddenWord(id)) {
                successCount++;
            }
        }
        
        if (successCount > 0) {
            showNotification(`${successCount}개의 금칙어가 삭제되었습니다.`, 'success');
            await fetchForbiddenWords(currentSearchValue, currentFilter, true);
        }
    }

    // --- 전역 이벤트 핸들러 (HTML에서 호출) ---

    /**
     * 단일 금칙어 상태 토글
     */
    window.handleToggleStatus = async function(wordId) {
        if (await toggleWordStatus(wordId)) {
            showNotification('금칙어 상태가 변경되었습니다.', 'success');
            await fetchForbiddenWords(currentSearchValue, currentFilter, true);
        } else {
            showNotification('금칙어 상태 변경에 실패했습니다.', 'error');
        }
    };

    /**
     * 단일 금칙어 삭제
     */
    window.handleDeleteWord = async function(wordId) {
        if (!confirm('이 금칙어를 정말 삭제하시겠습니까?')) {
            return;
        }
        
        if (await deleteForbiddenWord(wordId)) {
            showNotification('금칙어가 삭제되었습니다.', 'success');
            await fetchForbiddenWords(currentSearchValue, currentFilter, true);
        } else {
            showNotification('금칙어 삭제에 실패했습니다.', 'error');
        }
    };

    // --- 이벤트 리스너 설정 ---

    // 검색 관련 이벤트
    elements.searchBtn.addEventListener('click', () => {
        fetchForbiddenWords(elements.searchInput.value.trim(), currentFilter, false);
    });

    setupEnterKey(elements.searchInput, () => elements.searchBtn.click());
    
    setupSearchInput(elements.searchInput, (value) => {
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
        $$('.word-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });

    // 벌크 액션 버튼 이벤트
    elements.enableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(true));
    elements.disableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(false));
    elements.deleteBtn.addEventListener('click', bulkDeleteWords);

    // 신규 등록 버튼 이벤트
    elements.addNewWordBtn.addEventListener('click', () => {
        showModal(elements.addWordModal);
        elements.modalWordInput.focus();
    });

    // 모달 등록 버튼 이벤트
    elements.modalRegisterBtn.addEventListener('click', async () => {
        const formData = getFormData(elements.addWordForm);
        const word = formData.word.trim();
        
        if (!word) {
            showNotification('금칙어를 입력해주세요.', 'warning');
            elements.modalWordInput.focus();
            return;
        }
        
        const isUsed = formData.status === 'use';
        
        if (await addForbiddenWord(word, isUsed)) {
            hideModal(elements.addWordModal);
            resetForm(elements.addWordForm);
            await fetchForbiddenWords(currentSearchValue, currentFilter, true);
        }
    });

    // 모달 이벤트 설정
    setupModalEvents(elements.addWordModal, [
        elements.modalCloseBtn,
        elements.modalCancelBtn
    ]);

    // 모달이 열릴 때 폼 초기화
    elements.addWordModal.addEventListener('show', () => {
        resetForm(elements.addWordForm);
    });

    // --- 초기화 ---
    
    /**
     * 페이지 초기화
     */
    function initialize() {
        // 초기 데이터 로드
        fetchForbiddenWords('', 'all', true);
    }

    // 페이지 초기화 실행
    initialize();
});