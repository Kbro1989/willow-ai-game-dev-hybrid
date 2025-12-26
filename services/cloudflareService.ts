/**
 * Cloudflare Workers AI Service
 * Hybrid integration - calls ai-game-studio worker for text/images/code
 */

import { Message, CodeCompletion, UserPreferences, FileNode, TodoTask, SceneObject, TokenMetrics } from "../types";

// Configure worker URL - uses deployed ai-game-studio worker
const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

// Bridge Configuration (defaults to local, can be overridden by user settings in tunnel mode)
let BRIDGE_URL = 'http://localhost:3040';

export const setBridgeUrl = (url: string) => {
  BRIDGE_URL = url;
  console.log(`[BRIDGE] URL updated to: ${BRIDGE_URL}`);
};

// Simple rate limiter for UI metrics display
class CloudflareRateLimiter {
  private usedTokens: number = 0;
  private readonly LIMIT = 100000000; // Cloudflare has generous limits

  addUsage(tokens: number) { this.usedTokens += tokens; }
  getMetrics(): TokenMetrics {
    return {
      used: this.usedTokens,
      limit: this.LIMIT,
      isFallbackActive: false
    };
  }
}

export const cloudlareLimiter = new CloudflareRateLimiter();

/**
 * Main orchestration - Chat with function calling
 * Replaces geminiService.runOrchestration
 */
export const runOrchestration = async (
  prompt: string,
  history: Message[],
  context: string,
  engineState: string,
  userPrefs: UserPreferences,
  version: string
) => {
  try {
    const response = await fetch(`${WORKER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Directive: "${prompt}"\nVersion: ${version}\n[PROJECT_TREE]: ${context}\n[ENGINE_STATE]: ${engineState}\n[USER_MEM]: ${JSON.stringify(userPrefs)}`,
        history: history.map(m => ({ role: m.role, content: m.content })),
        model: 'GPT_OSS', // Uses llama-3.1-70b-instruct
        systemPrompt: `You are the Antigravity Engine Architect. Master of solo game creation. Goal: Zero friction. Execute multi-step synthesis.

You have access to IDE tools for file mutation, scene updates, and testing. Respond with structured JSON when tool calls are needed.`
      })
    });

    if (!response.ok) {
      throw new Error(`Worker error: ${response.status}`);
    }

    const data = await response.json() as any;
    cloudlareLimiter.addUsage(data.tokensUsed || 1000);

    return {
      text: data.response,
      functionCalls: data.functionCalls || [],
      model: data.model,
      latency: data.latency
    };
  } catch (error) {
    console.error("[CLOUDFLARE] Orchestration Failure:", error);
    throw error;
  }
};

/**
 * Project Manager Review - Analyze project and suggest tasks
 * Replaces geminiService.runProjectManagerReview
 */
export const runProjectManagerReview = async (
  files: FileNode[],
  sceneObjects: SceneObject[],
  tasks: TodoTask[]
) => {
  try {
    const response = await fetch(`${WORKER_URL}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: files.map(f => f.path),
        sceneCount: sceneObjects.length,
        taskCount: tasks.length
      })
    });

    if (!response.ok) {
      console.warn("[CLOUDFLARE] PM Review failed, returning empty");
      return [];
    }

    const data = await response.json() as any;
    return data.tasks || [];
  } catch (error) {
    console.error("[CLOUDFLARE] PM Review Failed:", error);
    return [];
  }
};

/**
 * Image Generation - Uses FLUX via Cloudflare
 * Replaces geminiService.generateAsset
 */
export const generateImage = async (
  prompt: string,
  aspectRatio: "1:1" | "16:9" | "9:16" = "1:1"
) => {
  try {
    const response = await fetch(`${WORKER_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: 'FLUX' })
    });

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.status}`);
    }

    // Response is raw image bytes
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { imageUrl: url, model: 'Cloudflare AI Image' };
  } catch (error) {
    console.error("[CLOUDFLARE] Asset Synthesis Failed:", error);
    return { imageUrl: null, model: 'Cloudflare AI Image' };
  }
};

/**
 * Speech Synthesis - Uses Cloudflare TTS
 */
export const synthesizeSpeech = async (text: string) => {
  try {
    const response = await fetch(`${WORKER_URL}/api/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Speech synthesis failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { audioUrl: url, model: 'Cloudflare AI TTS' };
  } catch (error) {
    console.error("[CLOUDFLARE] Speech Synthesis Failed:", error);
    return { audioUrl: null, model: 'Cloudflare AI TTS' };
  }
};

/**
 * Cinematic Video Generation - Uses Cloudflare Video
 */
