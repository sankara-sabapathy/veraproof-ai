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

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0 && this.chunkCallback) {
        this.chunkCallback(event.data);
      }
    };

    recorder.onstop = () => {
      if (recorder._notifyOnStop && this.stopCallback) {
        this.stopCallback();
      }
      recorder._notifyOnStop = false;
    };

    return recorder;
  }

  /**
   * Switch the active camera lens (front vs back).
   * Uses a lock (_switchPromise) so start() can safely await any in-progress switch.
   */
  async switchCamera(newFacingMode) {
    if (this.currentFacingMode === newFacingMode) return this.stream;

    // Create a new switch promise that start() can await
    const doSwitch = async () => {
      // 1. Check if recording was active
      const wasRecording = this.mediaRecorder && this.mediaRecorder.state === 'recording';

      // 2. Stop the old MediaRecorder cleanly
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder._notifyOnStop = false;
        this.mediaRecorder.stop();
      }

      // 3. Tear down the old hardware tracks
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
      }

      // 4. Boot up the new hardware lens
      this.currentFacingMode = newFacingMode;
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      // 5. Recreate the MediaRecorder with the new stream
      this.mediaRecorder = this._createRecorder(this.stream);

      // 6. Resume recording if it was previously active
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
    // Wait for any ongoing camera switch to complete
    if (this._switchPromise) {
      console.log('Waiting for camera switch to finish before starting...');
      await this._switchPromise;
    }

    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder not initialized');
    }

    // Idempotent: skip if already recording (e.g. camera switch started it early)
    if (this.mediaRecorder.state === 'recording') {
      console.log('MediaRecorder already recording, skipping start()');
      return;
    }

    // Start recording with timeslice for chunked output
    this.mediaRecorder.start(this.chunkInterval);
  }

  /**
   * Stop recording
   */
  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder._notifyOnStop = true;
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
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

