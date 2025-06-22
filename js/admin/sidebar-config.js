/**
 * sidebar-config.js - 사이드바 설정 및 네비게이션 관리
 */

// --- 사이드바 메뉴 설정 ---
const SIDEBAR_MENU = [
    {
        id: 'billing',
        icon: 'fas fa-credit-card',
        title: '요금제 관리',
        href: '/page/admin/billing/'
    },
    {
        id: 'forbidden-words',
        icon: 'fas fa-ban',
        title: '금칙어 관리',
        href: '/page/admin/forbidden-words/'
    },
    {
        id: 'user-management',
        icon: 'fas fa-users',
        title: '사용자 관리',
        href: '/page/admin/user-management/'
    }
];

/**
 * 현재 페이지 ID 가져오기
 * @returns {string|null} 현재 페이지 ID (매칭되지 않으면 null 반환)
 */
function getCurrentPageId() {
    const path = window.location.pathname;
    
    // /page/admin/[module]/ 구조에서 현재 페이지 감지
    if (path.includes('/page/admin/billing/')) {
        return 'billing';
    } else if (path.includes('/page/admin/forbidden-words/')) {
        return 'forbidden-words';
    } else if (path.includes('/page/admin/user-management/')) {
        return 'user-management';
    } else if (path.includes('/page/admin/forbidden-allow-words/')) {
        return 'forbidden-allow-words';
    }
    
    // 매칭되지 않는 경우 null 반환 (아무것도 선택되지 않음)
    return null;
}

/**
 * 관리자 이름 가져오기
 * @returns {string} 관리자 이름
 */
function getAdminName() {
    // 1. sessionStorage에서 사용자 정보 확인
    const userInfo = sessionStorage.getItem('userInfo');
    if (userInfo) {
        try {
            const parsed = JSON.parse(userInfo);
            // 이름 필드 우선순위: name > email > userId
            if (parsed.name) {
                return parsed.name;
            } else if (parsed.email) {
                // 이메일에서 @ 앞부분만 추출 (선택적)
                return parsed.email.split('@')[0];
            } else if (parsed.userId) {
                return parsed.userId;
            }
        } catch (e) {
            console.warn('사용자 정보 파싱 실패:', e);
        }
    }
    
    // 2. sessionStorage에서 직접 이름 확인
    const userName = sessionStorage.getItem('userName');
    if (userName) {
        return userName;
    }
    
    // 3. 기본값 반환
    return '관리자';
}

/**
 * 관리자 이름 설정 (헬퍼 함수)
 * @param {string} name 관리자 이름
 * @param {Object} userInfo 추가 사용자 정보 (선택적)
 */
function setAdminName(name, userInfo = null) {
    if (!name) return;
    
    // sessionStorage에 사용자 이름 저장
    sessionStorage.setItem('userName', name);
    
    // 추가 사용자 정보가 있으면 함께 저장
    if (userInfo) {
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
    } else {
        // 기본 사용자 정보 객체 생성
        sessionStorage.setItem('userInfo', JSON.stringify({ name: name }));
    }
    
    // 화면에 바로 업데이트
    updateAdminName(name);
    
    console.log('관리자 이름이 설정되었습니다:', name);
}

/**
 * 관리자 이름 업데이트
 * @param {string} name 관리자 이름
 */
function updateAdminName(name) {
    const adminDisplay = document.getElementById('admin-name-display');
    if (adminDisplay) {
        adminDisplay.textContent = `관리자: ${name}`;
    }
}

/**
 * 사용자 정보 로드 (API 호출)
 */
async function loadAdminInfo() {
    try {
        const accessToken = sessionStorage.getItem('accessToken');
        if (!accessToken) {
            console.warn('액세스 토큰이 없습니다.');
            return null;
        }

        // 토큰 검증 API를 통해 사용자 정보 가져오기 (채팅봇 코드 패턴 참고)
        const response = await fetch('https://www.visiblego.com/auth/validate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('토큰 검증 실패:', response.status);
            return null;
        }

        const result = await response.json();
        if (result && result.data) {
            const resultData = result.data;
            
            // 사용자 이름 추출 (이메일 또는 이름 필드 사용)
            const userName = resultData.name || resultData.email || resultData.userId;
            
            if (userName) {
                // sessionStorage에 사용자 정보 저장
                sessionStorage.setItem('userName', userName);
                sessionStorage.setItem('userInfo', JSON.stringify(resultData));
                
                // 화면에 업데이트
                updateAdminName(userName);
                console.log('사용자 정보 로드 성공:', userName);
                return userName;
            }
        }
        
        // window.AdminCommon API도 시도 (기존 방식 유지)
        if (window.AdminCommon && window.AdminCommon.apiGet) {
            const userInfo = await window.AdminCommon.apiGet('/admin/profile');
            if (userInfo && userInfo.name) {
                sessionStorage.setItem('userName', userInfo.name);
                sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
                updateAdminName(userInfo.name);
                return userInfo.name;
            }
        }
        
    } catch (error) {
        console.warn('사용자 정보 로드 실패:', error);
    }
    
    return null;
}

