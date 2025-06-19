document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('.login-form');
  const loginBtn = document.getElementById('login-btn');
  const emailInput = document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  // 로그인 처리 함수
  const handleLogin = async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    // 로딩 상태
    loginBtn.textContent = '로그인 중...';
    loginBtn.disabled = true;

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

      const responseJson = await response.json();
      const accessToken = responseJson.data.accessToken;
      const role = responseJson.data.role;

      if (accessToken) {
        sessionStorage.setItem('accessToken', accessToken);
        showSuccess('로그인 성공!');
        loginBtn.textContent = '로그인 완료';

        setTimeout(() => {
          if (role == "ROLE_ADMIN") {
            window.location.href = '../admin/';
          } else {
            window.location.href = '../chatbot/';
          }

        }, 1500);
      } else {
        throw new Error('accessToken이 없습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      showError('로그인 중 문제가 발생했습니다.');

      // 버튼 상태 복원
      loginBtn.textContent = '계속';
      loginBtn.disabled = false;
    }
  };

  // 폼 제출 이벤트
  loginForm.addEventListener('submit', handleLogin);

  // 소셜 로그인 버튼들 (기존 카카오 제외)
  const socialButtons = document.querySelectorAll('.social-btn:not(.kakao-btn):not(.google-btn)');
  socialButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      showWarning('해당 소셜 로그인은 준비 중입니다.');
    });
  });

  // 입력 필드 유효성 검사 (실시간)
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('input', () => {
      if (input.value.trim()) {
        input.style.borderColor = '#d1d5db';
      }
    });
  });
});