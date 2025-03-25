import config from '../config';
import { refreshToken } from './authService';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000;
    this.isRefreshing = false;
    this.currentUpload = null;
  }

  async connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise(async (resolve, reject) => {
      try {
        // If token is expired, refresh it
        if (this.isTokenExpired(token)) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              const newToken = await refreshToken();
              token = newToken;
            } catch (error) {
              console.error('Token refresh failed:', error);
              this.isRefreshing = false;
              reject(error);
              return;
            }
            this.isRefreshing = false;
          } else {
            // Wait for refresh to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Use the correct WebSocket path
        this.ws = new WebSocket(`${config.wsUrl}/ws/upload?token=${token}`);

        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.handleReconnect(token);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'error' && data.message === 'Unauthorized') {
              // Token is invalid or expired
              this.handleTokenError(token);
              return;
            }
            const handler = this.messageHandlers.get(data.type);
            if (handler) {
              handler(data);
            }
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const { exp } = JSON.parse(jsonPayload);
      return exp * 1000 < Date.now();
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  async handleTokenError(token) {
    try {
      const newToken = await refreshToken();
      await this.reconnectWithNewToken(newToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.disconnect();
    }
  }

  async reconnectWithNewToken(token) {
    this.disconnect();
    await this.connect(token);
  }

  handleReconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(async () => {
        try {
          await this.connect(token);
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  off(type) {
    this.messageHandlers.delete(type);
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  async uploadPackage(file, metadata, onProgress) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    return new Promise((resolve, reject) => {
      let completed = false;
      let cancelled = false;

      const cleanup = () => {
        this.off('progress');
        this.off('error');
        this.off('completed');
        this.off('ready');
        this.currentUpload = null;
      };

      // Store cancel function in currentUpload
      this.currentUpload = {
        cancel: () => {
          if (completed) return;
          
          cancelled = true;
          cleanup();
          
          // Try to send cancel message to server
          try {
            this.send({ type: 'cancel' });
          } catch (e) {
            console.error('Error sending cancel message:', e);
          }
          
          reject(new Error('Upload cancelled by user'));
        }
      };

      this.on('progress', (data) => {
        if (cancelled) return;
        onProgress?.(data.progress, data.message);
      });

      this.on('error', (data) => {
        if (cancelled) return;
        cleanup();
        reject(new Error(data.message));
      });

      this.on('completed', (data) => {
        if (cancelled || completed) return;
        completed = true;
        cleanup();
        resolve(data.data);
      });

      this.on('ready', () => {
        if (cancelled) return;
        
        const reader = new FileReader();
        reader.onload = () => {
          if (cancelled) return;
          
          try {
            this.ws.send(reader.result);
          } catch (error) {
            cleanup();
            reject(error);
          }
        };
        reader.onerror = () => {
          if (cancelled) return;
          
          cleanup();
          reject(reader.error);
        };
        reader.readAsArrayBuffer(file);
      });

      try {
        this.send({
          name: metadata.name,
          category: metadata.category,
          version: metadata.version,
          size: file.size,
          contentType: file.type,
          extension: metadata.extension
        });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  cancelCurrentUpload() {
    if (this.currentUpload && typeof this.currentUpload.cancel === 'function') {
      this.currentUpload.cancel();
      return true;
    }
    return false;
  }

  async installPackage(s3Key, onProgress) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    return new Promise((resolve, reject) => {
      let completed = false;

      const cleanup = () => {
        this.off('progress');
        this.off('error');
        this.off('completed');
      };

      this.on('progress', (data) => {
        onProgress?.(data.progress, {
          message: data.message,
          details: data.details
        });
      });

      this.on('error', (data) => {
        cleanup();
        reject(new Error(data.message));
      });

      this.on('completed', (data) => {
        if (!completed) {
          completed = true;
          cleanup();
          resolve(data.data);
        }
      });

      try {
        this.send({
          type: 'install',
          s3Key
        });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  // Uninstallation is now handled via HTTP API

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocketService = new WebSocketService();
