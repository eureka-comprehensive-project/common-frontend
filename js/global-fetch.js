const originalFetch = window.fetch;

window.fetch = async function (url, options = {}) {
  const accessToken = sessionStorage.getItem("accessToken");

  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };

  // 1차 요청
  let response = await originalFetch(url, { ...options, headers });
  console.log(response)

  const cloned = response.clone();
  const contentType = cloned.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    try {
      const json = await cloned.json();
      const statusCode = json.statusCode;
      const errorMessage = json.data?.message || "에러가 발생했습니다.";

      if (statusCode !== 200) {
        // ✅ Access Token 만료: 재발급 시도 후 재요청
        if (statusCode === 10001) {
          try {
            const reissueResponse = await fetch("https://www.visiblego.com/auth/reissue", {
              method: "GET",
              credentials: "include", // ✅ refreshToken 쿠키 전송
            });

            const reissueJson = await reissueResponse.json();

            if (reissueJson.statusCode === 200) {
              const newAccessToken = reissueJson.data.accessToken;
              sessionStorage.setItem("accessToken", newAccessToken);

              // ✅ 헤더에 새 토큰으로 교체 후 재요청
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

        // ✅ 블랙리스트 또는 기타 오류
        let message = "오류가 발생했습니다.";
        switch (statusCode) {
          case 10004:
            message = "로그인이 필요합니다.";
            break;
          case 10007:
          case 10008:
            message = "차단된 사용자입니다. 관리자에게 문의해주세요.";
            break;
          default:
            message = `요청 실패: ${errorMessage}`;
        }

        showErrorModal(message);
        throw new Error(`API 실패 - statusCode: ${statusCode}`);
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
    window.location.href = redirectUrl;
  };

  box.appendChild(msg);
  box.appendChild(btn);
  modal.appendChild(box);
  document.body.appendChild(modal);
}