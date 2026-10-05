import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Task } from '../types';
import { useTheme } from '../ThemeContext';
import { formatHours, parseTimeInput } from '../utils/timeFormat';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

interface Props {
  task: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export default function EditTaskModal({ task, onSave, onCancel }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(task.title);
  const [hours, setHours] = useState(task.totalHours.toString());
  const [color, setColor] = useState(task.color);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = parseTimeInput(hours);
    if (!title.trim() || parsedHours === null || parsedHours <= 0) return;

    onSave({
      ...task,
      title: title.trim(),
      totalHours: parsedHours,
      color,
    });
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2147483647, padding: 20
    }}>
      <div style={{
        background: theme.bgCard, borderRadius: 16, padding: 24,
        maxWidth: 400, width: '100%', boxShadow: theme.shadowLg
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>
          Редактировать задачу
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.textSecondary, marginBottom: 8 }}>
              Название
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
                border: `1px solid ${theme.borderPrimary}`, background: theme.bgSecondary,
                color: theme.textPrimary, outline: 'none', boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = theme.accent1}
              onBlur={e => e.currentTarget.style.borderColor = theme.borderPrimary}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.textSecondary, marginBottom: 8 }}>
              Общее время
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {[0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h.toString())}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: hours === h.toString() ? theme.accent1 : `${theme.accent1}15`,
                    color: hours === h.toString() ? '#fff' : theme.accent1,
                    border: `1px solid ${hours === h.toString() ? theme.accent1 : theme.accent1 + '30'}`,
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {formatHours(h)}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="или введите чч:мм"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
                border: `1px solid ${theme.borderPrimary}`, background: theme.bgSecondary,
                color: theme.textPrimary, outline: 'none', textAlign: 'center',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = theme.accent1}
              onBlur={e => {
                e.currentTarget.style.borderColor = theme.borderPrimary;
                const parsed = parseTimeInput(hours);
                if (parsed !== null && parsed > 0) {
                  setHours(parsed.toString());
                }
              }}
            />
            <div style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4, textAlign: 'center' }}>
              порог 15 минут
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: theme.textSecondary, marginBottom: 8 }}>
              Цвет
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', transition: 'transform 0.2s',
                    transform: color === c ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 0 2px ${theme.bgCard}, 0 0 0 4px ${theme.textTertiary}` : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                flex: 1, padding: '12px', background: theme.accent1, color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1, padding: '12px', background: theme.bgSecondary, color: theme.textSecondary,
                border: `1px solid ${theme.borderPrimary}`, borderRadius: 8, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = theme.bgSecondary}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
