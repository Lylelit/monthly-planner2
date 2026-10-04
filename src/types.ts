export interface Task {
  id: string;
  title: string;
  totalHours: number;
  color: string;
  description?: string;
  status?: 'new' | 'completed';
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
}

export interface Week {
  id: string;
  days: Day[];
}
