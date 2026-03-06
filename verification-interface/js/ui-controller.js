/**
 * UIController - Manages UI updates and branding
 */
export class UIController {
  constructor() {
    this.pages = {
      landing: document.getElementById('landing-page'),
      deviceCheck: document.getElementById('device-check-page'),
      verification: document.getElementById('verification-page'),
      result: document.getElementById('result-page'),
      error: document.getElementById('error-page')
    };
    this.instructionTimer = null;
    this.countdownAnimationClass = 'animate-pop-a';
  }

  /**
   * Show specific page
   */
  showPage(pageName) {
    Object.values(this.pages).forEach(page => {
      page.classList.remove('active');
    });

    if (this.pages[pageName]) {
      this.pages[pageName].classList.add('active');
    }
  }

  /**
   * Apply partner branding
   */
  applyBranding(config) {
    if (!config) return;

    // Apply logo
    if (config.logo_url) {
      const logoElement = document.getElementById('branding-logo');
      if (logoElement) {
        logoElement.innerHTML = `<img src="${config.logo_url}" alt="Partner Logo">`;
        logoElement.classList.remove('hidden');
      }
    }

    // Apply colors
    const root = document.documentElement;
    if (config.primary_color) {
      root.style.setProperty('--primary-color', config.primary_color);
    }
    if (config.secondary_color) {
      root.style.setProperty('--secondary-color', config.secondary_color);
    }
    if (config.button_color) {
      root.style.setProperty('--button-color', config.button_color);
    }
  }

  /**
   * Show phase instructions
   */
  showInstructions(phaseData) {
    const titleElement = document.getElementById('phase-title');
    const instructionElement = document.getElementById('phase-instruction');
    const progressFill = document.getElementById('progress-fill');
    const progressBar = document.getElementById('progress-bar');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownTimerElement = document.getElementById('countdown-timer');

    if (titleElement) {
      titleElement.textContent = phaseData.title;
    }

    if (instructionElement) {
      instructionElement.textContent = phaseData.instruction;
    }

    // Update progress bar
    if (progressFill) {
      const progressMap = {
        baseline: 25,
        pan: 50,
        return: 75,
        analyzing: 100
      };

      // If it's a dynamic instruction phase, assume ~50% progress for visual continuity
      const progress = phaseData.phase === 'instruction' ? 50 : (progressMap[phaseData.phase] || 0);
      progressFill.style.width = `${progress}%`;
      if (progressBar) {
        progressBar.setAttribute('aria-valuenow', String(progress));
      }
    }

    // Handle dynamic duration timer
    if (this.instructionTimer) {
      clearInterval(this.instructionTimer);
      this.instructionTimer = null;
    }

    if (countdownOverlay && countdownTimerElement) {
      if (phaseData.duration && phaseData.phase === 'instruction') {
        countdownOverlay.classList.remove('hidden');

        let secondsRemaining = Math.ceil(phaseData.duration / 1000);

        countdownTimerElement.textContent = secondsRemaining;
        this.restartCountdownAnimation(countdownTimerElement);

        this.instructionTimer = setInterval(() => {
          secondsRemaining--;
          if (secondsRemaining > 0) {
            countdownTimerElement.textContent = secondsRemaining;
            this.restartCountdownAnimation(countdownTimerElement);
          } else {
            clearInterval(this.instructionTimer);
            this.instructionTimer = null;
            countdownOverlay.classList.add('hidden');
          }
        }, 1000);
      } else {
        countdownOverlay.classList.add('hidden');
      }
    }
  }

  restartCountdownAnimation(countdownTimerElement) {
    countdownTimerElement.classList.remove('animate-pop-a', 'animate-pop-b');
    this.countdownAnimationClass =
      this.countdownAnimationClass === 'animate-pop-a' ? 'animate-pop-b' : 'animate-pop-a';
    countdownTimerElement.classList.add(this.countdownAnimationClass);
  }

