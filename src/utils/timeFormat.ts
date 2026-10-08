export function formatHours(hours: number): string {
  if (hours === 0) return '0м';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0) return `${minutes}м`;
  if (minutes === 0) return `${wholeHours}ч`;
  return `${wholeHours}ч ${minutes}м`;
}

export function parseTimeInput(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    if (minutes >= 60) return null;
    return hours + minutes / 60;
  }
  const decimalMatch = trimmed.match(/^(\d+)[,.](\d+)$/);
  if (decimalMatch) {
    const hours = parseInt(decimalMatch[1], 10);
    const decimalPart = decimalMatch[2];
    if (decimalPart.length <= 2) {
      const decimalValue = parseFloat(`0.${decimalPart}`);
      if (decimalValue <= 0.59) return hours + decimalValue;
      const minutes = parseInt(decimalPart, 10);
      if (minutes >= 60) return null;
      return hours + minutes / 60;
    }
    return null;
  }
  const simpleMatch = trimmed.match(/^(\d+)$/);
  if (simpleMatch) return parseInt(simpleMatch[1], 10);
  return null;
}
