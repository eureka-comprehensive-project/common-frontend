document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.signup-form');
  const emailInput = form.querySelector('input[type="email"]');
  const passwordInput = form.querySelectorAll('input[type="password"]')[0];
  const confirmPasswordInput = form.querySelectorAll('input[type="password"]')[1];
  const nameInput = form.querySelector('input[placeholder="이름"]');
  const phoneInput = form.querySelector('input[type="tel"]');
  const birthInput = form.querySelector('input[type="date"]');
  const checkBtn = document.querySelector('.check-btn');

  let isEmailChecked = false;

  // ✅ 이메일 중복체크
  checkBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
      alert('이메일을 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(`https://www.visiblego.com/auth/check-email?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error('서버 오류');
      const result = await res.json();

      if (result.exists) {
        alert('이미 사용 중인 이메일입니다.');
        isEmailChecked = false;
      } else {
        alert('사용 가능한 이메일입니다.');
        isEmailChecked = true;
      }
    } catch (err) {
      console.error(err);
      alert('이메일 중복 체크 중 오류가 발생했습니다.');
    }
  });

  // ✅ 실시간 비밀번호 확인
  const validatePasswords = () => {
    const pw = passwordInput.value;
    const confirmPw = confirmPasswordInput.value;

    if (!confirmPw) {
      confirmPasswordInput.style.border = '1px solid #999';
      return;
    }

    if (pw !== confirmPw) {
      confirmPasswordInput.style.border = '1px solid red';
    } else {
      confirmPasswordInput.style.border = '1px solid #999';
    }
  };

  passwordInput.addEventListener('input', validatePasswords);
  confirmPasswordInput.addEventListener('input', validatePasswords);

  // ✅ 회원가입 폼 제출 처리
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const birth = birthInput.value;

    if (password !== confirmPassword) {
      confirmPasswordInput.style.border = '1px solid red';
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isEmailChecked) {
      alert('이메일 중복체크를 먼저 해주세요.');
      return;
    }

    const payload = {
      email,
      password,
      name,
      phone,
      birth
    };

    try {
      const res = await fetch('https://www.visiblego.com/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('회원가입 실패');

      const result = await res.json();
      alert('회원가입이 완료되었습니다!');
      window.location.href = '../login/';
    } catch (err) {
      console.error(err);
      alert('회원가입 중 오류가 발생했습니다.');
    }
  });
});