  /**
   * Show device check status
   */
  showDeviceStatus(checkResult) {
    const statusBox = document.getElementById('device-status');
    const errorBox = document.getElementById('device-error');
    const continueBtn = document.getElementById('continue-verification-btn');
    const permissionsBtn = document.getElementById('request-permissions-btn');

    if (checkResult.isCompatible) {
      statusBox.innerHTML = `
        <p class="success">&#10003; Device is compatible</p>
        <p>Browser: ${checkResult.deviceInfo.browser} ${checkResult.deviceInfo.version}</p>
        <p>OS: ${checkResult.deviceInfo.os} ${checkResult.deviceInfo.version}</p>
        <p>&#10003; Camera access granted</p>
        <p>&#10003; Motion sensors accessible</p>
      `;
      statusBox.className = 'status-box success';
      errorBox.classList.add('hidden');

      if (continueBtn) {
        continueBtn.classList.remove('hidden');
      }
      if (permissionsBtn) {
        permissionsBtn.classList.add('hidden');
      }
    } else {
      statusBox.innerHTML = '<p class="error">&#10007; Device is not compatible</p>';
      statusBox.className = 'status-box error';

      errorBox.innerHTML = `
        <h3>Compatibility Issues:</h3>
        <ul>
          ${checkResult.errors.map(err => `<li>${err}</li>`).join('')}
        </ul>
      `;
      errorBox.classList.remove('hidden');

      if (continueBtn) {
        continueBtn.classList.add('hidden');
      }
      if (permissionsBtn) {
        permissionsBtn.classList.add('hidden');
      }
    }
  }

  /**
   * Show permission request button
   */
  showPermissionButton(onClickHandler) {
    const statusBox = document.getElementById('device-status');
    const permissionsBtn = document.getElementById('request-permissions-btn');

    statusBox.innerHTML = `
      <p class="info">&#10003; Device is compatible</p>
      <p>We need your permission to access:</p>
      <ul style="text-align: left; margin: 1rem auto; max-width: 300px;">
        <li>&#128247; Camera (for video recording)</li>
        <li>&#128241; Motion sensors (for fraud detection)</li>
      </ul>
      <p>Click the button below to grant permissions.</p>
    `;
    statusBox.className = 'status-box info';

    if (permissionsBtn) {
      permissionsBtn.classList.remove('hidden');
      permissionsBtn.onclick = onClickHandler;
    }
  }

  /**
   * Show verification result
   */
  showResult(result) {
    this.showPage('result');

    const iconElement = document.getElementById('result-icon');
    const titleElement = document.getElementById('result-title');
    const messageElement = document.getElementById('result-message');
    const scoreElement = document.getElementById('result-score');

    if (result.status === 'success') {
      iconElement.textContent = '\u2713';
      iconElement.className = 'result-icon success';
      titleElement.textContent = 'Verification Successful';
      messageElement.textContent = result.reasoning || 'Your video has been verified successfully.';
    } else {
      iconElement.textContent = '\u2717';
      iconElement.className = 'result-icon failed';
      titleElement.textContent = 'Verification Failed';
      messageElement.textContent = result.reasoning || 'Your video could not be verified.';
    }

    if (result.final_trust_score !== undefined) {
      scoreElement.innerHTML = `
        <div class="score-label">Trust Score</div>
        <div class="score-value">${result.final_trust_score}/100</div>
        <div class="score-note">Deep AI forensic analysis will follow shortly.</div>
      `;
    }
  }

  /**
   * Show error message
   */
  showError(error) {
    this.showPage('error');

    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = error.message || 'An unexpected error occurred.';
  }

  /**
   * Show status message
   */
  showStatusMessage(message, type = 'info') {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
      statusElement.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
      statusElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
    }
  }

  /**
   * Setup video preview
   */
  setupVideoPreview(stream) {
    const videoElement = document.getElementById('video-preview');
    if (videoElement && stream) {
      videoElement.srcObject = stream;
    }
  }

  /**
   * Setup redirect button
   */
  setupRedirectButton(returnUrl, sessionId, result) {
    const redirectBtn = document.getElementById('redirect-btn');
    if (redirectBtn) {
      if (returnUrl) {
        const url = new URL(returnUrl);
        url.searchParams.set('session_id', sessionId);
        url.searchParams.set('status', result.status);
        url.searchParams.set('trust_score', result.final_trust_score);
        if (result.correlation_value !== undefined) {
          url.searchParams.set('correlation', result.correlation_value.toFixed(3));
        }

        redirectBtn.textContent = 'Continue';
        redirectBtn.onclick = () => {
          window.location.href = url.toString();
        };
      } else {
        redirectBtn.textContent = 'Close';
        redirectBtn.onclick = () => {
          window.close();
        };
      }
      redirectBtn.classList.remove('hidden');
    }
  }
}
