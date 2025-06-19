// 사용되는 변수들
let accessToken;
let userId;

let planBenefitId = null;
let planId = null;
let planName = null;

document.addEventListener('DOMContentLoaded', function() {
    validateToken();

    const tabs = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            fetchUserUsagePattern(); // 월 사용량
        });
    });

    // 개인정보 상세 보기 모달 열기
    document.querySelector('.edit-btn').addEventListener('click', () => {
        fetchUserProfileDetail();
    });

    // 개인정보 상세 보기 모달 닫기
    document.getElementById('cancelBtn').addEventListener('click', () => {
        document.querySelector('.edit-modal').classList.add('hidden');
    });

});

// 토큰 검증
async function validateToken() {
    try {
        accessToken = sessionStorage.getItem('accessToken');

        if (!accessToken) {
            console.log('토큰이 없습니다. 로그인 페이지로 이동합니다.');
            redirectToLogin();
            return;
        }

        const response = await fetch('https://www.visiblego.com/auth/validate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.log('토큰이 유효하지 않습니다. 로그인 페이지로 이동합니다.');
            sessionStorage.removeItem('accessToken'); // 무효한 토큰 제거
            redirectToLogin();
            return;
        }

        const result = await response.json();
        console.log('토큰 검증 성공:', result);

        let resultData = result.data
        userId = resultData.userId;
        console.log(userId);

        fetchUserProfile();
        fetchActivePlanBenefit();
        fetchUserUsageSummary();
        fetchUserUsagePattern();
        fetchUserProfileDetailForEmailOnly();

    } catch (error) {
        console.error('토큰 검증 중 오류 발생:', error);
        redirectToLogin();
    }
}

// 간단한 사용자 정보
async function fetchUserProfile() {

    try {
        const response = await fetch('https://www.visiblego.com/gateway/user/profile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });

        const data = await response.json();

        if (data.message === "fail") {
            console.warn(`${data.data.statusCode} ${data.data.detailMessage}`);
            return;
        }

        if (response.ok) {
            const name = data.data.name;
            const phone = data.data.phone;
            console.log(name, phone);

            document.querySelector('.user-name').textContent = `이름 : ${name}`;
            document.querySelector('.user-phone').textContent = `전화번호 : ${formatPhoneNumber(phone)}`;
        } else {
            console.warn(`프로필 요청 실패: ${data.message}`);
            alert(`${data.status} ${data.error}`);
        }
    } catch (error) {
        console.error('프로필 조회 과정 중 오류:', error);
        alert('프로필 정보를 불러오는 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

// 왼쪽 하단 이메일 불러오기
async function fetchUserProfileDetailForEmailOnly() {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/user/profileDetail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });

        const result = await response.json();

        if (result.message === 'fail') {
            console.warn(`${result.data.statusCode} ${result.data.detailMessage}`);
            return;
        }

        const email = result.data.email;
        document.getElementById('profile-email').innerHTML = `${email}`;

    } catch (error) {
        console.error('이메일 불러오기 실패:', error);
    }
}

// 사용자 상세 정보 불러오기
async function fetchUserProfileDetail() {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/user/profileDetail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });

        const result = await response.json();

        if (result.message === 'fail') {
            console.warn(`${result.data.statusCode} ${result.data.detailMessage}`);
            return;
        }

        const profile = result.data;

        // 모달에 값 넣기
        document.getElementById('email').value = profile.email;
        document.getElementById('name').value = profile.name;
        document.getElementById('birth').value = profile.birthday ?? '';
        document.getElementById('phone').value = formatPhoneNumber(profile.phone);
        document.getElementById('joinDate').value = profile.createdAt?.slice(0, 10); // YYYY-MM-DD

        // 모달 열기
        document.querySelector('.edit-modal').classList.remove('hidden');

    } catch (error) {
        console.error('상세 프로필 요청 중 오류:', error);
        alert('개인정보를 불러오는 데 문제가 발생했습니다.');
    }
}


