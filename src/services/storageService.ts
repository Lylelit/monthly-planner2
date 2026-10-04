import { Task, TaskAssignment } from '../types';
import { supabase } from '../lib/supabase';

// Режим хранения: 'local' или 'supabase'
const STORAGE_MODE: 'local' | 'supabase' = 'local';

// Текущий пользователь и группа (будут устанавливаться из App)
let currentUserId: string | null = null;
let currentGroupId: string | null = null;

export function setCurrentUser(userId: string | null, groupId: string | null = null) {
  currentUserId = userId;
  currentGroupId = groupId;
}

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
  if (!currentUserId) {
    console.error('Cannot load tasks: no user logged in');
    return [];
  }

  let query = supabase.from('tasks').select('*');
  
  if (currentGroupId) {
    query = query.eq('group_id', currentGroupId);
  } else {
    query = query.eq('user_id', currentUserId).is('group_id', null);
  }
  
  const { data, error } = await query.order('created_at', { ascending: true });
  
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
  if (!currentUserId) {
    console.error('Cannot load assignments: no user logged in');
    return [];
  }

  // Сначала получаем все задачи пользователя/группы
  const tasks = await loadSupabaseTasks();
  const taskIds = tasks.map(t => t.id);
  
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .in('task_id', taskIds)
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
  if (!currentUserId) {
    console.error('Cannot save tasks: no user logged in');
    return;
  }

  // Удаляем все старые задачи текущего пользователя/группы
  if (currentGroupId) {
    await supabase.from('tasks').delete().eq('group_id', currentGroupId);
  } else {
    await supabase.from('tasks').delete().eq('user_id', currentUserId).is('group_id', null);
  }
  
  if (tasks.length > 0) {
    const rows = tasks.map(t => ({
      id: t.id,
      user_id: currentUserId,
      group_id: currentGroupId,
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
  if (!currentUserId) {
    console.error('Cannot save assignments: no user logged in');
    return;
  }

  // Получаем все задачи пользователя/группы
  const tasks = await loadSupabaseTasks();
  const taskIds = tasks.map(t => t.id);
  
  if (taskIds.length > 0) {
    // Удаляем старые назначения для этих задач
    await supabase.from('assignments').delete().in('task_id', taskIds);
  }
  
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
