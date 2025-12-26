/**
 * Engine Logging Service
 * Interacts with the Cloudflare Worker to send and receive engine logs
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const sendLog = async (log: any): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to send log.' };
    }

    return await response.json();
  } catch (error) {
    console.error('[LOGGING_SERVICE] Failed to send log:', error);
    return { success: false, message: 'Failed to send log.' };
  }
};

export const getLogs = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/logs`);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('[LOGGING_SERVICE] Failed to fetch logs:', error);
    return [];
  }
};
