/**
 * common.js - 관리자 대시보드 공통 기능
 * 인증, API 호출, 유틸리티 함수 등
 */

// --- 전역 설정 ---
const GATEWAY_URL = 'https://www.visiblego.com/gateway';

// --- 공통 유틸리티 함수 ---

/**
 * 인증 헤더 생성
 * @returns {Object|null} Authorization 헤더 객체
 */
function getAuthHeader() {
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('accessToken이 없습니다.');
        
        // 즉시 로그인 페이지로 리다이렉트
        alert('인증이 만료되었습니다.\n다시 로그인해주세요.');
        window.location.href = '/page/login';
        return null;
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
    };
}

/**
 * 알림 표시
 * @param {string} message 알림 메시지
 * @param {string} type 알림 타입 (info, success, warning, error)
 */
function showNotification(message, type = 'info') {
    // 현재는 기본 alert 사용, 추후 토스트 알림으로 개선 가능
    alert(message);
}

/**
 * 로딩 상태 설정
 * @param {HTMLElement} element 로딩을 적용할 요소
 * @param {boolean} isLoading 로딩 상태
 */
function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
    } else {
        element.classList.remove('loading');
    }
}

/**
 * HTML 이스케이프
 * @param {string} text 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
}

/**
 * 날짜 포맷팅
 * @param {string|Date} date 날짜
 * @returns {string} 포맷된 날짜 문자열
 */
function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ko-KR');
}

/**
 * 타임스탬프 포맷팅 (YYYYMMDDHHMMSS -> 한국 시간)
 * @param {string} timestamp 14자리 타임스탬프
 * @returns {string} 포맷된 날짜시간 문자열
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    const s = String(timestamp);
    if (s.length !== 14) return s;
    
    try {
        const dt = new Date(
            s.substring(0, 4),
            parseInt(s.substring(4, 6), 10) - 1,
            s.substring(6, 8),
            s.substring(8, 10),
            s.substring(10, 12),
            s.substring(12, 14)
        );
        return dt.toLocaleString('ko-KR');
    } catch {
        return s;
    }
}

// --- 모달 관리 ---

/**
 * 모달 표시
 * @param {HTMLElement} modal 모달 요소
 */
function showModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * 모달 숨기기
 * @param {HTMLElement} modal 모달 요소
 */
function hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

/**
 * 모달 이벤트 설정
 * @param {HTMLElement} modal 모달 요소
 * @param {HTMLElement[]} closeButtons 닫기 버튼들
 */
function setupModalEvents(modal, closeButtons = []) {
    // 닫기 버튼 이벤트
    closeButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => hideModal(modal));
        }
    });

    // 백드롭 클릭시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
            hideModal(modal);
        }
    });
}

// --- API 호출 헬퍼 ---

/**
 * API 요청 헬퍼
 * @param {string} url 요청 URL
 * @param {Object} options 요청 옵션
 * @returns {Promise<Object>} API 응답
 */
async function apiRequest(url, options = {}) {
    try {
        const headers = getAuthHeader();
        if (!headers) {
            throw new Error('인증 토큰이 없습니다.');
        }

        const config = {
            headers: headers,
            ...options
        };

        const response = await fetch(url, config);
        
        // 401 Unauthorized 응답 시 로그인 페이지로 리다이렉트
        if (response.status === 401) {
            console.error('인증이 만료되었습니다.');
            alert('인증이 만료되었습니다.\n다시 로그인해주세요.');
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            window.location.href = '/page/login';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API 요청 오류:', error);
        throw error;
    }
}

/**
 * GET 요청
 * @param {string} endpoint API 엔드포인트
 * @returns {Promise<Object>} API 응답
 */
async function apiGet(endpoint) {
    return apiRequest(`${GATEWAY_URL}${endpoint}`, {
        method: 'GET'
    });
}

/**
 * POST 요청
 * @param {string} endpoint API 엔드포인트
 * @param {Object} data 요청 데이터
 * @returns {Promise<Object>} API 응답
 */
async function apiPost(endpoint, data) {
    return apiRequest(`${GATEWAY_URL}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * PUT 요청
 * @param {string} endpoint API 엔드포인트
 * @param {Object} data 요청 데이터
 * @returns {Promise<Object>} API 응답
 */
async function apiPut(endpoint, data) {
    return apiRequest(`${GATEWAY_URL}${endpoint}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * PATCH 요청
 * @param {string} endpoint API 엔드포인트
 * @param {Object} data 요청 데이터 (선택적)
 * @returns {Promise<Object>} API 응답
 */
async function apiPatch(endpoint, data = null) {
    const options = {
        method: 'PATCH'
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    return apiRequest(`${GATEWAY_URL}${endpoint}`, options);
}

/**
 * DELETE 요청
 * @param {string} endpoint API 엔드포인트
 * @returns {Promise<Object>} API 응답
 */
async function apiDelete(endpoint) {
    return apiRequest(`${GATEWAY_URL}${endpoint}`, {
        method: 'DELETE'
    });
}

// --- 폼 헬퍼 ---

/**
 * 폼 데이터 수집
 * @param {HTMLFormElement} form 폼 요소
 * @returns {Object} 폼 데이터 객체
 */
function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

/**
 * 폼 초기화
 * @param {HTMLFormElement} form 폼 요소
 */
function resetForm(form) {
    form.reset();
    
    // 라디오 버튼 초기화
    const radios = form.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        if (radio.hasAttribute('checked')) {
            radio.checked = true;
        }
    });
}

// --- 이벤트 헬퍼 ---

/**
 * Enter 키 이벤트 설정
 * @param {HTMLElement} input 입력 요소
 * @param {Function} callback 콜백 함수
 */
function setupEnterKey(input, callback) {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            callback();
        }
    });
}

