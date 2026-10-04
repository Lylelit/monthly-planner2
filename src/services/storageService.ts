import { Task, TaskAssignment } from '../types';
import { getProfileData, saveProfileData, Profile } from '../components/AuthScreen';

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

// Загрузка задач текущего профиля
export async function loadTasks(): Promise<Task[]> {
  if (!currentProfile) return [];
  const data = getProfileData(currentProfile.login);
  return data.tasks || [];
}

// Загрузка назначений текущего профиля
export async function loadAssignments(): Promise<TaskAssignment[]> {
  if (!currentProfile) return [];
  const data = getProfileData(currentProfile.login);
  return data.assignments || [];
}

// Сохранение задач текущего профиля
export async function saveTasks(tasks: Task[]): Promise<void> {
  if (!currentProfile) return;
  const data = getProfileData(currentProfile.login);
  saveProfileData(currentProfile.login, { ...data, tasks });
}

// Сохранение назначений текущего профиля
export async function saveAssignments(assignments: TaskAssignment[]): Promise<void> {
  if (!currentProfile) return;
  const data = getProfileData(currentProfile.login);
  saveProfileData(currentProfile.login, { ...data, assignments });
}
