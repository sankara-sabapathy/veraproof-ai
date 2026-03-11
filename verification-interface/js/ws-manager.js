/**
 * WSManager - Manages WebSocket connection for real-time communication
 */
export class WSManager {
  constructor(sessionId, apiUrl, wsToken = null) {
    this.sessionId = sessionId;
    this.apiUrl = apiUrl || this.getDefaultApiUrl();
    this.wsToken = wsToken;
    this.ws = null;
    this.messageCallback = null;
    this.pendingMessages = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isIntentionallyClosed = false;
    this.outboundQueue = [];

    // Recording transport state so finalization can be verified explicitly.
    this.recordingStarted = false;
    this.nextVideoChunkSequence = 0;
    this.videoChunkSequence = 0;
    this.videoBytesSent = 0;
    this.videoSendChain = Promise.resolve();
    this.recordingTransportError = null;
    this.recordingCompleteSent = false;
    this.recordingFinalizationPromise = null;
    this.recordingFinalizedResolver = null;
    this.recordingFinalizedAck = null;
  }

  /**
   * Get default API URL based on environment
   */
  getDefaultApiUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Production: Use environment variable or derive from current host
    if (window.VERAPROOF_API_URL) {
      // API URL injected during build/deployment
      return window.VERAPROOF_API_URL.replace('https:', 'wss:').replace('http:', 'ws:');
    }

    // Development: localhost detection
    let host;
    if (window.location.hostname === 'localhost' && window.location.protocol === 'https:') {
      // HTTPS localhost - connect to HTTPS backend
      host = 'localhost:8443';
    } else if (window.location.hostname === 'localhost') {
      // HTTP localhost - connect to HTTP backend
      host = 'localhost:8100';
    } else if (window.location.port === '3443') {
      // HTTPS verification interface - connect to HTTPS backend
      host = `${window.location.hostname}:8443`;
    } else if (window.location.hostname.includes('cloudfront.net') || window.location.hostname.includes('yourdomain.com')) {
      // Production CloudFront - use API subdomain or environment variable
      // This will be replaced during deployment with actual API URL
      return 'wss://api.yourdomain.com';
    } else {
      // Fallback: same host as current page
      host = window.location.host;
    }

    return `${protocol}//${host}`;
  }

  /**
   * Connect to WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const tokenQuery = this.wsToken ? `?ws_token=${encodeURIComponent(this.wsToken)}` : '';
      const wsUrl = `${this.apiUrl}/api/v1/ws/verify/${this.sessionId}${tokenQuery}`;

      console.log('Connecting to WebSocket:', wsUrl);

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.flushOutboundQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'recording_finalized') {
              this.recordingFinalizedAck = message.payload || {};
              if (this.recordingFinalizedResolver) {
                const resolveRecording = this.recordingFinalizedResolver;
                this.recordingFinalizedResolver = null;
                resolveRecording(this.recordingFinalizedAck);
              }
            }

            if (this.messageCallback) {
              this.messageCallback(message);
            } else {
              this.pendingMessages.push(message);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.error('WebSocket URL was:', wsUrl);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed. Code:', event.code, 'Reason:', event.reason);
          if (!this.isIntentionallyClosed) {
            this.handleReconnect();
          }
        };
      } catch (error) {
        console.error('WebSocket construction error:', error);
        reject(error);
      }
    });
  }

  flushOutboundQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.outboundQueue.length === 0) {
      return;
    }

    while (this.outboundQueue.length > 0) {
      this.ws.send(this.outboundQueue.shift());
    }
  }

  sendOrQueue(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
      return;
    }

    this.outboundQueue.push(payload);
  }

  sendJsonMessage(message) {
    this.sendOrQueue(JSON.stringify(message));
  }

  markRecordingStarted() {
    this.recordingStarted = true;
  }

  async blobToArrayBuffer(blob) {
    if (typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read recording chunk.'));
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      if (this.messageCallback) {
        this.messageCallback({
          type: 'error',
          payload: { message: 'Connection lost. Please refresh the page.' }
        });
      }
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      await this.connect();
    } catch (error) {
      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
    }
  }

  /**
   * Send video chunk in strict sequence order.
   */
  async sendVideoChunk(blob) {
    if (!blob || blob.size <= 0) {
      return;
    }

    this.recordingStarted = true;
    const sequence = ++this.nextVideoChunkSequence;
    const sendTask = this.videoSendChain
      .catch(() => undefined)
      .then(async () => {
        const arrayBuffer = await this.blobToArrayBuffer(blob);
        this.videoChunkSequence = Math.max(this.videoChunkSequence, sequence);
        this.videoBytesSent += arrayBuffer.byteLength;

        this.sendJsonMessage({
          type: 'video_chunk',
          payload: {
            sequence,
            size: arrayBuffer.byteLength,
            timestamp: Date.now()
          }
        });
        this.sendOrQueue(arrayBuffer);
      });

    this.videoSendChain = sendTask.catch((error) => {
      this.recordingTransportError = error;
      console.error('Failed to send video chunk:', error);
    });

    return sendTask;
  }

  async finalizeRecording(timeoutMs = 4000) {
    if (this.recordingFinalizedAck) {
      return { acknowledged: true, payload: this.recordingFinalizedAck };
    }

    if (this.recordingFinalizationPromise) {
      return this.recordingFinalizationPromise;
    }

    await this.videoSendChain;

    if (this.recordingTransportError) {
      console.error('Video transport encountered an error before finalization:', this.recordingTransportError);
    }

    this.recordingCompleteSent = true;
    this.recordingFinalizationPromise = new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = window.setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        this.recordingFinalizedResolver = null;
        console.warn('Timed out waiting for backend recording finalization acknowledgement.');
        resolve({ acknowledged: false, payload: null });
      }, timeoutMs);

      this.recordingFinalizedResolver = (payload) => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeoutHandle);
        resolve({ acknowledged: true, payload: payload || {} });
      };

      this.sendJsonMessage({
        type: 'recording_complete',
        payload: {
          chunk_count: this.videoChunkSequence,
          byte_count: this.videoBytesSent,
          last_sequence: this.videoChunkSequence,
          timestamp: Date.now()
        }
      });
    });

    return this.recordingFinalizationPromise;
  }

  hasPendingRecordingTransport() {
    return (this.recordingStarted || this.videoChunkSequence > 0 || this.recordingCompleteSent) && !this.recordingFinalizedAck;
  }

  /**
   * Send IMU data batch
   */
  sendIMUBatch(imuDataArray) {
    const message = {
      type: 'imu_batch',
      payload: imuDataArray,
      timestamp: Date.now()
    };
    this.sendJsonMessage(message);
  }

  /**
   * Register callback for server messages
   */
  onMessage(callback) {
    this.messageCallback = callback;

    if (this.pendingMessages.length > 0) {
      const queuedMessages = [...this.pendingMessages];
      this.pendingMessages = [];
      queuedMessages.forEach((message) => this.messageCallback(message));
    }
  }

  /**
   * Close WebSocket connection
   */
  close() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
    }
  }
}
