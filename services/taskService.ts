/**
 * Persistent Task Management Service
 * Interacts with the Cloudflare Worker to manage tasks
 */

import { TodoTask } from '../types';

const WORKER_URL = 'https://ai-game-studio.kristain33rs.workers.dev';

export const getTasks = async (): Promise<TodoTask[]> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/tasks`);
    if (!response.ok) {
      return [];
    }
    return await response.json() as TodoTask[];
  } catch (error) {
    console.error('[TASK_SERVICE] Failed to fetch tasks:', error);
    return [];
  }
};

export const addTask = async (task: Omit<TodoTask, 'id' | 'completed'>): Promise<TodoTask | null> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json() as TodoTask;
  } catch (error) {
    console.error('[TASK_SERVICE] Failed to add task:', error);
    return null;
  }
};

export const updateTask = async (id: string, updates: Partial<TodoTask>): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to update task.' };
    }

    return await response.json();
  } catch (error) {
    console.error(`[TASK_SERVICE] Failed to update task ${id}:`, error);
    return { success: false, message: 'Failed to update task.' };
  }
};

export const deleteTask = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${WORKER_URL}/api/tasks/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return { success: false, message: 'Failed to delete task.' };
    }

    return await response.json();
  } catch (error) {
    console.error(`[TASK_SERVICE] Failed to delete task ${id}:`, error);
    return { success: false, message: 'Failed to delete task.' };
  }
}
