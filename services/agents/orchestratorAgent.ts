/**
 * Orchestrator Agent
 * Master coordinator using DeepSeek R1 or Qwen to decompose complex requests
 * Delegates to specialized agents and coordinates multi-step execution
 */

import { modelRouter } from '../modelRouter';
import { createFile } from '../bridgeService';
import { allTools } from '../toolDefinitions';
import { analyzeImage } from '../visionService';

export interface OrchestrationRequest {
  userRequest: string;
  projectContext: string;
  history: Array<{ role: 'user' | 'model'; content: string }>;
}

export interface OrchestrationResult {
  plan: ExecutionPlan;
  steps: ExecutionStep[];
  files: CreatedFile[];
  complete: boolean;
}

export interface ExecutionPlan {
  goal: string;
  tasks: Task[];
  estimatedSteps: number;
}

export interface Task {
  id: string;
  description: string;
  agent: 'code' | 'reasoning' | 'image' | 'vision';
  dependencies: string[];
  status: 'pending' | 'running' | 'complete' | 'failed';
}

export interface ExecutionStep {
  id: string;
  agent: string;
  action: string;
  result?: any;
  timestamp: number;
}

export interface CreatedFile {
  path: string;
  language: string;
  size: number;
  timestamp: number;
}

/**
 * Main orchestration function
 * Takes user request, creates plan, executes with specialized agents
 */
export async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
  const startTime = Date.now();
  console.log('[ORCHESTRATOR] Starting orchestration:', request.userRequest);

  // Step 1: Create execution plan using thinking model
  const plan = await createExecutionPlan(request);
  console.log('[ORCHESTRATOR] Plan created:', plan);

  // Step 2: Execute tasks in order
  const steps: ExecutionStep[] = [];
  const files: CreatedFile[] = [];

  for (const task of plan.tasks) {
    task.status = 'running';

    const step: ExecutionStep = {
      id: task.id,
      agent: task.agent,
      action: task.description,
      timestamp: Date.now()
    };

    try {
      // Execute based on agent type
      const result = await executeTask(task, request.projectContext);
      step.result = result;
      task.status = 'complete';

      // Track created files
      if (result.files) {
        files.push(...result.files);
      }
    } catch (error) {
      console.error(`[ORCHESTRATOR] Task ${task.id} failed:`, error);
      task.status = 'failed';
      step.result = { error: String(error) };
    }

    steps.push(step);
  }

  const duration = Date.now() - startTime;
  console.log(`[ORCHESTRATOR] Complete in ${duration}ms - ${files.length} files created`);

  return {
    plan,
    steps,
    files,
    complete: plan.tasks.every(t => t.status === 'complete')
  };
}

/**
 * Create execution plan using thinking model (DeepSeek R1 / Qwen)
 */
async function createExecutionPlan(request: OrchestrationRequest): Promise<ExecutionPlan> {
  const systemPrompt = `You are an AI orchestration planner. Analyze user requests and create detailed execution plans.

Given a user request, break it down into discrete tasks that can be executed by specialized agents:
- CODE: Generate complete, production-ready files (games, apps, components)
- REASONING: Design algorithms, logic, AI opponents
- IMAGE: Generate textures, sprites, UI assets
- VISION: Analyze screenshots or existing assets

CRITICAL RULES:
1. Create COMPLETE, working implementations - no placeholders or stubs
2. Generate ALL necessary files for the request
3. Files must be production-ready with proper error handling
4. Each task must have clear dependencies
5. Prefer code agent for all file generation

Output format (JSON):
{
  "goal": "brief description",
  "tasks": [
    {
      "id": "task-1",
      "description": "Create index.html with Three.js setup",
      "agent": "code",
      "dependencies": []
    }
  ],
  "estimatedSteps": 5
}`;

  const prompt = `User Request: "${request.userRequest}"

Project Context:
${request.projectContext}

Create a detailed execution plan to fully implement this request. Include ALL files needed.`;

  try {
    const response = await modelRouter.chat(prompt, request.history, systemPrompt);

    // Parse plan from response
    const jsonMatch = response.content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]) as ExecutionPlan;
      return plan;
    }

    // Fallback: create simple plan
    return {
      goal: request.userRequest,
      tasks: [
        {
          id: 'task-1',
          description: request.userRequest,
          agent: 'code',
          dependencies: [],
          status: 'pending'
        }
      ],
      estimatedSteps: 1
    };
  } catch (error) {
    console.error('[ORCHESTRATOR] Plan creation failed:', error);
    throw error;
  }
}

