// 사용되는 변수들
let accessToken;
let userId;

let planBenefitId = null;
let planId = null;
let planName = null;
let voiceAllowance = null;

document.addEventListener('DOMContentLoaded', function() {
    validateToken();

    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            tabBtns.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            fetchUserUsagePattern(); // 월 사용량 패턴 다시 불러오기
        });
    });

    document.querySelector('.edit-btn').addEventListener('click', () => {
        fetchUserProfileDetail();
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        document.querySelector('.edit-modal').classList.add('hidden');
    });

    document.querySelector('.edit-modal').addEventListener('click', (e) => {
        if (e.target === document.querySelector('.edit-modal')) {
            document.querySelector('.edit-modal').classList.add('hidden');
        }
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
            sessionStorage.removeItem('accessToken');
            redirectToLogin();
            return;
        }

        const result = await response.json();
        userId = result.data.userId;

        // 모든 데이터 fetch 함수들을 순차적으로 호출
        fetchUserProfile();
        fetchActivePlanBenefit();
        fetchUserUsageSummary(); // 미니 위젯용 사용량
        fetchUserUsagePattern(); // 월별 패턴
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
            document.querySelector('.user-name').textContent = `${name}님`;
            document.querySelector('.user-phone').textContent = `${formatPhoneNumber(phone)}`;
        } else {
            console.warn(`프로필 요청 실패: ${data.message}`);
        }
    } catch (error) {
        console.error('프로필 조회 과정 중 오류:', error);
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
        document.getElementById('profile-email').textContent = email;
        if (email) {
            const emailInitial = email.charAt(0).toUpperCase();
            document.getElementById('userAvatar').textContent = emailInitial;
        }
    } catch (error) {
        console.error('이메일 불러오기 실패:', error);
    }
}

// 사용자 상세 정보 불러오기 (모달용)
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
        document.getElementById('email').value = profile.email;
        document.getElementById('name').value = profile.name;
        document.getElementById('birth').value = profile.birthday ?? '';
        document.getElementById('phone').value = formatPhoneNumber(profile.phone);
        document.getElementById('joinDate').value = profile.createdAt?.slice(0, 10);
        document.querySelector('.edit-modal').classList.remove('hidden');
    } catch (error) {
        console.error('상세 프로필 요청 중 오류:', error);
    }
}

// 사용중인 요금제 정보 및 혜택 조회
async function fetchActivePlanBenefit() {
    try {
        planBenefitId = await getPlanBenefitId(userId);
        if (!planBenefitId) {
            document.querySelector('.plan-name').textContent = '등록된 요금제 없음';
            return;
        }
        
        // planBenefitId로 바로 혜택 조회
        await fetchPlanBenefits(planBenefitId);
        
        // 요금제 상세 정보도 필요하면 planId 조회해서 가져오기
        planId = await getPlanIdFromBenefitId(planBenefitId);
        if (planId) {
            await fetchPlanNameById(planId);
        }
    } catch (error) {
        console.error('사용 중인 요금제 조회 과정 중 오류:', error);
    }
}

// [Helper] 요금제 혜택 ID 조회
async function getPlanBenefitId(userId) {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/user/user-plan-record/valid-contract', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([userId])
        });
        const data = await response.json();
        if (data.message === "fail") return null;
        return data.data.find(item => item.userId === userId)?.planBenefitId ?? null;
    } catch (error) {
        console.error('요금제 혜택 ID 조회 중 오류:', error);
        return null;
    }
}

// [Helper] 요금제 ID 조회
async function getPlanIdFromBenefitId(pBenefitId) {
    try {
        const response = await fetch('https://www.visiblego.com/gateway/plan/plan-benefit', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([pBenefitId])
        });
        const data = await response.json();
        if (data.message === "fail") return null;
        const planDto = data.data.find(item => item.planBenefitId === pBenefitId);
        return planDto?.planId ?? null;
    } catch (error) {
        console.error('요금제 ID 조회 중 오류:', error);
        return null;
    }
}

