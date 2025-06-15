
class AlertManager {
  constructor() {
    this.alertQueue = [];
    this.isProcessing = false;
    this.initStyles();
  }

  /**
   * 알럿 CSS 스타일 초기화
   */
  initStyles() {
    // 이미 스타일이 추가되었는지 확인
    if (document.getElementById('alert-styles')) return;

    const styles = `
      .alert {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 250px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .alert.show {
        transform: translateX(0);
        opacity: 1;
      }

      .alert.error {
        background-color: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }

      .alert.success {
        background-color: #f0fdf4;
        color: #16a34a;
        border: 1px solid #bbf7d0;
      }

      .alert.warning {
        background-color: #fffbeb;
        color: #d97706;
        border: 1px solid #fed7aa;
      }

      .alert.info {
        background-color: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
      }

      .alert-close {
        background: none;
        border: none;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        margin-left: 10px;
        padding: 0;
        line-height: 1;
        opacity: 0.7;
        transition: opacity 0.2s ease;
        color: inherit;
        flex-shrink: 0;
      }

      .alert-close:hover {
        opacity: 1;
      }

      .alert-message {
        flex: 1;
        margin-right: 10px;
      }

      /* 다중 알럿 지원 */
      .alert-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }

      .alert-container .alert {
        position: relative;
        top: auto;
        right: auto;
        pointer-events: auto;
      }

      /* 반응형 */
      @media (max-width: 480px) {
        .alert {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
          transform: translateY(-100%);
        }

        .alert.show {
          transform: translateY(0);
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'alert-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  /**
   * 알럿 표시
   * @param {string} message - 표시할 메시지
   * @param {string} type - 알럿 타입 ('error', 'success', 'warning', 'info')
   * @param {number} duration - 표시 시간 (ms, 기본값: 3000)
   */
  show(message, type = 'error', duration = 3000) {
    // 기존 알럿 제거
    this.removeExistingAlert();

    const alert = this.createAlert(message, type);
    document.body.appendChild(alert);

    // 애니메이션으로 표시
    setTimeout(() => {
      alert.classList.add('show');
    }, 100);

    // 지정된 시간 후 제거
    setTimeout(() => {
      this.hideAlert(alert);
    }, duration);

    return alert;
  }

  /**
   * 알럿 엘리먼트 생성
   * @param {string} message 
   * @param {string} type 
   * @returns {HTMLElement}
   */
  createAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;

    // 메시지 영역
    const messageSpan = document.createElement('span');
    messageSpan.className = 'alert-message';
    messageSpan.textContent = message;
    alert.appendChild(messageSpan);

    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.className = 'alert-close';
    closeBtn.onclick = () => this.hideAlert(alert);
    alert.appendChild(closeBtn);

    return alert;
  }

  /**
   * 기존 알럿 제거
   */
  removeExistingAlert() {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }
  }

  /**
   * 알럿 숨기기
   * @param {HTMLElement} alert 
   */
  hideAlert(alert) {
    if (!alert || !alert.parentNode) return;

    alert.classList.remove('show');
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 300);
  }

  /**
   * 모든 알럿 제거
   */
  clearAll() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => this.hideAlert(alert));
  }

  // 편의 메서드들
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.alertManagerInstance = new AlertManager();
  });
} else {
  window.alertManagerInstance = new AlertManager();
}

// 전역 인스턴스 생성 (즉시 실행)
const alertManager = new AlertManager();

// 간편 사용을 위한 전역 함수
window.showAlert = (message, type, duration) => {
  return alertManager.show(message, type, duration);
};

// 편의 함수들
window.showSuccess = (message, duration) => alertManager.success(message, duration);
window.showError = (message, duration) => alertManager.error(message, duration);
window.showWarning = (message, duration) => alertManager.warning(message, duration);
window.showInfo = (message, duration) => alertManager.info(message, duration);

// 모듈 익스포트 (ES6 모듈 사용시)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AlertManager, alertManager };
}

// ES6 모듈 익스포트
if (typeof window !== 'undefined') {
  window.AlertManager = AlertManager;
  window.alertManager = alertManager;
}