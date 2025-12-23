/**
 * Neural Bridge Service
 * Routes all file operations through neural-bridge-pages for local file system access
 */

const BRIDGE_URL = 'https://neural-bridge-pages.pages.dev';
const LOCAL_BRIDGE_URL = 'http://localhost:8788'; // Fallback for local dev

export interface BridgeCommand {
  type: 'execute' | 'write_file' | 'read_file' | 'list_dir';
  command?: string;
  path?: string;
  content?: string;
}

export interface BridgeResponse {
  success: boolean;
  output?: string;
  error?: string;
  files?: string[];
}

/**
 * Execute command via neural bridge
 */
export const executeCommand = async (command: string): Promise<BridgeResponse> => {
  try {
    // Try local bridge first, fallback to deployed
    const urls = [LOCAL_BRIDGE_URL, BRIDGE_URL];

    for (const baseUrl of urls) {
      try {
        const response = await fetch(`${baseUrl}/api/local/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'execute',
            command
          })
        });

        if (response.ok) {
          const data = await response.json();
          return { success: true, output: data.output || data.result };
        }
      } catch (e) {
        // Try next URL
        continue;
      }
    }

    return { success: false, error: 'Bridge unavailable' };
  } catch (error) {
    console.error('[BRIDGE] Execute failed:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Write file via neural bridge
 */
export const writeFile = async (path: string, content: string): Promise<BridgeResponse> => {
  try {
    const urls = [LOCAL_BRIDGE_URL, BRIDGE_URL];

    for (const baseUrl of urls) {
      try {
        const response = await fetch(`${baseUrl}/api/local/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'write_file',
            path,
            content
          })
        });

        if (response.ok) {
          return { success: true, output: `File written: ${path}` };
        }
      } catch (e) {
        continue;
      }
    }

    return { success: false, error: 'Bridge unavailable' };
  } catch (error) {
    console.error('[BRIDGE] Write file failed:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Create file via neural bridge (enhanced version with PowerShell)
 * Creates directory structure if needed and writes content
 */
export const createFile = async (path: string, content: string, language?: string): Promise<BridgeResponse> => {
  try {
    // Escape content for PowerShell
    const escapedContent = content.replace(/"/g, '`"').replace(/\$/g, '`$');

    // PowerShell command to create file with directory structure
    const command = `
      $targetPath = "${path}"
      $directory = Split-Path -Parent $targetPath
      if ($directory -and !(Test-Path $directory)) {
        New-Item -ItemType Directory -Force -Path $directory | Out-Null
      }
      @"
${content}
"@ | Set-Content -Path $targetPath -Encoding UTF8
      Write-Output "Created: $targetPath"
    `;

    const result = await executeCommand(command);

    if (result.success) {
      console.log(`[BRIDGE] File created: ${path}`);
    }

    return result;
  } catch (error) {
    console.error('[BRIDGE] Create file failed:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Save imported asset to local filesystem via bridge
 */
export const saveAssetToLocal = async (
  fileName: string,
  fileData: Blob,
  targetDir: string = 'C:\\Users\\Destiny\\Desktop\\imported-assets'
): Promise<BridgeResponse> => {
  try {
    // Convert blob to base64
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileData);
    });

    // Extract base64 content (remove data:*/*;base64, prefix)
    const base64Content = base64Data.split(',')[1];

    // Create PowerShell command to save file
    const targetPath = `${targetDir}\\${fileName}`;
    const command = `
      $bytes = [System.Convert]::FromBase64String("${base64Content}")
      New-Item -ItemType Directory -Force -Path "${targetDir}" | Out-Null
      [System.IO.File]::WriteAllBytes("${targetPath}", $bytes)
      Write-Output "Saved to: ${targetPath}"
    `;

    return await executeCommand(command);
  } catch (error) {
    console.error('[BRIDGE] Save asset failed:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Check if bridge is available
 */
export const checkBridgeStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${LOCAL_BRIDGE_URL}/api/mesh/status`, {
      method: 'GET'
    }).catch(() =>
      fetch(`${BRIDGE_URL}/api/mesh/status`, { method: 'GET' })
    );

    return response.ok;
  } catch {
    return false;
  }
};

export const bridgeService = {
  executeCommand,
  writeFile,
  createFile,
  saveAssetToLocal,
  checkBridgeStatus,
  BRIDGE_URL,
  LOCAL_BRIDGE_URL
};

export default bridgeService;
