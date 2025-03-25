import config from '../config';
import authService from '../api/authService';

class SoftwareService {
  async makeRequest(endpoint, options = {}) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${config.apiUrl}/api/software/${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      return response;
    } catch (error) {
      console.error(`Software service error (${endpoint}):`, error);
      throw error;
    }
  }

  async scanInstalledSoftware() {
    try {
      const response = await this.makeRequest('scan', {
        method: 'POST'
      });

      const data = await response.json();
      return data.installedApps || [];
    } catch (error) {
      throw new Error('Failed to scan installed software: ' + error.message);
    }
  }

  async installSoftware(name, onProgress) {
    try {
      console.log(`[INSTALL] Starting installation of: ${name}`);
      
      // Log the request details
      console.log(`[INSTALL] Making API request to install ${name}`);
      
      const response = await this.makeRequest('install', {
        method: 'POST',
        body: JSON.stringify({ s3Key: name })
      });
      
      console.log(`[INSTALL] API request successful, status: ${response.status}`);
      console.log(`[INSTALL] Content-Type: ${response.headers.get('content-type')}`);
      
      // Log the response headers for debugging
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('[INSTALL] Response headers:', headers);
      
      // Handle the SSE response with detailed logging
      console.log('[INSTALL] Starting SSE response handling');
      return this.handleSSEResponse(response, (data) => {
        console.log(`[INSTALL] Progress update: ${JSON.stringify(data)}`);
        onProgress?.(data);
      });
    } catch (error) {
      // Log the error details
      console.error('[INSTALL] Installation error:', error);
      console.error('[INSTALL] Error stack:', error.stack);
      
      // Map error types to user-friendly messages
      const errorMessages = {
        'PERMISSION_DENIED': 'Permission denied. Please check your permissions.',
        'FILE_NOT_FOUND': 'Installation file not found.',
        'PROCESS_RUNNING': 'Application is currently running. Please close it and try again.',
        'OPERATION_CANCELLED': 'Installation was cancelled.',
        'INVALID_PACKAGE': 'Invalid installation package.',
        'UNKNOWN': 'An unknown error occurred during installation.',
        'TIMEOUT_ERROR': 'The installation timed out. This may be due to a large package or network issues.'
      };

      const userMessage = errorMessages[error.message] || error.message;
      console.error(`[INSTALL] Throwing user-friendly error: ${userMessage}`);
      throw new Error(userMessage);
    }
  }

  async uninstallSoftware(name, onProgress) {
    try {
      console.log('Using HTTP API for uninstallation of:', name);
      
      // Special case for GitHub Desktop
      let s3Key = name;
      if (typeof name === 'string' && name.toLowerCase().includes('github')) {
        console.log('Special handling for GitHub Desktop');
        // Try to find GitHub Desktop in the Applications folder
        try {
          // First try to uninstall using the actual app name
          const response = await this.makeRequest('uninstall', {
            method: 'POST',
            body: JSON.stringify({ s3Key: 'GitHub Desktop' })
          });
          
          return this.handleSSEResponse(response, onProgress);
        } catch (error) {
          console.error('Failed with GitHub Desktop name, trying GitHubDesktop:', error);
          // If that fails, try with GitHubDesktop (no space)
          const response = await this.makeRequest('uninstall', {
            method: 'POST',
            body: JSON.stringify({ s3Key: 'GitHubDesktop' })
          });
          
          return this.handleSSEResponse(response, onProgress);
        }
      }
      
      // For all other applications
      const response = await this.makeRequest('uninstall', {
        method: 'POST',
        body: JSON.stringify({ s3Key })
      });
      
      return this.handleSSEResponse(response, onProgress);
    } catch (error) {
      // Map error types to user-friendly messages
      const errorMessages = {
        'PERMISSION_DENIED': 'Permission denied. Please check your permissions.',
        'FILE_NOT_FOUND': 'Application not found. It may have been already uninstalled.',
        'PROCESS_RUNNING': 'Application is currently running. Please close it and try again.',
        'OPERATION_CANCELLED': 'Uninstallation was cancelled.',
        'UNKNOWN': 'An unknown error occurred during uninstallation.'
      };

      throw new Error(errorMessages[error.message] || error.message);
    }
  }
  
  // Helper method to handle SSE responses
  async handleSSEResponse(response, onProgress) {
    console.log('[SSE] Starting SSE response handling');
    
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('[SSE] Content-Type is text/event-stream, setting up reader');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';
      let chunkCount = 0;

      try {
        while (true) {
          console.log('[SSE] Reading next chunk...');
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('[SSE] Reader done, breaking loop');
            break;
          }
          
          chunkCount++;
          console.log(`[SSE] Received chunk #${chunkCount}, size: ${value?.length || 0} bytes`);
          
          // Decode the chunk and add it to our buffer
          const text = decoder.decode(value, { stream: true });
          lineBuffer += text;
          console.log(`[SSE] Decoded text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
          
          // Split the buffer by newlines
          const lines = lineBuffer.split('\n');
          
          // The last line might be incomplete, so we keep it in the buffer
          lineBuffer = lines.pop() || '';
          
          console.log(`[SSE] Processing ${lines.length} lines, buffer remaining: ${lineBuffer.length} chars`);
          
          for (const line of lines) {
            console.log(`[SSE] Processing line: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
            
            if (line.startsWith('data: ')) {
              console.log('[SSE] Line is a data event, parsing JSON');
              try {
                const jsonStr = line.slice(6);
                console.log(`[SSE] JSON string: ${jsonStr.substring(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);
                
                const data = JSON.parse(jsonStr);
                console.log('[SSE] Data parsed successfully:', data);

                if (data.status === 'error') {
                  console.error('[SSE] Error status received:', data.message);
                  throw new Error(data.message || 'Operation failed');
                }

                console.log('[SSE] Calling progress callback with data');
                onProgress?.(data);

                if (data.status === 'completed') {
                  console.log('[SSE] Completed status received, returning true');
                  return true;
                }
              } catch (e) {
                console.error('[SSE] Error parsing SSE data:', e);
                console.error('[SSE] Problematic line:', line);
                
                if (e.message !== 'Operation failed') {
                  // Continue processing if it's just a JSON parse error
                  console.log('[SSE] Continuing despite parse error');
                  continue;
                }
                
                console.error('[SSE] Throwing error from SSE data');
                throw e;
              }
            } else if (line.startsWith(':')) {
              console.log('[SSE] Received keepalive ping');
            } else if (line.trim() !== '') {
              console.log(`[SSE] Received unknown line format: ${line}`);
            }
          }
        }
      } catch (error) {
        console.error('[SSE] SSE processing error:', error);
        console.error('[SSE] Error stack:', error.stack);
        throw error;
      } finally {
        console.log('[SSE] SSE processing completed');
      }
    } else {
      console.log('[SSE] Response is not SSE, content-type:', response.headers.get('content-type'));
    }

    console.log('[SSE] Returning true from handleSSEResponse');
    return true;
  }

  async checkSoftwareUpdates() {
    try {
      const response = await this.makeRequest('check-updates', {
        method: 'POST'
      });

      const data = await response.json();
      return data.updates || [];
    } catch (error) {
      throw new Error('Failed to check for updates: ' + error.message);
    }
  }

  async getSystemRequirements(name) {
    try {
      const response = await this.makeRequest(`requirements/${encodeURIComponent(name)}`, {
        method: 'GET'
      });

      const data = await response.json();
      return data.requirements || {};
    } catch (error) {
      console.error('Failed to get system requirements:', error);
      return null;
    }
  }

  async validateInstallation(name) {
    try {
      const response = await this.makeRequest('validate', {
        method: 'POST',
        body: JSON.stringify({ name })
      });

      const data = await response.json();
      return {
        isValid: data.isValid,
        issues: data.issues || []
      };
    } catch (error) {
      console.error('Failed to validate installation:', error);
      return {
        isValid: false,
        issues: ['Failed to validate installation']
      };
    }
  }
}

export const softwareService = new SoftwareService();
