import { Task, TaskAssignment } from '../types';
import { Profile } from '../components/AuthScreen';

let currentProfile: Profile | null = null;

export function setCurrentProfile(profile: Profile | null) {
  currentProfile = profile;
}

export function getCurrentProfile(): Profile | null {
  return currentProfile;
}

export function getStorageMode(): 'local' {
  return 'local';
}

export async function loadTasks(): Promise<Task[]> {
  if (!currentProfile) return [];
  const data = getProfileData(currentProfile.login);
  return data.tasks || [];
}

export async function loadAssignments(): Promise<TaskAssignment[]> {
  if (!currentProfile) return [];
  const data = getProfileData(currentProfile.login);
  return data.assignments || [];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  if (!currentProfile) return;
  const data = getProfileData(currentProfile.login);
  saveProfileData(currentProfile.login, { ...data, tasks });
}

export async function saveAssignments(assignments: TaskAssignment[]): Promise<void> {
  if (!currentProfile) return;
  const data = getProfileData(currentProfile.login);
  saveProfileData(currentProfile.login, { ...data, assignments });
}

interface ProfileData {
  tasks: Task[];
  assignments: TaskAssignment[];
}

const DATA_KEY = 'planner-data-';

export function getProfileData(login: string): ProfileData {
  try {
    const saved = localStorage.getItem(DATA_KEY + login);
    return saved ? JSON.parse(saved) : { tasks: [], assignments: [] };
  } catch {
    return { tasks: [], assignments: [] };
  }
}

export function saveProfileData(login: string, data: ProfileData) {
  localStorage.setItem(DATA_KEY + login, JSON.stringify(data));
}
