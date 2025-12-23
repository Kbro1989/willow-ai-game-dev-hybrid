/**
 * Tool Definitions for AI Function Calling
 * Complete set of IDE tools available to AI agents
 */

import { FunctionDeclaration, Type } from "@google/genai";

/**
 * File Operation Tools
 */
export const fileTools: FunctionDeclaration[] = [
  {
    name: 'create_file',
    description: 'Create a new file with content and save to local filesystem via bridge',
    parameters: {
      type: Type.OBJECT,
      description: 'File creation parameters',
      properties: {
        path: {
          type: Type.STRING,
          description: 'File path relative to current working directory (e.g., "src/App.tsx")'
        },
        content: {
          type: Type.STRING,
          description: 'Complete file content - production-ready, no placeholders'
        },
        language: {
          type: Type.STRING,
          description: 'Programming language for syntax (e.g., "typescript", "javascript", "html")'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'update_file',
    description: 'Modify existing file content',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'File path to update' },
        updates: {
          type: Type.ARRAY,
          description: 'Array of updates to apply',
          items: {
            type: Type.OBJECT,
            properties: {
              startLine: { type: Type.NUMBER },
              endLine: { type: Type.NUMBER },
              newContent: { type: Type.STRING }
            }
          }
        }
      },
      required: ['path', 'updates']
    }
  },
  {
    name: 'read_file',
    description: 'Read file content from filesystem',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'File path to read' }
      },
      required: ['path']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file from filesystem',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'File path to delete' }
      },
      required: ['path']
    }
  }
];

/**
 * Project Management Tools
 */
export const projectTools: FunctionDeclaration[] = [
  {
    name: 'create_project',
    description: 'Scaffold a complete project structure with all necessary files',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Project name (will be folder name)' },
        type: {
          type: Type.STRING,
          description: 'Project type',
          enum: ['threejs', 'react', 'vite', 'node', 'vanilla-html']
        },
        files: {
          type: Type.ARRAY,
          description: 'All files to create',
          items: {
            type: Type.OBJECT,
            properties: {
              path: { type: Type.STRING },
              content: { type: Type.STRING }
            }
          }
        }
      },
      required: ['name', 'type', 'files']
    }
  },
  {
    name: 'run_command',
    description: 'Execute a terminal command via bridge (npm install, git, etc.)',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: 'Command to execute (e.g., "npm install three")' },
        cwd: { type: Type.STRING, description: 'Working directory (optional)' }
      },
      required: ['command']
    }
  }
];

/**
 * 3D Scene Manipulation Tools
 */
export const sceneTools: FunctionDeclaration[] = [
  {
    name: 'add_scene_object',
    description: 'Add a 3D object to the game scene',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ['mesh', 'light', 'camera', 'group'] },
        name: { type: Type.STRING },
        position: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: '[x, y, z] coordinates'
        },
        rotation: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: '[x, y, z] rotation in radians'
        },
        scale: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER }
        },
        properties: { type: Type.OBJECT }
      },
      required: ['type', 'name', 'position']
    }
  },
  {
    name: 'update_scene_object',
    description: 'Modify an existing scene object',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        updates: { type: Type.OBJECT }
      },
      required: ['id', 'updates']
    }
  }
];

/**
 * Asset Generation Tools
 */
export const assetTools: FunctionDeclaration[] = [
  {
    name: 'generate_texture',
    description: 'Generate an image texture using AI and save locally',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'Image generation prompt' },
        negativePrompt: { type: Type.STRING, description: 'What to avoid' },
        size: { type: Type.STRING, enum: ['512x512', '1024x1024', '1024x768'], description: 'Image dimensions' },
        savePath: { type: Type.STRING, description: 'Where to save (e.g., "assets/board.png")' }
      },
      required: ['prompt', 'savePath']
    }
  },
  {
    name: 'optimize_asset',
    description: 'Optimize a 3D model or texture',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING },
        targetSize: { type: Type.NUMBER, description: 'Target file size in KB' }
      },
      required: ['path']
    }
  }
];

/**
 * Analysis & Testing Tools
 */
export const analysisTools: FunctionDeclaration[] = [
  {
    name: 'analyze_code',
    description: 'Review code quality, suggest improvements, find bugs',
    parameters: {
      type: Type.OBJECT,
      properties: {
        files: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'File paths to analyze'
        },
        focus: {
          type: Type.STRING,
          enum: ['performance', 'security', 'readability', 'all']
        }
      },
      required: ['files']
    }
  },
  {
    name: 'run_tests',
    description: 'Execute test suite',
    parameters: {
      type: Type.OBJECT,
      properties: {
        framework: { type: Type.STRING, enum: ['jest', 'vitest', 'mocha', 'none'] },
        files: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  }
];

/**
 * Complete Tool Set
 */
export const allTools: FunctionDeclaration[] = [
  ...fileTools,
  ...projectTools,
  ...sceneTools,
  ...assetTools,
  ...analysisTools
];

/**
 * Tool Categories
 */
export const toolCategories = {
  file: fileTools,
  project: projectTools,
  scene: sceneTools,
  asset: assetTools,
  analysis: analysisTools,
  all: allTools
};

export default allTools;