/**
 * Execute a single task with appropriate agent
 */
async function executeTask(task: Task, context: string): Promise<any> {
  console.log(`[ORCHESTRATOR] Executing ${task.agent} task:`, task.description);

  switch (task.agent) {
    case 'code':
      return executeCodeTask(task, context);

    case 'reasoning':
      return executeReasoningTask(task, context);

    case 'image':
      return executeImageTask(task, context);

    case 'vision':
      return executeVisionTask(task, context);

    default:
      throw new Error(`Unknown agent type: ${task.agent}`);
  }
}

/**
 * Code Agent: Generate complete files
 */
async function executeCodeTask(task: Task, context: string): Promise<{ files: CreatedFile[] }> {
  const systemPrompt = `You are an expert code generator. Generate complete, production-ready files.

CRITICAL RULES:
- Generate COMPLETE implementations, never use placeholders like "// TODO" or "// Add logic here"
- Include ALL necessary imports, dependencies, and logic
- Add proper error handling and edge cases
- Use modern best practices and clean code
- Files must work immediately without modification`;

  const prompt = `Task: ${task.description}

Context:
${context}

Generate complete, working code. Respond with JSON:
{
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>...",
      "language": "html"
    }
  ]
}`;

  try {
    const response = await modelRouter.chat(prompt, [], systemPrompt);

    // Parse files from response
    const jsonMatch = response.content?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No files generated');
    }

    const data = JSON.parse(jsonMatch[0]);
    const createdFiles: CreatedFile[] = [];

    // Create each file via bridge
    for (const file of data.files) {
      const result = await createFile(file.path, file.content, file.language);

      if (result.success) {
        createdFiles.push({
          path: file.path,
          language: file.language,
          size: file.content.length,
          timestamp: Date.now()
        });
        console.log(`[CODE AGENT] Created: ${file.path}`);
      } else {
        console.error(`[CODE AGENT] Failed to create ${file.path}:`, result.error);
      }
    }

    return { files: createdFiles };
  } catch (error) {
    console.error('[CODE AGENT] Execution failed:', error);
    throw error;
  }
}

/**
 * Reasoning Agent: Design algorithms and logic
 */
async function executeReasoningTask(task: Task, context: string): Promise<{ algorithm: string }> {
  const systemPrompt = `You are an expert algorithm designer. Design efficient, elegant algorithms and logic.

Focus on:
- Optimal time/space complexity
- Clean, maintainable code structure
- Proper error handling
- Well-documented logic`;

  const prompt = `Task: ${task.description}

Context:
${context}

Design the algorithm or logic. Return implementation code.`;

  const response = await modelRouter.chat(prompt, [], systemPrompt);

  return {
    algorithm: response.content || ''
  };
}

/**
 * Image Agent: Generate textures and assets
 */
async function executeImageTask(task: Task, context: string): Promise<{ files: CreatedFile[] }> {
  // Extract prompt from task description
  const prompt = task.description.replace(/^generate\s+/i, '');

  const response = await modelRouter.generateImage(prompt);

  if (!response.imageUrl) {
    throw new Error('Image generation failed');
  }

  // Save image via bridge (implementation depends on image format)
  const path = `assets/${task.id}.png`;

  return {
    files: [{
      path,
      language: 'image',
      size: 0,
      timestamp: Date.now()
    }]
  };
}

/**
 * Vision Agent: Analyze visual assets
 */
async function executeVisionTask(task: Task, context: string): Promise<{ analysis: string }> {
  // This is a placeholder for how you might get the image data.
  // In a real application, the task would need to specify the image to analyze,
  // and you would need to fetch that image data.
  const imageFile = new File([], "placeholder.png"); // Placeholder

  const result = await analyzeImage(imageFile, task.description);

  return {
    analysis: result?.analysis || 'No analysis available.'
  };
}

export const orchestratorAgent = {
  orchestrate,
  createExecutionPlan
};

export default orchestratorAgent;
