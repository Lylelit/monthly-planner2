import React, { useState } from 'react';
import { Task } from '../types';
import { generateId } from '../utils/dateUtils';
import { useTheme } from '../ThemeContext';

const COLORS = ['#3996D3', '#EF7D00', '#87B4E1', '#89BC6B', '#F6A758'];

interface Props {
  onAddTask: (task: Task) => void;
}

export default function TaskForm({ onAddTask }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hours) return;
    const task: Task = { id: generateId(), title: title.trim(), totalHours: parseFloat(hours), color };
    onAddTask(task);
    setTitle('');
    setHours('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 12,
          border: `2px dashed ${theme.borderSecondary}`, background: 'transparent',
          color: theme.textTertiary, cursor: 'pointer', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent1; e.currentTarget.style.color = theme.accent1; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.borderSecondary; e.currentTarget.style.color = theme.textTertiary; }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Новая задача
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: theme.bgSecondary, borderRadius: 12, border: `1px solid ${theme.borderPrimary}`,
      padding: 16, boxShadow: theme.shadow, display: 'flex', flexDirection: 'column', gap: 12
    }}>
      <input
        type="text"
        placeholder="Название задачи..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
          border: `1px solid ${theme.borderPrimary}`, background: theme.bgCard,
          color: theme.textPrimary, outline: 'none', transition: 'border-color 0.2s',
          boxSizing: 'border-box'
        }}
        onFocus={e => (e.currentTarget.style.borderColor = theme.accent1)}
        onBlur={e => (e.currentTarget.style.borderColor = theme.borderPrimary)}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 4, display: 'block' }}>Часы</label>
          <input
            type="number"
            min="0.5"
            max="80"
            step="0.5"
            placeholder="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
              border: `1px solid ${theme.borderPrimary}`, background: theme.bgCard,
              color: theme.textPrimary, outline: 'none', transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={e => (e.currentTarget.style.borderColor = theme.accent1)}
            onBlur={e => (e.currentTarget.style.borderColor = theme.borderPrimary)}
          />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 4, display: 'block' }}>Цвет</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                cursor: 'pointer', transition: 'transform 0.2s',
                transform: color === c ? 'scale(1.25)' : 'scale(1)',
                boxShadow: color === c ? `0 0 0 2px ${theme.bgCard}, 0 0 0 4px ${theme.textTertiary}` : 'none'
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        <button
          type="submit"
          style={{
            flex: 1, padding: '8px 12px', background: theme.accent1, color: '#fff',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', transition: 'opacity 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Создать
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            padding: '8px 12px', background: theme.bgTertiary, color: theme.textSecondary,
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', transition: 'background 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
          onMouseLeave={e => (e.currentTarget.style.background = theme.bgTertiary)}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
