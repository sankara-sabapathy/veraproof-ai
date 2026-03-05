/**
 * ChallengeController - Controls the Pan & Return Challenge protocol
 */
export class ChallengeController {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.phaseCallback = null;
    this.currentPhase = 'idle';
    this.phaseTimers = [];
  }

  /**
   * Start the complete challenge sequence (now driven by Backend Playbook)
   */
  startChallenge() {
    this.clearTimers();
    this.currentPhase = 'listening';
    // The frontend now waits in 'listening' mode until the WebSocket receives the first payload.
    this.emitPhaseChange({
      phase: 'listening',
      title: 'Preparing Verification',
      instruction: 'Connecting to server playbook...',
      duration: 3000 // Give the UI a small buffer before first websocket ping
    });
  }

  /**
   * Execute an instruction provided dynamically by the Backend Playbook Engine over WebSocket.
   */
  executeInstruction(payload) {
    this.currentPhase = 'instruction';
    this.emitPhaseChange({
      phase: 'instruction',
      title: payload.lens === 'environment' ? 'Environment Scan' : 'Face Check',
      instruction: payload.text,
      duration: payload.duration * 1000 // Convert backend SECONDS to frontend MS
    });
  }

  /**
   * Complete challenge and wait for results
   */
  completeChallenge() {
    this.currentPhase = 'analyzing';
    this.emitPhaseChange({
      phase: 'analyzing',
      title: 'Analyzing',
      instruction: 'Please wait while we verify your video...',
      duration: null
    });
  }

  /**
   * Emit phase change event
   */
  emitPhaseChange(phaseData) {
    if (this.phaseCallback) {
      this.phaseCallback(phaseData);
    }
  }

  /**
   * Register callback for phase changes
   */
  onPhaseChange(callback) {
    this.phaseCallback = callback;
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    this.phaseTimers.forEach(timer => clearTimeout(timer));
    this.phaseTimers = [];
  }

  /**
   * Get current phase
   */
  getCurrentPhase() {
    return this.currentPhase;
  }
}
