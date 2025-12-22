
import { GoogleGenAI, Type, Modality, GenerateContentResponse, LiveServerMessage, FunctionDeclaration } from "@google/genai";
import { Message, ModelKey, CodeCompletion, AgentTask, TokenMetrics, UserPreferences, GroundingChunk, FileNode, TodoTask, SceneObject } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Base-64 helpers for Live API
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

class RateLimiter {
  private usedTokens: number = 0;
  private readonly PRO_LIMIT = 20000000;

  addUsage(tokens: number) { this.usedTokens += tokens; }
  getMetrics(): TokenMetrics { return { used: this.usedTokens, limit: this.PRO_LIMIT, isFallbackActive: this.usedTokens > (this.PRO_LIMIT * 0.9) }; }
  shouldFallback(): boolean { return this.usedTokens > (this.PRO_LIMIT * 0.9); }
}

export const limiter = new RateLimiter();

// The "Antigravity Protocol" Toolset
const ideTools: FunctionDeclaration[] = [
  {
    name: 'ide_propose_sprint',
    parameters: {
      type: Type.OBJECT,
      description: 'Propose a structured architectural roadmap for the project update.',
      properties: {
        version: { type: Type.STRING },
        goals: { type: Type.ARRAY, items: { type: Type.STRING } },
        tasks: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT, 
            properties: { 
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING }
            }
          }
        }
      },
      required: ['version', 'goals', 'tasks']
    }
  },
  {
    name: 'ide_filesystem_mutation',
    parameters: {
      type: Type.OBJECT,
      description: 'Inject high-performance, modular code. Optimized for WebGPU/Antigravity standards.',
      properties: {
        path: { type: Type.STRING },
        content: { type: Type.STRING },
        optimization: { type: Type.STRING, description: 'e.g., "batching", "tree-shaking", "worker-isolated"' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'ide_matrix_intervention',
    parameters: {
      type: Type.OBJECT,
      description: 'Modify 3D entities. Understands nested hierarchies and material instances.',
      properties: {
        action: { type: Type.STRING, enum: ['add', 'update', 'remove'] },
        payload: { type: Type.STRING }
      },
      required: ['action', 'payload']
    }
  },
  {
    name: 'ide_test_runtime',
    parameters: {
      type: Type.OBJECT,
      description: 'Execute a build and run automated tests on the current runtime state.',
      properties: {
        testCase: { type: Type.STRING, description: 'Logic to verify, e.g., "collision_check", "frame_rate_stability", "variable_sync"' },
        duration: { type: Type.NUMBER, description: 'Test duration in seconds.' }
      },
      required: ['testCase']
    }
  },
  {
    name: 'ide_presentation_mode',
    parameters: {
      type: Type.OBJECT,
      description: 'Engage high-fidelity presentation protocol to show the current game state to the user in clean full-screen.',
      properties: {
        active: { type: Type.BOOLEAN }
      },
      required: ['active']
    }
  },
  {
    name: 'ide_synthesis_request',
    parameters: {
      type: Type.OBJECT,
      description: 'Synthesize cinematic or texture assets using Veo or ImageFX.',
      properties: {
        prompt: { type: Type.STRING },
        modality: { type: Type.STRING, enum: ['image', 'video', 'audio_character'] },
        aspectRatio: { type: Type.STRING, enum: ["1:1", "16:9", "9:16"] }
      },
      required: ['prompt', 'modality']
    }
  },
  {
    name: 'ide_world_grounding_info',
    parameters: {
      type: Type.OBJECT,
      description: 'Fetch project-relevant geographic data concepts for immersive world design.',
      properties: {
        location: { type: Type.STRING },
        detail: { type: Type.STRING, enum: ['topography', 'urban_layout', 'lighting_profile'] }
      },
      required: ['location']
    }
  }
];

export class LiveDirectorSession {
  private nextStartTime = 0;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private session: any = null;

  async connect(onMessage: (msg: string, role: 'user' | 'model') => void) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      this.inputAudioContext = new AudioContext({ sampleRate: 16000 });
      this.outputAudioContext = new AudioContext({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: ModelKey.LIVE_AUDIO,
        callbacks: {
          onopen: () => {
            console.log("[LIVE] Uplink Established.");
            const source = this.inputAudioContext!.createMediaStreamSource(stream);
            const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then((s: any) => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(this.inputAudioContext!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext!.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), this.outputAudioContext!, 24000, 1);
              const source = this.outputAudioContext!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputAudioContext!.destination);
              source.start(this.nextStartTime);
              this.nextStartTime += audioBuffer.duration;
              this.sources.add(source);
            }
            if (message.serverContent?.inputTranscription) onMessage(message.serverContent.inputTranscription.text, 'user');
            if (message.serverContent?.outputTranscription) onMessage(message.serverContent.outputTranscription.text, 'model');
            if (message.serverContent?.interrupted) {
              this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
              this.sources.clear();
              this.nextStartTime = 0;
            }
          },
          onerror: (e) => console.error("[LIVE] Throughput Fault:", e),
        },
        config: {
          tools: [{ functionDeclarations: ideTools }],
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: "You are the Antigravity Director. A high-level engine architect. Be authoritative, efficient, and precise. You have direct access to IDE tools to mutate and test the game world.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
      this.session = await sessionPromise;
    } catch (err) {
      console.error("[LIVE] Initialization Failed:", err);
      throw err;
    }
  }
  close() { if (this.session) this.session.close(); }
}

export const runOrchestration = async (prompt: string, history: Message[], context: string, engineState: string, userPrefs: UserPreferences, version: string) => {
  try {
    const response = await ai.models.generateContent({
      model: ModelKey.COMMANDER,
      contents: [{ role: 'user', parts: [{ text: `Directive: "${prompt}"\nVersion: ${version}\n[PROJECT_TREE]: ${context}\n[ENGINE_STATE]: ${engineState}\n[USER_MEM]: ${JSON.stringify(userPrefs)}` }] }],
      config: {
        systemInstruction: `You are the Antigravity Engine Architect. Master of solo game creation. Goal: Zero friction. Execute multi-step synthesis (Symphony logic).

        If you need to update files or test, call the tools. You can call multiple tools in one turn.
        If a test fails, you must attempt to fix the binary source.
        Once the build is complete and tested, use ide_presentation_mode to show the result.`,
        tools: [{ functionDeclarations: ideTools }],
        thinkingConfig: { thinkingBudget: 1024 }, // Reduced from 32k to 1024 to prevent 429 quota exhaustion while keeping basic reasoning
      },
    });
    limiter.addUsage(response.usageMetadata?.totalTokenCount || 5000);
    return response;
  } catch (error) {
    console.error("[GEMINI] Orchestration Failure:", error);
    // If we hit quota, try to fail gracefully or signal the UI
    if (String(error).includes('429')) {
       return { 
         text: "Director Core is currently rebooting due to high neural load (Quota Exhausted). Please wait 60s and try a smaller directive.",
         functionCalls: []
       } as any;
    }
    throw error;
  }
};

export const runProjectManagerReview = async (files: FileNode[], sceneObjects: SceneObject[], tasks: TodoTask[]) => {
  try {
    const aiLocal = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await aiLocal.models.generateContent({
      model: ModelKey.LITE,
      contents: `Analyze current project state for potential improvements or bottlenecks.
      Files: ${JSON.stringify(files.map(f => f.path))}
      Scene entities: ${sceneObjects.length}
      Current backlog size: ${tasks.length} tasks`,
      config: {
        systemInstruction: "You are the Symphony PM. Analyze project state and provide a JSON array of 3 actionable tasks to improve the project. Each task must have: 'text', 'justification', 'category' (code/asset/gameplay/optimization/vfx), and 'priority' (low/medium/high).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              justification: { type: Type.STRING },
              category: { type: Type.STRING },
              priority: { type: Type.STRING }
            },
            required: ["text", "justification", "category", "priority"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("[GEMINI] PM Review Failed:", error);
    return [];
  }
};

export const generateCinematic = async (prompt: string) => {
  try {
    if (!(await (window as any).aistudio.hasSelectedApiKey())) await (window as any).aistudio.openSelectKey();
    const aiLocal = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await aiLocal.models.generateVideos({
      model: ModelKey.VEO,
      prompt,
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
      await new Promise(r => setTimeout(r, 10000));
      operation = await aiLocal.operations.getVideosOperation({ operation });
    }
    return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${process.env.API_KEY}`;
  } catch (error) {
    console.error("[VEO] Cinematic Synthesis Failed:", error);
    throw error;
  }
};

export const generateAsset = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16") => {
  try {
    const response = await ai.models.generateContent({
      model: ModelKey.ARTIST,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio } }
    });
    const part = response.candidates[0].content.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (error) {
    console.error("[IMAGEFX] Asset Synthesis Failed:", error);
    return null;
  }
};

export const getCodeCompletions = async (prefix: string, suffix: string, filename: string): Promise<CodeCompletion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: ModelKey.LITE,
      contents: `Filename: ${filename}\nPrefix: ${prefix}\nSuffix: ${suffix}`,
      config: {
        systemInstruction: "Antigravity Autocomplete. Pro game dev context. High-perf snippets only.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            completions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { text: { type: Type.STRING }, description: { type: Type.STRING } },
                required: ["text"]
              }
            }
          }
        },
      },
    });
    return JSON.parse(response.text || "{}").completions || [];
  } catch (error) {
    console.error("[LITE] Autocomplete Failed:", error);
    return [];
  }
};
