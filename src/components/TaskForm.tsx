import React, { useState } from 'react';
import { Task } from '../types';
import { generateId } from '../utils/dateUtils';
import { formatHours, parseTimeInput } from '../utils/timeFormat';
import { useTheme } from '../ThemeContext';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

interface Props { onAddTask: (task: Task) => void; }

export default function TaskForm({ onAddTask }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hours) return;
    const parsedHours = parseTimeInput(hours);
    if (parsedHours === null || parsedHours <= 0) return;
    const task: Task = { id: generateId(), title: title.trim(), totalHours: parsedHours, color, status: 'new', createdAt: new Date().toISOString() };
    onAddTask(task);
    setTitle(''); setHours(''); setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={{
        width: '100%', padding: '12px 16px', borderRadius: 12,
        border: `2px dashed ${theme.borderSecondary}`, background: 'transparent',
        color: theme.textTertiary, cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14
      }}>
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Новая задача
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: theme.bgSecondary, borderRadius: 12, border: `1px solid ${theme.borderPrimary}`, padding: 16, boxShadow: theme.shadow, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="text" placeholder="Название задачи..." value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: `1px solid ${theme.borderPrimary}`, background: theme.bgCard, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box' }} autoFocus />
      <div>
        <label style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 8, display: 'block' }}>Время выполнения</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {[0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4].map((h) => (
            <button key={h} type="button" onClick={() => setHours(h.toString())} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: hours === h.toString() ? theme.accent1 : `${theme.accent1}15`,
              color: hours === h.toString() ? '#fff' : theme.accent1,
              border: `1px solid ${hours === h.toString() ? theme.accent1 : theme.accent1 + '30'}`,
              cursor: 'pointer', transition: 'all 0.2s'
            }}>{formatHours(h)}</button>
          ))}
        </div>
        <input type="text" placeholder="или введите чч:мм" value={hours} onChange={(e) => setHours(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, border: `1px solid ${theme.borderPrimary}`, background: theme.bgCard, color: theme.textPrimary, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
          onBlur={() => { const parsed = parseTimeInput(hours); if (parsed !== null && parsed > 0) setHours(parsed.toString()); }} />
        <div style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4, textAlign: 'center' }}>порог 15 минут</div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 4, display: 'block' }}>Цвет</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', transform: color === c ? 'scale(1.25)' : 'scale(1)', boxShadow: color === c ? `0 0 0 2px ${theme.bgCard}, 0 0 0 4px ${theme.textTertiary}` : 'none' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        <button type="submit" style={{ flex: 1, padding: '8px 12px', background: theme.accent1, color: '#fff', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Создать</button>
        <button type="button" onClick={() => setIsOpen(false)} style={{ padding: '8px 12px', background: theme.bgTertiary, color: theme.textSecondary, borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Отмена</button>
      </div>
    </form>
  );
}
