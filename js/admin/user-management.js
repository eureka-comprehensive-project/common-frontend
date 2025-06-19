/**
 * user-management.js - 사용자 관리 페이지 기능
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 참조
    const elements = {
        // 검색 관련
        userSearchInput: $('#userSearchInput'),
        userSearchBtn: $('#userSearchBtn'),
        searchStats: $('#searchStats'),
        userCount: $('#userCount'),
        
        // 테이블
        userTableBody: $('#userTableBody'),
        
        // 모달
        userDetailModal: $('#userDetailModal'),
        userDetailContent: $('#userDetailContent'),
        detailCloseBtn: $('#detailCloseBtn'),
        detailCloseBtn2: $('#detailCloseBtn2')
    };

    // 상태 관리
    let currentUsers = [];
    let lastSearchTerm = '';

    // --- API 함수들 ---

    /**
     * 사용자 검색
     */
    async function searchUsers(searchTerm) {
        try {
            if (searchTerm.length < 2) {
                showNotification('검색어는 최소 2글자 이상 입력해주세요.', 'warning');
                return;
            }

            setLoading(elements.userTableBody.closest('.card'), true);
            
            const result = await apiPost('/user/search', {
                searchWord: searchTerm
            });
            
            let users = [];
            if (result.statusCode === 200 && Array.isArray(result.data)) {
                users = result.data;
            } else if (result.message) {
                showNotification(`사용자 검색 실패: ${result.message}`, 'warning');
            }
            
            currentUsers = users;
            lastSearchTerm = searchTerm;
            renderUserTable(users);
            updateSearchStats(users.length, searchTerm);
            
        } catch (error) {
            console.error('사용자 검색 오류:', error);
            showNotification(`사용자 검색에 실패했습니다: ${error.message}`, 'error');
            renderUserTable([]);
            updateSearchStats(0, searchTerm);
        } finally {
            setLoading(elements.userTableBody.closest('.card'), false);
        }
    }

    /**
     * 사용자 상태 토글 (차단/해제)
     */
    async function toggleUserStatus(userId, isBlocked) {
        try {
            await apiPut(`/user/${userId}/status`, {
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
     */
    async function getUserDetails(userId) {
        try {
            const result = await apiPost('/admin/forbidden-words/chats/detail', {
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
     */
    async function deleteChatLog(chatLogId) {
        try {
            await apiDelete(`/admin/forbidden-words/chats/${chatLogId}`);
            return true;
        } catch (error) {
            console.error('채팅 로그 삭제 오류:', error);
            return false;
        }
    }

    // --- 렌더링 함수들 ---

    /**
     * 사용자 테이블 렌더링
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
                <td class="user-name">${escapeHtml(user.name || '-')}</td>
                <td class="user-email">${escapeHtml(user.email || '-')}</td>
                <td class="user-birthday">${escapeHtml(user.birthday || '-')}</td>
                <td class="user-phone">${escapeHtml(user.phone || '-')}</td>
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
     * 검색 통계 업데이트
     */
    function updateSearchStats(count, searchTerm) {
        elements.userCount.textContent = count;
        elements.searchStats.style.display = searchTerm ? 'block' : 'none';
    }

    /**
     * 사용자 상세 정보 모달 렌더링
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
                                <span class="forbidden-word-tag">${escapeHtml(item.forbiddenWord || '-')}</span>
                            </div>
                            <div class="chat-message">
                                <strong>채팅 내용:</strong> 
                                <span>${escapeHtml(item.chatMessage || '-')}</span>
                            </div>
                            <div class="chat-timestamp">
                                <strong>발송 시간:</strong> 
                                <span>${formatTimestamp(item.chatSentAt)}</span>
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
                        총 사용 횟수: <strong>${totalCount}회</strong>
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

    // --- 전역 이벤트 핸들러 (HTML에서 호출) ---

    /**
     * 사용자 차단 상태 토글
     */
    window.handleToggleUserBlock = async function(userId, isBlocked) {
        const success = await toggleUserStatus(userId, isBlocked);
        
        if (success) {
            const action = isBlocked ? '차단' : '차단 해제';
            showNotification(`사용자가 ${action}되었습니다.`, 'success');
            
            // 현재 검색 결과 새로고침
            if (lastSearchTerm) {
                await searchUsers(lastSearchTerm);
            }
        } else {
            // 실패 시 토글 상태 되돌리기
            const toggle = document.querySelector(`input[onchange*="${userId}"]`);
            if (toggle) {
                toggle.checked = !isBlocked;
            }
            showNotification('사용자 상태 변경에 실패했습니다.', 'error');
        }
    };

    /**
     * 사용자 상세 정보 표시
     */
    window.showUserDetail = async function(userId) {
        // 로딩 상태로 모달 표시
        elements.userDetailContent.innerHTML = '<div class="loading-spinner"></div>';
        showModal(elements.userDetailModal);
        
        // 사용자 상세 정보 조회
        const userDetails = await getUserDetails(userId);
        
        // 결과 렌더링
        renderUserDetailModal(userDetails);
        
        if (!userDetails || !userDetails.data) {
            showNotification('사용자 상세 정보를 불러오는 데 실패했습니다.', 'error');
        }
    };

    /**
     * 채팅 로그 삭제
     */
    window.handleDeleteChatLog = async function(chatLogId) {
        if (!confirm('이 금칙어 사용 기록을 정말 삭제하시겠습니까?')) {
            return;
        }

        const chatItem = document.querySelector(`[data-chat-id="${chatLogId}"]`);
        if (chatItem) {
            chatItem.style.opacity = '0.5';
            chatItem.classList.add('deleting');
        }

        const success = await deleteChatLog(chatLogId);
        
        if (success) {
            showNotification('금칙어 사용 기록이 삭제되었습니다.', 'success');
            
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
                        statsEl.textContent = `${remainingItems}회`;
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
            showNotification('금칙어 사용 기록 삭제에 실패했습니다.', 'error');
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
    setupEnterKey(elements.userSearchInput, () => {
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
        }
    });

    // 모달 이벤트 설정
    setupModalEvents(elements.userDetailModal, [
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