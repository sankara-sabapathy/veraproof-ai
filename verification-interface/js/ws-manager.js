/**
 * WSManager - Manages WebSocket connection for real-time communication
 */
export class WSManager {
  constructor(sessionId, apiUrl) {
    this.sessionId = sessionId;
    this.apiUrl = apiUrl || this.getDefaultApiUrl();
    this.ws = null;
    this.messageCallback = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isIntentionallyClosed = false;
  }

  /**
   * Get default API URL based on environment
   */
  getDefaultApiUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // For HTTPS on port 3443, connect to HTTPS backend on port 8443
    let host;
    if (window.location.hostname === 'localhost') {
      host = 'localhost:8000';
    } else if (window.location.port === '3443') {
      // HTTPS verification interface - connect to HTTPS backend
      host = `${window.location.hostname}:8443`;
    } else {
      host = window.location.host;
    }
    
    return `${protocol}//${host}`;
  }

  /**
   * Connect to WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.apiUrl}/api/v1/ws/verify/${this.sessionId}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message.type);
            if (this.messageCallback) {
              this.messageCallback(message);
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send as binary data with type prefix
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const message = JSON.stringify({
          type: 'video_chunk',
          size: arrayBuffer.byteLength,
          timestamp: Date.now()
        });
        
        // Send metadata first, then binary data
        this.ws.send(message);
        this.ws.send(arrayBuffer);
      };
      reader.readAsArrayBuffer(blob);
    }
  }

  /**
   * Send IMU data batch
   */
  sendIMUBatch(imuDataArray) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'imu_batch',
        payload: imuDataArray,
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Register callback for server messages
   */
  onMessage(callback) {
    this.messageCallback = callback;
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
