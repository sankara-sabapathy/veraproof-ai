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
   * Start the complete challenge sequence
   */
  startChallenge() {
    this.clearTimers();
    this.startBaseline();
  }

  /**
   * Phase 1: Baseline (1 second static hold)
   */
  startBaseline() {
    this.currentPhase = 'baseline';
    this.emitPhaseChange({
      phase: 'baseline',
      title: 'Hold Still',
      instruction: 'Keep your phone steady for 1 second',
      duration: 1000
    });

    const timer = setTimeout(() => {
      // Notify backend that baseline is complete
      this.wsManager.ws.send(JSON.stringify({
        type: 'phase_complete',
        payload: { phase: 'baseline' }
      }));
      this.startPan();
    }, 1000);
    
    this.phaseTimers.push(timer);
  }

  /**
   * Phase 2: Pan (tilt phone right)
   */
  startPan() {
    this.currentPhase = 'pan';
    this.emitPhaseChange({
      phase: 'pan',
      title: 'Tilt Right',
      instruction: 'Slowly tilt your phone to the right',
      duration: 2000
    });

    const timer = setTimeout(() => {
      // Notify backend that pan is complete
      this.wsManager.ws.send(JSON.stringify({
        type: 'phase_complete',
        payload: { phase: 'pan' }
      }));
      this.startReturn();
    }, 2000);
    
    this.phaseTimers.push(timer);
  }

  /**
   * Phase 3: Return (return to center)
   */
  startReturn() {
    this.currentPhase = 'return';
    this.emitPhaseChange({
      phase: 'return',
      title: 'Return to Center',
      instruction: 'Slowly return your phone to the center position',
      duration: 2000
    });

    const timer = setTimeout(() => {
      // Notify backend that return is complete
      this.wsManager.ws.send(JSON.stringify({
        type: 'phase_complete',
        payload: { phase: 'return' }
      }));
      this.completeChallenge();
    }, 2000);
    
    this.phaseTimers.push(timer);
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
