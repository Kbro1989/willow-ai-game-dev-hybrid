/**
 * Vision Service
 * Interacts with the Cloudflare Worker to analyze images
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const analyzeImage = async (image: File, prompt: string): Promise<{ analysis: string } | null> => {
  try {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('prompt', prompt);

    const response = await fetch(`${WORKER_URL}/api/vision`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[VISION_SERVICE] Failed to analyze image:', error);
    return null;
  }
};
