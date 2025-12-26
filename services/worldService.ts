/**
 * Procedural World Generation Service
 * Interacts with the Cloudflare Worker to generate worlds
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const generateWorld = async (config?: any): Promise<{ success: boolean; worldData: any }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/world`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    if (!response.ok) {
      return { success: false, worldData: null };
    }

    return await response.json();
  } catch (error) {
    console.error('[WORLD_SERVICE] Failed to generate world:', error);
    return { success: false, worldData: null };
  }
};
