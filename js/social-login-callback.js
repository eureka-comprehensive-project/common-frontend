
window.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get("authCode");

  if (!authCode) return;

  try {
    // const response = await fetch("http://localhost:8081/auth/exchange-token", {
    const response = await fetch("https://visiblego.com/auth/exchange-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ authCode })
    });

    if (!response.ok) {
      throw new Error("토큰 요청 실패");
    }

    const result = await response.json();
    const accessToken = result.data.accessToken;

    // 토큰 저장 (필요 시 로컬 스토리지나 쿠키 등)
    sessionStorage.setItem("accessToken", accessToken);
    console.log("토큰 저장 완료")
    // 원하는 페이지로 이동
    window.location.href = "/page/chatbot/"; // 또는 원하는 URL
  } catch (error) {
    console.error("로그인 처리 중 오류:", error);
  }
});