/**
 * CI/CD Pipeline Management Service
 * Interacts with the Cloudflare Worker to manage pipelines
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const savePipeline = async (pipeline: any): Promise<any> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/pipelines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[PIPELINE_SERVICE] Failed to save pipeline:', error);
    return null;
  }
};

export const getPipelines = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/pipelines`);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('[PIPELINE_SERVICE] Failed to fetch pipelines:', error);
    return [];
  }
}
