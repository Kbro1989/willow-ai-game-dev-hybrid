/**
 * RSMV Model Data Service
 * Interacts with the Cloudflare Worker to fetch RSMV model data
 */

import { RSMVModelEntry, GameSource, ModelCategory } from '../components/RSMVBrowser';

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getRsmvModels = async (gameSource: GameSource, category: ModelCategory): Promise<RSMVModelEntry[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/rsmv/${gameSource}/${category}`);
    if (!response.ok) {
      return [];
    }
    return await response.json() as RSMVModelEntry[];
  } catch (error) {
    console.error('[RSMV_SERVICE] Failed to fetch models:', error);
    return [];
  }
};
