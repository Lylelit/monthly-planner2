export interface RedmineSettings {
  baseUrl: string;
  apiKey: string;
  userId: number;
}

export interface RedmineTask {
  id: number;
  subject: string;
  description?: string;
  status?: {
    id: number;
    name: string;
  };
  priority?: {
    id: number;
    name: string;
  };
  project?: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: number;
    name: string;
  };
  due_date?: string;
  estimated_hours?: number | null;
  created_on: string;
  updated_on: string;
}

export interface RedmineIssuesResponse {
  issues: RedmineTask[];
  total_count: number;
  offset: number;
  limit: number;
}

const REDMINE_SETTINGS_KEY = 'redmine-settings';

export function getRedmineSettings(): RedmineSettings | null {
  const saved = localStorage.getItem(REDMINE_SETTINGS_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveRedmineSettings(settings: RedmineSettings): void {
  localStorage.setItem(REDMINE_SETTINGS_KEY, JSON.stringify(settings));
}

export async function fetchRedmineTasks(settings: RedmineSettings): Promise<RedmineTask[]> {
  const url = `${settings.baseUrl}/issues.json?assigned_to_id=${settings.userId}&limit=100&status_id=*`;
  
  const response = await fetch(url, {
    headers: {
      'X-Redmine-API-Key': settings.apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Ошибка подключения к Redmine: ${response.status} ${response.statusText}`);
  }

  const data: RedmineIssuesResponse = await response.json();
  return data.issues;
}

export function getRedmineTaskUrl(baseUrl: string, taskId: number): string {
  return `${baseUrl}/issues/${taskId}`;
}
