/**
 * Unified Model Router
 * Routes requests to Gemini (paid) first, falls back to Cloudflare (free)
 */

import geminiProvider, { GeminiTextRequest, GeminiImageRequest, GeminiCodeRequest } from './geminiProvider';
import cloudflareProvider from './cloudflareProvider';

export type ModelType = 'text' | 'function_calling' | 'image' | 'code' | 'audio' | 'video';

export interface ModelRequest {
  type: ModelType;
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  systemPrompt?: string;
  functionDeclarations?: any[];
  negativePrompt?: string;
  language?: string;
  context?: string;
  options?: any;
}

export interface ModelResponse {
  content?: string;
  code?: string;
  imageUrl?: string;
  functionCalls?: any[];
  model: string;
  provider: 'gemini' | 'cloudflare';
  latency: number;
  tokensUsed?: number;
}

/**
 * Route model request to best available provider
 */
export async function route(request: ModelRequest): Promise<ModelResponse> {
  const startTime = Date.now();

  // Audio and Video are Gemini-exclusive
  if (request.type === 'audio' || request.type === 'video') {
    if (!geminiProvider.isAvailable()) {
      throw new Error(`${request.type} generation requires Gemini API key`);
    }
    // These are handled by geminiService.ts (Live Audio / VEO)
    throw new Error(`${request.type} should use geminiService.ts directly`);
  }

  // Try Gemini first if available
  if (geminiProvider.isAvailable()) {
    try {
      console.log(`[ROUTER] Trying Gemini for ${request.type}...`);
      const result = await routeToGemini(request);
      const latency = Date.now() - startTime;

      return {
        ...result,
        provider: 'gemini',
        latency
      };
    } catch (error: any) {
      // If rate limit, fall through to Cloudflare
      if (error.message === 'RATE_LIMIT') {
        console.warn('[ROUTER] Gemini rate limited, falling back to Cloudflare');
      } else {
        console.error('[ROUTER] Gemini error:', error);
      }
      // Fall through to Cloudflare
    }
  }

  // Fallback to Cloudflare
  console.log(`[ROUTER] Using Cloudflare for ${request.type}`);
  const result = await routeToCloudflare(request);
  const latency = Date.now() - startTime;

  return {
    ...result,
    provider: 'cloudflare',
    latency
  };
}

/**
 * Route to Gemini provider
 */
async function routeToGemini(request: ModelRequest): Promise<Omit<ModelResponse, 'provider' | 'latency'>> {
  switch (request.type) {
    case 'text':
    case 'function_calling': {
      const geminiRequest: GeminiTextRequest = {
        prompt: request.prompt,
        history: request.history,
        systemPrompt: request.systemPrompt,
        functionDeclarations: request.functionDeclarations
      };

      const response = await geminiProvider.textChat(geminiRequest);

      return {
        content: response.content,
        functionCalls: response.functionCalls,
        model: response.model,
        tokensUsed: response.tokensUsed
      };
    }

    case 'image': {
      const geminiRequest: GeminiImageRequest = {
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        aspectRatio: request.options?.aspectRatio
      };

      const response = await geminiProvider.generateImage(geminiRequest);

      return {
        imageUrl: response.imageUrl,
        model: response.model
      };
    }

    case 'code': {
      const geminiRequest: GeminiCodeRequest = {
        prompt: request.prompt,
        language: request.language,
        context: request.context
      };

      const response = await geminiProvider.codeCompletion(geminiRequest);

      return {
        code: response.code,
        model: response.model
      };
    }

    default:
      throw new Error(`Unsupported model type: ${request.type}`);
  }
}

/**
 * Route to Cloudflare provider
 */
async function routeToCloudflare(request: ModelRequest): Promise<Omit<ModelResponse, 'provider' | 'latency'>> {
  switch (request.type) {
    case 'text':
    case 'function_calling': {
      const response = await cloudflareProvider.textChat({
        prompt: request.prompt,
        history: request.history,
        systemPrompt: request.systemPrompt,
        functionDeclarations: request.functionDeclarations
      });

      return {
        content: response.content,
        functionCalls: response.functionCalls,
        model: response.model,
        tokensUsed: response.tokensUsed
      };
    }

    case 'image': {
      const response = await cloudflareProvider.generateImage({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        aspectRatio: request.options?.aspectRatio
      });

      return {
        imageUrl: response.imageUrl,
        model: response.model
      };
    }

    case 'code': {
      const response = await cloudflareProvider.codeCompletion({
        prompt: request.prompt,
        language: request.language,
        context: request.context
      });

      return {
        code: response.code,
        model: response.model
      };
    }

    default:
      throw new Error(`Unsupported model type: ${request.type}`);
  }
}

/**
 * Convenience function for text chat
 */
export async function chat(
  prompt: string,
  history?: Array<{ role: 'user' | 'model'; content: string }>,
  systemPrompt?: string
): Promise<ModelResponse> {
  return route({
    type: 'text',
    prompt,
    history,
    systemPrompt
  });
}

/**
 * Convenience function for function calling
 */
export async function chatWithFunctions(
  prompt: string,
  functionDeclarations: any[],
  history?: Array<{ role: 'user' | 'model'; content: string }>,
  systemPrompt?: string
): Promise<ModelResponse> {
  return route({
    type: 'function_calling',
    prompt,
    history,
    systemPrompt,
    functionDeclarations
  });
}

/**
 * Convenience function for image generation
 */
export async function generateImage(
  prompt: string,
  negativePrompt?: string
): Promise<ModelResponse> {
  return route({
    type: 'image',
    prompt,
    negativePrompt
  });
}

/**
 * Convenience function for code completion
 */
export async function completeCode(
  prompt: string,
  language?: string,
  context?: string
): Promise<ModelResponse> {
  return route({
    type: 'code',
    prompt,
    language,
    context
  });
}

export const modelRouter = {
  route,
  chat,
  chatWithFunctions,
  generateImage,
  completeCode
};

export default modelRouter;
