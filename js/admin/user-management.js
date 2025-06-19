/**
 * user-management.js - 사용자 관리 페이지 기능
 */

document.addEventListener('DOMContentLoaded', () => {
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
        
        // 모달
        userDetailModal: document.getElementById('userDetailModal'),
        userDetailContent: document.getElementById('userDetailContent'),
        detailCloseBtn: document.getElementById('detailCloseBtn'),
        detailCloseBtn2: document.getElementById('detailCloseBtn2'),
        
        // Toast 컨테이너
        toastContainer: document.getElementById('toastContainer')
    };

    // 상태 관리
    let currentUsers = [];
    let lastSearchTerm = '';

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
     * 사용자 검색
     * @param {string} searchTerm - 검색어
     */
    async function searchUsers(searchTerm) {
        try {
            if (searchTerm.length < 2) {
                showToast('검색어는 최소 2글자 이상 입력해주세요.', 'warning');
                return;
            }

            setLoading(true);
            
            const result = await window.AdminCommon.apiPost('/user/search', {
                searchWord: searchTerm
            });
            
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

    /**
     * 사용자 상태 토글 (차단/해제)
     * @param {string} userId - 사용자 ID
     * @param {boolean} isBlocked - 차단 상태
     * @returns {boolean} 성공 여부
     */
    async function toggleUserStatus(userId, isBlocked) {
        try {
            await window.AdminCommon.apiPut(`/user/${userId}/status`, {
                status: isBlocked ? 'BLOCKED' : 'ACTIVE'
            });
            
            return true;
        } catch (error) {
            console.error('사용자 상태 변경 오류:', error);
            return false;
        }
    }

    /**
     * 사용자 상세 정보 조회 (금칙어 사용 기록)
     * @param {string} userId - 사용자 ID
     * @returns {Object|null} 사용자 상세 정보
     */
    async function getUserDetails(userId) {
        try {
            const result = await window.AdminCommon.apiPost('/admin/forbidden-words/chats/detail', {
                userId: Number(userId)
            });
            
            return result;
        } catch (error) {
            console.error('사용자 상세 정보 조회 오류:', error);
            return null;
        }
    }

    /**
     * 채팅 로그 삭제
     * @param {string} chatLogId - 채팅 로그 ID
     * @returns {boolean} 성공 여부
     */
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

    /**
     * 사용자 테이블 렌더링
     * @param {Array} users - 사용자 목록
     */
    function renderUserTable(users) {
        const tbody = elements.userTableBody;
        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>검색된 사용자가 없습니다</h3>
                            <p>다른 검색어로 시도해보세요</p>
                        </div>
                    </td>
                </tr>
            `;
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
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <span class="unban-time ${unbanTimeText === '-' ? 'none' : ''}">${unbanTimeText}</span>
                </td>
                <td>
                    <button class="btn detail-btn" onclick="showUserDetail('${user.id}')">
                        <i class="fas fa-eye"></i>
                        상세
                    </button>
                </td>
                <td class="user-toggle">
                    <label class="toggle-switch">
                        <input type="checkbox" ${isBlocked ? 'checked' : ''} 
                               onchange="handleToggleUserBlock('${user.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * 사용자 행 상태 업데이트 (깜빡임 방지)
     * @param {string} userId - 사용자 ID
     * @param {boolean} isBlocked - 차단 상태
     */
    function updateUserRowStatus(userId, isBlocked) {
        // 메모리의 데이터 업데이트
        const user = currentUsers.find(u => u.id == userId);
        if (user) {
            user.status = isBlocked ? 'BLOCKED' : 'ACTIVE';
        }
        
        // 해당 행의 상태 배지만 업데이트
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

    /**
     * 검색 통계 업데이트
     * @param {number} count - 검색된 사용자 수
     * @param {string} searchTerm - 검색어
     */
    function updateSearchStats(count, searchTerm) {
        elements.userCount.textContent = count.toLocaleString();
        elements.searchStats.style.display = searchTerm ? 'block' : 'none';
    }

    /**
     * 사용자 상세 정보 모달 렌더링
     * @param {Object} userDetails - 사용자 상세 정보
     */
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
                            <button class="chat-delete-btn" onclick="handleDeleteChatLog('${chatId}')" 
                                    title="이 기록 삭제">
                                <i class="fas fa-trash"></i>
                                삭제
                            </button>
                            <div class="chat-info">
                                <strong>금칙어:</strong> 
                                <span class="forbidden-word-tag">${window.AdminCommon.escapeHtml(item.forbiddenWord || '-')}</span>
                            </div>
                            <div class="chat-message">
                                <strong>채팅 내용:</strong> 
                                <span>${window.AdminCommon.escapeHtml(item.chatMessage || '-')}</span>
                            </div>
                            <div class="chat-timestamp">
                                <strong>발송 시간:</strong> 
                                <span>${window.AdminCommon.formatTimestamp(item.chatSentAt)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                chatListHtml = '<div class="empty-chat-list"><i class="fas fa-comment-slash"></i><p>금칙어 사용 내역이 없습니다.</p></div>';
            }
            
            elements.userDetailContent.innerHTML = `
                <div class="detail-header">
                    <h4><i class="fas fa-history"></i> 금칙어 사용 상세 내역</h4>
                    <div class="detail-stats">
                        총 사용 횟수: <strong>${totalCount.toLocaleString()}회</strong>
                    </div>
                </div>
                <div class="detail-body">${chatListHtml}</div>
            `;
        } else {
            elements.userDetailContent.innerHTML = `
                <div class="detail-header">
                    <h4><i class="fas fa-exclamation-triangle"></i> 오류</h4>
                </div>
                <div class="detail-body">
                    <div class="empty-chat-list">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>사용자 상세 정보를 불러올 수 없습니다.</p>
                    </div>
                </div>
            `;
        }
    }

    // --- 유틸리티 함수들 ---

    /**
     * 날짜 포맷팅
     * @param {string} dateString - 날짜 문자열
     * @returns {string} 포맷된 날짜
     */
    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('ko-KR');
        } catch {
            return dateString;
        }
    }

    // --- 전역 이벤트 핸들러 (HTML에서 호출) ---

    /**
     * 사용자 차단 상태 토글 (깜빡임 방지)
     * @param {string} userId - 사용자 ID
     * @param {boolean} isBlocked - 차단 상태
     */
    window.handleToggleUserBlock = async function(userId, isBlocked) {
        // 현재 상태 확인
        const user = currentUsers.find(u => u.id == userId);
        if (!user) return;
        
        const currentStatus = user.status !== 'ACTIVE';
        
        // 상태가 실제로 변경되었는지 확인
        if (currentStatus === isBlocked) return;
        
        // 토글 버튼 비활성화 (중복 클릭 방지)
        const toggleInput = document.querySelector(`input[onchange*="${userId}"]`);
        if (toggleInput) {
            toggleInput.disabled = true;
        }
        
        try {
            const success = await toggleUserStatus(userId, isBlocked);
            
            if (success) {
                // 성공: 상태 업데이트 (깜빡임 없이)
                updateUserRowStatus(userId, isBlocked);
                
                const action = isBlocked ? '차단' : '차단 해제';
                showToast(`사용자가 ${action}되었습니다.`, 'success');
            } else {
                // 실패 시 토글 상태 되돌리기
                if (toggleInput) {
                    toggleInput.checked = currentStatus;
                }
                showToast('사용자 상태 변경에 실패했습니다.', 'error');
            }
        } catch (error) {
            // 오류: 토글 원래 상태로 복원
            if (toggleInput) {
                toggleInput.checked = currentStatus;
            }
            showToast('사용자 상태 변경 중 오류가 발생했습니다.', 'error');
        } finally {
            // 토글 버튼 다시 활성화
            if (toggleInput) {
                toggleInput.disabled = false;
            }
        }
    };

    /**
     * 사용자 상세 정보 표시
     * @param {string} userId - 사용자 ID
     */
    window.showUserDetail = async function(userId) {
        // 로딩 상태로 모달 표시
        elements.userDetailContent.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>사용자 정보를 불러오는 중...</span>
            </div>
        `;
        window.AdminCommon.showModal(elements.userDetailModal);
        
        // 사용자 상세 정보 조회
        const userDetails = await getUserDetails(userId);
        
        // 결과 렌더링
        renderUserDetailModal(userDetails);
        
        if (!userDetails || !userDetails.data) {
            showToast('사용자 상세 정보를 불러오는 데 실패했습니다.', 'error');
        }
    };

    /**
     * 채팅 로그 삭제 (깜빡임 방지)
     * @param {string} chatLogId - 채팅 로그 ID
     */
    window.handleDeleteChatLog = async function(chatLogId) {
        if (!confirm('이 금칙어 사용 기록을 정말 삭제하시겠습니까?')) {
            return;
        }

        const chatItem = document.querySelector(`[data-chat-id="${chatLogId}"]`);
        const deleteBtn = chatItem?.querySelector('.chat-delete-btn');
        
        if (chatItem) {
            chatItem.style.opacity = '0.5';
            chatItem.classList.add('deleting');
        }
        
        if (deleteBtn) {
            deleteBtn.disabled = true;
        }

        try {
            const success = await deleteChatLog(chatLogId);
            
            if (success) {
                showToast('금칙어 사용 기록이 삭제되었습니다.', 'success');
                
                if (chatItem) {
                    // 삭제 애니메이션
                    chatItem.style.transition = 'all 0.3s ease';
                    chatItem.style.transform = 'translateX(100%)';
                    chatItem.style.opacity = '0';
                    
                    setTimeout(() => {
                        chatItem.remove();
                        
                        // 남은 아이템 수 업데이트
                        const remainingItems = document.querySelectorAll('.chat-item').length;
                        const statsEl = document.querySelector('.detail-stats strong');
                        if (statsEl) {
                            statsEl.textContent = `${remainingItems.toLocaleString()}회`;
                        }
                        
                        // 아이템이 없으면 빈 상태 표시
                        if (remainingItems === 0) {
                            document.querySelector('.detail-body').innerHTML = 
                                '<div class="empty-chat-list"><i class="fas fa-comment-slash"></i><p>금칙어 사용 내역이 없습니다.</p></div>';
                        }
                    }, 300);
                }
            } else {
                if (chatItem) {
                    chatItem.style.opacity = '1';
                    chatItem.classList.remove('deleting');
                }
                if (deleteBtn) {
                    deleteBtn.disabled = false;
                }
                showToast('금칙어 사용 기록 삭제에 실패했습니다.', 'error');
            }
        } catch (error) {
            if (chatItem) {
                chatItem.style.opacity = '1';
                chatItem.classList.remove('deleting');
            }
            if (deleteBtn) {
                deleteBtn.disabled = false;
            }
            showToast('금칙어 사용 기록 삭제 중 오류가 발생했습니다.', 'error');
        }
    };

    // --- 이벤트 리스너 설정 ---

    // 검색 버튼 이벤트
    elements.userSearchBtn.addEventListener('click', () => {
        const searchTerm = elements.userSearchInput.value.trim();
        if (searchTerm.length >= 2) {
            searchUsers(searchTerm);
        }
    });

    // 검색 입력 필드 이벤트
    window.AdminCommon.setupEnterKey(elements.userSearchInput, () => {
        if (elements.userSearchInput.value.trim().length >= 2) {
            elements.userSearchBtn.click();
        }
    });

    // 검색 입력 유효성 검사
    elements.userSearchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        const isValid = value.length >= 2;
        
        elements.userSearchBtn.disabled = !isValid;
        elements.userSearchBtn.style.opacity = isValid ? '1' : '0.6';
        
        // 입력이 비어있으면 검색 통계 숨기기
        if (value.length === 0) {
            updateSearchStats(0, '');
            elements.userTableBody.innerHTML = `
                <tr class="initial-state">
                    <td colspan="10" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>사용자를 검색해주세요</h3>
                            <p>이름 또는 이메일로 사용자를 검색할 수 있습니다</p>
                        </div>
                    </td>
                </tr>
            `;
            currentUsers = [];
            lastSearchTerm = '';
        }
    });

    // 모달 이벤트 설정
    window.AdminCommon.setupModalEvents(elements.userDetailModal, [
        elements.detailCloseBtn,
        elements.detailCloseBtn2
    ]);

    // --- 초기화 ---

    /**
     * 페이지 초기화
     */
    function initialize() {
        // 검색 버튼 초기 상태 설정
        elements.userSearchBtn.disabled = true;
        elements.userSearchBtn.style.opacity = '0.6';
        
        // 검색 통계 숨기기
        elements.searchStats.style.display = 'none';
        
        console.log('사용자 관리 페이지가 초기화되었습니다.');
    }

    // 페이지 초기화 실행
    initialize();
});