// 이번달 사용량 요약(미니 위젯) 조회 함수
async function fetchUserUsageSummary() {
    try {
        const usageResponse = await fetch('https://www.visiblego.com/gateway/user/user-data-record/usage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, monthCount: 1 })
        });
        const usageResult = await usageResponse.json();
        if (usageResult.message === "fail" || !usageResult.data || usageResult.data.length === 0) {
            updateMiniUsageWidget(0, 'GB', null, 0); // 데이터 없으면 0으로 초기화
            return;
        }
        const record = usageResult.data[0];
        let { dataUsage, dataUsageUnit, callUsage } = record;

        if (!planId) { // 요금제 정보가 아직 로드되지 않았다면 기다림
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const allowanceInfo = await fetchPlanAllowanceById(planId);
        if (!allowanceInfo) {
            updateMiniUsageWidget(dataUsage, dataUsageUnit, null, callUsage);
            return;
        }

        updateMiniUsageWidget(dataUsage, dataUsageUnit, allowanceInfo, callUsage);

    } catch (error) {
        console.error('사용량 요약 정보 조회 중 오류:', error);
        updateMiniUsageWidget(0, 'GB', null, 0); // 에러 시 초기화
    }
}

// [UI Update] 미니 위젯 업데이트
function updateMiniUsageWidget(usedDataAmount, usedDataUnit, allowanceInfo, callUsage) {
    const isUnlimited = allowanceInfo && allowanceInfo.dataAllowance === 99999;

    // --- 데이터 사용량 처리 ---
    let dataPercent = 0;
    let dataText = '';
    let displayDataUsage = usedDataAmount;

    if (allowanceInfo && !isUnlimited) {
        const totalDataMB = convertToMB(allowanceInfo.dataAllowance, allowanceInfo.dataAllowanceUnit);
        const usedDataMB = convertToMB(usedDataAmount, usedDataUnit);
        
        // [요청된 로직] 제공량보다 많이 사용했는지 확인
        if (usedDataMB > totalDataMB) {
            displayDataUsage = 0; // 제공량 초과 시 표시 사용량을 0으로 설정
        }

        const displayUsedDataMB = convertToMB(displayDataUsage, usedDataUnit);

        if (totalDataMB > 0) {
            // 퍼센트 계산은 수정된 표시 사용량으로 (초과 시 0%)
            dataPercent = Math.min((displayUsedDataMB / totalDataMB) * 100, 100);
        }
        // 텍스트 표시는 수정된 표시 사용량으로
        dataText = `${displayDataUsage}${usedDataUnit} / ${allowanceInfo.dataAllowance}${allowanceInfo.dataAllowanceUnit}`;

    } else if (isUnlimited) {
        dataPercent = 100; // 무제한은 항상 꽉 찬 것으로 간주
        dataText = `${usedDataAmount}${usedDataUnit} / 무제한`; // 실제 사용량은 그대로 표시
    } else {
        // 요금제 정보가 없는 경우 (allowanceInfo is null)
        dataText = `${usedDataAmount}${usedDataUnit}`;
        dataPercent = 0; // 제공량을 모르므로 0%
    }

    document.getElementById('miniDataValue').textContent = dataText;
    document.getElementById('miniDataProgress').style.width = `${dataPercent}%`;

    // --- 음성통화 처리 ---
    let callPercent = 0;
    let callText = '';
    let displayCallUsage = callUsage;

    if (voiceAllowance === 0) {
        // 무제한인 경우
        callText = `무제한`;
        callPercent = 100; // 무제한은 항상 꽉 찬 것으로 간주
    } else if (voiceAllowance && voiceAllowance > 0) {
        // 제한이 있는 경우
        
        // [요청된 로직] 제공량보다 많이 사용했는지 확인
        if (callUsage > voiceAllowance) {
            displayCallUsage = 0; // 제공량 초과 시 표시 사용량을 0으로 설정
        }

        // 퍼센트 계산은 수정된 표시 사용량으로 (초과 시 0%)
        callPercent = Math.min((displayCallUsage / voiceAllowance) * 100, 100);
        // 텍스트 표시는 수정된 표시 사용량으로
        callText = `${displayCallUsage}분 / ${voiceAllowance}분`;
    } else {
        // 요금제 정보가 없는 경우 (voiceAllowance is null or undefined)
        callText = `${callUsage}분`;
        callPercent = 0; // 제공량을 모르므로 0%
    }
    
    document.getElementById('miniCallValue').textContent = callText;
    document.getElementById('miniCallProgress').style.width = `${callPercent}%`;
}