/**
 * 사이드바 HTML 생성
 * @returns {string} 사이드바 HTML
 */
function generateSidebarHTML() {
    const currentPage = getCurrentPageId();
    const adminName = getAdminName();
    
    const menuItems = SIDEBAR_MENU.map(item => {
        // currentPage가 null이면 어떤 메뉴도 active되지 않음
        const isActive = (currentPage && item.id === currentPage) ? 'active' : '';
        return `
            <li class="nav-item ${isActive}">
                <a href="${item.href}" class="nav-link">
                    <i class="${item.icon}"></i>
                    <span>${item.title}</span>
                </a>
            </li>
        `;
    }).join('');

    return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <i class="fas fa-shield-alt"></i>
                    <span>요기U+ 관리자</span>
                </div>
            </div>
            <nav class="sidebar-nav">
                <ul class="nav-menu">
                    ${menuItems}
                </ul>
            </nav>
            <div class="sidebar-footer">
                <div class="admin-info">
                    <i class="fas fa-user-shield"></i>
                    <span id="admin-name-display">관리자: ${adminName}</span>
                </div>
            </div>
        </aside>
    `;
}

/**
 * 페이지 제목 정보 가져오기
 * @param {string|null} pageId 페이지 ID
 * @returns {Object} 페이지 제목 정보
 */
function getPageTitleInfo(pageId) {
    const titleMap = {
        'billing': {
            title: '요금제 관리',
            subtitle: '시스템 요금제를 관리하고 모니터링합니다'
        },
        'forbidden-words': {
            title: '금칙어 관리',
            subtitle: '시스템 금칙어를 관리하고 모니터링합니다'
        },
        'user-management': {
            title: '사용자 관리',
            subtitle: '등록된 사용자를 검색하고 관리합니다'
        },
        'forbidden-allow-words': {
            title: '예외 금칙어 관리',
            subtitle: '금칙어가 아니지만, 금칙어가 포함되어 있는 단어를 관리하고 모니터링합니다'
        }
    };
    
    // pageId가 null이거나 매칭되지 않으면 기본 대시보드 정보 반환
    return titleMap[pageId] || {
        title: '관리자 대시보드',
        subtitle: '시스템 관리 및 모니터링 대시보드'
    };
}

/**
 * 페이지 헤더 설정
 * @param {string|null} pageId 페이지 ID (선택적)
 */
function setupPageHeader(pageId = null) {
    const currentPageId = pageId !== null ? pageId : getCurrentPageId();
    const titleInfo = getPageTitleInfo(currentPageId);
    
    const pageTitle = document.querySelector('.page-title');
    const pageSubtitle = document.querySelector('.page-subtitle');
    
    if (pageTitle) {
        pageTitle.textContent = titleInfo.title;
    }
    
    if (pageSubtitle) {
        pageSubtitle.textContent = titleInfo.subtitle;
    }
    
    // 페이지 타이틀도 설정
    document.title = `${titleInfo.title} - 관리자 대시보드`;
}

/**
 * 사이드바 초기화
 */
function initializeSidebar() {
    // 사이드바 HTML 삽입
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.insertAdjacentHTML('afterbegin', generateSidebarHTML());
    }
    
    // 페이지 헤더 설정
    setupPageHeader();
    
    // 모바일 반응형 처리 (선택적)
    setupMobileNavigation();
    
    // 사용자 정보 로드 (비동기)
    loadAdminInfo()
        .then(userName => {
            if (userName) {
                console.log('사용자 정보 로드 완료:', userName);
            } else {
                console.log('사용자 정보를 불러올 수 없어 기본값을 사용합니다.');
            }
        })
        .catch(error => {
            console.warn('사용자 정보 로드 중 오류:', error);
        });
}

/**
 * 모바일 네비게이션 설정
 */
function setupMobileNavigation() {
    // 모바일 메뉴 토글 버튼이 있다면 이벤트 설정
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
        
        // 모바일에서 사이드바 외부 클릭시 닫기
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
    }
}

/**
 * 사이드바 활성 상태 업데이트
 * @param {string|null} pageId 활성화할 페이지 ID
 */
function updateSidebarActive(pageId) {
    // 모든 네비게이션 아이템에서 active 클래스 제거
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // pageId가 null이 아닐 때만 해당 메뉴 활성화
    if (pageId) {
        const menuItem = SIDEBAR_MENU.find(item => item.id === pageId);
        if (menuItem) {
            const navLink = document.querySelector(`a[href="${menuItem.href}"]`);
            if (navLink) {
                navLink.closest('.nav-item').classList.add('active');
            }
        }
    }
}

// DOM 로드 완료 시 사이드바 초기화
document.addEventListener('DOMContentLoaded', initializeSidebar);

// 전역 객체로 내보내기
window.SidebarConfig = {
    SIDEBAR_MENU,
    getCurrentPageId,
    getAdminName,
    setAdminName,
    updateAdminName,
    loadAdminInfo,
    generateSidebarHTML,
    getPageTitleInfo,
    setupPageHeader,
    initializeSidebar,
    updateSidebarActive
};