export const generateCinematic = async (prompt: string) => {
  try {
    const response = await fetch(`${WORKER_URL}/api/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`Video generation failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { videoUrl: url, model: 'Cloudflare AI Video' };
  } catch (error) {
    console.error("[CLOUDFLARE] Video Generation Failed:", error);
    return { videoUrl: null, model: 'Cloudflare AI Video' };
  }
};

/**
 * Code Completions - Uses Qwen Coder via Cloudflare
 * Replaces geminiService.getCodeCompletions
 */
export const getCodeCompletions = async (
  prefix: string,
  suffix: string,
  filename: string
): Promise<CodeCompletion[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, suffix, filename })
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as any;
    return data.completions || [];
  } catch (error) {
    console.error("[CLOUDFLARE] Autocomplete Failed:", error);
    return [];
  }
};

/**
 * Health check for the Cloudflare worker
 */
export const checkWorkerHealth = async () => {
  try {
    const response = await fetch(`${WORKER_URL}/api/health`);
    const data = await response.json() as any;
    return {
      status: data.status,
      models: data.models,
      version: data.version
    };
  } catch (error) {
    return { status: 'offline', models: 0, version: 'unknown' };
  }
};

/**
 * AI Code Audit - Analyze code for potential issues
 */
export const auditCode = async (
  code: string,
  filename: string
): Promise<import('../types').CodeIssue[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename })
    });

    if (!response.ok) {
      console.warn("[CLOUDFLARE] Audit failed, returning empty");
      return [];
    }

    const data = await response.json() as any;
    return data.issues || [];
  } catch (error) {
    console.error("[CLOUDFLARE] Audit Failed:", error);
    return [];
  }
};

/**
 * AI Code Refactoring - Suggest improvements to code
 */
export const refactorCode = async (
  code: string,
  filename: string
): Promise<{ original: string, modified: string, explanation: string } | null> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/refactor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as any;
    return data.suggestion || null;
  } catch (error) {
    console.error("[CLOUDFLARE] Refactor Failed:", error);
    return null;
  }
};

/**
 * AI Asset Optimization - Suggest mesh/texture optimizations
 */
export const optimizeAsset = async (
  assetType: string,
  polyCount?: number,
  textureSize?: string,
  lodLevels?: number
): Promise<{
  optimizations: Array<{ type: string; target?: number; format?: string; levels?: number[]; savings: string; description: string }>;
  estimatedPerformanceGain: string;
  priority: 'low' | 'medium' | 'high';
} | null> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/optimize-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetType, polyCount, textureSize, lodLevels })
    });

    if (!response.ok) {
      console.warn("[CLOUDFLARE] Asset optimization failed");
      return null;
    }

    const data = await response.json() as any;
    return {
      optimizations: data.optimizations || [],
      estimatedPerformanceGain: data.estimatedPerformanceGain || '0%',
      priority: data.priority || 'low'
    };
  } catch (error) {
    console.error("[CLOUDFLARE] Asset Optimization Failed:", error);
    return null;
  }
};

/**
 * Semantic Asset Search - Search assets using vector embeddings
 * Uses AI to find similar assets based on semantic meaning
 */
export const searchSimilarAssets = async (
  query: string,
  limit: number = 10
): Promise<{
  results: Array<{ id: string; name: string; score: number; type: string }>;
  searchVector?: number[];
} | null> => {
  try {
    // First, generate embedding for the query
    const embeddingResponse = await fetch(`${WORKER_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query })
    });

    if (!embeddingResponse.ok) {
      // Fallback: use text-based search through chat API
      const fallbackResponse = await fetch(`${WORKER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Search for game assets matching: "${query}". Return ONLY a JSON array of results: [{"id": "...", "name": "...", "score": 0.9, "type": "mesh|texture|audio"}]`,
          model: 'QWEN_TURBO'
        })
      });

      if (!fallbackResponse.ok) {
        return null;
      }

      const data = await fallbackResponse.json() as any;
      try {
        const jsonMatch = data.response?.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return { results: JSON.parse(jsonMatch[0]) };
        }
      } catch (e) {
        // Return empty results
      }
      return { results: [] };
    }

    const embedData = await embeddingResponse.json() as any;

    // Search vector database with embedding
    const searchResponse = await fetch(`${WORKER_URL}/api/vector-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: embedData.embedding,
        limit,
        namespace: 'game-assets'
      })
    });

    if (!searchResponse.ok) {
      return { results: [], searchVector: embedData.embedding };
    }

    const searchData = await searchResponse.json() as any;
    return {
      results: searchData.results || [],
      searchVector: embedData.embedding
    };
  } catch (error) {
    console.error("[CLOUDFLARE] Semantic Search Failed:", error);
    return null;
  }
};
