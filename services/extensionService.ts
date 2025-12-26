/**
 * Extension Management Service
 * Interacts with the Cloudflare Worker to manage extensions
 */

import { Extension } from '../types';

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getExtensions = async (): Promise<Extension[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/extensions`);
    if (!response.ok) {
      return [];
    }
    return await response.json() as Extension[];
  } catch (error) {
    console.error("[EXTENSION_SERVICE] Failed to fetch extensions:", error);
    return [];
  }
};

export const uninstallExtension = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/extensions/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      return { success: false, message: 'Failed to uninstall extension.' };
    }
    return await response.json();
  } catch (error) {
    console.error(`[EXTENSION_SERVICE] Failed to uninstall extension ${id}:`, error);
    return { success: false, message: 'Failed to uninstall extension.' };
  }
};
