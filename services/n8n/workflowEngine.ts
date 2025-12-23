/**
 * N8N Workflow Execution Engine
 * Executes workflow graphs with dependency resolution
 */

import { NodeType, getNodeDefinition } from './nodeDefinitions';
import { modelRouter } from '../modelRouter';
import { createFile } from '../bridgeService';
import { orchestrate } from '../agents/orchestratorAgent';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  parameters: Record<string, any>;
}

export interface WorkflowConnection {
  id: string;
  sourceNode: string;
  sourceOutput: string;
  targetNode: string;
  targetInput: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface ExecutionContext {
  variables: Map<string, any>;
  nodeOutputs: Map<string, any>;
}

export class WorkflowEngine {
  private context: ExecutionContext;

  constructor() {
    this.context = {
      variables: new Map(),
      nodeOutputs: new Map()
    };
  }

  /**
   * Execute entire workflow
   */
  async execute(workflow: Workflow): Promise<{ success: boolean; outputs: Record<string, any>; error?: string }> {
    console.log(`[WORKFLOW] Executing: ${workflow.name}`);

    try {
      // Reset context
      this.context.variables.clear();
      this.context.nodeOutputs.clear();

      // Build execution order (topological sort)
      const executionOrder = this.topologicalSort(workflow);

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        console.log(`[WORKFLOW] Executing node: ${node.id} (${node.type})`);

        // Get inputs for this node
        const inputs = this.getNodeInputs(node, workflow);

        // Execute node
        const output = await this.executeNode(node, inputs);

        // Store output
        this.context.nodeOutputs.set(node.id, output);
      }

      return {
        success: true,
        outputs: Object.fromEntries(this.context.nodeOutputs)
      };
    } catch (error) {
      console.error('[WORKFLOW] Execution failed:', error);
      return {
        success: false,
        outputs: {},
        error: String(error)
      };
    }
  }

  /**
   * Get inputs for a node from connected nodes
   */
  private getNodeInputs(node: WorkflowNode, workflow: Workflow): Record<string, any> {
    const inputs: Record<string, any> = {};

    // Find connections targeting this node
    const incomingConnections = workflow.connections.filter(c => c.targetNode === node.id);

    for (const conn of incomingConnections) {
      const sourceOutput = this.context.nodeOutputs.get(conn.sourceNode);
      if (sourceOutput !== undefined) {
        inputs[conn.targetInput] = sourceOutput[conn.sourceOutput] || sourceOutput;
      }
    }

    return inputs;
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: WorkflowNode, inputs: Record<string, any>): Promise<any> {
    const def = getNodeDefinition(node.type);

    switch (node.type) {
      case 'input':
      case 'prompt':
        return { data: node.parameters.value || node.parameters.text };

      case 'ai_text':
        const textResponse = await modelRouter.chat(
          inputs.prompt || node.parameters.prompt || '',
          [],
          'You are a helpful AI assistant.'
        );
        return { text: textResponse.content };

      case 'ai_image':
        const imageResponse = await modelRouter.generateImage(
          inputs.prompt || node.parameters.prompt || ''
        );
        return { imageUrl: imageResponse.imageUrl };

      case 'ai_code':
        const codeResponse = await modelRouter.completeCode(
          inputs.prompt || node.parameters.prompt || '',
          node.parameters.language || 'typescript'
        );
        return { code: codeResponse.code };

      case 'ai_reasoning':
        const reasoningResponse = await modelRouter.chat(
          `Think step-by-step:\n\n${inputs.problem || ''}`,
          [],
          'You are a reasoning AI. Break down complex problems.'
        );
        return { solution: reasoningResponse.content };

      case 'file_writer':
        const writeResult = await createFile(
          inputs.path || node.parameters.path || '',
          inputs.content || node.parameters.content || ''
        );
        return { success: writeResult.success };

      case 'transform':
        try {
          const transformFn = new Function('data', node.parameters.code || 'return data;');
          return { result: transformFn(inputs.data) };
        } catch (e) {
          return { result: inputs.data };
        }

      case 'filter':
        try {
          const filterFn = new Function('data', node.parameters.condition || 'return true;');
          const passes = filterFn(inputs.data);
          return passes ? { true: inputs.data } : { false: inputs.data };
        } catch (e) {
          return { false: inputs.data };
        }

      case 'variable':
        if (node.parameters.operation === 'set') {
          this.context.variables.set(node.parameters.name, inputs.value);
          return { value: inputs.value };
        } else {
          return { value: this.context.variables.get(node.parameters.name) };
        }

      case 'merge':
        return {
          merged: {
            ...inputs.input1,
            ...inputs.input2
          }
        };

      default:
        return {};
    }
  }

  /**
   * Topological sort to determine execution order
   */
  private topologicalSort(workflow: Workflow): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Visit dependencies first
      const dependencies = workflow.connections
        .filter(c => c.targetNode === nodeId)
        .map(c => c.sourceNode);

      for (const depId of dependencies) {
        visit(depId);
      }

      result.push(nodeId);
    };

    // Start with nodes that have no inputs (input nodes)
    const inputNodes = workflow.nodes.filter(node => {
      const hasIncoming = workflow.connections.some(c => c.targetNode === node.id);
      return !hasIncoming;
    });

    for (const node of inputNodes) {
      visit(node.id);
    }

    // Visit any remaining unvisited nodes
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }

    return result;
  }
}

/**
 * Pre-built workflow templates
 */
export const WORKFLOW_TEMPLATES: Record<string, Workflow> = {
  'asset-gen': {
    id: 'asset-gen',
    name: 'Asset Generation Pipeline',
    nodes: [
      {
        id: 'prompt-1',
        type: 'prompt',
        position: { x: 100, y: 100 },
        parameters: { text: 'Create a sci-fi robot character' }
      },
      {
        id: 'ai-image-1',
        type: 'ai_image',
        position: { x: 300, y: 100 },
        parameters: { model: 'imagen', size: '1024x1024' }
      },
      {
        id: 'file-writer-1',
        type: 'file_writer',
        position: { x: 500, y: 100 },
        parameters: { path: 'assets/robot.png' }
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNode: 'prompt-1',
        sourceOutput: 'data',
        targetNode: 'ai-image-1',
        targetInput: 'prompt'
      },
      {
        id: 'conn-2',
        sourceNode: 'ai-image-1',
        sourceOutput: 'imageUrl',
        targetNode: 'file-writer-1',
        targetInput: 'content'
      }
    ]
  },

  'code-gen': {
    id: 'code-gen',
    name: 'Code Generation Pipeline',
    nodes: [
      {
        id: 'prompt-1',
        type: 'prompt',
        position: { x: 100, y: 100 },
        parameters: { text: 'Create a React counter component' }
      },
      {
        id: 'ai-code-1',
        type: 'ai_code',
        position: { x: 300, y: 100 },
        parameters: { language: 'typescript' }
      },
      {
        id: 'file-writer-1',
        type: 'file_writer',
        position: { x: 500, y: 100 },
        parameters: { path: 'src/Counter.tsx' }
      }
    ],
    connections: [
      {
        id: 'conn-1',
        sourceNode: 'prompt-1',
        sourceOutput: 'data',
        targetNode: 'ai-code-1',
        targetInput: 'prompt'
      },
      {
        id: 'conn-2',
        sourceNode: 'ai-code-1',
        sourceOutput: 'code',
        targetNode: 'file-writer-1',
        targetInput: 'content'
      }
    ]
  }
};

export const workflowEngine = new WorkflowEngine();
export default workflowEngine;
