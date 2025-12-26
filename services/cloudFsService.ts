/**
 * Cloud File System Service
 * Interacts with the Cloudflare Worker for cloud-based file operations
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const readCloudFile = async (path: string): Promise<string | null> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/cloud-fs${path}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[CLOUD_FS_SERVICE] File not found: ${path}`);
        return null;
      }
      throw new Error(`Failed to read cloud file: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`[CLOUD_FS_SERVICE] Error reading file ${path}:`, error);
    return null;
  }
};

export const writeCloudFile = async (path: string, content: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/cloud-fs${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    });
    if (!response.ok) {
      throw new Error(`Failed to write cloud file: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[CLOUD_FS_SERVICE] Error writing file ${path}:`, error);
    return { success: false, message: String(error) };
  }
};

export const deleteCloudFile = async (path: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/cloud-fs${path}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete cloud file: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[CLOUD_FS_SERVICE] Error deleting file ${path}:`, error);
    return { success: false, message: String(error) };
  }
};

export const listCloudFiles = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/cloud-fs`);
    if (!response.ok) {
      return [];
    }
    return await response.json() as string[];
  } catch (error) {
    console.error("[CLOUD_FS_SERVICE] Failed to list cloud files:", error);
    return [];
  }
};
