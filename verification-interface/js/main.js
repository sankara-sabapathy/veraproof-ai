/**
 * Main entry point for VeraProof AI Verification Interface
 */
import { DeviceDetector } from './device-detector.js?v=13';
import { VideoCapture } from './video-capture.js?v=13';
import { IMUCollector } from './imu-collector.js?v=13';
import { WSManager } from './ws-manager.js?v=13';
import { ChallengeController } from './challenge-controller.js?v=13';
import { UIController } from './ui-controller.js?v=16';

class VerificationApp {
  constructor() {
    this.ui = new UIController();
    this.videoCapture = null;
    this.imuCollector = null;
    this.wsManager = null;
    this.challengeController = null;
    this.sessionId = null;
    this.returnUrl = null;
    this.wsToken = null;
    this.imuBuffer = [];
    this.imuBatchSize = 10; // Send IMU data in batches of 10 samples
    this.consentDialogCleanup = null;
    this.lastFocusedElement = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    // Extract session_id and return_url from URL params
    const params = new URLSearchParams(window.location.search);
    this.sessionId = params.get('session_id');
    this.returnUrl = params.get('return_url');
    this.wsToken = params.get('ws_token');

    // If no session_id, show landing page
    if (!this.sessionId) {
      this.setupLandingPage();
      return;
    }

    // Start verification flow
    await this.startVerification();
  }

