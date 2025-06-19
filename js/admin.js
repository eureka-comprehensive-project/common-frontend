/**
 * admin.js - 관리자 대시보드 스크립트
 * 금칙어 관리 및 사용자 관리 기능
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 설정 ---
    const GATEWAY_URL = 'https://www.visiblego.com/gateway';

    // --- DOM 요소 ---
    const elements = {
        // 페이지
        forbiddenWordsPage: document.getElementById('forbiddenWordsPage'),
        userManagePage: document.getElementById('userManagePage'),
        
        // 네비게이션
        navLinks: document.querySelectorAll('.nav-link[data-page]'),
        
        // 금칙어 관리
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn'),
        addNewWordBtn: document.getElementById('addNewWordBtn'),
        enableSelectedBtn: document.getElementById('enableSelectedBtn'),
        disableSelectedBtn: document.getElementById('disableSelectedBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        forbiddenWordsTable: document.getElementById('forbiddenWordsTable'),
        forbiddenWordsTableBody: document.getElementById('forbiddenWordsTableBody'),
        emptyState: document.getElementById('emptyState'),
        selectAllCheckbox: document.getElementById('selectAllCheckbox'),
        
        // 필터 라디오 버튼
        filterRadios: document.querySelectorAll('input[name="forbiddenFilter"]'),
        
        // 사용자 관리
        userSearchInput: document.getElementById('userSearchInput'),
        userSearchBtn: document.getElementById('userSearchBtn'),
        userTableBody: document.getElementById('userTableBody'),
        
        // 모달
        addWordModal: document.getElementById('addWordModal'),
        userDetailModal: document.getElementById('userDetailModal'),
        modalWordInput: document.getElementById('modalWordInput'),
        modalRegisterBtn: document.getElementById('modalRegisterBtn'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalCancelBtn2: document.getElementById('modalCancelBtn2'),
        detailCloseBtn: document.getElementById('detailCloseBtn'),
        detailCloseBtn2: document.getElementById('detailCloseBtn2'),
        userDetailContent: document.getElementById('userDetailContent'),
        
        // 페이지 제목
        pageTitle: document.querySelector('.page-title'),
        pageSubtitle: document.querySelector('.page-subtitle')
    };

    // --- 전역 상태 ---
    let allForbiddenWords = []; // 전체 원본 데이터
    let currentForbiddenWords = []; // 현재 필터링된 데이터
    let currentFilter = 'all';
    let currentSearchValue = '';

    // --- 헬퍼 함수 ---

    function getAuthHeader() {
        const accessToken = sessionStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('accessToken이 없습니다.');
            showNotification('인증 토큰이 없습니다. 다시 로그인해주세요.', 'error');
            return null;
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        };
    }

    function showNotification(message, type = 'info') {
        alert(message);
    }

    function setLoading(element, isLoading) {
        if (isLoading) {
            element.classList.add('loading');
        } else {
            element.classList.remove('loading');
        }
    }

    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNavLink = document.querySelector(`[data-page="${pageId}"]`);
        if (activeNavLink) activeNavLink.closest('.nav-item').classList.add('active');

        updatePageTitle(pageId);
    }

    function updatePageTitle(pageId) {
        const titles = {
            'forbiddenWordsPage': { title: '금칙어 관리', subtitle: '시스템 금칙어를 관리하고 모니터링합니다' },
            'userManagePage': { title: '사용자 관리', subtitle: '등록된 사용자를 검색하고 관리합니다' }
        };
        const pageInfo = titles[pageId];
        if (pageInfo) {
            elements.pageTitle.textContent = pageInfo.title;
            elements.pageSubtitle.textContent = pageInfo.subtitle;
        }
    }

    function showModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // --- API 호출 함수 ---

    async function fetchForbiddenWords(searchValue = '', filterType = 'all', forceRefresh = false) {
        try {
            const headers = getAuthHeader();
            if (!headers) return;

            if (allForbiddenWords.length > 0 && !forceRefresh) {
                currentSearchValue = searchValue;
                currentFilter = filterType;
                if (elements.searchInput.value.trim() !== searchValue) {
                    elements.searchInput.value = searchValue;
                }
                currentForbiddenWords = applyFiltersAndSearch(allForbiddenWords, searchValue, filterType);
                renderForbiddenWordsTable();
                return;
            }

            setLoading(elements.forbiddenWordsTable, true);
            const url = new URL(`${GATEWAY_URL}/admin/forbidden-words`);
            const response = await fetch(url, { headers: { 'Authorization': headers.Authorization } });

            if (!response.ok) throw new Error(`금칙어 목록 조회 실패: ${response.status}`);
            
            const result = await response.json();
            let forbiddenWords = [];
            if (Array.isArray(result)) forbiddenWords = result;
            else if (result.data && Array.isArray(result.data)) forbiddenWords = result.data;
            else if (result.words && Array.isArray(result.words)) forbiddenWords = result.words;

            allForbiddenWords = forbiddenWords;
            currentSearchValue = searchValue;
            currentFilter = filterType;
            if (elements.searchInput.value.trim() !== searchValue) elements.searchInput.value = searchValue;
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

    function applyFiltersAndSearch(words, searchValue, filterType) {
        let filteredWords = [...words];
        if (filterType === 'used') filteredWords = filteredWords.filter(w => (w.status ?? w.used) === true);
        else if (filterType === 'unused') filteredWords = filteredWords.filter(w => (w.status ?? w.used) === false);

        if (searchValue.trim()) {
            const searchTerm = searchValue.trim().toLowerCase();
            filteredWords = filteredWords.filter(w => w.word && w.word.toLowerCase().includes(searchTerm));
        }
        return filteredWords;
    }

    async function addForbiddenWord(word, isUsed) {
        try {
            const headers = getAuthHeader();
            if (!headers) return false;
            const response = await fetch(`${GATEWAY_URL}/admin/forbidden-words`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ word, used: isUsed })
            });
            if (!response.ok) throw new Error((await response.json()).message || '금칙어 추가 실패');
            showNotification('금칙어가 성공적으로 추가되었습니다.', 'success');
            return true;
        } catch (error) {
            showNotification(`금칙어 추가 실패: ${error.message}`, 'error');
            return false;
        }
    }

    async function deleteForbiddenWord(wordId) {
        try {
            const headers = getAuthHeader();
            if (!headers) return false;
            const response = await fetch(`${GATEWAY_URL}/admin/forbidden-words/${wordId}`, {
                method: 'DELETE',
                headers: { 'Authorization': headers.Authorization }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async function toggleWordStatus(wordId) {
        try {
            const headers = getAuthHeader();
            if (!headers) return false;
            const response = await fetch(`${GATEWAY_URL}/admin/forbidden-words/${wordId}/status-change`, {
                method: 'PATCH',
                headers: { 'Authorization': headers.Authorization }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async function searchUsers(searchTerm) {
        try {
            const headers = getAuthHeader();
            if (!headers) return;

            setLoading(elements.userTableBody.closest('.card'), true);
            const url = `${GATEWAY_URL}/user/search`;
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ searchWord: searchTerm })
            });
            if (!response.ok) throw new Error(`사용자 검색 실패: ${response.status}`);
            
            const result = await response.json();
            let users = [];
            if (result.statusCode === 200 && Array.isArray(result.data)) {
                users = result.data;
            } else {
                showNotification(`사용자 검색 실패: ${result.message || '알 수 없는 오류'}`, 'warning');
            }
            renderUserTable(users);
        } catch (error) {
            showNotification(`사용자 검색에 실패했습니다: ${error.message}`, 'error');
            renderUserTable([]);
        } finally {
            setLoading(elements.userTableBody.closest('.card'), false);
        }
    }

    async function toggleUserStatus(userId, isBlocked) {
        try {
            const headers = getAuthHeader();
            if (!headers) return false;
            const response = await fetch(`${GATEWAY_URL}/user/${userId}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: isBlocked ? 'BLOCKED' : 'ACTIVE' })
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async function getUserDetails(userId) {
        try {
            const headers = getAuthHeader();
            if (!headers) return null;
            const url = `${GATEWAY_URL}/admin/forbidden-words/chats/detail`;
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId: Number(userId) })
            });
            if (!response.ok) throw new Error(`사용자 상세 정보 조회 실패: ${response.status}`);
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    /**
     * [함수 복원] 채팅 로그 삭제 API 호출
     */
    async function deleteChatLog(chatLogId) {
        try {
            const headers = getAuthHeader();
            if (!headers) return false;
            const response = await fetch(`${GATEWAY_URL}/admin/forbidden-words/chats/${chatLogId}`, {
                method: 'DELETE',
                headers: { 'Authorization': headers.Authorization }
            });
            if (!response.ok) throw new Error('채팅 로그 삭제 실패');
            return true;
        } catch (error) {
            console.error('채팅 로그 삭제 오류:', error);
            return false;
        }
    }

    // --- 렌더링 함수 ---

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
                <td><label class="checkbox-container"><input type="checkbox" class="word-checkbox" data-id="${word.id}"><span class="checkmark"></span></label></td>
                <td>${index + 1}</td>
                <td>${escapeHtml(word.word)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="toggleSingleWordStatus(${word.id})"><i class="fas fa-toggle-${isActive ? 'off' : 'on'}"></i> ${isActive ? '비활성화' : '활성화'}</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSingleWord(${word.id})"><i class="fas fa-trash"></i> 삭제</button>
                </td>`;
            tbody.appendChild(row);
        });
        elements.selectAllCheckbox.checked = false;
    }

    function renderUserTable(users) {
        const tbody = elements.userTableBody;
        tbody.innerHTML = '';
        if (!users || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center"><div class="empty-state"><i class="fas fa-search"></i><h3>검색된 사용자가 없습니다</h3><p>다른 검색어로 시도해보세요</p></div></td></tr>`;
            return;
        }

        users.forEach((user, index) => {
            const row = document.createElement('tr');
            const isBlocked = user.status !== 'ACTIVE';
            const statusClass = isBlocked ? 'status-blocked' : 'status-active';
            const statusText = isBlocked ? '차단됨' : '정상';
            const formatDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR') : '-';
            const unbanTimeText = user.unbanTime ? formatDate(user.unbanTime) : '-';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(user.name || '-')}</td>
                <td>${escapeHtml(user.email || '-')}</td>
                <td>${escapeHtml(user.birthday || '-')}</td>
                <td>${escapeHtml(user.phone || '-')}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${unbanTimeText}</td>
                <td><button class="btn btn-secondary btn-sm" onclick="showUserDetail('${user.id}')"><i class="fas fa-eye"></i> 상세</button></td>
                <td><label class="toggle-switch"><input type="checkbox" ${isBlocked ? 'checked' : ''} onchange="toggleUserBlock('${user.id}', this.checked)"><span class="toggle-slider"></span></label></td>`;
            tbody.appendChild(row);
        });
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
    }

    function getSelectedWordIds() {
        return Array.from(document.querySelectorAll('.word-checkbox:checked')).map(cb => cb.dataset.id);
    }

    // --- 전역 함수 (인라인 이벤트에서 사용) ---

    /**
     * [함수 복원] 채팅 로그 삭제 처리
     */
    window.deleteChatLogItem = async function(chatLogId) {
        if (!confirm('이 금칙어 사용 기록을 정말 삭제하시겠습니까?')) return;

        const chatItem = document.querySelector(`[data-chat-id="${chatLogId}"]`);
        if (chatItem) chatItem.style.opacity = '0.5';

        const success = await deleteChatLog(chatLogId);
        
        if (success) {
            showNotification('금칙어 사용 기록이 삭제되었습니다.', 'success');
            if (chatItem) {
                chatItem.style.transition = 'all 0.3s ease';
                chatItem.style.transform = 'translateX(100%)';
                chatItem.style.opacity = '0';
                setTimeout(() => {
                    chatItem.remove();
                    const remainingItems = document.querySelectorAll('.chat-item').length;
                    const statsEl = document.querySelector('.detail-stats strong');
                    if (statsEl) statsEl.textContent = `${remainingItems}회`;
                    if (remainingItems === 0) {
                        document.querySelector('.detail-body').innerHTML = '<p class="empty-chat-list">금칙어 사용 내역이 없습니다.</p>';
                    }
                }, 300);
            }
        } else {
            if (chatItem) chatItem.style.opacity = '1';
            showNotification('금칙어 사용 기록 삭제에 실패했습니다.', 'error');
        }
    };
    
    /**
     * [수정됨] 사용자 상세 정보 표시 (채팅 로그의 고유 ID 사용)
     */
    window.showUserDetail = async function(userId) {
        elements.userDetailContent.innerHTML = '<div class="loading-spinner"></div>';
        showModal(elements.userDetailModal);
        const userDetails = await getUserDetails(userId);

        if (userDetails && userDetails.data) {
            const detailsData = userDetails.data;
            const totalCount = detailsData.length;
            const formatTimestamp = (ts) => {
                if (!ts) return '-';
                const s = String(ts);
                if (s.length !== 14) return s;
                try {
                    const dt = new Date(s.substring(0, 4), parseInt(s.substring(4, 6), 10) - 1, s.substring(6, 8), s.substring(8, 10), s.substring(10, 12), s.substring(12, 14));
                    return dt.toLocaleString('ko-KR');
                } catch { return s; }
            };

            let chatListHtml = '';
            if (totalCount > 0) {
                chatListHtml = detailsData.map(item => {
                    // [핵심 수정] DTO에 추가된 채팅 로그의 고유 'id'를 직접 사용합니다.
                    const chatId = item.id;

                    // 만약 ID가 없는 비정상적인 데이터가 있을 경우를 대비한 방어 코드
                    if (!chatId) {
                        console.error("삭제에 필요한 채팅 로그 ID가 없습니다.", item);
                        return ''; // ID가 없는 아이템은 렌더링하지 않음
                    }

                    return `
                        <div class="chat-item" data-chat-id="${chatId}">
                            <button class="chat-delete-btn" onclick="deleteChatLogItem('${chatId}')" title="이 기록 삭제">
                                <i class="fas fa-trash"></i>
                            </button>
                            <p class="chat-info">
                                <strong>금칙어:</strong> <span class="forbidden-word-tag">${escapeHtml(item.forbiddenWord || '-')}</span>
                            </p>
                            <p class="chat-message">
                                <strong>채팅 내용:</strong> <span>${escapeHtml(item.chatMessage || '-')}</span>
                            </p>
                            <p class="chat-timestamp">
                                <strong>발송 시간:</strong> <span>${formatTimestamp(item.chatSentAt)}</span>
                            </p>
                        </div>`;
                }).join('');
            } else {
                chatListHtml = '<p class="empty-chat-list">금칙어 사용 내역이 없습니다.</p>';
            }
            
            elements.userDetailContent.innerHTML = `
                <div class="detail-header">
                    <h4>금칙어 사용 상세 내역</h4>
                    <div class="detail-stats">총 사용 횟수: <strong>${totalCount}회</strong></div>
                </div>
                <div class="detail-body">${chatListHtml}</div>`;
        } else {
            elements.userDetailContent.innerHTML = `
                <div class="detail-header"><h4>금칙어 사용 상세 내역</h4></div>
                <div class="detail-body"><p class="empty-chat-list">사용자 상세 정보를 불러올 수 없습니다.</p></div>`;
            showNotification('사용자 상세 정보를 불러오는 데 실패했습니다.', 'error');
        }
    };

    window.toggleUserBlock = async function(userId, isBlocked) {
        if (await toggleUserStatus(userId, isBlocked)) {
            showNotification(`사용자가 ${isBlocked ? '차단' : '차단 해제'}되었습니다.`, 'success');
            await searchUsers(elements.userSearchInput.value.trim());
        } else {
            const toggle = document.querySelector(`input[onchange*="${userId}"]`);
            if (toggle) toggle.checked = !isBlocked;
            showNotification('사용자 상태 변경에 실패했습니다.', 'error');
        }
    };

    window.toggleSingleWordStatus = async function(wordId) {
        if (await toggleWordStatus(wordId)) {
            showNotification('금칙어 상태가 변경되었습니다.', 'success');
            fetchForbiddenWords(currentSearchValue, currentFilter, true);
        } else {
            showNotification('금칙어 상태 변경에 실패했습니다.', 'error');
        }
    };

    window.deleteSingleWord = async function(wordId) {
        if (confirm('이 금칙어를 정말 삭제하시겠습니까?')) {
            if (await deleteForbiddenWord(wordId)) {
                showNotification('금칙어가 삭제되었습니다.', 'success');
                fetchForbiddenWords(currentSearchValue, currentFilter, true);
            } else {
                showNotification('금칙어 삭제에 실패했습니다.', 'error');
            }
        }
    };

    // --- 이벤트 리스너 설정 ---

    elements.navLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.dataset.page;
        if (pageId) showPage(pageId);
    }));

    elements.filterRadios.forEach(radio => radio.addEventListener('change', () => {
        if (radio.checked) {
            currentFilter = radio.value;
            fetchForbiddenWords(currentSearchValue, currentFilter, false);
        }
    }));

    elements.searchBtn.addEventListener('click', () => fetchForbiddenWords(elements.searchInput.value.trim(), currentFilter, false));
    elements.searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') elements.searchBtn.click(); });
    elements.searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val === '' || val.length >= 2) fetchForbiddenWords(val, currentFilter, false);
    });

    elements.selectAllCheckbox.addEventListener('change', (e) => {
        document.querySelectorAll('.word-checkbox').forEach(cb => cb.checked = e.target.checked);
    });

    elements.addNewWordBtn.addEventListener('click', () => showModal(elements.addWordModal));

    async function bulkChangeWordStatus(targetStatus) {
        const selectedIds = getSelectedWordIds();
        if (selectedIds.length === 0) return showNotification('상태를 변경할 금칙어를 선택해주세요.', 'warning');
        
        let successCount = 0;
        for (const id of selectedIds) {
            const word = allForbiddenWords.find(w => w.id == id);
            if (!word) continue;
            const currentStatus = word.status ?? word.used;
            if (currentStatus !== targetStatus) {
                if (await toggleWordStatus(id)) successCount++;
            } else {
                successCount++;
            }
        }
        if (successCount > 0) {
            showNotification(`${successCount}개의 금칙어 상태가 변경되었습니다.`, 'success');
            fetchForbiddenWords(currentSearchValue, currentFilter, true);
        }
    }

    elements.enableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(true));
    elements.disableSelectedBtn.addEventListener('click', () => bulkChangeWordStatus(false));
    elements.deleteBtn.addEventListener('click', async () => {
        const ids = getSelectedWordIds();
        if (ids.length === 0) return showNotification('삭제할 금칙어를 선택해주세요.', 'warning');
        if (confirm(`선택한 ${ids.length}개의 금칙어를 정말 삭제하시겠습니까?`)) {
            let successCount = 0;
            for (const id of ids) if (await deleteForbiddenWord(id)) successCount++;
            if (successCount > 0) {
                showNotification(`${successCount}개의 금칙어가 삭제되었습니다.`, 'success');
                fetchForbiddenWords(currentSearchValue, currentFilter, true);
            }
        }
    });

    elements.modalRegisterBtn.addEventListener('click', async () => {
        const word = elements.modalWordInput.value.trim();
        if (!word) return showNotification('금칙어를 입력해주세요.', 'warning');
        const isUsed = document.querySelector('input[name="modalWordStatus"]:checked').value === 'use';
        if (await addForbiddenWord(word, isUsed)) {
            hideModal(elements.addWordModal);
            elements.modalWordInput.value = '';
            fetchForbiddenWords(currentSearchValue, currentFilter, true);
        }
    });

    [elements.modalCancelBtn, elements.modalCancelBtn2].forEach(b => b?.addEventListener('click', () => hideModal(elements.addWordModal)));
    [elements.detailCloseBtn, elements.detailCloseBtn2].forEach(b => b?.addEventListener('click', () => hideModal(elements.userDetailModal)));
    [elements.addWordModal, elements.userDetailModal].forEach(m => m?.addEventListener('click', (e) => {
        if (e.target === m || e.target.classList.contains('modal-backdrop')) hideModal(m);
    }));

    elements.userSearchBtn.addEventListener('click', () => {
        const term = elements.userSearchInput.value.trim();
        if (term.length < 2) return showNotification('검색어는 최소 2글자 이상 입력해주세요.', 'warning');
        searchUsers(term);
    });
    elements.userSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') elements.userSearchBtn.click(); });
    elements.userSearchInput.addEventListener('input', (e) => {
        const btn = elements.userSearchBtn;
        btn.disabled = e.target.value.trim().length < 2;
        btn.style.opacity = btn.disabled ? '0.6' : '1';
    });

    // --- 초기화 ---
    function initialize() {
        showPage('forbiddenWordsPage');
        fetchForbiddenWords('', 'all', true);
        elements.userSearchBtn.disabled = true;
        elements.userSearchBtn.style.opacity = '0.6';
    }

    initialize();
});