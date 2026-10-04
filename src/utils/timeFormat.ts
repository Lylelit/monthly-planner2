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
 * Парсит строку времени в десятичные часы
 * Поддерживает форматы: "1:30", "01:30", "1,5", "1.5", "2,45", "2.45"
 * Возвращает null если формат невалидный
 */
export function parseTimeInput(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  
  // Формат с двоеточием: "1:30", "01:30", "2:45"
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    if (minutes >= 60) return null;
    return hours + minutes / 60;
  }
  
  // Формат с запятой или точкой: "1,5", "2.45", "3,15"
  const decimalMatch = trimmed.match(/^(\d+)[,.](\d+)$/);
  if (decimalMatch) {
    const hours = parseInt(decimalMatch[1], 10);
    const decimalPart = decimalMatch[2];
    
    // Если это минуты (2 цифры) или десятичные часы
    if (decimalPart.length <= 2) {
      const decimalValue = parseFloat(`0.${decimalPart}`);
      // Если значение <= 0.59, считаем это десятичными часами
      // Если > 0.59, считаем это минутами
      if (decimalValue <= 0.59) {
        return hours + decimalValue;
      } else {
        const minutes = parseInt(decimalPart, 10);
        if (minutes >= 60) return null;
        return hours + minutes / 60;
      }
    }
    
    return null;
  }
  
  // Просто число часов: "2", "3"
  const simpleMatch = trimmed.match(/^(\d+)$/);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10);
  }
  
  return null;
}