// 데이터 제공량 정보 가져오기
async function fetchPlanAllowanceById(pId) {
    if (!pId) return null;
    try {
        const response = await fetch(`https://www.visiblego.com/gateway/plan/${pId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.message === "fail") return null;
        return {
            dataAllowance: data.data.dataAllowance,
            dataAllowanceUnit: data.data.dataAllowanceUnit
        };
    } catch (error) {
        console.error('요금제 제공량 조회 중 오류:', error);
        return null;
    }
}

// 월별 이용 패턴 조회
async function fetchUserUsagePattern() {
    try {
        // 현재 요금제의 제공량 정보를 가져옵니다. (가정: 지난 몇 달간 요금제가 동일함)
        const allowanceInfo = await fetchPlanAllowanceById(planId);
        const isDataUnlimited = allowanceInfo && allowanceInfo.dataAllowance === 99999;
        const isCallUnlimited = voiceAllowance === 0;

        const response = await fetch('https://www.visiblego.com/gateway/user/user-data-record/usage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, monthCount: 5 })
        });
        const result = await response.json();

        if (result.message === 'fail' || !result.data || result.data.length < 2) {
            // 데이터 없을 때 카드 초기화
            for (let i = 0; i < 3; i++) {
                document.querySelector(`#monthCard${i} .month-name`).textContent = '-';
                document.querySelector(`#monthCard${i} .usage-value`).textContent = '-';
                document.querySelector(`#monthCard${i} .usage-change`).textContent = '-';
                document.getElementById(`trend${i}`).textContent = '-';
                document.getElementById(`visualBar${i}`).style.width = '0%';
            }
            return;
        }
        
        const usageList = result.data.slice(0, 4).reverse(); // [3개월전, 2개월전, 1개월전, 지난달]
        const activeTab = document.querySelector('.tab-btn.active');
        const type = activeTab ? activeTab.getAttribute('data-type') : '데이터';
        
        // =======================================================
        // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 요청에 따라 로직이 수정된 부분 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
        // 사용량 데이터를 변환하면서, 제공량 초과 시 '0'으로 처리
        const values = usageList.map(item => {
            if (type === '데이터') {
                let usageInGB = item.dataUsage || 0;
                if (item.dataUsageUnit === 'MB') {
                    usageInGB /= 1024; // 단위를 GB로 통일
                }

                // 무제한이 아닐 경우에만 제공량과 비교
                if (allowanceInfo && !isDataUnlimited) {
                    const allowanceInGB = allowanceInfo.dataAllowanceUnit === 'GB' 
                        ? allowanceInfo.dataAllowance 
                        : allowanceInfo.dataAllowance / 1024;
                    
                    if (usageInGB > allowanceInGB) {
                        return 0; // 제공량 초과 시 사용량을 0으로 간주
                    }
                }
                return usageInGB;

            } else { // '음성' 타입일 경우
                let callUsage = item.callUsage || 0;
                
                // 무제한이 아닐 경우에만 제공량과 비교
                if (voiceAllowance && !isCallUnlimited) {
                    if (callUsage > voiceAllowance) {
                        return 0; // 제공량 초과 시 사용량을 0으로 간주
                    }
                }
                return callUsage;
            }
        });
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 로직 수정 완료 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        // =======================================================

        // '0'으로 처리된 값이 포함된 새로운 values 배열을 기준으로 최대값을 계산
        const maxValue = Math.max(...values, (type === '데이터' ? 10 : 100));

        // 3개의 카드 업데이트
        for (let i = 0; i < 3; i++) {
            const listIndex = i + 1; // 표시할 월은 usageList[1], [2], [3]
            const currentData = usageList[listIndex];
            
            if (!currentData) {
                // ... 카드 비활성화 로직 (생략) ...
                continue;
            }

            // 모든 계산은 '0' 처리가 완료된 values 배열을 사용
            const currentValue = values[listIndex];
            const prevValue = values[listIndex - 1];
            
            const monthName = String(currentData.yearMonth).replace('-', '.');
            const displayValue = type === '데이터' ? `${currentValue.toFixed(1)}GB` : `${Math.round(currentValue)}분`;
            const percent = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;
            const change = currentValue - prevValue;

            document.querySelector(`#monthCard${i} .month-name`).textContent = monthName;
            document.querySelector(`#monthCard${i} .usage-value`).textContent = displayValue;
            document.getElementById(`visualBar${i}`).style.width = `${percent}%`;

            // 증감 표시 로직
            const trendIndicator = document.getElementById(`trend${i}`);
            const changeText = document.querySelector(`#monthCard${i} .usage-change`);
            
            trendIndicator.className = 'trend-indicator';
            if (change > 0) {
                trendIndicator.classList.add('trend-up');
                trendIndicator.textContent = '▲';
                changeText.className = 'usage-change positive';
                changeText.textContent = `+${type === '데이터' ? change.toFixed(1) : Math.round(change)}`;
            } else if (change < 0) {
                trendIndicator.classList.add('trend-down');
                trendIndicator.textContent = '▼';
                changeText.className = 'usage-change negative';
                changeText.textContent = `${type === '데이터' ? change.toFixed(1) : Math.round(change)}`;
            } else {
                trendIndicator.classList.add('trend-same');
                trendIndicator.textContent = '—';
                changeText.className = 'usage-change';
                changeText.textContent = '변동 없음';
            }
        }
    } catch (error) {
        console.error('월 이용패턴 불러오기 오류:', error);
    }
}

