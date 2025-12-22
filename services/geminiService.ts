/**
 * Gemini-Only Service (Hybrid Mode)
 * Keeps only features that require Gemini: Live Audio and VEO Video
 * All text/image/code functions migrated to cloudflareService.ts
 */

import { GoogleGenAI, Modality, LiveServerMessage, FunctionDeclaration, Type } from "@google/genai";
import { ModelKey } from "../types";

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

// IDE Tools for Live Audio Session
const ideTools: FunctionDeclaration[] = [
  {
    name: 'ide_propose_sprint',
    parameters: {
      type: Type.OBJECT,
      description: 'Propose a structured architectural roadmap for the project update.',
      properties: {
        version: { type: Type.STRING },
        goals: { type: Type.ARRAY, items: { type: Type.STRING } },
        tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING } } } }
      },
      required: ['version', 'goals', 'tasks']
    }
  },
  {
    name: 'ide_filesystem_mutation',
    parameters: {
      type: Type.OBJECT,
      description: 'Inject code into the filesystem.',
      properties: { path: { type: Type.STRING }, content: { type: Type.STRING }, optimization: { type: Type.STRING } },
      required: ['path', 'content']
    }
  },
  {
    name: 'ide_matrix_intervention',
    parameters: {
      type: Type.OBJECT,
      description: 'Modify 3D entities.',
      properties: { action: { type: Type.STRING, enum: ['add', 'update', 'remove'] }, payload: { type: Type.STRING } },
      required: ['action', 'payload']
    }
  },
  {
    name: 'ide_presentation_mode',
    parameters: {
      type: Type.OBJECT,
      description: 'Engage fullscreen presentation mode.',
      properties: { active: { type: Type.BOOLEAN } },
      required: ['active']
    }
  }
];

/**
 * Live Audio Director Session
 * Real-time voice interaction with AI
 * GEMINI-ONLY - No Cloudflare equivalent
 */
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
              this.sources.forEach(s => { try { s.stop(); } catch (e) { } });
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
          systemInstruction: "You are the Antigravity Director. A high-level engine architect. Be authoritative, efficient, and precise.",
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

/**
 * Generate Cinematic Video via VEO
 * GEMINI-ONLY - No Cloudflare equivalent
 */
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

// ============================================
// MIGRATED TO CLOUDFLARE - See cloudflareService.ts
// ============================================
// - runOrchestration (text chat) --> cloudflareService.runOrchestration
// - generateAsset (images) --> cloudflareService.generateAsset
// - getCodeCompletions --> cloudflareService.getCodeCompletions
// - runProjectManagerReview --> cloudflareService.runProjectManagerReview
