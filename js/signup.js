document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.querySelector('.signup-form');
  const signupBtn = document.getElementById('signup-btn');
  const emailInput = document.querySelector('.email-input');
  const passwordInput = document.querySelector('.password-input');
  const passwordConfirmInput = document.querySelector('.password-confirm-input');
  const nameInput = document.querySelector('.name-input');
  const phoneInput = document.querySelector('.phone-input');
  const birthInput = document.querySelector('.birth-input');
  const checkBtn = document.querySelector('.check-btn');

  let isEmailChecked = false;

  // 이메일 인증 모달 표시
  const showEmailVerificationModal = (email) => {
    // 모달 HTML 생성
    const modal = document.createElement('div');
    modal.className = 'email-verification-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <button class="modal-close" onclick="closeModal()">×</button>
          <div class="modal-icon">
            📧
          </div>
          <h3 class="modal-title">이메일 인증이 필요합니다</h3>
          <p class="modal-message">
            <strong>${email}</strong>로<br>
            인증 링크가 전송되었습니다.
          </p>
          <p class="modal-submessage">
            이메일의 보안 링크를 클릭하여<br>
            계정을 활성화한 후 로그인해주세요.
          </p>
        </div>
      </div>
    `;

    // 모달 스타일 추가
    const modalStyles = `
      .email-verification-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .modal-content {
        background: white;
        border-radius: 20px;
        padding: 40px 30px;
        text-align: center;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        position: relative;
      }

      .modal-close {
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        color: #6b7280;
        transition: color 0.2s ease;
        padding: 5px;
        line-height: 1;
      }

      .modal-close:hover {
        color: #1a1a1a;
      }

      .modal-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }

      .modal-title {
        font-size: 24px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 20px;
      }

      .modal-message {
        font-size: 16px;
        color: #4b5563;
        margin-bottom: 16px;
        line-height: 1.5;
      }

      .modal-submessage {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 20px;
        line-height: 1.4;
      }

      @media (max-width: 480px) {
        .modal-content {
          padding: 30px 20px;
        }
        
        .modal-title {
          font-size: 20px;
        }
        
        .modal-message {
          font-size: 15px;
        }
      }
    `;

    // 스타일 추가
    const styleSheet = document.createElement('style');
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);

    // 모달을 body에 추가
    document.body.appendChild(modal);

    // 전역 모달 변수 설정 (닫기 함수에서 사용)
    window.currentModal = modal;

    // 오버레이 클릭시 모달 닫기
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    });
  };

  // 모달 닫기 함수
  window.closeModal = () => {
    if (window.currentModal) {
      window.currentModal.remove();
      window.currentModal = null;
    }
    // 모달 닫으면 로그인 페이지로 이동
    window.location.href = '../login/';
  };

  // 이메일 중복확인
  const handleEmailCheck = async () => {
    const email = emailInput.value.trim();

    if (!email) {
      showError('이메일을 입력해주세요.');
      return;
    }

    if (!isValidEmail(email)) {
      showError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    checkBtn.textContent = '확인 중...';
    checkBtn.disabled = true;

    try {
      const response = await fetch('https://www.visiblego.com/gateway/user/email-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("response data:", responseData);
        
        // data가 false일 때만 사용 가능한 이메일 (중복되지 않음)
        if (responseData.data === false) {
          showSuccess('사용 가능한 이메일입니다.');
          isEmailChecked = true;
          checkBtn.textContent = '확인 완료';
          emailInput.style.borderColor = '#16a34a';
        } else {
          // data가 true이면 이미 사용 중인 이메일
          showError('이미 사용 중인 이메일입니다.');
          isEmailChecked = false;
          checkBtn.textContent = '중복확인';
          emailInput.style.borderColor = '#dc2626';
        }
      } else {
        showError('이메일 확인 중 문제가 발생했습니다.');
        isEmailChecked = false;
        checkBtn.textContent = '중복확인';
        emailInput.style.borderColor = '#dc2626';
      }
    } catch (error) {
      console.error('이메일 확인 오류:', error);
      showError('이메일 확인 중 문제가 발생했습니다.');
      isEmailChecked = false;
      checkBtn.textContent = '중복확인';
    }

    checkBtn.disabled = false;
  };

  // 이메일 유효성 검사
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 비밀번호 유효성 검사
  const isValidPassword = (password) => {
    return password.length >= 8;
  };

  // 전화번호 형식 변환
  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 회원가입 처리
  const handleSignup = async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const birth = birthInput.value;

    // 유효성 검사
    if (!email || !password || !passwordConfirm || !name || !phone || !birth) {
      showError('모든 필드를 입력해주세요.');
      return;
    }

    if (!isEmailChecked) {
      showError('이메일 중복확인을 해주세요.');
      return;
    }

    if (!isValidEmail(email)) {
      showError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (!isValidPassword(password)) {
      showError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      showError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (name.length < 2) {
      showError('이름은 2자 이상이어야 합니다.');
      return;
    }

    // 로딩 상태
    signupBtn.textContent = '가입 중...';
    signupBtn.disabled = true;

    try {
      const response = await fetch('https://www.visiblego.com/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          phone: phone.replace(/\D/g, ''), // 숫자만 전송
          birth
        }),
      });

      if (response.ok) {
        showSuccess('회원가입이 완료되었습니다!');
        signupBtn.textContent = '가입 완료';

        // 이메일 인증 모달 표시
        showEmailVerificationModal(email);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '회원가입 실패');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      showError('회원가입 중 문제가 발생했습니다.');

      // 버튼 상태 복원
      signupBtn.textContent = '가입하기';
      signupBtn.disabled = false;
    }
  };

  // 이벤트 리스너
  checkBtn.addEventListener('click', handleEmailCheck);
  signupForm.addEventListener('submit', handleSignup);

  // 이메일 입력 변경시 중복확인 상태 초기화
  emailInput.addEventListener('input', () => {
    isEmailChecked = false;
    checkBtn.textContent = '중복확인';
    emailInput.style.borderColor = '#d1d5db';
  });

  // 전화번호 자동 포맷팅
  phoneInput.addEventListener('input', (e) => {
    e.target.value = formatPhoneNumber(e.target.value);
  });

  // 비밀번호 확인 실시간 검사
  passwordConfirmInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    if (passwordConfirm && password !== passwordConfirm) {
      passwordConfirmInput.style.borderColor = '#dc2626';
    } else {
      passwordConfirmInput.style.borderColor = '#d1d5db';
    }
  });

  // 소셜 로그인 버튼들 (기존 카카오 제외)
  const socialButtons = document.querySelectorAll('.social-btn:not(.kakao-btn)');
  socialButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      showWarning('해당 소셜 로그인은 준비 중입니다.');
    });
  });

  // 입력 필드 포커스 시 스타일 초기화
  [emailInput, passwordInput, passwordConfirmInput, nameInput, phoneInput, birthInput].forEach(input => {
    input.addEventListener('focus', () => {
      if (input !== emailInput && input !== passwordConfirmInput) {
        input.style.borderColor = '#d1d5db';
      }
    });
  });
});