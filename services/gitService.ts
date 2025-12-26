/**
 * Source Control (Git) Service
 * Interacts with the Cloudflare Worker to perform Git operations
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getGitStatus = async (): Promise<{ staged: string[], unstaged: string[] }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/git`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command: 'status' }),
    });

    if (!response.ok) {
      return { staged: [], unstaged: [] };
    }

    return await response.json();
  } catch (error) {
    console.error('[GIT_SERVICE] Failed to get status:', error);
    return { staged: [], unstaged: [] };
  }
};

export const commitChanges = async (message: string): Promise<{ success: boolean, commitId: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/git`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command: 'commit', message }),
    });

    if (!response.ok) {
      return { success: false, commitId: '' };
    }

    return await response.json();
  } catch (error) {
    console.error('[GIT_SERVICE] Failed to commit changes:', error);
    return { success: false, commitId: '' };
  }
}
