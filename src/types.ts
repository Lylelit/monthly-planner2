export interface Task {
  id: string;
  title: string;
  totalHours: number;
  color: string;
  description?: string;
  link?: string;
  status?: 'new' | 'completed';
  createdAt?: string;
  completedAt?: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  dayId: string;
  hours: number;
  order: number;
}

export interface Day {
  id: string;
  date: Date;
  dayOfWeek: number; // 1-5 (Mon-Fri)
  isWorkingDay: boolean;
  status?: 'working' | 'vacation' | 'holiday';
}

export interface Week {
  id: string;
  days: Day[];
}
