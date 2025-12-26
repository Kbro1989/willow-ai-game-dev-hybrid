import { readCloudFile, writeCloudFile, deleteCloudFile } from './cloudFsService';
import { executeRemoteCommand } from './remoteTerminalService';

class LocalBridgeClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (response: any) => void> = new Map();
  private commandCounter = 0;
  private isCloudMode: boolean = false; // New flag to indicate if we are in cloud mode

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket("ws://localhost:3040"); // Connect to local-bridge server.js

    this.ws.onopen = () => {
      console.log("[LocalBridge] Connected to local development tunnel.");
      this.isCloudMode = false;
    };

    this.ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data as string);
        if (response.type && this.messageHandlers.has(response.type)) {
          this.messageHandlers.get(response.type)?.(response);
        } else if (response.type === 'output' || response.type === 'system') {
          console.log(`[Terminal] ${response.data}`);
        }
      } catch (e) {
        console.error("[LocalBridge] Error parsing message:", e, event.data);
      }
    };

    this.ws.onclose = () => {
      console.log("[LocalBridge] Disconnected from local development tunnel. Reconnecting in 5 seconds... Switching to Cloud Mode.");
      this.isCloudMode = true;
      setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (error) => {
      console.error("[LocalBridge] WebSocket Error:", error);
      this.isCloudMode = true;
    };
  }

  getStatus(): { isConnected: boolean, isCloudMode: boolean } {
    return { isConnected: this.ws?.readyState === WebSocket.OPEN && !this.isCloudMode, isCloudMode: this.isCloudMode };
  }

  private sendMessage(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        return reject(new Error("WebSocket is not open."));
      }

      const messageId = `cmd-${this.commandCounter++}`;
      const handler = (response: any) => {
        if (response.messageId === messageId) {
          this.messageHandlers.delete(response.type); // One-time handler
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || "Unknown error during local bridge operation."));
          }
        }
      };

      this.messageHandlers.set(`${type}_response`, handler);

      this.ws.send(JSON.stringify({ type, messageId, ...payload }));
    });
  }

  async runTerminalCommand(command: string): Promise<{ success: boolean, output?: string, error?: string }> {
    if (this.isCloudMode) {
      const result = await executeRemoteCommand(command);
      return { success: result !== null, output: result?.output };
    }
    try {
      // For terminal commands, we don't expect a direct response, but rather output via the 'output' type messages.
      // We will send the command and rely on the broadcastToTerminals in server.js to send output.
      if (this.ws?.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not open. Cannot run terminal command.");
      }
      this.ws.send(JSON.stringify({ type: 'terminal_command', command }));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async readLocalFile(filePath: string): Promise<{ success: boolean, content?: string, error?: string }> {
    if (this.isCloudMode) {
      const content = await readCloudFile(filePath);
      return { success: content !== null, content };
    }
    try {
      const response = await this.sendMessage('fs_read', { filePath });
      return { success: true, content: response.content };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async writeLocalFile(filePath: string, content: string): Promise<{ success: boolean, error?: string }> {
    if (this.isCloudMode) {
      const result = await writeCloudFile(filePath, content);
      return { success: result.success, error: result.message };
    }
    try {
      await this.sendMessage('fs_write', { filePath, content });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async deleteLocalFile(filePath: string): Promise<{ success: boolean, error?: string }> {
    if (this.isCloudMode) {
      const result = await deleteCloudFile(filePath);
      return { success: result.success, error: result.message };
    }
    try {
      await this.sendMessage('fs_delete', { filePath });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const localBridgeClient = new LocalBridgeClient();
