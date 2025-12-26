/**
 * Asset Management Service
 * Interacts with the Cloudflare Worker to manage assets
 */

import { GameAsset } from '../types';

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getAssets = async (): Promise<GameAsset[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/assets`);
    if (!response.ok) {
      return [];
    }
    return await response.json() as GameAsset[];
  } catch (error) {
    console.error('[ASSET_SERVICE] Failed to fetch assets:', error);
    return [];
  }
};

export const uploadAsset = async (file: File, name?: string, type?: string): Promise<GameAsset | null> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (type) formData.append('type', type);

    const response = await fetch(`${WORKER_URL}/api/assets`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as GameAsset;
  } catch (error) {
    console.error('[ASSET_SERVICE] Failed to upload asset:', error);
    return null;
  }
};

export const deleteAsset = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/assets/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to delete asset.' };
    }

    return await response.json();
  } catch (error) {
    console.error(`[ASSET_SERVICE] Failed to delete asset ${id}:`, error);
    return { success: false, message: 'Failed to delete asset.' };
  }
};
