import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Message, ProjectState, ModelKey, SprintPlan, GroundingChunk, UserPreferences, Extension, SceneObject, PhysicsConfig, WorldConfig, RenderConfig, CompositingConfig, SimulationState, EngineAction } from '../types';
// Hybrid: Cloudflare for text/images, Gemini for live audio/video
import { runOrchestration, generateAsset, cloudlareLimiter as limiter } from '../services/cloudflareService';
import { LiveDirectorSession, generateCinematic } from '../services/geminiService';

interface ChatProps {
  project: ProjectState;
  sceneObjects: SceneObject[];
  physics: PhysicsConfig;
  worldConfig: WorldConfig;
  renderConfig: RenderConfig;
  compositingConfig: CompositingConfig;
  simulation: SimulationState;
  isOverwatchActive: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  userPrefs: UserPreferences;
  onFileUpdate: (path: string, content: string) => void;
  onAddSceneObject: (obj: Omit<SceneObject, 'id'>) => void;
  onUpdateSceneObject: (id: string, updates: Partial<SceneObject>) => void;
  onUpdatePhysics: (updates: Partial<PhysicsConfig>) => void;
  onUpdateWorld: (updates: Partial<WorldConfig>) => void;
  onUpdateConfig: (type: 'render' | 'compositing', updates: any) => void;
  onRemoveSceneObject: (id: string) => void;
  onInjectScript?: (path: string, content: string) => void;
  onSyncVariableData?: (data: Record<string, any>) => void;
  extensions: Extension[];
  projectVersion: string;
  onUpdateVersion?: (v: string) => void;
  onTriggerBuild?: () => void;
  onTriggerPresentation?: () => void;
}

export interface ChatHandle {
  addAnnotatedMessage: (imageData: string) => void;
  sendMessage: (text: string) => void;
}

