/**
 * Persistent Token Metrics Service
 * Interacts with the Cloudflare Worker to manage token metrics
 */

import { TokenMetrics } from '../types';

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getTokenMetrics = async (): Promise<TokenMetrics> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/metrics`);
    if (!response.ok) {
      return { used: 0, limit: 100000000, isFallbackActive: false };
    }
    return await response.json() as TokenMetrics;
  } catch (error) {
    console.error('[METRICS_SERVICE] Failed to fetch metrics:', error);
    return { used: 0, limit: 100000000, isFallbackActive: false };
  }
};

export const updateTokenMetrics = async (used: number): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ used }),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to update metrics.' };
    }

    return await response.json();
  } catch (error) {
    console.error('[METRICS_SERVICE] Failed to update metrics:', error);
    return { success: false, message: 'Failed to update metrics.' };
  }
};