  /**
   * Setup landing page event listeners
   */
  setupLandingPage() {
    const startBtn = document.getElementById('start-verification-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.ui.showError({
          message: 'Please access this page through a partner verification link.'
        });
      });
    }
  }

  /**
   * Start verification flow
   */
  async startVerification() {
    try {
      // Show device check page
      this.ui.showPage('deviceCheck');

      // Perform initial device compatibility check (without requesting permissions yet)
      const initialCheck = await this.performInitialCheck();

      if (!initialCheck.canProceed) {
        this.ui.showDeviceStatus(initialCheck.result);
        return;
      }

      // Show button to request permissions
      this.ui.showPermissionButton(() => this.requestPermissionsAndContinue());

    } catch (error) {
      console.error('Verification error:', error);
      this.ui.showError({ message: error.message });
    }
  }

  /**
   * Perform initial check without requesting permissions
   */
  async performInitialCheck() {
    const errors = [];

    // Check if desktop
    if (DeviceDetector.isDesktop()) {
      errors.push('Desktop/laptop devices are not supported. Please use a mobile phone.');
      return {
        canProceed: false,
        result: {
          isCompatible: false,
          errors,
          deviceInfo: DeviceDetector.getBrowserInfo()
        }
      };
    }

    // Check if APIs exist
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      errors.push('Your browser does not support camera access.');
    }

    if (!window.DeviceMotionEvent) {
      errors.push('Your device does not support motion sensors.');
    }

    if (errors.length > 0) {
      return {
        canProceed: false,
        result: {
          isCompatible: false,
          errors,
          deviceInfo: DeviceDetector.getBrowserInfo()
        }
      };
    }

    return { canProceed: true };
  }

  /**
   * Keep background content out of keyboard/screen-reader flow while dialog is open.
   */
  setAppInertState(modalOpen) {
    const app = document.getElementById('app');
    const modal = document.getElementById('consent-modal');

    if (!app || !modal) return;

    const modalHost = modal.parentElement;
    const modalPage = modal.closest('.page');

    Array.from(app.children).forEach((child) => {
      if (modalOpen) {
        if (child === modalPage) {
          child.removeAttribute('aria-hidden');
          child.removeAttribute('inert');
        } else {
          child.setAttribute('aria-hidden', 'true');
          child.setAttribute('inert', '');
        }
      } else {
        child.removeAttribute('aria-hidden');
        child.removeAttribute('inert');
      }
    });

    if (!modalHost) return;

    Array.from(modalHost.children).forEach((child) => {
      if (child === modal) return;

      if (modalOpen) {
        child.setAttribute('aria-hidden', 'true');
        child.setAttribute('inert', '');
      } else {
        child.removeAttribute('aria-hidden');
        child.removeAttribute('inert');
      }
    });
  }

  /**
   * Open consent dialog with focus trapping.
   */
  openConsentDialog() {
    const consentModal = document.getElementById('consent-modal');
    const agreeBtn = document.getElementById('consent-agree-btn');
    const declineBtn = document.getElementById('consent-decline-btn');

    if (!consentModal || !agreeBtn || !declineBtn) {
      return Promise.reject(new Error('Consent dialog is unavailable.'));
    }

    this.lastFocusedElement = document.activeElement;
    consentModal.classList.remove('hidden');
    this.setAppInertState(true);

    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusable = () => Array.from(consentModal.querySelectorAll(focusableSelector));

    const cleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
      agreeBtn.removeEventListener('click', onAgree);
      declineBtn.removeEventListener('click', onDecline);
      consentModal.classList.add('hidden');
      this.setAppInertState(false);
      this.consentDialogCleanup = null;

      if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        this.lastFocusedElement.focus();
      }
    };

    const onAgree = () => {
      cleanup();
      resolvePromise(true);
    };

    const onDecline = () => {
      cleanup();
      rejectPromise(new Error('User declined privacy consent.'));
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDecline();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    let resolvePromise;
    let rejectPromise;

    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    document.addEventListener('keydown', onKeyDown);
    agreeBtn.addEventListener('click', onAgree);
    declineBtn.addEventListener('click', onDecline);

    this.consentDialogCleanup = cleanup;

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      consentModal.focus();
    }

    return promise;
  }

  /**
   * Request permissions, display explicit consent, and continue if granted
   */
  async requestPermissionsAndContinue() {
    try {
      this.ui.showStatusMessage('Requesting permissions...', 'info');

      // Perform full device check (this will request camera/motion permissions)
      const checkResult = await DeviceDetector.performDeviceCheck();
      this.ui.showDeviceStatus(checkResult);

      if (!checkResult.isCompatible) {
        return;
      }

      // Hide permission button and display Consent Modal
      document.getElementById('request-permissions-btn').classList.add('hidden');

      const userConsent = await this.openConsentDialog();

      if (userConsent) {
        this.ui.showStatusMessage('Consent granted! Starting verification...', 'success');

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Initialize components and boot the camera tracks
        const initSuccess = await this.initializeComponents();
        if (!initSuccess) {
          return; // Halt if initialization failed. The user has been shown a retry prompt.
        }

        // Start verification playbook
        await this.runVerification();
      }
    } catch (error) {
      console.error('Permission / Consent error:', error);
      this.ui.showError({ message: error.message });
      // Redirect to partner dashboard after 3 seconds on decline
      setTimeout(() => {
        window.location.href = this.returnUrl ? this.returnUrl : '/';
      }, 3000);
    }
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    try {
      // Initialize video capture
      this.videoCapture = new VideoCapture(250); // 250ms chunks
      const stream = await this.videoCapture.initialize();
      this.ui.setupVideoPreview(stream);

      // Initialize IMU collector
      this.imuCollector = new IMUCollector(60); // 60Hz sampling

      // Initialize WebSocket manager
      this.wsManager = new WSManager(this.sessionId, undefined, this.wsToken);

      // Test backend connection first (for self-signed cert acceptance)
      await this.testBackendConnection();

      // Initialize challenge controller before the websocket connects so
      // incoming playbook messages always have a live handler target.
      this.challengeController = new ChallengeController(this.wsManager);

      // Setup event handlers before the websocket connects. The backend starts
      // the playbook immediately after connect, so the UI must already be listening.
      this.setupEventHandlers();

      return true;
    } catch (error) {
      console.error('Component initialization error:', error);

      // Check if it's a certificate/connection error
      if (error.message.includes('WebSocket') || error.message.includes('certificate') || error.message.includes('connection') || error.message.includes('Cannot connect')) {
        this.ui.showError({
          message: 'Connection failed. Please ensure you have accepted the security certificate. Click "Try Again" and accept any certificate warnings.',
          showRetry: true
        });
      } else {
        this.ui.showError({ message: error.message });
      }

      return false;
    }
  }

  /**
   * Test backend connection (helps with self-signed cert acceptance)
   * Only runs in development (localhost)
   */
  async testBackendConnection() {
    // Skip certificate check in production
    const isLocalDev = window.location.hostname === 'localhost' ||
      window.location.port === '3443' ||
      window.location.hostname.match(/^(192|172|10)\./);

    if (!isLocalDev) {
      console.log('Production environment detected, skipping certificate check');
      return;
    }

    const apiUrl = this.wsManager.apiUrl;
    const healthUrl = `${apiUrl.replace('wss:', 'https:').replace('ws:', 'http:')}/health`;

    try {
      const response = await fetch(healthUrl, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error('Backend health check failed');
      }

      console.log('Backend connection test successful');
    } catch (error) {
      console.error('Backend connection test failed:', error);

      // Only redirect to cert helper in local development
      if (isLocalDev) {
        const params = new URLSearchParams(window.location.search);
        params.set('health_url', healthUrl);
        window.location.href = `/cert-helper.html?${params.toString()}`;
        throw new Error('Redirecting to certificate setup...');
      } else {
        // In production, throw a more helpful error
        throw new Error('Cannot connect to backend server. Please check your network connection and try again.');
      }
    }
  }

  async renderInstruction(message) {
    const lens = message.payload?.lens;

    if (lens) {
      try {
        const newStream = await this.videoCapture.switchCamera(lens);
        if (newStream) {
          this.ui.setupVideoPreview(newStream);
        }
      } catch (error) {
        console.warn(`Camera switch to ${lens} failed; continuing with current stream.`, error);
        this.ui.showStatusMessage('Camera switch was unavailable on this device. Continuing verification.', 'info');
      }
    }

    this.challengeController.executeInstruction(message.payload);

    if (this.wsManager?.ws?.readyState === WebSocket.OPEN) {
      this.wsManager.ws.send(JSON.stringify({ type: 'instruction_acknowledged' }));
    }
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Handle video chunks
    this.videoCapture.onChunk((blob) => {
      this.wsManager.sendVideoChunk(blob);
    });

    this.videoCapture.onStop(() => {
      this.wsManager.sendJsonMessage({
        type: 'recording_complete',
        timestamp: Date.now()
      });
    });

    // Handle IMU data
    this.imuCollector.onData((imuData) => {
      this.imuBuffer.push(imuData);

      // Send in batches
      if (this.imuBuffer.length >= this.imuBatchSize) {
        this.wsManager.sendIMUBatch(this.imuBuffer);
        this.imuBuffer = [];
      }
    });

    // Handle phase changes
    this.challengeController.onPhaseChange((phaseData) => {
      this.ui.showInstructions(phaseData);
    });

    // Handle WebSocket messages
    this.wsManager.onMessage((message) => {
      this.handleServerMessage(message);
    });

    // Setup retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  /**
   * Handle messages from server
   */
  handleServerMessage(message) {
    switch (message.type) {
      case 'branding':
        this.ui.applyBranding(message.payload);
        break;

      case 'playbook_started':
        this.ui.startRecordingTimer(message.payload?.session_duration || 15);
        break;

      case 'instruction':
        // A single instruction payload from the Playbook.
        // Render the instruction even if camera switching fails on the device.
        if (message.payload) {
          this.renderInstruction(message);
        }
        break;

      case 'phase_change':
        // Phase change is informational - update the UI but do NOT stop recording
        if (message.payload) {
          this.challengeController.emitPhaseChange(message.payload);
        }
        break;

      case 'result':
        this.handleVerificationResult(message.payload);
        break;

      case 'error':
        this.handleVerificationError(message.payload);
        break;

      case 'status':
        this.ui.showStatusMessage(message.payload.message, message.payload.type || 'info');
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Run the verification process
   */
  async runVerification() {
    try {
      // Show verification page
      this.ui.showPage('verification');

      // Wait a moment for UI to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      this.ui.showInstructions({
        title: 'Get Ready',
        instruction: 'Recording will begin after the countdown completes.',
        phase: 'baseline'
      });

      await this.ui.runPreparationCountdown(5);

      // Start the video pipeline recording the blob (async: waits for any pending camera switch)
      await this.videoCapture.start();

      // Start IMU loop
      this.imuCollector.start();

      // Enter waiting mode before opening the websocket so the first
      // backend playbook instruction lands on a ready verification interface.
      this.challengeController.startChallenge();

      await this.wsManager.connect();

    } catch (error) {
      console.error('Verification run error:', error);
      this.ui.showError({ message: error.message });
    }
  }


  /**
   * Handle verification result
   */
  handleVerificationResult(result) {
    // Stop recording
    this.stopRecording();

    // Flush remaining IMU data
    if (this.imuBuffer.length > 0) {
      this.wsManager.sendIMUBatch(this.imuBuffer);
      this.imuBuffer = [];
    }

    // Show result
    this.ui.showResult(result);

    // Setup redirect button with session ID and results
    this.ui.setupRedirectButton(this.returnUrl, this.sessionId, result);
  }

  /**
   * Handle verification error
   */
  handleVerificationError(error) {
    // Stop recording
    this.stopRecording();

    // Show error
    this.ui.showError(error);
  }

  /**
   * Stop all recording
   */
  stopRecording() {
    if (this.videoCapture) {
      this.videoCapture.stop();
    }

    if (this.imuCollector) {
      this.imuCollector.stop();
    }

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
    }

    this.ui.stopPreparationCountdown();
    this.ui.stopRecordingTimer();
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    this.stopRecording();

    if (this.consentDialogCleanup) {
      this.consentDialogCleanup();
    }

    if (this.wsManager) {
      this.wsManager.close();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new VerificationApp();
  await app.init();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    app.cleanup();
  });
});

