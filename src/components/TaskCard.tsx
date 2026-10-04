import { Task } from '../types';
import { useTheme } from '../ThemeContext';

interface Props {
  task: Task;
  assignedHours: number;
  totalAssignedHours: number;
  onDragStart: (taskId: string) => void;
  onSplit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, assignedHours, totalAssignedHours, onDragStart, onSplit, onDelete }: Props) {
  const { theme } = useTheme();
  const remaining = task.totalHours - totalAssignedHours;
  const progress = totalAssignedHours / task.totalHours;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task.id);
      }}
      style={{
        position: 'relative', borderRadius: 10, padding: 12,
        cursor: 'grab', border: `1px solid ${theme.borderPrimary}`,
        background: theme.bgCard, transition: 'all 0.2s',
        borderLeft: `4px solid ${task.color}`,
        boxShadow: theme.shadow
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadowLg; e.currentTarget.style.borderColor = theme.borderSecondary; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = theme.shadow; e.currentTarget.style.borderColor = theme.borderPrimary; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 14, fontWeight: 500, color: theme.textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: theme.textTertiary }}>
              {totalAssignedHours} / {task.totalHours} ч
            </span>
            {remaining > 0 && (
              <span style={{ fontSize: 12, color: theme.warning, fontWeight: 500 }}>
                ({remaining} ч свободно)
              </span>
            )}
            {remaining === 0 && (
              <span style={{ fontSize: 12, color: theme.success, fontWeight: 500 }}>✓</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.2s' }}
          className="task-card-actions"
        >
          <button
            onClick={() => onSplit(task.id)}
            style={{
              padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.bgHover; e.currentTarget.style.color = theme.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textTertiary; }}
            title="Разбить задачу"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
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
  );
}