/**
 * 검색 입력 이벤트 설정 (디바운싱 포함)
 * @param {HTMLElement} input 검색 입력 요소
 * @param {Function} callback 검색 콜백 함수
 * @param {number} delay 디바운스 지연시간 (ms)
 */
function setupSearchInput(input, callback, delay = 300) {
    let timeout;
    
    input.addEventListener('input', (e) => {
        clearTimeout(timeout);
        const value = e.target.value.trim();
        
        timeout = setTimeout(() => {
            if (value === '' || value.length >= 2) {
                callback(value);
            }
        }, delay);
    });
}

// --- DOM 유틸리티 ---

/**
 * 요소 선택자 헬퍼
 * @param {string} selector CSS 선택자
 * @param {HTMLElement} parent 부모 요소 (선택적)
 * @returns {HTMLElement|null} 선택된 요소
 */
function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * 복수 요소 선택자 헬퍼
 * @param {string} selector CSS 선택자
 * @param {HTMLElement} parent 부모 요소 (선택적)
 * @returns {NodeList} 선택된 요소들
 */
function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

// --- 로그아웃 ---

/**
 * 로그아웃 처리
 */
function logout() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    window.location.href = '/page/login'; // 로그인 페이지로 리다이렉트
}

// --- 초기화 ---

/**
 * 공통 초기화 함수
 */
function initializeCommon() {
    console.log('=== 관리자 대시보드 초기화 시작 ===');
    
    // 인증 체크 먼저 수행
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
        console.warn('❌ 인증 토큰이 없습니다. 로그인 페이지로 이동합니다.');
        
        // 알림 표시 후 리다이렉트
        alert('로그인이 필요합니다.\n로그인 페이지로 이동합니다.');
        window.location.href = '/page/login';
        return; // 더 이상 진행하지 않음
    }
    
    console.log('✅ 인증 토큰 확인됨');
    
    // 로그아웃 버튼 이벤트 설정
    const logoutBtn = $('.btn-logout');
    console.log('로그아웃 버튼 찾기:', logoutBtn);
    
    if (logoutBtn) {
        console.log('로그아웃 버튼 이벤트 리스너 추가');
        logoutBtn.addEventListener('click', logout);
        
        // 테스트용: 버튼에 스타일 추가해서 확인
        logoutBtn.style.border = '2px solid red';
        console.log('로그아웃 버튼에 빨간 테두리 추가 (테스트용)');
    } else {
        console.error('❌ 로그아웃 버튼을 찾을 수 없습니다!');
        console.log('사용 가능한 버튼들:', document.querySelectorAll('button'));
        
        // 모든 .btn 클래스 요소 확인
        console.log('모든 .btn 요소들:', document.querySelectorAll('.btn'));
    }

    // 전역 함수 테스트
    console.log('logout 함수 타입:', typeof logout);
    
    console.log('=== 관리자 대시보드 초기화 완료 ===');
}

// DOM 로드 완료 시 공통 초기화 실행
document.addEventListener('DOMContentLoaded', initializeCommon);

// 전역 함수 등록
window.logout = logout;

// 테스트용 함수들 (개발 환경에서만 사용)
window.testLogin = function() {
    sessionStorage.setItem('accessToken', 'test-token-123');
    console.log('테스트 토큰이 설정되었습니다. 페이지를 새로고침하세요.');
};

window.testLogout = function() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    console.log('토큰이 제거되었습니다. 페이지를 새로고침하세요.');
};

// --- 전역 객체로 내보내기 ---
window.AdminCommon = {
    GATEWAY_URL,
    getAuthHeader,
    showNotification,
    setLoading,
    escapeHtml,
    formatDate,
    formatTimestamp,
    showModal,
    hideModal,
    setupModalEvents,
    apiRequest,
    apiGet,
    apiPost,
    apiPut,
    apiPatch,
    apiDelete,
    getFormData,
    resetForm,
    setupEnterKey,
    setupSearchInput,
    $,
    $,
    logout
};