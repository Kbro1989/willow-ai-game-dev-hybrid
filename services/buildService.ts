/**
 * Build & Test Orchestration Service
 * Interacts with the Cloudflare Worker to trigger builds and tests
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const triggerBuild = async (prompt?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to trigger build.' };
    }

    return await response.json();
  } catch (error) {
    console.error('[BUILD_SERVICE] Failed to trigger build:', error);
    return { success: false, message: 'Failed to trigger build.' };
  }
};

export const triggerTest = async (prompt?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to trigger test.' };
    }

    return await response.json();
  } catch (error) {
    console.error('[BUILD_SERVICE] Failed to trigger test:', error);
    return { success: false, message: 'Failed to trigger test.' };
  }
};