// 사용중인 요금제 불러오기
async function fetchActivePlanBenefit() {
    try {
        planBenefitId = await getPlanBenefitId(userId);
        console.log("요금제 혜택 ID:", planBenefitId);

        // 요금제 혜택 id 없으면 요금제 없는 것
        if (!planBenefitId) {
            console.info('사용자에게 등록된 요금제 혜택이 없습니다.');
            document.getElementById('planBenefitDisplay').textContent = `사용 중인 요금제 | 없음`;
            return;
        }

        planId = await getPlanIdFromBenefitId(planBenefitId);
        console.log("요금제 ID:", planId);

        planName = await fetchPlanNameById(planId);
        console.log("요금제 이름:", planName);

        document.getElementById('planBenefitDisplay').textContent = `사용 중인 요금제 | ${planName}`;

    } catch (error) {
        console.error('사용 중인 요금제 조회 과정 중 오류:', error);
        alert('사용 중인 요금제 정보를 불러오는 중 문제가 발생했습니다.');
    }

}

// 요금제 혜택 id 조회 함수
async function getPlanBenefitId(userId) {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/user/user-plan-record/valid-contract', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([userId])
        });

        const data = await response.json();

        if (data.message === "fail") {
            console.warn(`${data.data.statusCode} ${data.data.detailMessage}`);
            return null;
        }

        return data.data.find(item => item.userId === userId)?.planBenefitId ?? null;

    } catch (error) {
        console.error('요금제 혜택 ID 조회 중 오류:', error);
        return null;
    }
}

// 요금제 혜택 id로 요금제 id 조회 함수
async function getPlanIdFromBenefitId(planBenefitId) {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/plan/plan-benefit', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([planBenefitId])
        });

        const data = await response.json();

        if (data.message === "fail") {
            console.warn(`${data.data.statusCode} ${data.data.detailMessage}`);
            return null;
        }

        const planDto = data.data.find(item => item.planBenefitId === planBenefitId);
        return planDto?.planId ?? null;

    } catch (error) {
        console.error('요금제 ID 조회 중 오류:', error);
        return null;
    }
}

// 이번달 사용량 조회 함수
async function fetchUserUsageSummary() {
    try {
        // 1. 사용자 사용량 조회
        const response = await fetch('https://www.visiblego.com/gateway/user/user-data-record/usage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                monthCount: 1
            })
        });

        const usageData = await response.json();

        if (usageData.message === "fail") {
            console.warn(`${usageData.data.statusCode} ${usageData.data.detailMessage}`);
            return;
        }

        const record = usageData.data[0];
        if (!record) {
            console.log('사용량 데이터가 없습니다. 회색 차트로 표시합니다.');

            // 회색 차트로 초기화
            const dataChart = document.getElementById('dataChart');
            dataChart.style.background = '#e0e0e0';
            dataChart.querySelector('.chart-text').innerHTML = `0GB<br><small></small>`;

            const callChart = document.getElementById('callChart');
            callChart.style.background = '#e0e0e0';
            callChart.querySelector('.chart-text').innerHTML = `0분`;

            const messageChart = document.getElementById('messageChart');
            messageChart.style.background = '#e0e0e0';
            messageChart.querySelector('.chart-text').innerHTML = `0건`;

            return; // 이후 로직 스킵
        }

        let dataUsage = record.dataUsage;
        let dataUnit = record.dataUsageUnit;
        const callUsage = record.callUsage;
        const messageUsage = record.messageUsage;

        // // 2. 요금제 제공량 조회
        const planBenefitId = await getPlanBenefitId(userId);
        console.log("요금제 혜택 ID:", planBenefitId);
        if (!planBenefitId) {
            console.log("요금제 혜택 ID가 없습니다. 회색 차트로 처리합니다.");
            renderEmptyUsageChart();
            return;
        }

        const planId = await getPlanIdFromBenefitId(planBenefitId);
        console.log("요금제 ID:", planId);
        if (!planId) {
            console.log("요금제 ID가 없습니다. 회색 차트로 처리합니다.");
            renderEmptyUsageChart();
            return;
        }

        const allowanceInfo = await fetchPlanAllowanceById(planId);
        if (!allowanceInfo || allowanceInfo.dataAllowance == null) {
            console.warn('요금제 제공량 정보를 불러오지 못했습니다.');
            renderEmptyUsageChart();
            return;
        }

        const totalData = convertToMB(allowanceInfo.dataAllowance, allowanceInfo.dataAllowanceUnit);
        let usedData = convertToMB(dataUsage, dataUnit);

        if (usedData > totalData) {
            console.log('사용량이 제공량을 초과하였습니다. 0으로 처리합니다.');
            usedData = 0;
            dataUsage = 0;
            dataUnit = allowanceInfo.dataAllowanceUnit;
        }

        const percent = Math.min((usedData / totalData) * 360, 360);

        // 무제한 여부 판단
        const isUnlimited = allowanceInfo.dataAllowance === 99999 && allowanceInfo.dataAllowanceUnit === 'GB';

        if (isUnlimited) {
            // 데이터 차트 (무제한)
            const dataChart = document.getElementById('dataChart');
            dataChart.style.background = '#4285f4'; // 꽉 찬 파란색
            dataChart.querySelector('.chart-text').innerHTML = `${dataUsage}${dataUnit}<br><small>/무제한</small>`;
        } else {
            // 일반 요금제
            const totalData = convertToMB(allowanceInfo.dataAllowance, allowanceInfo.dataAllowanceUnit);
            const usedData = convertToMB(dataUsage, dataUnit);
            const percent = Math.min((usedData / totalData) * 360, 360);
            console.log(percent)
            const dataChart = document.getElementById('dataChart');
            dataChart.style.background = `conic-gradient(#4285f4 0deg ${percent}deg, #e8eaed ${percent}deg 360deg)`;
            dataChart.querySelector('.chart-text').innerHTML = `${dataUsage}${dataUnit}<br><small>/${allowanceInfo.dataAllowance}${allowanceInfo.dataAllowanceUnit}</small>`;
        }

        // 음성 차트
        const callChart = document.getElementById('callChart');
        callChart.classList.remove('chart-empty');
        callChart.style.background = '#4285f4';
        callChart.querySelector('.chart-text').innerHTML = `${callUsage}분`;

        // 문자 차트
        const messageChart = document.getElementById('messageChart');
        messageChart.classList.remove('chart-empty');
        messageChart.style.background = '#4285f4';
        messageChart.querySelector('.chart-text').innerHTML = `${messageUsage}건`;

    } catch (error) {
        console.error('사용량 정보 조회 중 오류:', error);
        alert('이번달 사용량을 불러오는 중 문제가 발생했습니다.');
    }
}

