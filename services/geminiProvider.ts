/**
 * Gemini API Provider
 * Wrapper for Google Generative AI with proper error handling
 */

import { GoogleGenAI, FunctionDeclaration } from "@google/genai";

export interface GeminiTextRequest {
  prompt: string;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  systemPrompt?: string;
  functionDeclarations?: FunctionDeclaration[];
}

export interface GeminiTextResponse {
  content: string;
  functionCalls?: any[];
  model: string;
  tokensUsed?: number;
}

export interface GeminiImageRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16';
}

export interface GeminiCodeRequest {
  prompt: string;
  language?: string;
  context?: string;
}

class GeminiProvider {
  private client: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    // Check localStorage for temporary key first, then fallback to env
    this.apiKey = localStorage.getItem('TEMP_GEMINI_KEY') || import.meta.env.VITE_GEMINI_API_KEY;
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Refresh API key (useful when user updates it in localStorage)
   */
  refreshApiKey() {
    this.apiKey = localStorage.getItem('TEMP_GEMINI_KEY') || import.meta.env.VITE_GEMINI_API_KEY;
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Check if Gemini is available (API key configured)
   */
  isAvailable(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  /**
   * Text chat with optional function calling
   */
  async textChat(request: GeminiTextRequest): Promise<GeminiTextResponse> {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        systemInstruction: request.systemPrompt,
        tools: request.functionDeclarations ? [{ functionDeclarations: request.functionDeclarations }] : undefined,
      });

      // Convert history to Gemini format
      const history = request.history?.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })) || [];

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(request.prompt);
      const response = result.response;

      // Extract function calls if present
      const functionCalls = response.functionCalls?.() || [];

      return {
        content: response.text(),
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        model: 'gemini-2.0-flash-exp',
        tokensUsed: response.usageMetadata?.totalTokenCount
      };
    } catch (error: any) {
      // Check for rate limit errors
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        throw new Error('RATE_LIMIT');
      }
      throw error;
    }
  }

  /**
   * Generate image using Imagen 3
   */
  async generateImage(request: GeminiImageRequest): Promise<{ imageUrl: string; model: string }> {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'imagen-3.0-generate-001' });

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `Generate image: ${request.prompt}${request.negativePrompt ? `\nAvoid: ${request.negativePrompt}` : ''}`
          }]
        }]
      });

      // Imagen returns base64 or URL - extract it
      const imageData = result.response.candidates?.[0]?.content?.parts?.[0];
      const imageUrl = imageData?.inlineData ?
        `data:image/png;base64,${imageData.inlineData.data}` :
        imageData?.text || '';

      return {
        imageUrl,
        model: 'imagen-3.0-generate-001'
      };
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        throw new Error('RATE_LIMIT');
      }
      throw error;
    }
  }

  /**
   * Code completion using Gemini Code
   */
  async codeCompletion(request: GeminiCodeRequest): Promise<{ code: string; model: string }> {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-2.0-flash-exp', // Using flash for code, adjust if specific code model exists
        systemInstruction: 'You are an expert programmer. Generate clean, efficient code without explanations unless asked.'
      });

      const prompt = request.context
        ? `Language: ${request.language || 'auto'}\nContext:\n${request.context}\n\nTask: ${request.prompt}`
        : request.prompt;

      const result = await model.generateContent(prompt);
      const code = result.response.text();

      return {
        code,
        model: 'gemini-2.0-flash-exp'
      };
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        throw new Error('RATE_LIMIT');
      }
      throw error;
    }
  }
}

// Export singleton instance
export const geminiProvider = new GeminiProvider();
export default geminiProvider;