// 혜택 정보 가져오기
async function fetchPlanBenefits(planBenefitId) {
    try {
        const response = await fetch(`https://www.visiblego.com/gateway/plan/benefit/${planBenefitId}/benefits`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log('Benefits data:', data);
        
        if (data.message === "fail") {
            console.warn(`${data.data.statusCode} ${data.data.detailMessage}`);
            return;
        }

        const benefits = data.data || [];
        const premiumBenefits = benefits.filter(b => b.benefitType === 'PREMIUM');
        const mediaBenefits = benefits.filter(b => b.benefitType === 'MEDIA');
        const basicBenefits = benefits.filter(b => b.benefitType === 'BASIC');

        // 각 타입별로 표시하고, 있으면 섹션 보이기
        const premiumSection = document.getElementById('premiumBenefitSection');
        if (premiumBenefits.length > 0) {
            document.getElementById('premiumBenefits').innerHTML = premiumBenefits.map(b => `<span class="benefit-tag">${b.benefitName}</span>`).join('');
            premiumSection.style.display = 'block';
        } else {
            premiumSection.style.display = 'none';
        }
        
        const mediaSection = document.getElementById('mediaBenefitSection');
        if (mediaBenefits.length > 0) {
            document.getElementById('mediaBenefits').innerHTML = mediaBenefits.map(b => `<span class="benefit-tag">${b.benefitName}</span>`).join('');
            mediaSection.style.display = 'block';
        } else {
            mediaSection.style.display = 'none';
        }

        const basicSection = document.getElementById('basicBenefitSection');
        if (basicBenefits.length > 0) {
            document.getElementById('basicBenefits').innerHTML = basicBenefits.map(b => `<span class="benefit-tag">${b.benefitName}</span>`).join('');
            basicSection.style.display = 'block';
        } else {
            basicSection.style.display = 'none';
        }

    } catch (error) {
        console.error('혜택 정보 조회 중 오류:', error);
        document.getElementById('premiumBenefits').innerHTML = '<span class="benefit-tag">오류</span>';
        document.getElementById('mediaBenefits').innerHTML = '<span class="benefit-tag">오류</span>';
        document.getElementById('basicBenefits').innerHTML = '<span class="benefit-tag">오류</span>';
    }
}

// [Helper] MB 단위로 변환
function convertToMB(value, unit) {
    if (unit === 'GB') return value * 1024;
    return value;
}

// [Helper] 전화번호 포맷
function formatPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}

