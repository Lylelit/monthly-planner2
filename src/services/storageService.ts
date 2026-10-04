import { Task, TaskAssignment } from '../types';
import { supabase } from '../lib/supabase';

// Режим хранения: 'local' или 'supabase'
const STORAGE_MODE: 'local' | 'supabase' = 'local';

// ===== LOCAL STORAGE =====
const LOCAL_TASKS_KEY = 'planner-tasks';
const LOCAL_ASSIGNMENTS_KEY = 'planner-assignments';

function loadLocalTasks(): Task[] {
  try {
    const saved = localStorage.getItem(LOCAL_TASKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: Task[]): void {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
}

function loadLocalAssignments(): TaskAssignment[] {
  try {
    const saved = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalAssignments(assignments: TaskAssignment[]): void {
  localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

// ===== SUPABASE =====
async function loadSupabaseTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
  
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    totalHours: row.total_hours,
    color: row.color,
    description: row.description,
  }));
}

async function loadSupabaseAssignments(): Promise<TaskAssignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error loading assignments:', error);
    return [];
  }
  
  return (data || []).map((row: any) => ({
    id: row.id,
    taskId: row.task_id,
    dayId: row.day_id,
    hours: row.hours,
    order: row.sort_order,
  }));
}

async function saveSupabaseTasks(tasks: Task[]): Promise<void> {
  // Удаляем все старые задачи и вставляем новые
  await supabase.from('tasks').delete().neq('id', '');
  
  if (tasks.length > 0) {
    const rows = tasks.map(t => ({
      id: t.id,
      title: t.title,
      total_hours: t.totalHours,
      color: t.color,
      description: t.description,
    }));
    
    const { error } = await supabase.from('tasks').insert(rows);
    if (error) {
      console.error('Error saving tasks:', error);
    }
  }
}

async function saveSupabaseAssignments(assignments: TaskAssignment[]): Promise<void> {
  // Удаляем все старые назначения и вставляем новые
  await supabase.from('assignments').delete().neq('id', '');
  
  if (assignments.length > 0) {
    const rows = assignments.map(a => ({
      id: a.id,
      task_id: a.taskId,
      day_id: a.dayId,
      hours: a.hours,
      sort_order: a.order,
    }));
    
    const { error } = await supabase.from('assignments').insert(rows);
    if (error) {
      console.error('Error saving assignments:', error);
    }
  }
}

// ===== PUBLIC API =====
export async function loadTasks(): Promise<Task[]> {
  if (STORAGE_MODE === 'supabase') {
    return await loadSupabaseTasks();
  }
  return loadLocalTasks();
}

export async function loadAssignments(): Promise<TaskAssignment[]> {
  if (STORAGE_MODE === 'supabase') {
    return await loadSupabaseAssignments();
  }
  return loadLocalAssignments();
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  if (STORAGE_MODE === 'supabase') {
    await saveSupabaseTasks(tasks);
  } else {
    saveLocalTasks(tasks);
  }
}

export async function saveAssignments(assignments: TaskAssignment[]): Promise<void> {
  if (STORAGE_MODE === 'supabase') {
    await saveSupabaseAssignments(assignments);
  } else {
    saveLocalAssignments(assignments);
  }
}

export function getStorageMode(): 'local' | 'supabase' {
  return STORAGE_MODE;
}
