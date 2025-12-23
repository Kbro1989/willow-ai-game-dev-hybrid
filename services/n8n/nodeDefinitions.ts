/**
 * N8N Node Definitions
 * Defines all available workflow nodes and their schemas
 */

export type NodeType =
  | 'input' | 'prompt' | 'image_upload' | 'file_input' | 'variable'
  | 'ai_text' | 'ai_image' | 'ai_code' | 'ai_reasoning'
  | 'transform' | 'filter' | 'loop' | 'merge'
  | 'file_writer' | '3d_export' | 'git_commit' | 'deploy'
  | 'cloudflare' | 'github' | 'discord' | 'http';

export interface NodeDefinition {
  type: NodeType;
  category: 'input' | 'processing' | 'ai' | 'output' | 'integration';
  label: string;
  icon: string;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  parameters: NodeParameter[];
}

export interface NodePort {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required: boolean;
}

export interface NodeParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'code';
  label: string;
  default?: any;
  options?: Array<{ label: string; value: any }>;
  required?: boolean;
}

export const NODE_DEFINITIONS: Record<NodeType, NodeDefinition> = {
  // INPUT NODES
  input: {
    type: 'input',
    category: 'input',
    label: 'Input',
    icon: '📥',
    description: 'Manual input trigger',
    inputs: [],
    outputs: [{ name: 'data', type: 'any', required: false }],
    parameters: [
      { name: 'value', type: 'textarea', label: 'Input Value', default: '' }
    ]
  },

  prompt: {
    type: 'prompt',
    category: 'input',
    label: 'Prompt',
    icon: '💭',
    description: 'Text prompt input',
    inputs: [],
    outputs: [{ name: 'prompt', type: 'string', required: true }],
    parameters: [
      { name: 'text', type: 'textarea', label: 'Prompt Text', required: true }
    ]
  },

  image_upload: {
    type: 'image_upload',
    category: 'input',
    label: 'Image Upload',
    icon: '🖼️',
    description: 'Upload reference image',
    inputs: [],
    outputs: [{ name: 'image', type: 'object', required: true }],
    parameters: [
      { name: 'url', type: 'string', label: 'Image URL', required: true }
    ]
  },

  file_input: {
    type: 'file_input',
    category: 'input',
    label: 'File Input',
    icon: '📄',
    description: 'Read file from filesystem',
    inputs: [],
    outputs: [{ name: 'content', type: 'string', required: true }],
    parameters: [
      { name: 'path', type: 'string', label: 'File Path', required: true }
    ]
  },

  variable: {
    type: 'variable',
    category: 'input',
    label: 'Variable',
    icon: '🔢',
    description: 'Store/retrieve variable',
    inputs: [{ name: 'value', type: 'any', required: false }],
    outputs: [{ name: 'value', type: 'any', required: false }],
    parameters: [
      { name: 'name', type: 'string', label: 'Variable Name', required: true },
      {
        name: 'operation', type: 'select', label: 'Operation',
        options: [
          { label: 'Get', value: 'get' },
          { label: 'Set', value: 'set' }
        ],
        default: 'get'
      }
    ]
  },

  // AI NODES
  ai_text: {
    type: 'ai_text',
    category: 'ai',
    label: 'AI Text',
    icon: '🤖',
    description: 'Generate text with AI',
    inputs: [{ name: 'prompt', type: 'string', required: true }],
    outputs: [{ name: 'text', type: 'string', required: true }],
    parameters: [
      {
        name: 'model', type: 'select', label: 'Model',
        options: [
          { label: 'Gemini 2.0 Flash', value: 'gemini' },
          { label: 'Llama 3.1 70B', value: 'llama' },
          { label: 'DeepSeek R1', value: 'deepseek' }
        ],
        default: 'gemini'
      },
      { name: 'temperature', type: 'number', label: 'Temperature', default: 0.7 },
      { name: 'maxTokens', type: 'number', label: 'Max Tokens', default: 2048 }
    ]
  },

  ai_image: {
    type: 'ai_image',
    category: 'ai',
    label: 'AI Image',
    icon: '🎨',
    description: 'Generate image with AI',
    inputs: [{ name: 'prompt', type: 'string', required: true }],
    outputs: [{ name: 'imageUrl', type: 'string', required: true }],
    parameters: [
      {
        name: 'model', type: 'select', label: 'Model',
        options: [
          { label: 'Imagen 3', value: 'imagen' },
          { label: 'Stable Diffusion XL', value: 'sdxl' },
          { label: 'Flux', value: 'flux' }
        ],
        default: 'imagen'
      },
      {
        name: 'size', type: 'select', label: 'Size',
        options: [
          { label: '512x512', value: '512x512' },
          { label: '1024x1024', value: '1024x1024' }
        ],
        default: '1024x1024'
      }
    ]
  },

  ai_code: {
    type: 'ai_code',
    category: 'ai',
    label: 'AI Code',
    icon: '⚡',
    description: 'Generate code with AI',
    inputs: [{ name: 'prompt', type: 'string', required: true }],
    outputs: [{ name: 'code', type: 'string', required: true }],
    parameters: [
      {
        name: 'language', type: 'select', label: 'Language',
        options: [
          { label: 'TypeScript', value: 'typescript' },
          { label: 'JavaScript', value: 'javascript' },
          { label: 'Python', value: 'python' },
          { label: 'Rust', value: 'rust' }
        ],
        default: 'typescript'
      }
    ]
  },

  ai_reasoning: {
    type: 'ai_reasoning',
    category: 'ai',
    label: 'AI Reasoning',
    icon: '🧠',
    description: 'Step-by-step reasoning',
    inputs: [{ name: 'problem', type: 'string', required: true }],
    outputs: [{ name: 'solution', type: 'string', required: true }],
    parameters: [
      {
        name: 'model', type: 'select', label: 'Model',
        options: [
          { label: 'DeepSeek R1', value: 'deepseek-r1' },
          { label: 'QwQ-32B', value: 'qwq' }
        ],
        default: 'deepseek-r1'
      }
    ]
  },

  // PROCESSING NODES
  transform: {
    type: 'transform',
    category: 'processing',
    label: 'Transform',
    icon: '🔄',
    description: 'Transform data',
    inputs: [{ name: 'data', type: 'any', required: true }],
    outputs: [{ name: 'result', type: 'any', required: true }],
    parameters: [
      {
        name: 'code', type: 'code', label: 'Transform Code',
        default: 'return data;',
        required: true
      }
    ]
  },

  filter: {
    type: 'filter',
    category: 'processing',
    label: 'Filter',
    icon: '🔍',
    description: 'Conditional routing',
    inputs: [{ name: 'data', type: 'any', required: true }],
    outputs: [
      { name: 'true', type: 'any', required: false },
      { name: 'false', type: 'any', required: false }
    ],
    parameters: [
      {
        name: 'condition', type: 'code', label: 'Condition',
        default: 'return true;',
        required: true
      }
    ]
  },

  loop: {
    type: 'loop',
    category: 'processing',
    label: 'Loop',
    icon: '🔁',
    description: 'Iterate over items',
    inputs: [{ name: 'items', type: 'array', required: true }],
    outputs: [{ name: 'item', type: 'any', required: true }],
    parameters: []
  },

  merge: {
    type: 'merge',
    category: 'processing',
    label: 'Merge',
    icon: '🔀',
    description: 'Merge multiple inputs',
    inputs: [
      { name: 'input1', type: 'any', required: false },
      { name: 'input2', type: 'any', required: false }
    ],
    outputs: [{ name: 'merged', type: 'any', required: true }],
    parameters: []
  },

  // OUTPUT NODES
  file_writer: {
    type: 'file_writer',
    category: 'output',
    label: 'File Writer',
    icon: '💾',
    description: 'Write file to filesystem',
    inputs: [
      { name: 'path', type: 'string', required: true },
      { name: 'content', type: 'string', required: true }
    ],
    outputs: [{ name: 'success', type: 'boolean', required: true }],
    parameters: []
  },

  '3d_export': {
    type: '3d_export',
    category: 'output',
    label: '3D Export',
    icon: '📦',
    description: 'Export 3D model',
    inputs: [{ name: 'model', type: 'object', required: true }],
    outputs: [{ name: 'path', type: 'string', required: true }],
    parameters: [
      {
        name: 'format', type: 'select', label: 'Format',
        options: [
          { label: 'GLB', value: 'glb' },
          { label: 'FBX', value: 'fbx' },
          { label: 'OBJ', value: 'obj' }
        ],
        default: 'glb'
      },
      { name: 'filename', type: 'string', label: 'Filename', required: true }
    ]
  },

  git_commit: {
    type: 'git_commit',
    category: 'output',
    label: 'Git Commit',
    icon: '📝',
    description: 'Commit changes to git',
    inputs: [{ name: 'files', type: 'array', required: true }],
    outputs: [{ name: 'commitHash', type: 'string', required: true }],
    parameters: [
      { name: 'message', type: 'string', label: 'Commit Message', required: true }
    ]
  },

  deploy: {
    type: 'deploy',
    category: 'output',
    label: 'Deploy',
    icon: '🚀',
    description: 'Deploy to production',
    inputs: [{ name: 'files', type: 'array', required: true }],
    outputs: [{ name: 'url', type: 'string', required: true }],
    parameters: [
      {
        name: 'target', type: 'select', label: 'Target',
        options: [
          { label: 'Cloudflare Pages', value: 'pages' },
          { label: 'Cloudflare Workers', value: 'workers' }
        ],
        default: 'pages'
      }
    ]
  },

  // INTEGRATION NODES
  cloudflare: {
    type: 'cloudflare',
    category: 'integration',
    label: 'Cloudflare',
    icon: '☁️',
    description: 'Cloudflare API',
    inputs: [{ name: 'config', type: 'object', required: true }],
    outputs: [{ name: 'result', type: 'any', required: true }],
    parameters: [
      {
        name: 'action', type: 'select', label: 'Action',
        options: [
          { label: 'Deploy Worker', value: 'deploy_worker' },
          { label: 'Deploy Pages', value: 'deploy_pages' },
          { label: 'Update KV', value: 'update_kv' }
        ],
        default: 'deploy_worker'
      }
    ]
  },

  github: {
    type: 'github',
    category: 'integration',
    label: 'GitHub',
    icon: '🐙',
    description: 'GitHub API',
    inputs: [{ name: 'config', type: 'object', required: true }],
    outputs: [{ name: 'result', type: 'any', required: true }],
    parameters: [
      {
        name: 'action', type: 'select', label: 'Action',
        options: [
          { label: 'Create PR', value: 'create_pr' },
          { label: 'Commit', value: 'commit' },
          { label: 'Create Issue', value: 'create_issue' }
        ],
        default: 'commit'
      }
    ]
  },

  discord: {
    type: 'discord',
    category: 'integration',
    label: 'Discord',
    icon: '💬',
    description: 'Send Discord notification',
    inputs: [{ name: 'message', type: 'string', required: true }],
    outputs: [{ name: 'success', type: 'boolean', required: true }],
    parameters: [
      { name: 'webhookUrl', type: 'string', label: 'Webhook URL', required: true }
    ]
  },

  http: {
    type: 'http',
    category: 'integration',
    label: 'HTTP Request',
    icon: '🌐',
    description: 'Custom HTTP request',
    inputs: [{ name: 'body', type: 'any', required: false }],
    outputs: [{ name: 'response', type: 'any', required: true }],
    parameters: [
      { name: 'url', type: 'string', label: 'URL', required: true },
      {
        name: 'method', type: 'select', label: 'Method',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' }
        ],
        default: 'GET'
      }
    ]
  }
};

export function getNodeDefinition(type: NodeType): NodeDefinition {
  return NODE_DEFINITIONS[type];
}

export function getNodesByCategory(category: string): NodeDefinition[] {
  return Object.values(NODE_DEFINITIONS).filter(n => n.category === category);
}
