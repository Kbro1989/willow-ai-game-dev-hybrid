/**
 * Cloudflare Workers AI Provider
 * PRIMARY BUFFER for all basic AI tasks
 * Supports all free-tier Workers AI models from developers.cloudflare.com/workers-ai/models
 */

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export interface CloudflareTextRequest {
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  systemPrompt?: string;
  functionDeclarations?: any[];
}

export interface CloudflareTextResponse {
  content: string;
  functionCalls?: any[];
  model: string;
  tokensUsed?: number;
}

export interface CloudflareImageRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
}

export interface CloudflareCodeRequest {
  prompt: string;
  language?: string;
  context?: string;
}

class CloudflareProvider {
  private workerUrl: string;

  constructor(workerUrl: string = WORKER_URL) {
    this.workerUrl = workerUrl;
  }

  /**
   * Cloudflare is always available (generous free tier)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Chat using Llama 3.1 70B (PRIMARY for general conversation)
   * Model: @cf/meta/llama-3.1-70b-instruct
   */
  async chatWithLlama(
    prompt: string,
    history: Array<{ role: 'user' | 'model'; content: string }> = [],
    systemPrompt?: string
  ): Promise<CloudflareTextResponse> {
    try {
      const response = await fetch(`${this.workerUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history,
          systemPrompt,
          model: '@cf/meta/llama-3.1-70b-instruct'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        content: data.response || data.text,
        model: '@cf/meta/llama-3.1-70b-instruct',
        tokensUsed: data.tokensUsed || data.usage?.total_tokens
      };
    } catch (error) {
      console.error('[CF/LLAMA] Chat error:', error);
      throw error;
    }
  }

  /**
   * Code generation using Qwen 2.5 Coder (PRIMARY for code tasks)
   * Model: @cf/qwen/qwen2.5-coder-32b-instruct
   */
  async codeWithQwen(
    prompt: string,
    language: string = 'typescript'
  ): Promise<{ code: string; model: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/code-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          language,
          model: '@cf/qwen/qwen2.5-coder-32b-instruct'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        code: data.completion || data.code || data.response,
        model: '@cf/qwen/qwen2.5-coder-32b-instruct'
      };
    } catch (error) {
      console.error('[CF/QWEN] Code generation error:', error);
      throw error;
    }
  }

  /**
   * Reasoning using QwQ 32B (PRIMARY for step-by-step logic)
   * Model: @cf/qwq/qwq-32b-preview
   */
  async reasonWithQwQ(problem: string): Promise<{ solution: string; model: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Think step-by-step and solve this problem:\n\n${problem}`,
          model: '@cf/qwq/qwq-32b-preview',
          systemPrompt: 'You are a reasoning AI. Break down complex problems into clear logical steps.'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        solution: data.response || data.text,
        model: '@cf/qwq/qwq-32b-preview'
      };
    } catch (error) {
      console.error('[CF/QWQ] Reasoning error:', error);
      throw error;
    }
  }

  /**
   * Reasoning using DeepSeek R1 distilled (ALTERNATIVE reasoning model)
   * Model: @cf/deepseek-ai/deepseek-r1-distill-qwen-32b
   */
  async reasonWithDeepSeek(problem: string): Promise<{ solution: string; model: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: problem,
          model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
          systemPrompt: 'You are DeepSeek R1, a thinking model. Show your reasoning process.'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        solution: data.response || data.text,
        model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b'
      };
    } catch (error) {
      console.error('[CF/DEEPSEEK] Reasoning error:', error);
      throw error;
    }
  }

  /**
   * Image generation using Stable Diffusion XL (PRIMARY for textures/assets)
   * Model: @cf/stabilityai/stable-diffusion-xl-base-1.0
   */
  async imageWithSDXL(
    prompt: string,
    negativePrompt?: string
  ): Promise<{ imageUrl: string; model: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          model: '@cf/stabilityai/stable-diffusion-xl-base-1.0'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        imageUrl: data.imageUrl || data.url || data.image,
        model: '@cf/stabilityai/stable-diffusion-xl-base-1.0'
      };
    } catch (error) {
      console.error('[CF/SDXL] Image generation error:', error);
      throw error;
    }
  }

  /**
   * Fast image generation using Flux Schnell (FAST alternative)
   * Model: @cf/black-forest-labs/flux-1-schnell
   */
  async imageWithFlux(prompt: string): Promise<{ imageUrl: string; model: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: '@cf/black-forest-labs/flux-1-schnell'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        imageUrl: data.imageUrl || data.url || data.image,
        model: '@cf/black-forest-labs/flux-1-schnell'
      };
    } catch (error) {
      console.error('[CF/FLUX] Image generation error:', error);
      throw error;
    }
  }

  /**
   * Translation using M2M100 (for multilingual support)
   * Model: @cf/meta/m2m100-1.2b
   */
  async translate(
    text: string,
    sourceLang: string = 'en',
    targetLang: string = 'es'
  ): Promise<{ translation: string; model: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang,
          targetLang,
          model: '@cf/meta/m2m100-1.2b'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        translation: data.translation || data.text,
        model: '@cf/meta/m2m100-1.2b'
      };
    } catch (error) {
      console.error('[CF/M2M100] Translation error:', error);
      throw error;
    }
  }

  /**
   * Text embeddings using BGE (for semantic search)
   * Model: @cf/baai/bge-large-en-v1.5
   */
  async embed(text: string): Promise<{ embedding: number[]; model: string }> {
    try {
      const response = await fetch(`${this.workerUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model: '@cf/baai/bge-large-en-v1.5'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        embedding: data.embedding || data.data,
        model: '@cf/baai/bge-large-en-v1.5'
      };
    } catch (error) {
      console.error('[CF/BGE] Embedding error:', error);
      throw error;
    }
  }

  // Legacy methods for compatibility
  async textChat(request: CloudflareTextRequest): Promise<CloudflareTextResponse> {
    return this.chatWithLlama(request.prompt, request.history, request.systemPrompt);
  }

  async generateImage(request: CloudflareImageRequest): Promise<{ imageUrl: string; model: string }> {
    return this.imageWithSDXL(request.prompt, request.negativePrompt);
  }

  async codeCompletion(request: CloudflareCodeRequest): Promise<{ code: string; model: string }> {
    return this.codeWithQwen(request.prompt, request.language);
  }
}

// Export singleton instance
export const cloudflareProvider = new CloudflareProvider();
export default cloudflareProvider;
