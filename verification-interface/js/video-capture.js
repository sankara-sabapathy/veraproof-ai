/**
 * VideoCapture - Handles video recording with MediaRecorder
 */
export class VideoCapture {
  constructor(chunkInterval = 250) {
    this.chunkInterval = chunkInterval;
    this.mediaRecorder = null;
    this.stream = null;
    this.chunkCallback = null;
    this.stopCallback = null;
    this._switchPromise = null; // Guards against race conditions during camera switches
  }

  /**
   * Initialize camera and MediaRecorder
   */
  async initialize(facingMode = 'user') {
    this.currentFacingMode = facingMode;
    try {
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      // Create MediaRecorder - try preferred MIME, fall back to browser default
      this.mediaRecorder = this._createRecorder(this.stream);

      return this.stream;
    } catch (error) {
      console.error('Camera initialization error:', error);
      throw new Error('Failed to access camera: ' + error.message);
    }
  }

  /**
   * Create a MediaRecorder with graceful MIME type fallback
   */
  _createRecorder(stream) {
    const mimeType = this.getSupportedMimeType();
    let recorder;

    try {
      const options = mimeType
        ? { mimeType, videoBitsPerSecond: 2500000 }
        : { videoBitsPerSecond: 2500000 };
      recorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.warn('MediaRecorder failed with mimeType', mimeType, '- falling back to default', e);
      recorder = new MediaRecorder(stream);
    }

    recorder._notifyOnStop = false;
    recorder._stopPromise = null;
    recorder._stopResolver = null;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0 && this.chunkCallback) {
        this.chunkCallback(event.data);
      }
    };

    recorder.onstop = async () => {
      // Stop only the stream bound to this specific recorder instance.
      // Using this.stream here is unsafe during camera switches because it may point
      // at a newly created stream by the time the old recorder fires onstop.
      stream.getTracks().forEach(track => track.stop());

      try {
        if (recorder._notifyOnStop && this.stopCallback) {
          await this.stopCallback();
        }
      } catch (error) {
        console.error('Recorder stop callback failed:', error);
      } finally {
        recorder._notifyOnStop = false;
        if (recorder._stopResolver) {
          recorder._stopResolver();
        }
        recorder._stopResolver = null;
        recorder._stopPromise = null;
      }
    };

    return recorder;
  }

  /**
   * Switch the active camera lens (front vs back).
   * Uses a lock (_switchPromise) so start() can safely await any in-progress switch.
   */
  async switchCamera(newFacingMode) {
    if (this.currentFacingMode === newFacingMode) return this.stream;

    const doSwitch = async () => {
      const wasRecording = this.mediaRecorder && this.mediaRecorder.state === 'recording';

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder._notifyOnStop = false;
        this.mediaRecorder.stop();
      }

      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
      }

      this.currentFacingMode = newFacingMode;
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.mediaRecorder = this._createRecorder(this.stream);

      if (wasRecording) {
        this.mediaRecorder.start(this.chunkInterval);
      }

      return this.stream;
    };

    this._switchPromise = doSwitch();
    try {
      return await this._switchPromise;
    } finally {
      this._switchPromise = null;
    }
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  getSupportedMimeType() {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Let browser choose
  }

  /**
   * Start recording (waits for any in-progress camera switch to finish first)
   */
  async start() {
    if (this._switchPromise) {
      console.log('Waiting for camera switch to finish before starting...');
      await this._switchPromise;
    }

    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder not initialized');
    }

    if (this.mediaRecorder.state === 'recording') {
      console.log('MediaRecorder already recording, skipping start()');
      return;
    }

    this.mediaRecorder.start(this.chunkInterval);
  }

  /**
   * Stop recording and resolve only after the recorder has fully finalized.
   */
  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      if (this.mediaRecorder._stopPromise) {
        return this.mediaRecorder._stopPromise;
      }

      this.mediaRecorder._notifyOnStop = true;
      this.mediaRecorder._stopPromise = new Promise((resolve) => {
        this.mediaRecorder._stopResolver = resolve;
      });
      this.mediaRecorder.stop();
      return this.mediaRecorder._stopPromise;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    return Promise.resolve();
  }

  /**
   * Register callback for video chunks
   */
  onChunk(callback) {
    this.chunkCallback = callback;
  }

  onStop(callback) {
    this.stopCallback = callback;
  }

  /**
   * Get video stream for preview
   */
  getStream() {
    return this.stream;
  }
}
