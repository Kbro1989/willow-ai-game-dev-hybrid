/**
 * Gemini-Only Service (Hybrid Mode)
 * Keeps only features that require Gemini: Live Audio and VEO Video
 * All text/image/code functions migrated to cloudflareService.ts
 */

import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { ModelKey } from "../types";

// Removed global auto-init to prevent crash on load
// const ai = new GoogleGenerativeAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });


// Base-64 helpers for Live Audio (These will be used in the Cloudflare Worker setup)
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

// IDE Tools for Live Audio Session (Using string literals for types, compatible with FunctionDeclaration)
export const ideTools: FunctionDeclaration[] = [
  {
    name: 'ide_propose_sprint',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Propose a structured architectural roadmap for the project update.',
      properties: {
        version: { type: SchemaType.STRING },
        goals: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        tasks: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { id: { type: SchemaType.STRING }, description: { type: SchemaType.STRING }, type: { type: SchemaType.STRING } } } }
      },
      required: ['version', 'goals', 'tasks']
    }
  },
  {
    name: 'ide_filesystem_mutation',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Inject code into the filesystem.',
      properties: { path: { type: SchemaType.STRING }, content: { type: SchemaType.STRING }, optimization: { type: SchemaType.STRING } },
      required: ['path', 'content']
    }
  },
  {
    name: 'ide_matrix_intervention',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Modify 3D entities.',
      properties: { action: { type: SchemaType.STRING, enum: ['add', 'update', 'remove'], format: 'enum' }, payload: { type: SchemaType.STRING } },
      required: ['action', 'payload']
    }
  },
  {
    name: 'ide_presentation_mode',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Engage fullscreen presentation mode.',
      properties: { active: { type: SchemaType.BOOLEAN } },
      required: ['active']
    }
  },
  {
    name: 'generate_image',
    description: 'Generate an image based on a text prompt using Cloudflare AI.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prompt: { type: SchemaType.STRING, description: 'The text prompt to generate the image from.' },
      },
      required: ['prompt']
    }
  },
  {
    name: 'synthesize_speech',
    description: 'Convert text to speech using Cloudflare AI.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        text: { type: SchemaType.STRING, description: 'The text to convert to speech.' },
      },
      required: ['text']
    }
  },
  {
    name: 'generate_cinematic',
    description: 'Generate a cinematic video based on a text prompt via Cloudflare Worker.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prompt: { type: SchemaType.STRING, description: 'The text prompt to generate the video from.' },
      },
      required: ['prompt']
    }
  },
  // --- Local Code Agent Tools ---
  {
    name: 'run_terminal_command',
    description: 'Execute a command in the local terminal via WebSocket tunnel. Use this to install packages, run scripts, or interact with the local filesystem.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        command: { type: SchemaType.STRING, description: 'The terminal command to execute.' },
      },
      required: ['command']
    }
  },
  {
    name: 'read_local_file',
    description: 'Read the content of a local file via WebSocket tunnel. Provide a relative path from the project root.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: { type: SchemaType.STRING, description: 'The path to the local file (relative to project root).' },
      },
      required: ['filePath']
    }
  },
  {
    name: 'write_local_file',
    description: 'Write content to a local file via WebSocket tunnel. Provide a relative path from the project root.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: { type: SchemaType.STRING, description: 'The path to the local file (relative to project root).' },
        content: { type: SchemaType.STRING, description: 'The content to write to the file.' },
      },
      required: ['filePath', 'content']
    }
  },
  {
    name: 'delete_local_file',
    description: 'Delete a local file via WebSocket tunnel. Provide a relative path from the project root.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filePath: { type: SchemaType.STRING, description: 'The path to the local file (relative to project root).' },
      },
      required: ['filePath']
    }
  }
];

/**
 * Live Audio Director Session
 * Real-time voice interaction with AI via Cloudflare Worker for Speech-to-Text and Text-to-Speech
 * (Frontend client implementation)
 */
export class LiveDirectorSession {
  private ws: WebSocket | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async connect(onMessage: (msg: string, role: 'user' | 'model') => void) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn("Already connected to LiveDirectorSession.");
      return;
    }

    // Connect to your Cloudflare Worker WebSocket endpoint
    this.ws = new WebSocket("ws://localhost:8787/live-audio"); // Replace with your actual Worker URL

    this.ws.onopen = () => {
      console.log("[LIVE] Uplink Established to Cloudflare Worker.");
      onMessage("Uplink Established.", "model");
      this.startAudioStreaming();
    };

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'transcription') {
        onMessage(message.text, 'user');
      } else if (message.type === 'speech') {
        // Assume message.audio is base64 encoded audio
        const audioBuffer = await decodeAudioData(decode(message.audio), this.audioContext!, 24000, 1);
        this.audioQueue.push(audioBuffer.getChannelData(0).buffer);
        this.processAudioQueue();
      } else if (message.type === 'model_response') {
        onMessage(message.text, 'model');
      }
    };

    this.ws.onclose = () => {
      console.log("[LIVE] Uplink Disconnected from Cloudflare Worker.");
      this.stopAudioStreaming();
    };

    this.ws.onerror = (error) => {
      console.error("[LIVE] Throughput Fault with Cloudflare Worker:", error);
      onMessage("Uplink Fault.", "model");
    };
  }

  private async startAudioStreaming() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Use webm for browser compatibility

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(event.data); // Send audio chunks to worker
        }
      };

      this.mediaRecorder.start(100); // Send data every 100ms
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }

  private stopAudioStreaming() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    this.audioQueue = [];
    this.isPlaying = false;
  }

  private async processAudioQueue() {
    if (this.audioQueue.length === 0 || this.isPlaying) return;

    this.isPlaying = true;
    const audioData = this.audioQueue.shift();

    if (audioData && this.audioContext) {
      const source = this.audioContext.createBufferSource();
      const buffer = this.audioContext.createBuffer(1, audioData.byteLength / 2, 24000); // Assuming 16-bit PCM
      buffer.copyToChannel(new Float32Array(audioData), 0);
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.onended = () => {
        this.isPlaying = false;
        this.processAudioQueue(); // Play next chunk
      };
      source.start();
    } else {
      this.isPlaying = false;
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopAudioStreaming();
  }
}

/**
 * Generate Cinematic Video via VEO
 * (Frontend client implementation - will interact with Cloudflare Worker for video generation)
 */
export const generateCinematic = async (prompt: string) => {
  console.warn("generateCinematic is currently a placeholder. It will interact with a Cloudflare Worker for video generation.");
  try {
    const response = await fetch("http://localhost:8787/generate-video", { // Replace with your actual Worker URL
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, apiKey: import.meta.env.VITE_GEMINI_API_KEY }), // Pass API key securely via worker
    });

    if (!response.ok) {
      throw new Error(`Video generation failed: ${response.statusText}`);
    }

    const result = await response.json();
    // Assuming the worker returns a video URI
    return result.videoUri;

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
