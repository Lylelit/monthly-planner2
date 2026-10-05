import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Task, TaskAssignment, Day } from '../types';
import { useTheme } from '../ThemeContext';
import { formatHours, parseTimeInput } from '../utils/timeFormat';

interface Props {
  tasks: Task[];
  assignments: TaskAssignment[];
  days: Day[];
  onReturnToNew: (taskId: string, additionalHours: number) => void;
}

export default function CompletedTasksList({ tasks, assignments, days, onReturnToNew }: Props) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [returnHours, setReturnHours] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Получаем уникальные месяцы из выполненных задач
  const availableMonths = Array.from(new Set(
    completedTasks
      .filter(t => t.completedAt)
      .map(t => {
        const date = new Date(t.completedAt!);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      })
  )).sort().reverse();

  // Фильтруем задачи по выбранному месяцу
  const filteredTasks = selectedMonth === 'all' 
    ? completedTasks 
    : completedTasks.filter(t => {
        if (!t.completedAt) return false;
        const date = new Date(t.completedAt);
        const taskMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return taskMonth === selectedMonth;
      });

  const getMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  const getTaskAssignments = (taskId: string) => {
    return assignments
      .filter(a => a.taskId === taskId)
      .map(a => {
        const day = days.find(d => d.id === a.dayId);
        return { ...a, day };
      })
      .filter(a => a.day)
      .sort((a, b) => a.day!.date.getTime() - b.day!.date.getTime());
  };

  const handleReturn = () => {
    if (!selectedTask) return;
    const hours = parseTimeInput(returnHours);
    if (hours === null || hours <= 0) return;
    onReturnToNew(selectedTask.id, hours);
    setSelectedTask(null);
    setReturnHours('');
  };

  if (completedTasks.length === 0) return null;

  return (
    <>
      <div style={{
        background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`,
        padding: 16, boxShadow: theme.shadow
      }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: '100%', padding: 0, background: 'none', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', color: theme.textPrimary
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" fill="none" stroke={theme.success} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Выполненные задачи</span>
            <span style={{
              fontSize: 12, padding: '2px 8px', borderRadius: 10,
              background: `${theme.success}20`, color: theme.success
            }}>
              {completedTasks.length}
            </span>
          </div>
          <svg
            width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <>
            {/* Фильтр по месяцам */}
            {availableMonths.length > 1 && (
              <div style={{ 
                marginTop: 12, 
                marginBottom: 12,
                display: 'flex', 
                flexWrap: 'wrap',
                gap: 6 
              }}>
                <button
                  onClick={() => setSelectedMonth('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${selectedMonth === 'all' ? theme.accent1 : theme.borderPrimary}`,
                    background: selectedMonth === 'all' ? theme.accent1 : 'transparent',
                    color: selectedMonth === 'all' ? '#fff' : theme.textSecondary,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Все
                </button>
                {availableMonths.map(month => (
                  <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1px solid ${selectedMonth === month ? theme.accent1 : theme.borderPrimary}`,
                      background: selectedMonth === month ? theme.accent1 : 'transparent',
                      color: selectedMonth === month ? '#fff' : theme.textSecondary,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize'
                    }}
                  >
                    {getMonthName(month)}
                  </button>
                ))}
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 8,
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
            {filteredTasks.map(task => (
              <div
                key={task.id}
                style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: theme.bgSecondary, border: `1px solid ${theme.borderPrimary}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onClick={() => setSelectedTask(task)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = theme.accent1;
                  e.currentTarget.style.background = theme.bgHover;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = theme.borderPrimary;
                  e.currentTarget.style.background = theme.bgSecondary;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: task.color
                  }} />
                  <div>
                    <span style={{ fontSize: 13, color: theme.textPrimary }}>{task.title}</span>
                    {task.completedAt && (
                      <div style={{ fontSize: 11, color: theme.textTertiary, marginTop: 2 }}>
                        {new Date(task.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: theme.textTertiary }}>
                  {formatHours(task.totalHours)}
                </span>
              </div>
            ))}
            </div>
          </>
        )}
      </div>

      {/* Модальное окно с деталями задачи */}
      {selectedTask && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2147483647, padding: 20
        }}>
          <div style={{
            background: theme.bgCard, borderRadius: 16, padding: 24,
            maxWidth: 500, width: '100%', maxHeight: '80vh', overflow: 'auto',
            boxShadow: theme.shadowLg, position: 'relative', zIndex: 2147483647
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: selectedTask.color
                }} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                style={{
                  padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: theme.textTertiary
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{
              padding: 12, borderRadius: 8, background: theme.bgSecondary,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 4 }}>Общее время</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.textPrimary }}>
                {formatHours(selectedTask.totalHours)}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
                Распределение по дням
              </h4>
              {getTaskAssignments(selectedTask.id).length === 0 ? (
                <div style={{ fontSize: 13, color: theme.textTertiary, fontStyle: 'italic' }}>
                  Нет назначений
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {getTaskAssignments(selectedTask.id).map(a => (
                    <div
                      key={a.id}
                      style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: theme.bgSecondary, border: `1px solid ${theme.borderPrimary}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: theme.textPrimary }}>
                          {a.day!.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: `${selectedTask.color}20`, color: selectedTask.color
                      }}>
                        {formatHours(a.hours)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              padding: 16, borderRadius: 8, background: `${theme.accent1}10`,
              border: `1px solid ${theme.accent1}30`
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: theme.accent1 }}>
                Вернуть на доработку
              </h4>
              <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8 }}>
                Укажите дополнительное время на доработку
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="чч:мм"
                  value={returnHours}
                  onChange={(e) => setReturnHours(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                    border: `1px solid ${theme.borderPrimary}`, background: theme.bgCard,
                    color: theme.textPrimary, outline: 'none', textAlign: 'center'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = theme.accent1}
                  onBlur={e => e.currentTarget.style.borderColor = theme.borderPrimary}
                />
                <button
                  onClick={handleReturn}
                  disabled={!returnHours || parseTimeInput(returnHours) === null}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: theme.accent1, color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', opacity: !returnHours || parseTimeInput(returnHours) === null ? 0.5 : 1
                  }}
                >
                  Вернуть
                </button>
              </div>
              <div style={{ fontSize: 10, color: theme.textTertiary, marginTop: 4 }}>
                порог 15 минут
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
