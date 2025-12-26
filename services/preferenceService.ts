/**
 * User Preference Management Service
 * Interacts with the Cloudflare Worker to manage user preferences
 */

import { UserPreferences } from '../types';

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getPreferences = async (): Promise<UserPreferences> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/preferences`);
    if (!response.ok) {
      return { theme: 'dark', language: 'en', history: [] };
    }
    return await response.json() as UserPreferences;
  } catch (error) {
    console.error('[PREFERENCE_SERVICE] Failed to fetch preferences:', error);
    return { theme: 'dark', language: 'en', history: [] };
  }
};

export const updatePreferences = async (updates: Partial<UserPreferences>): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to update preferences.' };
    }

    return await response.json();
  } catch (error) {
    console.error('[PREFERENCE_SERVICE] Failed to update preferences:', error);
    return { success: false, message: 'Failed to update preferences.' };
  }
};
