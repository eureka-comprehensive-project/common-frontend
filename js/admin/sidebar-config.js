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
 * @returns {string} 현재 페이지 ID
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
    }
    
    // 메인 페이지이거나 알 수 없는 경우 기본값
    return 'forbidden-words'; // 기본값: 금칙어 관리
}

/**
 * 사이드바 HTML 생성
 * @returns {string} 사이드바 HTML
 */
function generateSidebarHTML() {
    const currentPage = getCurrentPageId();
    
    const menuItems = SIDEBAR_MENU.map(item => {
        const isActive = item.id === currentPage ? 'active' : '';
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
                    <span>Admin Panel</span>
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
                    <span>관리자: OOO</span>
                </div>
            </div>
        </aside>
    `;
}

/**
 * 페이지 제목 정보 가져오기
 * @param {string} pageId 페이지 ID
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
        }
    };
    
    return titleMap[pageId] || titleMap['forbidden-words'];
}

/**
 * 페이지 헤더 설정
 * @param {string} pageId 페이지 ID (선택적)
 */
function setupPageHeader(pageId = null) {
    const currentPageId = pageId || getCurrentPageId();
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
 * @param {string} pageId 활성화할 페이지 ID
 */
function updateSidebarActive(pageId) {
    // 모든 네비게이션 아이템에서 active 클래스 제거
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 현재 페이지 네비게이션 아이템에 active 클래스 추가
    const menuItem = SIDEBAR_MENU.find(item => item.id === pageId);
    if (menuItem) {
        const navLink = document.querySelector(`a[href="${menuItem.href}"]`);
        if (navLink) {
            navLink.closest('.nav-item').classList.add('active');
        }
    }
}

// DOM 로드 완료 시 사이드바 초기화
document.addEventListener('DOMContentLoaded', initializeSidebar);

// 전역 객체로 내보내기
window.SidebarConfig = {
    SIDEBAR_MENU,
    getCurrentPageId,
    generateSidebarHTML,
    getPageTitleInfo,
    setupPageHeader,
    initializeSidebar,
    updateSidebarActive
};