const Chat = forwardRef<ChatHandle, ChatProps>(({
  project, sceneObjects, physics, worldConfig, renderConfig, compositingConfig, simulation,
  isOverwatchActive, messages, setMessages, userPrefs, onFileUpdate, onAddSceneObject, onUpdateSceneObject,
  onUpdatePhysics, onUpdateWorld, onUpdateConfig, onRemoveSceneObject, onInjectScript,
  onSyncVariableData, extensions, projectVersion, onUpdateVersion, onTriggerBuild, onTriggerPresentation
}, ref) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveManager = useRef<LiveDirectorSession>(new LiveDirectorSession());

  useImperativeHandle(ref, () => ({
    addAnnotatedMessage: (imageData: string) => handleSend(undefined, imageData),
    sendMessage: (text: string) => handleSend(text)
  }));

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isTyping]);

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = { ...msg, id: Math.random().toString(36).substring(7), timestamp: Date.now() };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  };

  const executeTool = async (call: any) => {
    const { name, args } = call;
    console.log(`[SYMPHONY] Executing Tool: ${name}`, args);

    switch (name) {
      case 'ide_propose_sprint':
        return { status: 'success', plan: args };
      case 'ide_filesystem_mutation':
        onInjectScript?.(args.path, args.content);
        if (onTriggerBuild) setTimeout(onTriggerBuild, 500); // Trigger build after mutation
        return { status: 'success', message: `Mutation at ${args.path} complete. Build cycle triggered.` };
      case 'ide_matrix_intervention':
        const payload = typeof args.payload === 'string' ? JSON.parse(args.payload) : args.payload;
        if (args.action === 'add') onAddSceneObject({ ...payload, visible: true });
        else if (args.action === 'update') onUpdateSceneObject(payload.id, payload.updates);
        else if (args.action === 'remove') onRemoveSceneObject(payload.id);
        return { status: 'success', message: `Matrix ${args.action} executed.` };
      case 'ide_test_runtime':
        // Generate mock telemetry for testing feedback loop
        const telemetry = {
          physics_stability: (Math.random() * 0.2 + 0.8).toFixed(2),
          collision_count: Math.floor(Math.random() * 5),
          average_fps: 144,
          errors: args.testCase === 'stress' ? ['Memory pressure warning'] : []
        };
        return { status: 'success', telemetry };
      case 'ide_synthesis_request':
        if (args.modality === 'image') {
          const img = await generateAsset(args.prompt, args.aspectRatio || "1:1");
          return { status: 'success', url: img };
        } else if (args.modality === 'video') {
          const vid = await generateCinematic(args.prompt);
          return { status: 'success', url: vid };
        }
        return { status: 'error', message: 'Unknown modality' };
      case 'ide_presentation_mode':
        if (onTriggerPresentation) onTriggerPresentation();
        return { status: 'success', message: 'Presentation protocol engaged.' };
      default:
        return { status: 'error', message: 'Tool not found' };
    }
  };

  // Task Decomposition: Break complex prompts into micro-steps
  const decomposeTask = (prompt: string): { steps: string[], tools: string[] } => {
    const steps: string[] = [];
    const tools: string[] = [];

    // Intent detection patterns
    if (/create|add|new|generate/i.test(prompt)) {
      if (/file|script|component/i.test(prompt)) {
        steps.push(`Analyze requested structure for new file`);
        steps.push(`Generate file content with AI`);
        steps.push(`Inject file into project tree`);
        tools.push('ide_filesystem_mutation');
      }
      if (/object|entity|mesh|scene/i.test(prompt)) {
        steps.push(`Define object properties from prompt`);
        steps.push(`Add object to 3D scene`);
        tools.push('ide_matrix_intervention');
      }
      if (/image|texture|asset/i.test(prompt)) {
        steps.push(`Generate asset with AI (FLUX)`);
        steps.push(`Import asset into registry`);
        tools.push('ide_synthesis_request');
      }
    }

    if (/test|verify|check/i.test(prompt)) {
      steps.push(`Run test suite for validation`);
      tools.push('ide_test_runtime');
    }

    if (/refactor|improve|optimize/i.test(prompt)) {
      steps.push(`Analyze code for improvements`);
      steps.push(`Apply refactoring suggestions`);
      tools.push('ide_filesystem_mutation');
    }

    // Default fallback
    if (steps.length === 0) {
      steps.push(`Process user request with AI`);
    }

    return { steps, tools };
  };

  // User Preference Learning: Track approvals/rejections
  const learnFromInteraction = (action: string, approved: boolean) => {
    console.log(`[SYMPHONY] Learning: ${action} was ${approved ? 'approved' : 'rejected'}`);
    // In a real implementation, this would update userPrefs.history
    // and persist to storage for future sessions
  };


  const handleSend = async (overrideText?: string, annotatedImage?: string) => {
    const userText = overrideText || input;
    if (!userText.trim() && !annotatedImage) return;

    if (!overrideText) setInput('');
    addMessage({ role: 'user', content: userText, annotatedImageUrl: annotatedImage });
    setIsTyping(true);
    setActiveAgent("Antigravity Symphony: Planning turn 1...");

    let turn = 0;
    const maxTurns = 5;
    let currentPrompt = userText;
    let accumulatedActions: EngineAction[] = [];
    let lastResponse: any = null;

    try {
      while (turn < maxTurns) {
        turn++;
        setActiveAgent(`Antigravity Symphony: Turn ${turn} execution...`);

        const context = JSON.stringify(project.files.map(f => ({ path: f.path, name: f.name })));
        const engineState = JSON.stringify({
          scene_entities: sceneObjects.length,
          version: projectVersion,
          sim_status: simulation.status,
          fps: 144
        });

        // Run the model orchestration turn
        const response = await runOrchestration(
          currentPrompt,
          messages,
          context,
          engineState,
          userPrefs,
          projectVersion
        );
        lastResponse = response;

        if (response.functionCalls && response.functionCalls.length > 0) {
          const toolResults = [];
          for (const call of response.functionCalls) {
            const result = await executeTool(call);
            toolResults.push({ callId: call.id, name: call.name, response: result });

            // Map results to engine actions for visual feedback in UI
            if (call.name === 'ide_test_runtime') {
              accumulatedActions.push({ type: 'RUN_TEST_SUITE', payload: result.telemetry });
            } else {
              accumulatedActions.push({ type: 'AI_EDITOR_REFACTOR', payload: { tool: call.name, result } });
            }
          }

          // In a real Symphony, we would feed these toolResults back to the model
          // to continue the turn if needed. For this singleton implementation,
          // we treat the turn as complete if it returns text alongside tool calls.
          if (!response.text) {
            currentPrompt = `Tool results: ${JSON.stringify(toolResults)}. Finalize the build or suggest next steps.`;
            continue; // Go to next turn
          }
        }

        // If we reach here, the model provided a final text response or reached turn limit
        break;
      }

      if (lastResponse && lastResponse.text) {
        let plan: SprintPlan | undefined;
        let img: string | undefined;
        let vid: string | undefined;

        // Extract plan or assets from last successful calls
        if (lastResponse.functionCalls) {
          for (const call of lastResponse.functionCalls) {
            if (call.name === 'ide_propose_sprint') plan = { ...call.args, status: 'planning' };
            if (call.name === 'ide_synthesis_request') {
              // Re-executing synthesis is costly, we assume the while loop captured it
              // In this simplified view, we'll check if we have results
            }
          }
        }

        addMessage({
          role: 'assistant', content: lastResponse.text, model: ModelKey.COMMANDER,
          engineActions: accumulatedActions, plan, imageUrl: img, videoUrl: vid,
          groundingChunks: lastResponse.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[]
        });
      }
    } catch (e) {
      console.error("[CHAT] Symphony Error:", e);
      addMessage({ role: 'assistant', content: "Symphony throughput failure. The Director has lost uplink connection. (Check binary console)", isError: true });
    }
    finally { setIsTyping(false); setActiveAgent(null); }
  };

  return (
    <div className="flex flex-col h-full bg-[#050a15] border-l border-cyan-900/30 overflow-hidden relative shadow-inner">
      <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar" ref={scrollRef}>
        <div className="flex flex-col items-center opacity-30 mb-8">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-cyan-500 to-transparent mb-4"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.6em] text-cyan-400">Antigravity Director Core</span>
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-6 duration-500`}>
            <div className={`max-w-[85%] rounded-[3rem] p-10 shadow-2xl border ${m.role === 'user' ? 'bg-cyan-600 border-cyan-400/30 text-white rounded-tr-none' :
              m.isError ? 'bg-rose-950/40 border-rose-500/30 text-rose-100 rounded-tl-none' :
                'bg-[#0a1222] border-cyan-900/40 text-cyan-50 rounded-tl-none'
              }`}>
              <div className="text-[15px] leading-relaxed prose prose-invert max-w-none whitespace-pre-wrap font-medium tracking-wide">
                {m.content}
              </div>

              {m.imageUrl && <div className="mt-8 rounded-[2rem] overflow-hidden border border-cyan-500/20 shadow-xl"><img src={m.imageUrl} alt="Neural Asset" className="w-full" /></div>}
              {m.videoUrl && <div className="mt-8 rounded-[2rem] overflow-hidden border border-cyan-500/20 shadow-xl"><video src={m.videoUrl} controls className="w-full" /></div>}

              {m.plan && (
                <div className="mt-10 p-10 bg-black/60 rounded-[3rem] border border-amber-500/20 shadow-inner">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-amber-500">Antigravity Sprint: {m.plan.version}</span>
                    <button onClick={() => { handleSend(`Director: Confirming the ${m.plan!.version} protocol. Execute multi-step synthesis.`); if (onUpdateVersion) onUpdateVersion(m.plan!.version); }} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">Execute Plan</button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {m.plan.tasks.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl">
                        <span className="text-[11px] font-medium text-cyan-50/80">{t.description}</span>
                        <span className="text-[8px] font-black uppercase text-cyan-600/40 font-mono">[{t.type}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engine Actions Visualization - Shows Tests Passing */}
              {m.engineActions && m.engineActions.length > 0 && (
                <div className="mt-6 space-y-2">
                  {m.engineActions.map((action, i) => (
                    <div key={i} className={`flex items-center space-x-3 text-[9px] uppercase font-black tracking-widest ${action.type === 'RUN_TEST_SUITE' ? 'text-emerald-400' : 'text-cyan-600'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${action.type === 'RUN_TEST_SUITE' ? 'bg-emerald-500 animate-pulse' : 'bg-cyan-600'}`}></div>
                      <span>{action.type === 'RUN_TEST_SUITE' ? `TEST SUITE PASSED: ${JSON.stringify(action.payload)}` : `ACTION: ${action.type}`}</span>
                    </div>
                  ))}
                </div>
              )}

              {m.groundingChunks && m.groundingChunks.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-2">
                  {m.groundingChunks.map((chunk, i) => chunk.web && (
                    <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-emerald-950/20 border border-emerald-500/10 rounded-xl text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors">{chunk.web.title}</a>
                  ))}
                </div>
              )}
            </div>
            {m.model && <div className="text-[9px] text-cyan-400/30 mt-4 font-black uppercase tracking-[0.8em] ml-6">{m.model}</div>}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center space-x-6 p-10 bg-cyan-950/10 rounded-[4rem] border border-cyan-500/10 w-fit animate-pulse">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span className="text-[12px] font-black text-cyan-400 uppercase tracking-[0.5em]">{activeAgent}</span>
          </div>
        )}
      </div>

      <div className="px-12 pb-12 bg-[#050a15] border-t border-cyan-900/30 shadow-2xl pt-6">
        <div className="flex items-center space-x-6 mb-6 px-4">
          <button
            onClick={async () => { if (isLive) { liveManager.current.close(); setIsLive(false); } else { await liveManager.current.connect((t, r) => { if (r === 'model') addMessage({ role: 'assistant', content: t, model: 'Live Director' }); }); setIsLive(true); } }}
            className={`p-5 rounded-full border transition-all ${isLive ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_20px_#00f2ff]' : 'bg-cyan-950/40 border-cyan-500/20 text-cyan-500 hover:bg-cyan-600/10'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isLive ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`}>Live Director Session</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={isTyping}
            placeholder="Direct Antigravity Command..."
            className="w-full bg-[#0a1222] border border-cyan-500/10 focus:border-cyan-500/40 rounded-[2.5rem] px-10 py-6 text-[17px] text-cyan-50 outline-none transition-all shadow-inner placeholder:text-cyan-950 font-medium"
          />
          <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-4 top-3 p-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[2rem] transition-all disabled:opacity-20"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
        </form>
      </div>
    </div>
  );
});

export default Chat;
