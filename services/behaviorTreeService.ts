/**
 * Behavior Tree Management Service
 * Interacts with the Cloudflare Worker to manage behavior trees
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const saveBehaviorTree = async (tree: any): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/behavior-trees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tree),
    });
    if (!response.ok) {
      return { success: false, message: 'Failed to save behavior tree.' };
    }
    return await response.json();
  } catch (error) {
    console.error('[BEHAVIOR_TREE_SERVICE] Failed to save behavior tree:', error);
    return { success: false, message: 'Failed to save behavior tree.' };
  }
};

export const getBehaviorTrees = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/behavior-trees`);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('[BEHAVIOR_TREE_SERVICE] Failed to fetch behavior trees:', error);
    return [];
  }
}
