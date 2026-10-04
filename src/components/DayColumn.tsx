import { useState } from 'react';
import { Day, Task, TaskAssignment } from '../types';
import { HOURS_PER_DAY, formatDate, getDayName } from '../utils/dateUtils';
import { formatHours, parseTimeInput } from '../utils/timeFormat';
import { useTheme } from '../ThemeContext';

interface Props {
  day: Day;
  tasks: Task[];
  assignments: TaskAssignment[];
  onDropTask: (taskId: string, dayId: string, hours: number) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onSplitAssignment: (assignmentId: string) => void;
  onMoveAssignment: (assignmentId: string, newDayId: string) => void;
}

export default function DayColumn({ day, tasks, assignments, onDropTask, onRemoveAssignment, onSplitAssignment, onMoveAssignment }: Props) {
  const { theme } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDropMenu, setShowDropMenu] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null);

  const dayAssignments = assignments
    .filter((a) => a.dayId === day.id)
    .sort((a, b) => a.order - b.order);

  const usedHours = dayAssignments.reduce((sum, a) => sum + a.hours, 0);
  const freeHours = HOURS_PER_DAY - usedHours;
  const fillPercent = (usedHours / HOURS_PER_DAY) * 100;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    const assignmentId = e.dataTransfer.getData('assignmentId');
    const sourceDayId = e.dataTransfer.getData('sourceDayId');

    if (!taskId) return;

    if (assignmentId && sourceDayId && sourceDayId !== day.id) {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment && freeHours >= assignment.hours) {
        onMoveAssignment(assignmentId, day.id);
        return;
      }
      if (freeHours > 0) {
        setPendingTaskId(taskId);
        setPendingAssignmentId(assignmentId);
        setShowDropMenu(true);
      }
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (freeHours > 0) {
      setPendingTaskId(taskId);
      setPendingAssignmentId(null);
      setShowDropMenu(true);
    }
  };

  const handleQuickDrop = (hours: number) => {
    if (pendingTaskId) {
      if (pendingAssignmentId) {
        onRemoveAssignment(pendingAssignmentId);
      }
      onDropTask(pendingTaskId, day.id, hours);
      setShowDropMenu(false);
      setPendingTaskId(null);
      setPendingAssignmentId(null);
    }
  };

  const getTaskForAssignment = (assignment: TaskAssignment) => tasks.find((t) => t.id === assignment.taskId);
  const isToday = new Date().toDateString() === day.date.toDateString();

  const freeHoursColor = freeHours === 0 ? theme.danger : freeHours <= 2 ? theme.warning : theme.success;
  const freeHoursBg = freeHours === 0 ? `${theme.danger}15` : freeHours <= 2 ? `${theme.warning}15` : `${theme.success}15`;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        borderRadius: 12, minHeight: 180, transition: 'all 0.2s',
        background: !day.isWorkingDay ? theme.bgTertiary : theme.bgCard,
        border: `${isToday ? '3px' : '1px'} solid ${!day.isWorkingDay ? theme.borderPrimary : isToday ? theme.accent1 : isDragOver ? theme.accent1 : theme.borderPrimary}`,
        opacity: !day.isWorkingDay ? 0.4 : 1,
        boxShadow: isDragOver ? `0 0 0 2px ${theme.accent1}30` : theme.shadow,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: `1px solid ${theme.borderPrimary}`,
        background: 'transparent',
        borderRadius: '12px 12px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: theme.textTertiary }}>{getDayName(day.dayOfWeek)}</span>
            <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 6, color: isToday ? theme.accent1 : theme.textPrimary }}>
              {formatDate(day.date)}
            </span>
          </div>
          {day.isWorkingDay && (
            <div style={{
              fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
              background: freeHoursBg, color: freeHoursColor
            }}>
              {formatHours(freeHours)}
            </div>
          )}
        </div>
        {day.isWorkingDay && (
          <div style={{ marginTop: 8, height: 4, background: theme.bgTertiary, borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%', borderRadius: 2, transition: 'width 0.5s',
                width: `${Math.min(fillPercent, 100)}%`,
                background: fillPercent >= 100 ? theme.danger : fillPercent >= 75 ? theme.warning : theme.success
              }}
            />
          </div>
        )}
      </div>

      {/* Task blocks */}
      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {day.isWorkingDay && dayAssignments.map((assignment) => {
          const task = getTaskForAssignment(assignment);
          if (!task) return null;
          return (
            <div
              key={assignment.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
                e.dataTransfer.setData('assignmentId', assignment.id);
                e.dataTransfer.setData('sourceDayId', day.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="day-task-block"
              style={{
                position: 'relative', borderRadius: 8, padding: '8px 10px',
                cursor: 'grab', transition: 'all 0.2s',
                background: `${task.color}15`,
                borderLeft: `3px solid ${task.color}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadowLg; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: task.color }}>
                  {task.title}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                    background: `${task.color}20`, color: task.color
                  }}>
                    {formatHours(assignment.hours)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSplitAssignment(assignment.id); }}
                    className="day-task-btn"
                    style={{
                      padding: 4, borderRadius: 4, border: 'none', cursor: 'pointer',
                      background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s',
                      opacity: 0
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = theme.bgCard; e.currentTarget.style.color = theme.accent1; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textTertiary; }}
                    title="Разделить"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveAssignment(assignment.id); }}
                    className="day-task-btn"
                    style={{
                      padding: 4, borderRadius: 4, border: 'none', cursor: 'pointer',
                      background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s',
                      opacity: 0
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = theme.bgCard; e.currentTarget.style.color = theme.danger; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textTertiary; }}
                    title="Убрать"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {day.isWorkingDay && isDragOver && !showDropMenu && (
          <div style={{
            border: `2px dashed ${theme.accent1}50`, borderRadius: 8, padding: 16,
            background: `${theme.accent1}08`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 2s infinite'
          }}>
            <span style={{ fontSize: 12, color: theme.accent1, fontWeight: 500 }}>Отпустите здесь</span>
          </div>
        )}
      </div>

      {/* Drop menu */}
      {showDropMenu && pendingTaskId && (
        <div style={{
          position: 'absolute', inset: 0, background: `${theme.bgCard}f5`, backdropFilter: 'blur(4px)',
          borderRadius: 12, zIndex: 10, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 16,
          border: `2px solid ${theme.accent1}50`, boxShadow: theme.shadowLg
        }}>
          <p style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4, fontWeight: 500 }}>Сколько часов назначить?</p>
          <p style={{ fontSize: 10, color: theme.textTertiary, marginBottom: 12 }}>Свободно: {formatHours(freeHours)} из 8ч</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 200 }}>
            {[0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4].filter(h => h <= freeHours).map((h) => (
              <button
                key={h}
                onClick={() => handleQuickDrop(h)}
                style={{
                  width: 48, height: 36, borderRadius: 8, background: `${theme.accent1}15`,
                  color: theme.accent1, fontWeight: 700, fontSize: 12, border: `1px solid ${theme.accent1}30`,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.accent1; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${theme.accent1}15`; e.currentTarget.style.color = theme.accent1; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {formatHours(h)}
              </button>
            ))}
            <div style={{ width: '100%', marginTop: 8 }}>
              <input
                type="text"
                placeholder="чч:мм"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  border: `1px solid ${theme.borderPrimary}`, background: theme.bgCard,
                  color: theme.textPrimary, outline: 'none', textAlign: 'center',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.currentTarget.style.borderColor = theme.accent1}
                onBlur={e => e.currentTarget.style.borderColor = theme.borderPrimary}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const value = (e.target as HTMLInputElement).value;
                    const parsed = parseTimeInput(value);
                    if (parsed !== null && parsed > 0 && parsed <= freeHours) {
                      handleQuickDrop(parsed);
                    }
                  }
                }}
              />
            </div>
          </div>
          <button
            onClick={() => { setShowDropMenu(false); setPendingTaskId(null); setPendingAssignmentId(null); }}
            style={{ marginTop: 12, fontSize: 12, color: theme.textTertiary, background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = theme.textPrimary)}
            onMouseLeave={e => (e.currentTarget.style.color = theme.textTertiary)}
          >
            Отмена
          </button>
        </div>
      )}

      <style>{`
        .day-task-block:hover .day-task-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
