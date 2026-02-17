/**
 * Main entry point for VeraProof AI Verification Interface
 */
import { DeviceDetector } from './device-detector.js?v=9';
import { VideoCapture } from './video-capture.js?v=9';
import { IMUCollector } from './imu-collector.js?v=9';
import { WSManager } from './ws-manager.js?v=9';
import { ChallengeController } from './challenge-controller.js?v=9';
import { UIController } from './ui-controller.js?v=9';

class VerificationApp {
  constructor() {
    this.ui = new UIController();
    this.videoCapture = null;
    this.imuCollector = null;
    this.wsManager = null;
    this.challengeController = null;
    this.sessionId = null;
    this.returnUrl = null;
    this.imuBuffer = [];
    this.imuBatchSize = 10; // Send IMU data in batches of 10 samples
  }

  /**
   * Initialize the application
   */
  async init() {
    // Extract session_id and return_url from URL params
    const params = new URLSearchParams(window.location.search);
    this.sessionId = params.get('session_id');
    this.returnUrl = params.get('return_url');

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
    const partnerLink = document.getElementById('partner-login-link');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.ui.showError({
          message: 'Please access this page through a partner verification link.'
        });
      });
    }

    if (partnerLink) {
      partnerLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Redirect to partner dashboard (to be implemented)
        window.location.href = '/partner-dashboard';
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
   * Request permissions and continue if granted
   */
  async requestPermissionsAndContinue() {
    try {
      this.ui.showStatusMessage('Requesting permissions...', 'info');

      // Perform full device check (this will request permissions)
      const checkResult = await DeviceDetector.performDeviceCheck();
      this.ui.showDeviceStatus(checkResult);

      if (!checkResult.isCompatible) {
        return;
      }

      // Permissions granted, continue
      this.ui.showStatusMessage('Permissions granted! Starting verification...', 'success');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Initialize components
      await this.initializeComponents();

      // Start verification
      await this.runVerification();
    } catch (error) {
      console.error('Permission request error:', error);
      this.ui.showError({ message: `Permission error: ${error.message}` });
    }
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    // Initialize video capture
    this.videoCapture = new VideoCapture(250); // 250ms chunks
    const stream = await this.videoCapture.initialize();
    this.ui.setupVideoPreview(stream);

    // Initialize IMU collector
    this.imuCollector = new IMUCollector(60); // 60Hz sampling

    // Initialize WebSocket manager
    this.wsManager = new WSManager(this.sessionId);
    await this.wsManager.connect();

    // Initialize challenge controller
    this.challengeController = new ChallengeController(this.wsManager);

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Handle video chunks
    this.videoCapture.onChunk((blob) => {
      this.wsManager.sendVideoChunk(blob);
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

      case 'phase_change':
        // Server can override phase changes if needed
        this.ui.showInstructions(message.payload);
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

      // Start video recording
      this.videoCapture.start();

      // Start IMU collection
      this.imuCollector.start();

      // Start challenge sequence
      this.challengeController.startChallenge();
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
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    this.stopRecording();

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
