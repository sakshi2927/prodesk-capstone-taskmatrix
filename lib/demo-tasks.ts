import type { TaskItem } from "@/lib/task-types";

const TASK_STORAGE_PREFIX = "taskmatrix-demo-tasks:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getStorageKey(userId: string): string {
  return `${TASK_STORAGE_PREFIX}${userId}`;
}

export function readDemoTasks(userId: string): TaskItem[] {
  if (!isBrowser()) {
    return [];
  }

  const rawTasks = window.localStorage.getItem(getStorageKey(userId));
  if (!rawTasks) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawTasks) as TaskItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDemoTasks(userId: string, tasks: TaskItem[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(tasks));
}