function renderEmptyUsageChart() {
    const dataChart = document.getElementById('dataChart');
    dataChart.style.background = '#e0e0e0';
    dataChart.querySelector('.chart-text').innerHTML = `0GB<br><small></small>`;

    const callChart = document.getElementById('callChart');
    callChart.style.background = '#e0e0e0';
    callChart.querySelector('.chart-text').innerHTML = `0분`;

    const messageChart = document.getElementById('messageChart');
    messageChart.style.background = '#e0e0e0';
    messageChart.querySelector('.chart-text').innerHTML = `0건`;
}

// 데이터 제공량 및 단위 가져오기
async function fetchPlanAllowanceById(planId) {
    try {
        const response = await fetch(`https://www.visiblego.com/gateway/plan/${planId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.message === "fail") {
            console.warn(`${data.data.statusCode} ${data.data.detailMessage}`);
            return null;
        }

        return {
            dataAllowance: data.data.dataAllowance,
            dataAllowanceUnit: data.data.dataAllowanceUnit
        };

    } catch (error) {
        console.error('요금제 제공량 조회 중 오류:', error);
        return null;
    }
}


async function fetchUserUsagePattern() {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/user/user-data-record/usage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                monthCount: 4
            })
        });

        const result = await response.json();

        if (result.message === 'fail') {
            console.warn(`${result.data.statusCode} ${result.data.detailMessage}`);
            return;
        }

        const rawList = result.data.slice(1, 4); // 최근 3개월
        const usageList = rawList.reverse();     // 최신 → 과거
        const bars = document.querySelectorAll('.bar');
        const type = document.querySelector('.tab.active').textContent;

        // 기준값 설정
        const maxValues = {
            '데이터': 80,       // 기준: 80GB
            '음성통화': 500,    // 기준: 500분
            '문자': 500         // 기준: 500건
        };

        if (usageList.length === 0) {
            bars.forEach(bar => {
                bar.querySelector('.bar-fill').style.height = `0%`;
                bar.querySelector('.bar-fill').style.backgroundColor = '#e0e0e0';
                bar.querySelector('.data-label').textContent = type === '데이터' ? '0GB' : type === '음성통화' ? '0분' : '0건';
                bar.querySelector('.bar-label').textContent = '';
            });
            return;
        }

        usageList.forEach((usage, index) => {
            const bar = bars[index];

            let value = 0;
            let label = '';
            let max = maxValues[type] || 100;

            if (type === '데이터') {
                value = usage.dataUsage;
                if (usage.dataUsageUnit === 'MB') {
                    value = value / 1024; // MB → GB 변환
                }
                // label = `${value.toFixed(1)}GB`;
                let displayValue = value.toFixed(1);
                if (displayValue.endsWith('.0')) {
                    displayValue = parseInt(displayValue, 10); // 소수점 제거
                }
                label = `${displayValue}GB`;
            } else if (type === '음성통화') {
                value = usage.callUsage;
                label = `${value}분`;
            } else if (type === '문자') {
                value = usage.messageUsage;
                label = `${value}건`;
            }

            const heightPercent = Math.min((value / max) * 100, 100);

            bar.querySelector('.bar-fill').style.height = `${heightPercent}%`;
            bar.querySelector('.bar-fill').style.backgroundColor = '#4285f4';
            bar.querySelector('.data-label').textContent = label;

            const formattedMonth = usage.yearMonth?.slice(0, 4) + usage.yearMonth?.slice(4) ?? '';
            bar.querySelector('.bar-label').textContent = formattedMonth;
        });

        // 남은 bar는 회색으로 초기화
        for (let i = usageList.length; i < bars.length; i++) {
            const bar = bars[i];
            bar.querySelector('.bar-fill').style.height = `0%`;
            bar.querySelector('.bar-fill').style.backgroundColor = '#e0e0e0';
            bar.querySelector('.data-label').textContent =
                type === '데이터' ? '0GB' : type === '음성통화' ? '0분' : '0건';
            bar.querySelector('.bar-label').textContent = '';
        }

    } catch (error) {
        console.error('월 이용패턴 불러오기 오류:', error);
    }
}


// 단위 변환
function convertToMB(value, unit) {
    if (unit === 'GB') return value * 1024;
    if (unit === 'MB') return value;
    return null;
}

// 전화번호 포맷 함수
function formatPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
}

async function fetchPlanNameById(planId) {
    try {
        const response = await fetch(`https://www.visiblego.com/gateway/plan/${planId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log(data);

        if (data.message === "fail") {
            console.warn(`${data.data.statusCode} ${data.data.detailMessage}`);
            return null;
        }

        // planName 추출
        const planName = data.data.planName ?? null;

        // monthlyFee 추출 및 표시
        const monthlyFee = data.data.monthlyFee ?? 0;
        const formattedFee = monthlyFee.toLocaleString() + '원';
        document.querySelector('.amount').textContent = formattedFee;

        // 현재 월 기준 날짜 계산
        const today = new Date();
        const thisMonth = today.getMonth();      // 0~11
        const thisYear = today.getFullYear();

        const prevMonth = new Date(thisYear, thisMonth - 1, 1);
        const prevYear = prevMonth.getFullYear();
        const prevMonthIndex = prevMonth.getMonth(); // 0~11

        const firstDay = new Date(prevYear, prevMonthIndex, 1);
        const lastDay = new Date(prevYear, prevMonthIndex + 1, 0); // 0일은 이전 달의 마지막 날

        const formatDate = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}.${mm}.${dd}`;
        };

        document.querySelector('.amount-title').textContent = `${thisMonth + 1}월 청구금액`;
        document.querySelector('.amount-period').textContent = `${formatDate(firstDay)} ~ ${formatDate(lastDay)}`;

        return planName;

    } catch (error) {
        console.error('요금제 이름 조회 중 오류:', error);
        return null;
    }
}

// 로그인 페이지로 이동
function redirectToLogin() {
    window.location.href = '/page/login';
}

// 쳇봇 페이지로 이동
function moveChatbotPage() {
    window.location.href = '/page/chatbot';
}

// 요금제 페이지로 이동
function movePlanPage() {
    window.location.href = '/page/plan';
}

function goToMyPage() {
    window.location.href = '/page/mypage';
}

// 프로필 메뉴 열기
function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
}

// 외부 클릭 시 닫기
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profileDropdown');
    const profile = document.querySelector('.user-profile');

    if (!profile.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// 로그아웃
async function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        try {
            if (accessToken) {
                const response = await fetch('https://www.visiblego.com/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    console.warn('로그아웃 API 호출 실패:', response.status);
                }
            }

            sessionStorage.removeItem('accessToken');
            accessToken = ''; // 전역변수도 초기화
            closeProfilePopup();
            window.location.href = '/page/login';

        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
            sessionStorage.removeItem('accessToken');
            accessToken = ''; // 전역변수도 초기화
            window.location.href = '/page/login';
        }
    }
}
