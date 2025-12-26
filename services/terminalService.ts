/**
 * Persistent Terminal History Service
 * Interacts with the Cloudflare Worker to manage terminal history
 */

import { TerminalLine } from '../types';

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getTerminalHistory = async (): Promise<TerminalLine[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/terminal-history`);
    if (!response.ok) {
      return [];
    }
    return await response.json() as TerminalLine[];
  } catch (error) {
    console.error('[TERMINAL_SERVICE] Failed to fetch history:', error);
    return [];
  }
};

export const saveTerminalHistory = async (line: TerminalLine): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/terminal-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(line),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to save history.' };
    }

    return await response.json();
  } catch (error) {
    console.error('[TERMINAL_SERVICE] Failed to save history:', error);
    return { success: false, message: 'Failed to save history.' };
  }
};
