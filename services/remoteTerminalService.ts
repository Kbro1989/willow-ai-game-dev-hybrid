/**
 * Remote Terminal Service
 * Interacts with the Cloudflare Worker for remote terminal commands
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const executeRemoteCommand = async (command: string): Promise<{ output: string } | null> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/remote-terminal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute remote command: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[REMOTE_TERMINAL_SERVICE] Error executing command: ${command}`, error);
    return { output: `Error: ${error instanceof Error ? error.message : String(error)}` };
  }
};
