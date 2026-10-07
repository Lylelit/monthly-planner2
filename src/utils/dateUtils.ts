import { Day, Week } from '../types';

export const HOURS_PER_DAY = 8;

export function getMonthWeeks(year: number, month: number): Week[] {
  const weeks: Week[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Find the Monday of the first week
  let current = new Date(firstDay);
  const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ...
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  current.setDate(current.getDate() + diff);

  let weekIndex = 0;
  while (current <= lastDay || weekIndex === 0) {
    const days: Day[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(current);
      const isInMonth = date.getMonth() === month;
      days.push({
        id: `day-${date.toISOString().split('T')[0]}`,
        date: new Date(date),
        dayOfWeek: i + 1,
        isWorkingDay: isInMonth,
      });
      current.setDate(current.getDate() + 1);
    }
    // Уникальный ID недели с учётом года и месяца
    weeks.push({
      id: `week-${year}-${month}-${weekIndex}`,
      days,
    });
    weekIndex++;
    
    // Skip weekend (Saturday and Sunday)
    current.setDate(current.getDate() + 2);
    
    if (current > lastDay && weekIndex > 0) break;
  }

  return weeks;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function getDayName(dayOfWeek: number): string {
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
  return names[dayOfWeek - 1] || '';
}

export function getMonthName(month: number): string {
  const names = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return names[month];
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
