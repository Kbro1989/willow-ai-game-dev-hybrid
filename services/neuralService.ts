/**
 * Neural Network Management Service
 * Interacts with the Cloudflare Worker to manage neural networks
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const saveNeuralNetwork = async (network: any): Promise<any> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/neural`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(network),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[NEURAL_SERVICE] Failed to save neural network:', error);
    return null;
  }
};

export const getNeuralNetworks = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/neural`);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('[NEURAL_SERVICE] Failed to fetch neural networks:', error);
    return [];
  }
}
