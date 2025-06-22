const originalFetch = window.fetch;

window.fetch = async function (url, options = {}) {
  const accessToken = sessionStorage.getItem("accessToken");

  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  let response = await originalFetch(url, { ...options, headers });
  const cloned = response.clone();
  const contentType = cloned.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    try {
      const json = await cloned.json();
      const statusCode = json.statusCode;
      const errorMessage = json.data?.message || "에러가 발생했습니다.";

      // ✅ Access Token 만료: 재발급 시도 후 재요청
      if (statusCode === 10001) {
        try {
          const reissueResponse = await fetch("https://www.visiblego.com/auth/reissue", {
            method: "GET",
            credentials: "include", // refreshToken 쿠키 포함
          });
          const reissueJson = await reissueResponse.json();

          if (reissueJson.statusCode === 200) {
            const newAccessToken = reissueJson.data.accessToken;
            sessionStorage.setItem("accessToken", newAccessToken);

            const retryHeaders = {
              ...(options.headers || {}),
              Authorization: `Bearer ${newAccessToken}`,
              "Content-Type": "application/json",
            };

            return await originalFetch(url, { ...options, headers: retryHeaders });
          } else {
            showErrorModal("세션이 만료되었습니다. 다시 로그인해주세요.");
            throw new Error("Token reissue failed");
          }
        } catch (err) {
          console.error("토큰 재발급 실패:", err);
          showErrorModal("세션이 만료되었습니다. 다시 로그인해주세요.");
          throw err;
        }
      }

      // ✅ 10002 ~ 10008 인증/차단 오류 → 로그인 페이지로 이동
      if (statusCode >= 10002 && statusCode <= 10008) {
        showErrorModal("인증 정보가 유효하지 않습니다. 다시 로그인해주세요.");
        throw new Error(`권한 오류 - statusCode: ${statusCode}`);
      }

      // ✅ 기타 에러
      if (statusCode !== 200) {
        const message = `요청 실패: ${errorMessage}`;
        showErrorModal(message, null); // 리디렉션 없이 모달만
        throw new Error(message);
      }

    } catch (e) {
      console.warn("JSON 파싱 실패", e);
    }
  }

  return response;
};

// ✅ 자동 생성되는 에러 모달
function showErrorModal(message, redirectUrl = "/page/login") {
  if (document.getElementById("errorModal")) return;

  const modal = document.createElement("div");
  modal.id = "errorModal";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0,0,0,0.4)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "10000";

  const box = document.createElement("div");
  box.style.backgroundColor = "white";
  box.style.padding = "24px 32px";
  box.style.borderRadius = "12px";
  box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  box.style.maxWidth = "90%";
  box.style.textAlign = "center";

  const msg = document.createElement("p");
  msg.textContent = message;
  msg.style.marginBottom = "16px";
  msg.style.fontSize = "16px";
  msg.style.color = "#333";

  const btn = document.createElement("button");
  btn.textContent = "확인";
  btn.style.padding = "8px 16px";
  btn.style.border = "none";
  btn.style.backgroundColor = "#007bff";
  btn.style.color = "white";
  btn.style.borderRadius = "6px";
  btn.style.cursor = "pointer";

  btn.onclick = () => {
    sessionStorage.removeItem("accessToken");
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      document.body.removeChild(modal); // 그냥 닫기만
    }
  };

  box.appendChild(msg);
  box.appendChild(btn);
  modal.appendChild(box);
  document.body.appendChild(modal);
}