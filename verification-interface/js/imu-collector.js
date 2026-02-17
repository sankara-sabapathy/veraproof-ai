/**
 * IMUCollector - Collects IMU data from DeviceMotionEvent at 60Hz
 */
export class IMUCollector {
  constructor(samplingRate = 60) {
    this.samplingRate = samplingRate;
    this.samplingInterval = 1000 / samplingRate; // ~16.67ms for 60Hz
    this.isCollecting = false;
    this.dataCallback = null;
    this.lastSampleTime = 0;
    this.handler = null;
    this.permissionGranted = false;
  }

  /**
   * Request motion sensor permission (iOS 13+)
   */
  async requestPermission() {
    // Check if permission API exists (iOS 13+)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        console.log('Requesting DeviceMotion permission...');
        const permission = await DeviceMotionEvent.requestPermission();
        this.permissionGranted = permission === 'granted';
        console.log('DeviceMotion permission:', permission);
        return this.permissionGranted;
      } catch (error) {
        console.error('Permission request error:', error);
        return false;
      }
    } else {
      // Android or older iOS - permission not needed
      console.log('DeviceMotion permission not required');
      this.permissionGranted = true;
      return true;
    }
  }

  /**
   * Start collecting IMU data
   */
  async start() {
    if (this.isCollecting) {
      console.log('IMU collector already running');
      return;
    }

    // Request permission if needed
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.error('Motion sensor permission denied');
        throw new Error('Motion sensor permission denied');
      }
    }

    console.log('Starting IMU collection at', this.samplingRate, 'Hz');
    this.isCollecting = true;
    this.lastSampleTime = Date.now();

    let eventCount = 0;

    this.handler = (event) => {
      if (!this.isCollecting) {
        return;
      }

      eventCount++;
      
      // Log first few events for debugging
      if (eventCount <= 3) {
        console.log('DeviceMotion event #' + eventCount + ':', {
          acceleration: event.acceleration,
          rotationRate: event.rotationRate,
          interval: event.interval
        });
      }

      const now = Date.now();
      
      // Throttle to target sampling rate
      if (now - this.lastSampleTime < this.samplingInterval) {
        return;
      }

      this.lastSampleTime = now;

      // Extract IMU data
      const imuData = {
        timestamp: now,
        acceleration: {
          x: event.acceleration?.x || 0,
          y: event.acceleration?.y || 0,
          z: event.acceleration?.z || 0
        },
        accelerationIncludingGravity: {
          x: event.accelerationIncludingGravity?.x || 0,
          y: event.accelerationIncludingGravity?.y || 0,
          z: event.accelerationIncludingGravity?.z || 0
        },
        rotationRate: {
          alpha: event.rotationRate?.alpha || 0,
          beta: event.rotationRate?.beta || 0,
          gamma: event.rotationRate?.gamma || 0
        },
        interval: event.interval || this.samplingInterval
      };

      if (this.dataCallback) {
        this.dataCallback(imuData);
      }
    };

    window.addEventListener('devicemotion', this.handler);
    
    // Check if events are firing
    setTimeout(() => {
      if (eventCount === 0) {
        console.error('No DeviceMotion events received after 2 seconds!');
        console.error('Device may not support motion sensors or permission was denied');
      } else {
        console.log('IMU collector working:', eventCount, 'events received');
      }
    }, 2000);
  }

  /**
   * Stop collecting IMU data
   */
  stop() {
    console.log('Stopping IMU collection');
    this.isCollecting = false;
    if (this.handler) {
      window.removeEventListener('devicemotion', this.handler);
      this.handler = null;
    }
  }

  /**
   * Register callback for IMU data
   */
  onData(callback) {
    this.dataCallback = callback;
  }
}
