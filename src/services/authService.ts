import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile?: UserProfile;
}

// Регистрация нового пользователя
export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
        display_name: username
      }
    }
  });

  if (error) throw error;
  return data;
}

// Вход в систему
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Выход из системы
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Получить текущего пользователя
export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return profile;
}

// Получить профиль по ID
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Обновить профиль
export async function updateProfile(updates: Partial<UserProfile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Создать группу
export async function createGroup(name: string): Promise<Group> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Генерируем уникальный код приглашения
  const inviteCode = generateInviteCode();

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      invite_code: inviteCode,
      created_by: user.id
    })
    .select()
    .single();

  if (groupError) throw groupError;

  // Добавляем создателя как владельца
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: 'owner'
    });

  if (memberError) throw memberError;

  return group;
}

// Присоединиться к группе по коду
export async function joinGroup(inviteCode: string): Promise<Group> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Находим группу по коду
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode)
    .single();

  if (groupError) throw new Error('Группа не найдена');

  // Проверяем, не является ли пользователь уже участником
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    throw new Error('Вы уже являетесь участником этой группы');
  }

  // Добавляем пользователя как участника
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: 'member'
    });

  if (memberError) throw memberError;

  return group;
}

// Получить все группы пользователя
export async function getUserGroups(): Promise<(Group & { member_count: number })[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: memberships, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      groups:groups(*)
    `)
    .eq('user_id', user.id);

  if (error) throw error;

  // Получаем количество участников для каждой группы
  const groupsWithCounts = await Promise.all(
    (memberships || []).map(async (membership) => {
      const groupData = membership.groups as any;
      const group: Group = {
        id: groupData.id,
        name: groupData.name,
        invite_code: groupData.invite_code,
        created_by: groupData.created_by,
        created_at: groupData.created_at
      };
      
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id);

      return {
        ...group,
        member_count: count || 0
      };
    })
  );

  return groupsWithCounts;
}

// Получить участников группы
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('group_id', groupId);

  if (error) throw error;
  return data || [];
}

// Покинуть группу
export async function leaveGroup(groupId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// Удалить группу (только для владельца)
export async function deleteGroup(groupId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Проверяем что пользователь владелец
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'owner') {
    throw new Error('Только владелец может удалить группу');
  }

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

// Подписка на изменения аутентификации
export function onAuthStateChange(callback: (user: UserProfile | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const profile = await getCurrentUser();
      callback(profile);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
}

// Генерация уникального кода приглашения
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
