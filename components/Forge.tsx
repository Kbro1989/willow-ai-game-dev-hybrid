/**
 * Forge Component - Multi-Model AI Interface
 * Direct access to all AI model types with orchestration support
 */

import React, { useState, useEffect } from 'react';
import { modelRouter } from '../services/modelRouter';
import { orchestrate } from '../services/agents/orchestratorAgent';
import { generateCinematic } from '../services/cloudflareService';
import PipelineBuilder from './PipelineBuilder';

type ForgeMode = 'text' | 'code' | 'image' | 'audio' | 'video' | 'reasoning' | 'orchestrate' | 'pipeline';

interface ForgeProps {
  onClose?: () => void;
}

export const Forge: React.FC<ForgeProps> = ({ onClose }) => {
  // Debug log to confirm component is mounting
  useEffect(() => {
    console.log("⚒️ Forge Component Mounted");
  }, []);

  const [mode, setMode] = useState<ForgeMode>('text');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [imageSize, setImageSize] = useState<'512x512' | '1024x1024'>('1024x1024');
  const [language, setLanguage] = useState('typescript');

  const handleForge = async () => {
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);
    setOutput('Forging response...');

    try {
      switch (mode) {
        case 'text': {
          const response = await modelRouter.chat(prompt, [],
            `You are a helpful AI assistant. Temperature: ${temperature}. Max tokens: ${maxTokens}.`
          );
          setOutput(`[${response.provider}/${response.model}] ${response.latency}ms\n\n${response.content}`);
          break;
        }

        case 'code': {
          const response = await modelRouter.completeCode(prompt, language);
          setOutput(`[${response.provider}/${response.model}] ${response.latency}ms\n\n\`\`\`${language}\n${response.code}\n\`\`\``);
          break;
        }

        case 'image': {
          const response = await modelRouter.generateImage(prompt);
          setOutput(`[${response.provider}/${response.model}] ${response.latency}ms\n\nImage generated:\n![Generated Image](${response.imageUrl})`);
          break;
        }

        case 'audio': {
          setOutput('[Audio] This requires Gemini Live API - use LiveDirectorSession from geminiService.ts');
          break;
        }

        case 'video': {
          const videoUri = await generateCinematic(prompt);
          setOutput(`[Gemini/VEO] Video generated:\nURI: ${videoUri}\n\nDownload from: https://generativelanguage.googleapis.com/v1beta/${videoUri}`);
          break;
        }

        case 'reasoning': {
          const response = await modelRouter.chat(
            `Think step-by-step and solve this:\n\n${prompt}`,
            [],
            'You are a reasoning AI. Break down complex problems into clear steps.'
          );
          setOutput(`[${response.provider}/${response.model}] ${response.latency}ms\n\n${response.content}`);
          break;
        }

        case 'orchestrate': {
          const result = await orchestrate({
            userRequest: prompt,
            projectContext: 'Forge direct execution',
            history: []
          });

          const summary = [
            `[ORCHESTRATOR] ${result.complete ? 'Complete' : 'Incomplete'}`,
            `\nPlan: ${result.plan.goal}`,
            `\nTasks: ${result.plan.tasks.length}`,
            `\nSteps executed: ${result.steps.length}`,
            `\nFiles created: ${result.files.length}`,
            result.files.length > 0 ? '\n\nCreated Files:' : '',
            ...result.files.map(f => `- ${f.path} (${f.language})`)
          ].join('\n');

          setOutput(summary);
          break;
        }
      }
    } catch (error) {
      console.error("Forge Error:", error);
      setOutput(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const modes: { id: ForgeMode; label: string; icon: string; desc: string }[] = [
    { id: 'text', label: 'Text Chat', icon: '💬', desc: 'General conversation & Q&A' },
    { id: 'code', label: 'Code Gen', icon: '⚡', desc: 'Complete file generation' },
    { id: 'image', label: 'Image', icon: '🎨', desc: 'Texture & asset creation' },
    { id: 'audio', label: 'Audio', icon: '🎤', desc: 'Voice & sound (Gemini Live)' },
    { id: 'video', label: 'Video', icon: '🎬', desc: 'Cinematic generation (VEO)' },
    { id: 'reasoning', label: 'Reasoning', icon: '🧠', desc: 'Step-by-step logic' },
    { id: 'orchestrate', label: 'Orchestra', icon: '🎯', desc: 'Multi-agent coordinator' },
    { id: 'pipeline', label: 'Pipeline', icon: '🔗', desc: 'Visual workflow builder' }
  ];

  return (
    <div className="flex flex-col min-h-[600px] h-full w-full bg-[#050a15] text-white relative z-10 border border-cyan-500/20 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-cyan-500/30 bg-[#0a1222]">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400">
            ⚒️ The Forge
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Direct model access & orchestration</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-all"
            aria-label="Close Forge"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="p-4 border-b border-slate-700 bg-[#0a1222]">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center ${mode === m.id
                ? 'bg-cyan-600 border-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                : 'bg-slate-800 border-slate-700 hover:border-cyan-500/50'
                }`}
              title={m.desc}
            >
              <div className="text-xl mb-1">{m.icon}</div>
              <div className="text-[10px] font-black uppercase tracking-tighter">
                {m.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="p-4 border-b border-slate-700 bg-[#0a1222]/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(mode === 'text' || mode === 'reasoning') && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">
                  Temperature: <span className="text-cyan-400">{temperature}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-cyan-400 focus:border-cyan-500 outline-none"
                />
              </div>
            </>
          )}

          {mode === 'code' && (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-cyan-400 focus:border-cyan-500 outline-none"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
              </select>
            </div>
          )}

          {mode === 'image' && (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">
                Image Size
              </label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-cyan-400 focus:border-cyan-500 outline-none"
              >
                <option value="512x512">512x512</option>
                <option value="1024x1024">1024x1024</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden bg-[#050a15]">
        {mode === 'pipeline' ? (
          <PipelineBuilder />
        ) : (
          <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-[150px]">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest">
                Prompt / Input
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Type your instructions for ${mode} mode...`}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-4 text-sm text-cyan-100 font-mono outline-none resize-none shadow-inner transition-colors"
              />
            </div>

            <button
              onClick={handleForge}
              disabled={isProcessing || !prompt.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black uppercase text-sm tracking-[0.3em] py-5 rounded-xl transition-all shadow-[0_0_25px_rgba(0,242,255,0.2)] active:scale-[0.98]"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Forging...
                </span>
              ) : '⚒️ Forge Execute'}
            </button>

            {/* Output Area */}
            {output && (
              <div className="flex-1 flex flex-col min-h-[150px] animate-in fade-in slide-in-from-bottom-2">
                <label className="text-[10px] font-black uppercase text-emerald-500 block mb-3 tracking-widest">
                  Process Output
                </label>
                <div className="flex-1 bg-slate-950 border border-emerald-500/30 rounded-xl p-5 text-sm text-emerald-400 font-mono overflow-auto whitespace-pre-wrap shadow-2xl">
                  {output}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Forge;
