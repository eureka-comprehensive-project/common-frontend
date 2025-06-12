document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const emailInput = document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  // 로그인 함수 (버튼 클릭과 Enter 키 둘 다 여기로 연결)
  const handleLogin = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('https://www.visiblego.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('로그인 실패');
      }

      const reponseJson = await response.json();
      const accessToken = reponseJson.data.accessToken;

      if (accessToken) {
        sessionStorage.setItem('accessToken', accessToken);
        window.location.href = '../chatbot/';
      } else {
        alert('accessToken이 없습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('로그인 중 문제가 발생했습니다.');
    }
  };

  // 버튼 클릭 시 로그인 처리
  loginBtn.addEventListener('click', handleLogin);

  // Enter 키 입력 시 로그인 버튼 효과
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleLogin();
      }
    });
  });
});