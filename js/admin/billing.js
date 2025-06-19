let accessToken;
let globalAllBenefits = [];

// =================================================================================
// === [추가] plan.js의 categoryMap을 추가하여 카테고리 이름과 ID를 매핑합니다. ===
// =================================================================================
const categoryMap = {
    '전체': 0,
    '프리미엄': 1,
    '유스': 2,
    '시니어': 3,
    '너겟': 4,
    '청소년': 5,
    '복지': 6,
    '다이렉트': 7,
    '키즈': 8
};

// 필터 상태를 저장할 전역 객체
const currentFilters = {
    category: [],
    monthlyFee: [],
    dataAllowance: [],
    benefits: [], // 혜택 ID들을 저장
};

// 페이지를 활성화하고 다른 페이지는 비활성화합니다.
function showPage(pageToShow) {
    const allPages = document.querySelectorAll(".page");
    allPages.forEach((page) => page.classList.remove("active"));
    pageToShow.classList.add("active");
}

// 클릭된 메뉴 항목을 활성화합니다.
function activateMenuItem(clickedBtn) {
    const sidebarMenuItems = document.querySelectorAll(".menu-item");
    sidebarMenuItems.forEach((item) => item.classList.remove("active"));
    clickedBtn.closest(".menu-item").classList.add("active");
}

// 액세스 토큰의 유효성을 검증하고, 유효하지 않으면 로그인 페이지로 리디렉션합니다.
async function validateToken() {
    try {
        accessToken = sessionStorage.getItem("accessToken");

        if (!accessToken) {
            console.log("토큰이 없습니다. 로그인 페이지로 리디렉션합니다.");
            redirectToLogin();
            return;
        }

        const response = await fetch("https://www.visiblego.com/auth/validate", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.log("유효하지 않은 토큰입니다. 로그인 페이지로 리디렉션합니다.");
            sessionStorage.removeItem("accessToken"); // Remove invalid token
            redirectToLogin();
            return;
        }

        const result = await response.json();
        console.log("토큰 유효성 검사 성공:", result);
    } catch (error) {
        console.error("토큰 유효성 검사 중 오류 발생:", error);
        redirectToLogin();
    }

    function redirectToLogin() {
        window.location.href = "/page/login";
    }
}

// 모든 혜택 목록을 서버에서 불러와 전역 변수에 저장합니다.
async function fetchAllBenefits() {
    try {
        const response = await fetch(
            "https://www.visiblego.com/gateway/plan/benefit",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                `혜택을 불러오지 못했습니다: ${errorData.message || response.statusText
                }`
            );
        }

        const result = await response.json();
        if (result.statusCode === 200 && result.data) {
            globalAllBenefits = result.data;
            console.log("모든 혜택을 성공적으로 불러왔습니다:", globalAllBenefits);
        } else {
            console.error("모든 혜택을 불러오는데 실패했습니다:", result.message);
        }
    } catch (error) {
        console.error("모든 혜택 불러오기 중 오류 발생:", error);
        alert(
            "모든 혜택 데이터를 불러오는 중 네트워크 또는 서버 오류가 발생했습니다. 콘솔을 확인하세요."
        );
    }
}