// 요금제 상세 정보 조회
async function fetchPlanNameById(pId) {
    try {
        const response = await fetch(`https://www.visiblego.com/gateway/plan/${pId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.message === "fail") return null;

        const planData = data.data;
        document.querySelector('.plan-name').textContent = planData.planName || '알 수 없음';
        document.getElementById('planCategory').textContent = planData.planCategory || '';
        
        const dataAllowanceText = planData.dataAllowance === 99999 ? '무제한' : `${planData.dataAllowance}${planData.dataAllowanceUnit}`;
        document.getElementById('dataAllowanceDisplay').textContent = dataAllowanceText;
        
        const dataPeriodMap = { 'MONTH': '월간', 'DAY': '일간', 'WEEK': '주간' };
        document.getElementById('dataPeriodDisplay').textContent = dataPeriodMap[planData.dataPeriod] || planData.dataPeriod;
        
        document.getElementById('tetheringDisplay').textContent = planData.tetheringDataAmount ? `${planData.tetheringDataAmount}${planData.tetheringDataUnit}` : '제공안함';
        document.getElementById('familyDataDisplay').textContent = planData.familyDataAmount ? `${planData.familyDataAmount}${planData.familyDataUnit}` : '제공안함';
        document.getElementById('voiceDisplay').textContent = planData.voiceAllowance === 0 ? '무제한' : `${planData.voiceAllowance}분`;
        document.getElementById('additionalCallDisplay').textContent = planData.additionalCallAllowance ? `${planData.additionalCallAllowance}분` : '제공안함';

        // 음성통화 정보 전역 변수에 저장
        voiceAllowance = planData.voiceAllowance;

        // 혜택 정보는 별도로 planBenefitId로 조회하므로 여기서는 제거

        const monthlyFee = planData.monthlyFee ?? 0;
        document.querySelector('.amount').textContent = monthlyFee.toLocaleString() + '원';

        const today = new Date();
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const firstDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
        
        const formatDate = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        document.querySelector('.amount-period').textContent = `${formatDate(firstDay)} ~ ${formatDate(lastDay)}`;

        return planData.planName;
    } catch (error) {
        console.error('요금제 이름 조회 중 오류:', error);
        return null;
    }
}

// 페이지 이동 함수
function redirectToLogin() { window.location.href = '/page/login'; }
function moveChatbotPage() { window.location.href = '/page/chatbot'; }
function movePlanPage() { window.location.href = '/page/plan'; }
function goToMyPage() { window.location.href = '/page/mypage'; }

// 프로필 메뉴 토글
function toggleProfileMenu() {
    const popup = document.getElementById('profilePopup');
    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
}

function closeProfilePopup() {
    document.getElementById('profilePopup').style.display = 'none';
}

document.addEventListener('click', function(event) {
    const popup = document.getElementById('profilePopup');
    const profile = document.querySelector('.sidebar-profile');
    if (popup && profile && !profile.contains(event.target) && popup.style.display === 'block') {
        closeProfilePopup();
    }
});

// 로그아웃
async function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        try {
            if (accessToken) {
                await fetch('https://www.visiblego.com/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                });
            }
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
        } finally {
            sessionStorage.removeItem('accessToken');
            accessToken = '';
            window.location.href = '/page/login';
        }
    }
}
// ===== 모바일 메뉴 토글 기능 추가 =====

document.addEventListener('DOMContentLoaded', function() {
    // ... 기존 DOMContentLoaded 내용 ...

    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    // 메뉴 버튼 클릭 시
    menuToggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    });

    // 오버레이 클릭 시
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        this.style.display = 'none';
    });
});