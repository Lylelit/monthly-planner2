import ExcelJS from 'exceljs';
import { Task, TaskAssignment } from '../types';
import { formatHours } from './timeFormat';

const COLOR_NAMES: Record<string, string> = {
  '#6366f1': 'Индиго', '#8b5cf6': 'Фиолетовый', '#ec4899': 'Розовый', '#f43f5e': 'Красный',
  '#f97316': 'Оранжевый', '#eab308': 'Жёлтый', '#22c55e': 'Зелёный', '#14b8a6': 'Бирюзовый',
  '#06b6d4': 'Циан', '#3b82f6': 'Синий',
};

export async function exportToExcel(tasks: Task[], assignments: TaskAssignment[], startDate: string, endDate: string) {
  const filteredTasks = tasks.filter(task => {
    if (task.status !== 'completed' || !task.completedAt) return false;
    const completedDate = new Date(task.completedAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return completedDate >= start && completedDate <= end;
  });

  if (filteredTasks.length === 0) { alert('Нет выполненных задач за выбранный период'); return; }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Выполненные задачи');

  worksheet.columns = [
    { header: 'Дата создания', key: 'createdAt', width: 18 },
    { header: 'Дата завершения', key: 'completedAt', width: 18 },
    { header: 'Затраченное время', key: 'spentTime', width: 18 },
    { header: 'Цвет', key: 'color', width: 15 },
    { header: 'Название', key: 'title', width: 30 },
    { header: 'Описание', key: 'description', width: 40 },
    { header: 'Ссылка', key: 'link', width: 40 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3996D3' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  filteredTasks.forEach(task => {
    const taskAssignments = assignments.filter(a => a.taskId === task.id);
    const spentTime = taskAssignments.reduce((sum, a) => sum + a.hours, 0);
    const colorName = COLOR_NAMES[task.color] || task.color;
    const createdAt = task.createdAt ? new Date(task.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const completedAt = task.completedAt ? new Date(task.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    const row = worksheet.addRow({ createdAt, completedAt, spentTime: formatHours(spentTime), color: colorName, title: task.title, description: task.description || '', link: task.link || '' });
    const colorCell = row.getCell('color');
    colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: task.color.replace('#', 'FF') } };
    const brightness = getBrightness(task.color);
    colorCell.font = { color: { argb: brightness > 128 ? 'FF000000' : 'FFFFFFFF' }, bold: true };
    row.alignment = { vertical: 'middle', wrapText: true };
    row.height = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Выполненные_задачи_${startDate}_${endDate}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function getBrightness(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
