import { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import { useTheme } from '../ThemeContext';
import { formatHours } from '../utils/timeFormat';

interface Props {
  task: Task;
  assignedHours: number;
  totalAssignedHours: number;
  onDragStart: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  index?: number;
}

export default function TaskCard({ task, assignedHours, totalAssignedHours, onDragStart, onComplete, onEdit, onDelete, onReorder, index }: Props) {
  const { theme } = useTheme();
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const dragLeaveTimeout = useRef<number | null>(null);
  const remaining = task.totalHours - totalAssignedHours;
  const progress = totalAssignedHours / task.totalHours;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Проверяем что перетаскивается задача (не из другого дня)
    const draggedTaskId = e.dataTransfer.getData('taskId');
    const sourceDayId = e.dataTransfer.getData('sourceDayId');
    
    // Если перетаскивается задача из другого дня, не показываем индикатор
    if (sourceDayId) {
      return;
    }
    
    // Если перетаскивается та же задача, не показываем индикатор
    if (draggedTaskId === task.id) {
      return;
    }
    
    // Отменяем предыдущий таймер если он есть
    if (dragLeaveTimeout.current) {
      clearTimeout(dragLeaveTimeout.current);
      dragLeaveTimeout.current = null;
    }
    
    // Определяем позицию курсора относительно карточки
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    if (e.clientY < midY) {
      setDragOverPosition('above');
    } else {
      setDragOverPosition('below');
    }
  };

  const handleDragLeave = () => {
    // Используем задержку, чтобы избежать моргания при быстрых пересечениях границы
    if (dragLeaveTimeout.current) {
      clearTimeout(dragLeaveTimeout.current);
    }
    dragLeaveTimeout.current = setTimeout(() => {
      setDragOverPosition(null);
    }, 50);
  };

  // Очистка таймера при unmount
  useEffect(() => {
    return () => {
      if (dragLeaveTimeout.current) {
        clearTimeout(dragLeaveTimeout.current);
      }
    };
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPosition(null);
    
    // Отменяем таймер если он есть
    if (dragLeaveTimeout.current) {
      clearTimeout(dragLeaveTimeout.current);
      dragLeaveTimeout.current = null;
    }
    
    const draggedId = e.dataTransfer.getData('taskId');
    if (draggedId && draggedId !== task.id && onReorder) {
      onReorder(draggedId, task.id);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Placeholder above */}
      {dragOverPosition === 'above' && (
        <div className="drag-placeholder drag-placeholder-above" />
      )}
      
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('taskId', task.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(task.id);
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      style={{
        position: 'relative', borderRadius: 10, padding: 12,
        cursor: 'grab', border: `1px solid ${theme.borderPrimary}`,
        background: theme.bgCard, transition: 'all 0.2s',
        borderLeft: `4px solid ${task.color}`,
        boxShadow: theme.shadow
      }}
      onMouseEnter={e => { 
        e.currentTarget.style.boxShadow = theme.shadowLg; 
        e.currentTarget.style.borderColor = theme.borderSecondary;
        e.currentTarget.style.borderLeft = `4px solid ${task.color}`;
      }}
      onMouseLeave={e => { 
        e.currentTarget.style.boxShadow = theme.shadow; 
        e.currentTarget.style.borderColor = theme.borderPrimary;
        e.currentTarget.style.borderLeft = `4px solid ${task.color}`;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 14, fontWeight: 500, color: theme.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: theme.textTertiary }}>
              {formatHours(totalAssignedHours)} / {formatHours(task.totalHours)}
            </span>
            {remaining > 0 && (
              <span style={{ fontSize: 12, color: theme.warning, fontWeight: 500 }}>
                ({formatHours(remaining)} не запланировано)
              </span>
            )}
            {remaining === 0 && (
              <svg width="14" height="14" fill="none" stroke={theme.success} viewBox="0 0 24 24" style={{ display: 'inline', verticalAlign: 'middle' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.2s' }}
          className="task-card-actions"
        >
          <button
            onClick={() => onEdit(task)}
            style={{
              padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.accent1; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textTertiary; }}
            title="Редактировать задачу"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onComplete(task.id)}
            style={{
              padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.success; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textTertiary; }}
            title="Отметить как выполненную"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            style={{
              padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${theme.danger}15`; e.currentTarget.style.color = theme.danger; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textTertiary; }}
            title="Удалить задачу"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ marginTop: 8, height: 6, background: theme.bgTertiary, borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{ height: '100%', borderRadius: 3, transition: 'width 0.3s', width: `${progress * 100}%`, background: task.color }}
        />
      </div>
      <style>{`
        div:hover > .task-card-actions { opacity: 1 !important; }
      `}</style>
      </div>
      
      {/* Placeholder below */}
      {dragOverPosition === 'below' && (
        <div className="drag-placeholder drag-placeholder-below" />
      )}
    </div>
  );
}
