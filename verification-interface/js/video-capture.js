/**
 * VideoCapture - Handles video recording with MediaRecorder
 */
export class VideoCapture {
  constructor(chunkInterval = 250) {
    this.chunkInterval = chunkInterval;
    this.mediaRecorder = null;
    this.stream = null;
    this.chunkCallback = null;
  }

  /**
   * Initialize camera and MediaRecorder
   */
  async initialize() {
    try {
      // Request camera access (rear camera preferred for mobile)
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for verification
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      // Create MediaRecorder with 250ms chunks
      const options = {
        mimeType: this.getSupportedMimeType(),
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && this.chunkCallback) {
          this.chunkCallback(event.data);
        }
      };

      return this.stream;
    } catch (error) {
      console.error('Camera initialization error:', error);
      throw new Error('Failed to access camera: ' + error.message);
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
   * Start recording
   */
  start() {
    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder not initialized');
    }

    // Start recording with timeslice for chunked output
    this.mediaRecorder.start(this.chunkInterval);
  }

  /**
   * Stop recording
   */
  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
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

  /**
   * Get video stream for preview
   */
  getStream() {
    return this.stream;
  }
}
