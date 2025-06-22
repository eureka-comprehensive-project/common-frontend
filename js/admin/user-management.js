/**
 * user-management.js - 사용자 관리 페이지 기능 (v2.0 - 커스텀 모달 적용)
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
        // 검색 관련
        userSearchInput: document.getElementById('userSearchInput'),
        userSearchBtn: document.getElementById('userSearchBtn'),
        searchStats: document.getElementById('searchStats'),
        userCount: document.getElementById('userCount'),
        
        // 테이블
        userTableBody: document.getElementById('userTableBody'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        
        // 상세 정보 모달
        userDetailModal: document.getElementById('userDetailModal'),
        userDetailContent: document.getElementById('userDetailContent'),
        detailCloseBtn: document.getElementById('detailCloseBtn'),
        detailCloseBtn2: document.getElementById('detailCloseBtn2'),
        
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
    let currentUsers = [];
    let lastSearchTerm = '';

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
            const { signal } = controller;

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
        setTimeout(() => { if (toast.parentNode) { toast.parentNode.removeChild(toast); } }, 300);
    }

    // --- 로딩 상태 관리 ---
    function setLoading(isLoading) {
        elements.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }

    // --- API 함수들 ---
    async function searchUsers(searchTerm) {
        try {
            if (searchTerm.length < 2) {
                showToast('검색어는 최소 2글자 이상 입력해주세요.', 'warning');
                return;
            }
            setLoading(true);
            const result = await window.AdminCommon.apiPost('/user/search', { searchWord: searchTerm });
            let users = [];
            if (result.statusCode === 200 && Array.isArray(result.data)) {
                users = result.data;
            } else if (result.message) {
                showToast(`사용자 검색 실패: ${result.message}`, 'warning');
            }
            currentUsers = users;
            lastSearchTerm = searchTerm;
            renderUserTable(users);
            updateSearchStats(users.length, searchTerm);
        } catch (error) {
            console.error('사용자 검색 오류:', error);
            showToast(`사용자 검색에 실패했습니다: ${error.message}`, 'error');
            renderUserTable([]);
            updateSearchStats(0, searchTerm);
        } finally {
            setLoading(false);
        }
    }

    async function toggleUserStatus(userId, isBlocked) {
        try {
            await window.AdminCommon.apiPut(`/user/${userId}/status`, { status: isBlocked ? 'BLOCKED' : 'ACTIVE' });
            return true;
        } catch (error) {
            console.error('사용자 상태 변경 오류:', error);
            return false;
        }
    }

    async function getUserDetails(userId) {
        try {
            const result = await window.AdminCommon.apiPost('/admin/forbidden-words/chats/detail', { userId: Number(userId) });
            return result;
        } catch (error) {
            console.error('사용자 상세 정보 조회 오류:', error);
            return null;
        }
    }

    async function deleteChatLog(chatLogId) {
        try {
            await window.AdminCommon.apiDelete(`/admin/forbidden-words/chats/${chatLogId}`);
            return true;
        } catch (error) {
            console.error('채팅 로그 삭제 오류:', error);
            return false;
        }
    }

    // --- 렌더링 함수들 ---
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
            const statusClass = isBlocked ? 'status-blocked' : 'status-normal';
            const statusText = isBlocked ? '차단됨' : '정상';
            const unbanTimeText = user.unbanTime ? formatDate(user.unbanTime) : '-';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="user-name" title="${window.AdminCommon.escapeHtml(user.name || '-')}">${window.AdminCommon.escapeHtml(user.name || '-')}</td>
                <td class="user-email" title="${window.AdminCommon.escapeHtml(user.email || '-')}">${window.AdminCommon.escapeHtml(user.email || '-')}</td>
                <td class="user-birthday">${window.AdminCommon.escapeHtml(user.birthday || '-')}</td>
                <td class="user-phone">${window.AdminCommon.escapeHtml(user.phone || '-')}</td>
                <td class="user-date">${formatDate(user.createdAt)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><span class="unban-time ${unbanTimeText === '-' ? 'none' : ''}">${unbanTimeText}</span></td>
                <td><button class="btn detail-btn" onclick="showUserDetail('${user.id}')"><i class="fas fa-eye"></i> 상세</button></td>
                <td class="user-toggle"><label class="toggle-switch"><input type="checkbox" ${isBlocked ? 'checked' : ''} onchange="handleToggleUserBlock('${user.id}', this.checked)"><span class="toggle-slider"></span></label></td>
            `;
            tbody.appendChild(row);
        });
    }

    function updateUserRowStatus(userId, isBlocked) {
        const user = currentUsers.find(u => u.id == userId);
        if (user) {
            user.status = isBlocked ? 'BLOCKED' : 'ACTIVE';
        }
        const row = document.querySelector(`input[onchange*="${userId}"]`).closest('tr');
        if (row) {
            const statusBadge = row.querySelector('.status-badge');
            if (statusBadge) {
                const statusClass = isBlocked ? 'status-blocked' : 'status-normal';
                const statusText = isBlocked ? '차단됨' : '정상';
                statusBadge.className = `status-badge ${statusClass}`;
                statusBadge.textContent = statusText;
            }
        }
    }

    function updateSearchStats(count, searchTerm) {
        elements.userCount.textContent = count.toLocaleString();
        elements.searchStats.style.display = searchTerm ? 'block' : 'none';
    }

    function renderUserDetailModal(userDetails) {
        if (userDetails && userDetails.data) {
            const detailsData = userDetails.data;
            const totalCount = detailsData.length;
            let chatListHtml = '';
            if (totalCount > 0) {
                chatListHtml = detailsData.map(item => {
                    const chatId = item.id;
                    if (!chatId) {
                        console.error("삭제에 필요한 채팅 로그 ID가 없습니다.", item);
                        return '';
                    }
                    return `
                        <div class="chat-item" data-chat-id="${chatId}">
                            <button class="chat-delete-btn" onclick="handleDeleteChatLog('${chatId}')" title="이 기록 삭제"><i class="fas fa-trash"></i> 삭제</button>
                            <div class="chat-info"><strong>금칙어:</strong> <span class="forbidden-word-tag">${window.AdminCommon.escapeHtml(item.forbiddenWord || '-')}</span></div>
                            <div class="chat-message"><strong>채팅 내용:</strong> <span>${window.AdminCommon.escapeHtml(item.chatMessage || '-')}</span></div>
                            <div class="chat-timestamp"><strong>발송 시간:</strong> <span>${window.AdminCommon.formatTimestamp(item.chatSentAt)}</span></div>
                        </div>`;
                }).join('');
            } else {
                chatListHtml = '<div class="empty-chat-list"><i class="fas fa-comment-slash"></i><p>금칙어 사용 내역이 없습니다.</p></div>';
            }
            elements.userDetailContent.innerHTML = `
                <div class="detail-header">
                    <h4><i class="fas fa-history"></i> 금칙어 사용 상세 내역</h4>
                    <div class="detail-stats">총 사용 횟수: <strong>${totalCount.toLocaleString()}회</strong></div>
                </div>
                <div class="detail-body">${chatListHtml}</div>`;
        } else {
            elements.userDetailContent.innerHTML = `
                <div class="detail-header"><h4><i class="fas fa-exclamation-triangle"></i> 오류</h4></div>
                <div class="detail-body"><div class="empty-chat-list"><i class="fas fa-exclamation-triangle"></i><p>사용자 상세 정보를 불러올 수 없습니다.</p></div></div>`;
        }
    }

    // --- 유틸리티 함수들 ---
    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('ko-KR');
        } catch {
            return dateString;
        }
    }

    // --- 전역 이벤트 핸들러 (HTML에서 호출) ---
    window.handleToggleUserBlock = async function(userId, isBlocked) {
        const user = currentUsers.find(u => u.id == userId);
        if (!user) return;
        const currentStatus = user.status !== 'ACTIVE';
        if (currentStatus === isBlocked) return;
        const toggleInput = document.querySelector(`input[onchange*="${userId}"]`);
        if (toggleInput) toggleInput.disabled = true;
        try {
            const success = await toggleUserStatus(userId, isBlocked);
            if (success) {
                updateUserRowStatus(userId, isBlocked);
                const action = isBlocked ? '차단' : '차단 해제';
                showToast(`사용자가 ${action}되었습니다.`, 'success');
            } else {
                if (toggleInput) toggleInput.checked = currentStatus;
                showToast('사용자 상태 변경에 실패했습니다.', 'error');
            }
        } catch (error) {
            if (toggleInput) toggleInput.checked = currentStatus;
            showToast('사용자 상태 변경 중 오류가 발생했습니다.', 'error');
        } finally {
            if (toggleInput) toggleInput.disabled = false;
        }
    };

    window.showUserDetail = async function(userId) {
        elements.userDetailContent.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>사용자 정보를 불러오는 중...</span></div>`;
        window.AdminCommon.showModal(elements.userDetailModal);
        const userDetails = await getUserDetails(userId);
        renderUserDetailModal(userDetails);
        if (!userDetails || !userDetails.data) {
            showToast('사용자 상세 정보를 불러오는 데 실패했습니다.', 'error');
        }
    };

    window.handleDeleteChatLog = async function(chatLogId) {
        // [수정] confirm을 커스텀 모달로 변경
        const confirmed = await showModalDialog('이 금칙어 사용 기록을 정말 삭제하시겠습니까?', {
            title: '기록 삭제 확인',
            type: 'confirm',
            okText: '삭제',
            okClass: 'btn-danger'
        });

        if (!confirmed) return;

        const chatItem = document.querySelector(`[data-chat-id="${chatLogId}"]`);
        const deleteBtn = chatItem?.querySelector('.chat-delete-btn');
        if (chatItem) {
            chatItem.style.opacity = '0.5';
            chatItem.classList.add('deleting');
        }
        if (deleteBtn) deleteBtn.disabled = true;
        try {
            const success = await deleteChatLog(chatLogId);
            if (success) {
                showToast('금칙어 사용 기록이 삭제되었습니다.', 'success');
                if (chatItem) {
                    chatItem.style.transition = 'all 0.3s ease';
                    chatItem.style.transform = 'translateX(100%)';
                    chatItem.style.opacity = '0';
                    setTimeout(() => {
                        chatItem.remove();
                        const remainingItems = document.querySelectorAll('.chat-item').length;
                        const statsEl = document.querySelector('.detail-stats strong');
                        if (statsEl) statsEl.textContent = `${remainingItems.toLocaleString()}회`;
                        if (remainingItems === 0) {
                            document.querySelector('.detail-body').innerHTML = '<div class="empty-chat-list"><i class="fas fa-comment-slash"></i><p>금칙어 사용 내역이 없습니다.</p></div>';
                        }
                    }, 300);
                }
            } else {
                if (chatItem) { chatItem.style.opacity = '1'; chatItem.classList.remove('deleting'); }
                if (deleteBtn) deleteBtn.disabled = false;
                showToast('금칙어 사용 기록 삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            if (chatItem) { chatItem.style.opacity = '1'; chatItem.classList.remove('deleting'); }
            if (deleteBtn) deleteBtn.disabled = false;
            showToast('금칙어 사용 기록 삭제 중 오류가 발생했습니다.', 'error');
        }
    };

    // --- 이벤트 리스너 설정 ---
    elements.userSearchBtn.addEventListener('click', () => {
        const searchTerm = elements.userSearchInput.value.trim();
        if (searchTerm.length >= 2) searchUsers(searchTerm);
    });
    window.AdminCommon.setupEnterKey(elements.userSearchInput, () => {
        if (elements.userSearchInput.value.trim().length >= 2) elements.userSearchBtn.click();
    });
    elements.userSearchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        const isValid = value.length >= 2;
        elements.userSearchBtn.disabled = !isValid;
        elements.userSearchBtn.style.opacity = isValid ? '1' : '0.6';
        if (value.length === 0) {
            updateSearchStats(0, '');
            elements.userTableBody.innerHTML = `<tr class="initial-state"><td colspan="10" class="text-center"><div class="empty-state"><i class="fas fa-search"></i><h3>사용자를 검색해주세요</h3><p>이름 또는 이메일로 사용자를 검색할 수 있습니다</p></div></td></tr>`;
            currentUsers = [];
            lastSearchTerm = '';
        }
    });
    window.AdminCommon.setupModalEvents(elements.userDetailModal, [elements.detailCloseBtn, elements.detailCloseBtn2]);

    // --- 초기화 ---
    function initialize() {
        elements.userSearchBtn.disabled = true;
        elements.userSearchBtn.style.opacity = '0.6';
        elements.searchStats.style.display = 'none';
        console.log('사용자 관리 페이지가 초기화되었습니다.');
    }
    initialize();
});