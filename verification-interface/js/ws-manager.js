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
      const tokenQuery = this.wsToken ? `?ws_token=${encodeURIComponent(this.wsToken)}` : "";
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
            // Hide standard instruction logs from console output
            if (message.type !== 'instruction' && message.type !== 'branding') {
              // console.log('WebSocket message received:', message.type);
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
   * Send video chunk
   */
  sendVideoChunk(blob) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      const message = JSON.stringify({
        type: 'video_chunk',
        size: arrayBuffer.byteLength,
        timestamp: Date.now()
      });

      // Preserve ordering even if recording begins before the socket is ready.
      this.sendOrQueue(message);
      this.sendOrQueue(arrayBuffer);
    };
    reader.readAsArrayBuffer(blob);
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