// 모달 모드 (추가/수정)와 현재 수정 중인 요금제 ID를 관리합니다.
let currentModalMode = "add";
let currentEditingPlanId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const BASE_URL = "https://www.visiblego.com/gateway/plan";

    // DOM 요소 참조
    const forbiddenWordsBtn = document.getElementById("forbiddenWordsBtn");
    const userManageBtn = document.getElementById("userManageBtn");
    const planManageBtn = document.getElementById("planManageBtn");
    const forbiddenWordsPage = document.getElementById("forbiddenWordsPage");
    const userManagePage = document.getElementById("userManagePage");
    const planManagePage = document.getElementById("planManagePage");

    // 요금제 모달 관련 요소
    const addNewPlanBtn = document.getElementById("addNewPlanBtn");
    const addPlanModal = document.getElementById("addPlanModal");
    const modalPlanRegisterBtn = document.getElementById("modalPlanRegisterBtn");
    const modalPlanCancelBtn = document.getElementById("modalPlanCancelBtn");
    const modalTitle = document.getElementById("modalTitle");

    // 요금제 테이블 요소
    const planTableBody = document.getElementById("planTableBody");

    // 검색 및 필터 버튼
    const planSearchBtn = document.getElementById("planSearchBtn");
    const planSearchInput = document.getElementById("planSearchInput");
    const planFilterBtn = document.getElementById("planFilterBtn");

    // 모달 내 혜택 목록 요소
    const basicBenefitList = document.getElementById("basicBenefitList");
    const premiumBenefitList = document.getElementById("premiumBenefitList");
    const mediaBenefitList = document.getElementById("mediaBenefitList");

    // 체크박스 및 일괄 삭제 요소
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    const deleteSelectedPlansBtn = document.getElementById(
        "deleteSelectedPlansBtn"
    );

    // 필터 모달 관련 요소
    const filterPopup = document.getElementById("filterPopup");
    const benefitFilterContainer = document.getElementById("benefitFilterContainer");
    const selectedFiltersContainer = document.getElementById("selectedFilters");


    // 페이지 로드 시 초기화 작업
    await validateToken();
    await fetchAllBenefits();
    renderBenefitFilterCards();
    showPage(planManagePage);
    activateMenuItem(planManageBtn);
    fetchAndRenderPlans(null, null);

    // 요금제 데이터를 테이블에 렌더링합니다.
    async function renderPlanTable(plans) {
        const planTableBody = document.getElementById("planTableBody");
        planTableBody.innerHTML = "";

        if (!plans || plans.length === 0) {
            planTableBody.innerHTML =
                '<tr><td colspan="12">데이터가 없습니다.</td></tr>';
            return;
        }

        plans.forEach((plan) => {
            const row = document.createElement("tr");

            const categoryDisplay = plan.planCategory || "";

            console.log(plan)

            let dataDisplay = "";
            if (plan.dataAllowance === 99999) {
                dataDisplay = "무제한";
            } else if (plan.dataAllowance >= 10 && plan.dataAllowanceUnit) {
                dataDisplay = "대용량";
            } else if (plan.dataAllowance < 10 && plan.dataAllowanceUnit) {
                dataDisplay = "소용량";
            } else {
                dataDisplay = "정보 없음";
            }
            if (plan.dataPeriod) {
                let periodDisplay = "";
                switch (plan.dataPeriod) {
                    case "DAY":
                        periodDisplay = "일";
                        break;
                    case "MONTH":
                        periodDisplay = "월";
                        break;
                    default:
                        periodDisplay = plan.dataPeriod;
                }
                dataDisplay += ` (${periodDisplay})`;
            }

            let tetheringSharingDisplay = "";
            const tethering =
                plan.tetheringDataAmount !== undefined && plan.tetheringDataUnit
                    ? `테더링: ${plan.tetheringDataAmount}${plan.tetheringDataUnit}`
                    : "";
            const sharing =
                plan.familyDataAmount !== undefined && plan.familyDataUnit
                    ? `쉐어링: ${plan.familyDataAmount}${plan.familyDataUnit}`
                    : "";

            if (tethering && sharing) {
                tetheringSharingDisplay = `${tethering} / ${sharing}`;
            } else if (tethering) {
                tetheringSharingDisplay = tethering;
            } else if (sharing) {
                tetheringSharingDisplay = sharing;
            } else {
                tetheringSharingDisplay = "없음";
            }

            let voiceCallDisplay = "";
            if (plan.voiceAllowance === 0) {
                voiceCallDisplay = "무제한";
            } else if (plan.voiceAllowance !== undefined) {
                voiceCallDisplay = `${plan.voiceAllowance}분`;
            } else {
                voiceCallDisplay = "정보 없음";
            }

            if (
                plan.additionalCallAllowance !== undefined &&
                plan.additionalCallAllowance > 0
            ) {
                voiceCallDisplay += ` (+${plan.additionalCallAllowance}분)`;
            }

            const monthlyFeeDisplay =
                plan.monthlyFee != null
                    ? `${plan.monthlyFee.toLocaleString()}원`
                    : "정보 없음";

            const currentPlanBenefits = (plan.benefitIdList || [])
                .map((benefitId) => {
                    return globalAllBenefits.find((b) => b.benefitId === benefitId);
                })
                .filter(Boolean);

            const basicBenefits = [];
            const premiumBenefits = [];
            const mediaBenefits = [];

            currentPlanBenefits.forEach((benefit) => {
                if (benefit.benefitType === "BASIC") {
                    basicBenefits.push(benefit.benefitName);
                } else if (benefit.benefitType === "PREMIUM") {
                    premiumBenefits.push(benefit.benefitName);
                } else if (benefit.benefitType === "MEDIA") {
                    mediaBenefits.push(benefit.benefitName);
                }
            });

            const basicBenefitDisplay =
                basicBenefits.length > 0 ? basicBenefits.join(", ") : "없음";
            const premiumBenefitDisplay =
                premiumBenefits.length > 0 ? premiumBenefits.join(", ") : "없음";
            const mediaBenefitDisplay =
                mediaBenefits.length > 0 ? mediaBenefits.join(", ") : "없음";

            row.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" data-plan-id="${plan.planId}"></td>
        <td>${plan.planId || ""}</td>
        <td>${categoryDisplay}</td>
        <td>${plan.planName || ""}</td>
        <td>${dataDisplay}</td>
        <td>${tetheringSharingDisplay}</td>
        <td>${voiceCallDisplay}</td>
        <td>${basicBenefitDisplay}</td>
        <td>${premiumBenefitDisplay}</td>
        <td>${mediaBenefitDisplay}</td>
        <td>${monthlyFeeDisplay}</td>
        <td>
            <button class="btn-table-action modify-btn" data-plan-id="${plan.planId
                }">수정</button>
            </td>
      `;
            planTableBody.appendChild(row);
        });
        attachPlanButtonListeners();
        updateSelectAllCheckboxState();
    }

    function attachPlanButtonListeners() {
        const modifyPlanButtons = document.querySelectorAll(
            "#planTable .modify-btn"
        );
        modifyPlanButtons.forEach((button) => {
            button.onclick = null;
            button.addEventListener("click", async (event) => {
                const planId = event.target.dataset.planId;
                currentModalMode = "edit";
                currentEditingPlanId = planId;
                modalTitle.textContent = "요금제 수정";
                modalPlanRegisterBtn.textContent = "수정";

                try {
                    const response = await fetch(`${BASE_URL}/${planId}`, {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                            `수정할 요금제 데이터를 불러오지 못했습니다: ${errorData.message || response.statusText
                            }`
                        );
                    }
                    const result = await response.json();
                    const planData = result.data;

                    document.getElementById("modalPlanName").value =
                        planData.planName || "";
                    document.getElementById("modalCategory").value =
                        planData.planCategory || "";
                    document.getElementById("modalMonthlyFee").value =
                        planData.monthlyFee || "";

                    document.getElementById("modalDataAllowance").value =
                        planData.dataAllowance === 99999
                            ? ""
                            : planData.dataAllowance || "";
                    document.getElementById("modalDataAllowanceUnit").value =
                        planData.dataAllowanceUnit || "";
                    document.getElementById("modalDataPeriod").value =
                        planData.dataPeriod || "MONTH";

                    document.getElementById("modalTetheringDataAmount").value =
                        planData.tetheringDataAmount || "";
                    document.getElementById("modalTetheringDataUnit").value =
                        planData.tetheringDataUnit || "";
                    document.getElementById("modalFamilyDataAmount").value =
                        planData.familyDataAmount || "";
                    document.getElementById("modalFamilyDataUnit").value =
                        planData.familyDataUnit || "";

                    document.getElementById("modalVoiceAllowance").value =
                        planData.voiceAllowance === 0 ? "" : planData.voiceAllowance || "";
                    document.getElementById("modalAdditionalCallAllowance").value =
                        planData.additionalCallAllowance || "";

                    const planBenefits = (planData.benefitIdList || [])
                        .map((benefitId) => {
                            return globalAllBenefits.find((b) => b.benefitId === benefitId);
                        })
                        .filter(Boolean);

                    basicBenefitList.innerHTML = "";
                    premiumBenefitList.innerHTML = "";
                    mediaBenefitList.innerHTML = "";

                    planBenefits.forEach((benefit) => {
                        if (benefit.benefitType === "BASIC") {
                            addBenefitItemToModal(
                                basicBenefitList,
                                benefit.benefitId,
                                benefit.benefitName,
                                "BASIC"
                            );
                        } else if (benefit.benefitType === "PREMIUM") {
                            addBenefitItemToModal(
                                premiumBenefitList,
                                benefit.benefitId,
                                benefit.benefitName,
                                "PREMIUM"
                            );
                        } else if (benefit.benefitType === "MEDIA") {
                            addBenefitItemToModal(
                                mediaBenefitList,
                                benefit.benefitId,
                                benefit.benefitName,
                                "MEDIA"
                            );
                        }
                    });

                    setupBenefitManagement(
                        "BASIC",
                        "addBasicBenefitBtn",
                        "selectBasicBenefit",
                        "basicBenefitList"
                    );
                    setupBenefitManagement(
                        "PREMIUM",
                        "addPremiumBenefitBtn",
                        "selectPremiumBenefit",
                        "premiumBenefitList"
                    );
                    setupBenefitManagement(
                        "MEDIA",
                        "addMediaBenefitBtn",
                        "selectMediaBenefit",
                        "mediaBenefitList"
                    );

                    addPlanModal.classList.add("active");
                } catch (error) {
                    console.error("수정할 요금제 데이터 로딩 중 오류 발생:", error);
                    alert("요금제 데이터를 불러오는데 실패했습니다.");
                }
            });
        });

    }

    // =================================================================================
    // === [수정] fetchAndRenderPlans 함수 (카테고리 ID 전송 로직 반영) ===
    // =================================================================================
    async function fetchAndRenderPlans(searchTerm = null, filters = null) {
        let url;
        let method = "GET";
        let body = null;
        let fetchOptions = {};

        const hasFilters = filters && ((filters.category && filters.category.length > 0) ||
            (filters.monthlyFee && filters.monthlyFee.length > 0) ||
            (filters.dataAllowance && filters.dataAllowance.length > 0) ||
            (filters.benefits && filters.benefits.length > 0));
        const hasSearchTerm = searchTerm && searchTerm.length > 0;

        if (hasSearchTerm && !hasFilters) {
            url = `${BASE_URL}/search`;
            method = "POST";
            body = JSON.stringify({ planName: searchTerm });
            fetchOptions = {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: body,
            };
        } else if (hasFilters) {
            url = `${BASE_URL}/filter`;
            method = "POST";

            // 선택된 카테고리 이름(string)을 ID(number)로 변환
            const categoryIds = filters.category
                .map(name => categoryMap[name]) // categoryMap을 사용해 ID 조회
                .filter(id => id !== undefined); // 혹시 모를 오류 방지

            const filterRequestDto = {
                // ✅ 누락된 planName 제거 (DTO에 없음)
                categoryIds: categoryIds,
                allCategoriesSelected: filters.category.length === 0,

                // ✅ 필드 이름 일치시킴
                priceRanges: filters.monthlyFee.length > 0 ? filters.monthlyFee : [],
                anyPriceSelected: filters.monthlyFee.length === 0,

                dataOptions: filters.dataAllowance.length > 0 ? filters.dataAllowance : [],
                anyDataSelected: filters.dataAllowance.length === 0,

                benefitIds: filters.benefits.length > 0 ? filters.benefits : [],
                noBenefitsSelected: filters.benefits.length === 0,
            };

            body = JSON.stringify(filterRequestDto);
            fetchOptions = {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: body,
            };
        } else {
            url = `${BASE_URL}/`;
            fetchOptions = {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            };
        }

        console.log(`요금제 불러오는 중: URL=${url}, 메서드=${method}, 바디=${body || '없음'}`);

        try {
            const response = await fetch(url, fetchOptions);
            console.log(">>>>>>>>>>>>>>>>>>>." + response)

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    `요금제 불러오기 실패: ${errorData.message || response.statusText}`
                );
            }

            const result = await response.json();
            console.log(">>>>>>>>>>>>>>>>>>>." + result.data)

            if (result.statusCode == 200) {
                const mappedPlans = result.data.map(({ categoryName, ...rest }) => ({
                    ...rest,
                    planCategory: categoryName,
                }));
                renderPlanTable(mappedPlans);
            } else {
                alert(`데이터 불러오기 실패: ${result.message}`);
                planTableBody.innerHTML =
                    '<tr><td colspan="12">데이터를 불러오는데 실패했습니다.</td></tr>';
            }
        } catch (error) {
            console.error("요금제 데이터 불러오기 중 오류 발생:", error);
            alert(
                "요금제 데이터를 불러오는 중 네트워크 또는 서버 오류가 발생했습니다. 콘솔을 확인하세요."
            );
            planTableBody.innerHTML =
                '<tr><td colspan="12">데이터를 불러오는데 실패했습니다.</td></tr>';
        }
    }

    if (planManageBtn) {
        planManageBtn.addEventListener("click", (e) => {
            e.preventDefault();
            showPage(planManagePage);
            activateMenuItem(planManageBtn);
            currentFilters.category = [];
            currentFilters.monthlyFee = [];
            currentFilters.dataAllowance = [];
            currentFilters.benefits = [];
            initializeFilterPopup();
            renderSelectedFilters();

            planSearchInput.value = "";
            fetchAndRenderPlans(null, null);
        });
    }

    if (forbiddenWordsBtn) {
        forbiddenWordsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            showPage(forbiddenWordsPage);
            activateMenuItem(forbiddenWordsBtn);
        });
    }

    if (userManageBtn) {
        userManageBtn.addEventListener("click", (e) => {
            e.preventDefault();
            showPage(userManagePage);
            activateMenuItem(userManageBtn);
        });
    }

    function addBenefitItemToModal(
        targetListElement,
        benefitId,
        benefitName,
        benefitType
    ) {
        const li = document.createElement("li");
        li.dataset.benefitId = benefitId;
        li.dataset.benefitType = benefitType;
        li.innerHTML = `
            <span>${benefitName}</span>
            <button type="button" class="remove-benefit-btn" data-benefit-id="${benefitId}" data-benefit-type="${benefitType}">-</button>
        `;
        targetListElement.appendChild(li);

        li.querySelector(".remove-benefit-btn").addEventListener(
            "click",
            (event) => {
                event.target.closest("li").remove();
            }
        );
    }

    function setupBenefitManagement(benefitType, addBtnId, selectId, listId) {
        const addBtn = document.getElementById(addBtnId);
        const selectElement = document.getElementById(selectId);
        const targetListElement = document.getElementById(listId);

        selectElement.innerHTML = '<option value="">혜택 선택</option>';
        const filteredBenefits = globalAllBenefits.filter(
            (b) => b.benefitType === benefitType
        );
        filteredBenefits.forEach((benefit) => {
            const option = document.createElement("option");
            option.value = benefit.benefitId;
            option.textContent = benefit.benefitName;
            selectElement.appendChild(option);
        });

        addBtn.onclick = null;
        addBtn.addEventListener("click", () => {
            const selectedBenefitId = selectElement.value;
            if (selectedBenefitId) {
                const existingBenefitIds = Array.from(targetListElement.children).map(
                    (li) => li.dataset.benefitId
                );
                if (existingBenefitIds.includes(selectedBenefitId)) {
                    alert("이미 추가된 혜택입니다.");
                    return;
                }

                const selectedBenefit = filteredBenefits.find(
                    (b) => b.benefitId == selectedBenefitId
                );
                if (selectedBenefit) {
                    addBenefitItemToModal(
                        targetListElement,
                        selectedBenefit.benefitId,
                        selectedBenefit.benefitName,
                        benefitType
                    );
                    selectElement.value = "";
                }
            } else {
                alert("추가할 혜택을 선택해주세요.");
            }
        });
    }

    if (addNewPlanBtn) {
        addNewPlanBtn.addEventListener("click", () => {
            currentModalMode = "add";
            currentEditingPlanId = null;
            modalTitle.textContent = "새 요금제 등록";
            modalPlanRegisterBtn.textContent = "등록";

            document.getElementById("modalPlanName").value = "";
            document.getElementById("modalCategory").value = "";
            document.getElementById("modalMonthlyFee").value = "";
            document.getElementById("modalDataAllowance").value = "";
            document.getElementById("modalDataAllowanceUnit").value = "GB";
            document.getElementById("modalDataPeriod").value = "MONTH";
            document.getElementById("modalTetheringDataAmount").value = "";
            document.getElementById("modalTetheringDataUnit").value = "GB";
            document.getElementById("modalFamilyDataAmount").value = "";
            document.getElementById("modalFamilyDataUnit").value = "GB";
            document.getElementById("modalVoiceAllowance").value = "";
            document.getElementById("modalAdditionalCallAllowance").value = "";

            basicBenefitList.innerHTML = "";
            premiumBenefitList.innerHTML = "";
            mediaBenefitList.innerHTML = "";

            setupBenefitManagement(
                "BASIC",
                "addBasicBenefitBtn",
                "selectBasicBenefit",
                "basicBenefitList"
            );
            setupBenefitManagement(
                "PREMIUM",
                "addPremiumBenefitBtn",
                "selectPremiumBenefit",
                "premiumBenefitList"
            );
            setupBenefitManagement(
                "MEDIA",
                "addMediaBenefitBtn",
                "selectMediaBenefit",
                "mediaBenefitList"
            );

            addPlanModal.classList.add("active");
        });
    }

    if (modalPlanRegisterBtn) {
        modalPlanRegisterBtn.addEventListener("click", async () => {
            const planName = document.getElementById("modalPlanName").value.trim();
            const planCategory = document
                .getElementById("modalCategory")
                .value.trim();
            const monthlyFee = parseFloat(
                document.getElementById("modalMonthlyFee").value
            );

            let dataAllowanceInput = document
                .getElementById("modalDataAllowance")
                .value.trim();
            const dataAllowance =
                dataAllowanceInput === "" || dataAllowanceInput === "무제한"
                    ? 99999
                    : parseFloat(dataAllowanceInput);

            const dataAllowanceUnit = document
                .getElementById("modalDataAllowanceUnit")
                .value.trim();
            const dataPeriod = document
                .getElementById("modalDataPeriod")
                .value.trim();

            const tetheringDataAmount =
                document.getElementById("modalTetheringDataAmount").value.trim() === ""
                    ? null
                    : parseFloat(
                        document.getElementById("modalTetheringDataAmount").value
                    );
            const tetheringDataUnit = document
                .getElementById("modalTetheringDataUnit")
                .value.trim();
            const familyDataAmount =
                document.getElementById("modalFamilyDataAmount").value.trim() === ""
                    ? null
                    : parseFloat(document.getElementById("modalFamilyDataAmount").value);
            const familyDataUnit = document
                .getElementById("modalFamilyDataUnit")
                .value.trim();

            let voiceAllowanceInput = document
                .getElementById("modalVoiceAllowance")
                .value.trim();
            const voiceAllowance =
                voiceAllowanceInput === "" || voiceAllowanceInput === "무제한"
                    ? 0
                    : parseFloat(voiceAllowanceInput);

            const additionalCallAllowance =
                document.getElementById("modalAdditionalCallAllowance").value.trim() ===
                    ""
                    ? null
                    : parseFloat(
                        document.getElementById("modalAdditionalCallAllowance").value
                    );

            const benefitIdList = [];
            Array.from(basicBenefitList.children).forEach((li) =>
                benefitIdList.push(parseInt(li.dataset.benefitId))
            );
            Array.from(premiumBenefitList.children).forEach((li) =>
                benefitIdList.push(parseInt(li.dataset.benefitId))
            );
            Array.from(mediaBenefitList.children).forEach((li) =>
                benefitIdList.push(parseInt(li.dataset.benefitId))
            );

            const planDataToSend = {
                planName: planName,
                planCategory: planCategory,
                monthlyFee: monthlyFee,
                dataAllowance: dataAllowance,
                dataAllowanceUnit: dataAllowanceUnit,
                dataPeriod: dataPeriod,
                tetheringDataAmount: tetheringDataAmount,
                tetheringDataUnit: tetheringDataUnit,
                familyDataAmount: familyDataAmount,
                familyDataUnit: familyDataUnit,
                voiceAllowance: voiceAllowance,
                additionalCallAllowance: additionalCallAllowance,
                benefitIdList: benefitIdList,
            };

            if (!planName || !planCategory || isNaN(monthlyFee)) {
                alert("요금제 이름, 카테고리, 월 요금은 필수 입력 항목입니다.");
                return;
            }
            if (
                (dataAllowance !== 99999 && isNaN(dataAllowance)) ||
                (voiceAllowance !== 0 && isNaN(voiceAllowance))
            ) {
                alert("데이터 사용량 또는 음성 통화량은 유효한 숫자여야 합니다.");
                return;
            }
            if (
                (tetheringDataAmount !== null && isNaN(tetheringDataAmount)) ||
                (familyDataAmount !== null && isNaN(familyDataAmount)) ||
                (additionalCallAllowance !== null && isNaN(additionalCallAllowance))
            ) {
                alert(
                    "테더링/쉐어링 데이터 또는 추가 통화량은 유효한 숫자여야 합니다."
                );
                return;
            }

            let url = `${BASE_URL}/register`;
            let method = "POST";
            let successMessage = "요금제가 성공적으로 등록되었습니다.";

            if (currentModalMode === "edit" && currentEditingPlanId) {
                url = `${BASE_URL}/${currentEditingPlanId}`;
                method = "PUT";
                successMessage = "요금제가 성공적으로 수정되었습니다.";

                try {
                    const getResponse = await fetch(
                        `${BASE_URL}/${currentEditingPlanId}`,
                        {
                            method: "GET",
                            headers: { Authorization: `Bearer ${accessToken}` },
                        }
                    );
                    if (!getResponse.ok) {
                        const errorData = await getResponse.json();
                        throw new Error(
                            `현재 요금제 상태를 가져오지 못했습니다: ${errorData.message || getResponse.statusText
                            }`
                        );
                    }
                    const currentPlanResult = await getResponse.json();
                    planDataToSend.planStatus = currentPlanResult.data.planStatus;
                } catch (error) {
                    console.error(
                        "업데이트를 위한 현재 요금제 상태를 가져오는 중 오류 발생:",
                        error
                    );
                    alert("업데이트 중 현재 요금제 상태를 가져오는데 실패했습니다.");
                    return;
                }
            } else {
                planDataToSend.planStatus = "USE";
            }

            console.log("전송할 요금제 데이터:", JSON.stringify(planDataToSend, null, 2));

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(planDataToSend),
                });

                const result = await response.json();

                if (result.statusCode == 200) {
                    alert(successMessage);
                    addPlanModal.classList.remove("active");
                    const currentSearchTerm = planSearchInput.value.trim();
                    if (
                        currentFilters.category.length > 0 ||
                        currentFilters.monthlyFee.length > 0 ||
                        currentFilters.dataAllowance.length > 0 ||
                        currentFilters.benefits.length > 0
                    ) {
                        fetchAndRenderPlans(currentSearchTerm, currentFilters);
                    } else if (currentSearchTerm) {
                        fetchAndRenderPlans(currentSearchTerm, null);
                    } else {
                        fetchAndRenderPlans(null, null);
                    }

                } else {
                    alert(`작업 실패: ${result.message || "알 수 없는 오류"}`);
                }
            } catch (error) {
                console.error("요금제 등록/수정 중 오류 발생:", error);
                alert(
                    "요금제 등록/수정 중 네트워크 또는 서버 오류가 발생했습니다. 콘솔을 확인하세요."
                );
            }
        });
    }

    if (modalPlanCancelBtn) {
        modalPlanCancelBtn.addEventListener("click", () => {
            addPlanModal.classList.remove("active");
        });
    }

    if (addPlanModal) {
        addPlanModal.addEventListener("click", (e) => {
            if (e.target === addPlanModal) {
                addPlanModal.classList.remove("active");
            }
        });
    }

    if (planSearchBtn && planSearchInput) {
        planSearchBtn.addEventListener("click", () => {
            const searchTerm = planSearchInput.value.trim();
            fetchAndRenderPlans(searchTerm, null);
        });
        planSearchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                planSearchBtn.click();
            }
        });
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", (event) => {
            const isChecked = event.target.checked;
            const rowCheckboxes = document.querySelectorAll(
                "#planTableBody .row-checkbox"
            );
            rowCheckboxes.forEach((checkbox) => {
                checkbox.checked = isChecked;
            });
        });
    }

    planTableBody.addEventListener("change", (event) => {
        if (event.target.classList.contains("row-checkbox")) {
            updateSelectAllCheckboxState();
        }
    });

    function updateSelectAllCheckboxState() {
        const rowCheckboxes = document.querySelectorAll(
            "#planTableBody .row-checkbox"
        );
        const checkedCheckboxes = document.querySelectorAll(
            "#planTableBody .row-checkbox:checked"
        );

        if (rowCheckboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length === rowCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCheckboxes.length > 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    if (deleteSelectedPlansBtn) {
        deleteSelectedPlansBtn.addEventListener("click", async () => {
            const selectedPlanIds = Array.from(
                document.querySelectorAll("#planTableBody .row-checkbox:checked")
            ).map((cb) => cb.dataset.planId);

            if (selectedPlanIds.length === 0) {
                alert("삭제할 요금제를 선택해주세요.");
                return;
            }

            if (
                confirm(`${selectedPlanIds.length}개의 요금제를 정말로 삭제하시겠습니까?`)
            ) {
                try {
                    const deletePromises = selectedPlanIds.map((id) =>
                        fetch(`${BASE_URL}/${id}`, {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                            },
                        }).then((response) => {
                            if (!response.ok) {
                                return response.json().then((errorData) => {
                                    throw new Error(
                                        `요금제 ${id} 삭제 실패: ${errorData.message || response.statusText
                                        }`
                                    );
                                });
                            }
                            return response;
                        })
                    );

                    await Promise.all(deletePromises);
                    alert(`${selectedPlanIds.length}개의 요금제가 성공적으로 삭제되었습니다.`);
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = false;
                    }
                    const currentSearchTerm = planSearchInput.value.trim();
                    if (
                        currentFilters.category.length > 0 ||
                        currentFilters.monthlyFee.length > 0 ||
                        currentFilters.dataAllowance.length > 0 ||
                        currentFilters.benefits.length > 0
                    ) {
                        fetchAndRenderPlans(currentSearchTerm, currentFilters);
                    } else if (currentSearchTerm) {
                        fetchAndRenderPlans(currentSearchTerm, null);
                    } else {
                        fetchAndRenderPlans(null, null);
                    }
                } catch (error) {
                    console.error("일괄 삭제 중 오류 발생:", error);
                    alert(`요금제 삭제 중 오류 발생: ${error.message}`);
                }
            }
        });
    }

    // ----------------------------------------------------
    // 필터 모달 관련 JavaScript 로직
    // ----------------------------------------------------

    if (planFilterBtn) {
        planFilterBtn.addEventListener("click", () => {
            filterPopup.classList.add("active");
            initializeFilterPopup();

            document.querySelectorAll(".filter-tag-group .filter-tag-btn").forEach(btn => {
                btn.removeEventListener("click", toggleTagHandler);
                btn.addEventListener("click", toggleTagHandler);
            });

            document.querySelectorAll(".benefit-card").forEach(card => {
                card.removeEventListener("click", benefitCardClickHandler);
                card.addEventListener("click", benefitCardClickHandler);
            });
        });
    }

    window.closeFilterPopup = function () {
        filterPopup.classList.remove("active");
    };

    filterPopup.addEventListener("click", (e) => {
        if (e.target === filterPopup) {
            closeFilterPopup();
        }
    });

    function initializeFilterPopup() {
        document.querySelectorAll(".filter-tag-btn").forEach(btn => {
            btn.classList.remove("selected");
        });
        document.querySelectorAll(".benefit-card").forEach(card => {
            card.classList.remove("selected");
        });

        for (const type in currentFilters) {
            if (type === "benefits") {
                currentFilters.benefits.forEach(benefitId => {
                    const card = document.querySelector(`.benefit-card[data-benefit-id="${benefitId}"]`);
                    if (card) {
                        card.classList.add("selected");
                    }
                });
            } else {
                const group = document.querySelector(`.filter-tag-group[data-filter-type="${type}"]`);
                if (group) {
                    if (currentFilters[type].length === 0) {
                        const allTag = group.querySelector('.filter-tag-btn[data-value="all"]');
                        if (allTag) allTag.classList.add("selected");
                    } else {
                        currentFilters[type].forEach(value => {
                            const tag = group.querySelector(`.filter-tag-btn[data-value="${value}"]`);
                            if (tag) tag.classList.add("selected");
                        });
                    }
                }
            }
        }
        renderSelectedFilters();
    }


    function toggleTag(clickedTag) {
        const group = clickedTag.closest(".filter-tag-group");
        const value = clickedTag.dataset.value;

        if (value === "all") {
            group.querySelectorAll(".filter-tag-btn").forEach(tag => {
                tag.classList.remove("selected");
            });
            clickedTag.classList.add("selected");
        } else {
            const allTag = group.querySelector('.filter-tag-btn[data-value="all"]');
            if (allTag) allTag.classList.remove("selected");

            clickedTag.classList.toggle("selected");

            const anyOtherTagSelected = Array.from(group.querySelectorAll('.filter-tag-btn:not([data-value="all"])')).some(tag => tag.classList.contains("selected"));
            if (!anyOtherTagSelected && allTag) {
                allTag.classList.add("selected");
            }
        }
    }

    function toggleTagHandler(event) {
        toggleTag(event.currentTarget);
    }

    function benefitCardClickHandler(event) {
        event.currentTarget.classList.toggle("selected");
    }


    function renderBenefitFilterCards() {
        benefitFilterContainer.innerHTML = "";
        globalAllBenefits.forEach(benefit => {
            const benefitCard = document.createElement("div");
            benefitCard.classList.add("benefit-card");

            if (benefit.benefitType === "BASIC") {
                benefitCard.classList.add("basic");
            } else if (benefit.benefitType === "PREMIUM") {
                benefitCard.classList.add("premium");
            } else if (benefit.benefitType === "MEDIA") {
                benefitCard.classList.add("media");
            }

            benefitCard.dataset.benefitId = benefit.benefitId;
            benefitCard.innerHTML = `
                <div class="benefit-card-name">${benefit.benefitName}</div>
                <div class="benefit-card-price">${benefit.benefitPrice ? benefit.benefitPrice.toLocaleString() + '원' : '무료'}</div>
            `;
            benefitFilterContainer.appendChild(benefitCard);
        });
    }

    window.clearAllFilters = function () {
        document.querySelectorAll(".filter-tag-group").forEach(group => {
            group.querySelectorAll(".filter-tag-btn").forEach(tag => {
                tag.classList.remove("selected");
            });
            const allTag = group.querySelector('.filter-tag-btn[data-value="all"]');
            if (allTag) allTag.classList.add("selected");
        });

        document.querySelectorAll(".benefit-card").forEach(card => {
            card.classList.remove("selected");
        });

        currentFilters.category = [];
        currentFilters.monthlyFee = [];
        currentFilters.dataAllowance = [];
        currentFilters.benefits = [];

        renderSelectedFilters();
        const searchTerm = planSearchInput.value.trim();
        if (searchTerm) {
            fetchAndRenderPlans(searchTerm, null);
        } else {
            fetchAndRenderPlans(null, null);
        }
    };

    window.applyFilter = function () {
        currentFilters.category = getSelectedTagValues("category");
        currentFilters.monthlyFee = getSelectedTagValues("monthlyFee");
        currentFilters.dataAllowance = getSelectedTagValues("dataAllowance");
        currentFilters.benefits = getSelectedBenefitIds();

        closeFilterPopup();
        renderSelectedFilters();

        const searchTerm = planSearchInput.value.trim();
        fetchAndRenderPlans(searchTerm, currentFilters);
    };

    function getSelectedTagValues(filterType) {
        const group = document.querySelector(`.filter-tag-group[data-filter-type="${filterType}"]`);
        if (!group) return [];

        const selectedTags = Array.from(group.querySelectorAll(".filter-tag-btn.selected"));

        if (selectedTags.some(tag => tag.dataset.value === "all") || selectedTags.length === 0) {
            return [];
        }

        return selectedTags
            .filter(tag => tag.dataset.value !== "all")
            .map(tag => tag.dataset.value);
    }

    function getSelectedBenefitIds() {
        const selectedBenefitCards = document.querySelectorAll(".benefit-card.selected");
        return Array.from(selectedBenefitCards).map(card => parseInt(card.dataset.benefitId));
    }


    function renderSelectedFilters() {
        selectedFiltersContainer.innerHTML = "";

        currentFilters.category.forEach(value => {
            addSelectedFilterTag(value, "category");
        });

        currentFilters.monthlyFee.forEach(value => {
            addSelectedFilterTag(value, "monthlyFee");
        });

        currentFilters.dataAllowance.forEach(value => {
            addSelectedFilterTag(value, "dataAllowance");
        });

        currentFilters.benefits.forEach(benefitId => {
            const benefit = globalAllBenefits.find(b => b.benefitId === benefitId);
            if (benefit) {
                addSelectedFilterTag(benefit.benefitName, "benefit", benefitId);
            }
        });
    }

    function addSelectedFilterTag(displayValue, filterType, id = null) {
        const tag = document.createElement("span");
        tag.classList.add("selected-filter-tag");
        tag.innerHTML = `
            ${displayValue}
            <button type="button" class="remove-tag-btn" data-filter-type="${filterType}" data-value="${displayValue}" ${id ? `data-id="${id}"` : ''}>&times;</button>
        `;
        selectedFiltersContainer.appendChild(tag);

        tag.querySelector(".remove-tag-btn").addEventListener("click", (event) => {
            const typeToRemove = event.target.dataset.filterType;
            const valueToRemove = event.target.dataset.value;
            const idToRemove = event.target.dataset.id ? parseInt(event.target.dataset.id) : null;

            if (typeToRemove === "benefit" && idToRemove !== null) {
                currentFilters.benefits = currentFilters.benefits.filter(id => id !== idToRemove);
            } else {
                currentFilters[typeToRemove] = currentFilters[typeToRemove].filter(val => val !== valueToRemove);
            }

            if (typeToRemove === "benefit" && idToRemove !== null) {
                const card = document.querySelector(`.benefit-card[data-benefit-id="${idToRemove}"]`);
                if (card) card.classList.remove("selected");
            } else {
                const group = document.querySelector(`.filter-tag-group[data-filter-type="${typeToRemove}"]`);
                if (group) {
                    const tagBtn = group.querySelector(`.filter-tag-btn[data-value="${valueToRemove}"]`);
                    if (tagBtn) tagBtn.classList.remove("selected");

                    const anyOtherTagSelected = Array.from(group.querySelectorAll('.filter-tag-btn:not([data-value="all"])')).some(t => t.classList.contains("selected"));
                    const allTag = group.querySelector('.filter-tag-btn[data-value="all"]');
                    if (!anyOtherTagSelected && allTag) {
                        allTag.classList.add("selected");
                    }
                }
            }

            renderSelectedFilters();
            const searchTerm = planSearchInput.value.trim();
            if (
                currentFilters.category.length > 0 ||
                currentFilters.monthlyFee.length > 0 ||
                currentFilters.dataAllowance.length > 0 ||
                currentFilters.benefits.length > 0
            ) {
                fetchAndRenderPlans(searchTerm, currentFilters);
            } else if (searchTerm) {
                fetchAndRenderPlans(searchTerm, null);
            } else {
                fetchAndRenderPlans(null, null);
            }
        });
    }
});