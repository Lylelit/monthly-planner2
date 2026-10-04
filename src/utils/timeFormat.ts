/**
 * Форматирует время из десятичных часов в читаемый формат
 * Например: 7.75 -> "7ч 45м", 1.5 -> "1ч 30м", 0.25 -> "15м"
 */
export function formatHours(hours: number): string {
  if (hours === 0) return '0м';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${minutes}м`;
  } else if (minutes === 0) {
    return `${wholeHours}ч`;
  } else {
    return `${wholeHours}ч ${minutes}м`;
  }
}

/**
 * Парсит строку времени в формате "чч:мм" в десятичные часы
 * Например: "1:30" -> 1.5, "0:45" -> 0.75, "2:00" -> 2
 */
export function parseTimeString(timeStr: string): number | null {
  const match = timeStr.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  if (minutes >= 60) return null;
  
  return hours + minutes / 60;
}
