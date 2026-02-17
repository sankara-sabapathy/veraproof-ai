/**
 * DeviceDetector - Detects device type and sensor capabilities
 */
export class DeviceDetector {
  /**
   * Check if device is desktop/laptop
   */
  static isDesktop() {
    // TEMPORARILY DISABLED FOR TESTING
    return false;
    
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
    
    // Block desktop and tablets (tablets often lack proper IMU)
    return !isMobile || isTablet;
  }

  /**
   * Check if device has sensor support
   */
  static async hasSensorSupport() {
    // Check if DeviceMotionEvent exists
    if (!window.DeviceMotionEvent) {
      return false;
    }

    // For iOS 13+, need to request permission
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Sensor permission error:', error);
        return false;
      }
    }

    // For Android and older iOS, check if event fires
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('devicemotion', handler);
        resolve(false);
      }, 1000);

      const handler = (event) => {
        clearTimeout(timeout);
        window.removeEventListener('devicemotion', handler);
        resolve(event.acceleration !== null || event.rotationRate !== null);
      };

      window.addEventListener('devicemotion', handler);
    });
  }

  /**
   * Get browser information
   */
  static getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (ua.includes('Chrome')) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    }

    return { browser, version };
  }

  /**
   * Get OS version
   */
  static getOSVersion() {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let version = 'Unknown';

    if (/android/i.test(ua)) {
      os = 'Android';
      version = ua.match(/Android (\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = 'iOS';
      version = ua.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || 'Unknown';
    }

    return { os, version };
  }

  /**
   * Check camera access by requesting permission
   */
  static async hasCameraAccess() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { hasAccess: false, error: 'Camera API not supported' };
    }

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      
      return { hasAccess: true, error: null };
    } catch (error) {
      console.error('Camera permission error:', error);
      return { 
        hasAccess: false, 
        error: error.name === 'NotAllowedError' 
          ? 'Camera permission denied' 
          : 'Camera not available'
      };
    }
  }

  /**
   * Perform complete device check
   */
  static async performDeviceCheck() {
    const errors = [];

    // Check if desktop
    if (this.isDesktop()) {
      errors.push('Desktop/laptop devices are not supported. Please use a mobile phone.');
    }

    // Check camera support and request permission
    const cameraCheck = await this.hasCameraAccess();
    if (!cameraCheck.hasAccess) {
      errors.push(`Camera access required: ${cameraCheck.error}`);
    }

    // Check sensor support (this will request permission on iOS 13+)
    const hasSensors = await this.hasSensorSupport();
    if (!hasSensors) {
      errors.push('Motion sensor access required. Please grant permission when prompted.');
    }

    const browserInfo = this.getBrowserInfo();
    const osInfo = this.getOSVersion();

    return {
      isCompatible: errors.length === 0,
      errors,
      deviceInfo: {
        ...browserInfo,
        ...osInfo,
        userAgent: navigator.userAgent
      }
    };
  }
}
