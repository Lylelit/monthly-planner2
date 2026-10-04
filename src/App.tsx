import { useState, useCallback, useMemo, useEffect } from 'react';
import { Task, TaskAssignment, Week } from './types';
import { getMonthWeeks, getMonthName, generateId, HOURS_PER_DAY } from './utils/dateUtils';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import DayColumn from './components/DayColumn';
import { loadTasks, loadAssignments, saveTasks, saveAssignments, getStorageMode } from './services/storageService';
import { useTheme } from './ThemeContext';

function App() {
  const { theme, mode, toggleTheme } = useTheme();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [tasks, setTasks] = useState<Task[]>(() => {
    return [
      { id: 'demo-1', title: 'Разработка API', totalHours: 12, color: '#3996D3' },
      { id: 'demo-2', title: 'Дизайн интерфейса', totalHours: 8, color: '#EF7D00' },
      { id: 'demo-3', title: 'Тестирование', totalHours: 6, color: '#89BC6B' },
    ];
  });
  const [assignments, setAssignments] = useState<TaskAssignment[]>(() => {
    const weeks = getMonthWeeks(now.getFullYear(), now.getMonth());
    if (weeks.length > 0 && weeks[0].days.length > 0) {
      return [
        { id: 'asgn-1', taskId: 'demo-1', dayId: weeks[0].days[0].id, hours: 4, order: 1 },
        { id: 'asgn-2', taskId: 'demo-2', dayId: weeks[0].days[0].id, hours: 3, order: 2 },
        { id: 'asgn-3', taskId: 'demo-1', dayId: weeks[0].days[1].id, hours: 5, order: 1 },
        { id: 'asgn-4', taskId: 'demo-3', dayId: weeks[0].days[2].id, hours: 6, order: 1 },
      ];
    }
    return [];
  });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(() => {
    return !localStorage.getItem('planner-hint-dismissed');
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [savedTasks, savedAssignments] = await Promise.all([
          loadTasks(),
          loadAssignments(),
        ]);
        if (savedTasks.length > 0) setTasks(savedTasks);
        if (savedAssignments.length > 0) setAssignments(savedAssignments);
      } catch (error) {
        console.error('Error loading ', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => { if (!isLoading) saveTasks(tasks); }, [tasks, isLoading]);
  useEffect(() => { if (!isLoading) saveAssignments(assignments); }, [assignments, isLoading]);

  const weeks = useMemo(() => getMonthWeeks(currentYear, currentMonth), [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const goToToday = () => { setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth()); };

  const addTask = useCallback((task: Task) => { setTasks((prev) => [...prev, task]); }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setAssignments((prev) => prev.filter((a) => a.taskId !== taskId));
  }, []);

  const splitTask = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const totalAssigned = assignments.filter((a) => a.taskId === taskId).reduce((sum, a) => sum + a.hours, 0);
    const remaining = task.totalHours - totalAssigned;
    if (remaining <= 1) return;
    const splitHours = Math.floor(remaining / 2);
    const newTask: Task = { ...task, id: generateId(), title: `${task.title} (часть 2)`, totalHours: remaining - splitHours };
    setTasks((prev) => [...prev.map((t) => t.id === taskId ? { ...t, totalHours: totalAssigned + splitHours } : t), newTask]);
  }, [tasks, assignments]);

  const splitAssignment = useCallback((assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || assignment.hours <= 1) return;
    const half = Math.floor(assignment.hours / 2);
    const rest = assignment.hours - half;
    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.id !== assignmentId);
      return [...filtered, { ...assignment, hours: half }, { ...assignment, id: generateId(), hours: rest, order: assignment.order + 0.5 }];
    });
  }, [assignments]);

  const removeAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }, []);

  const moveAssignment = useCallback((assignmentId: string, newDayId: string) => {
    setAssignments((prev) => {
      const assignment = prev.find(a => a.id === assignmentId);
      if (!assignment) return prev;
      const maxOrder = prev.filter((a) => a.dayId === newDayId).reduce((max, a) => Math.max(max, a.order), 0);
      return prev.map(a => a.id === assignmentId ? { ...a, dayId: newDayId, order: maxOrder + 1 } : a);
    });
  }, []);

  const dropTask = useCallback((taskId: string, dayId: string, hours: number) => {
    const existing = assignments.find((a) => a.taskId === taskId && a.dayId === dayId);
    if (existing) {
      const dayTotal = assignments.filter((a) => a.dayId === dayId).reduce((sum, a) => sum + a.hours, 0);
      if (dayTotal + hours <= HOURS_PER_DAY) {
        setAssignments((prev) => prev.map((a) => a.id === existing.id ? { ...a, hours: a.hours + hours } : a));
      }
      return;
    }
    const dayTotal = assignments.filter((a) => a.dayId === dayId).reduce((sum, a) => sum + a.hours, 0);
    if (dayTotal + hours > HOURS_PER_DAY) return;
    const maxOrder = assignments.filter((a) => a.dayId === dayId).reduce((max, a) => Math.max(max, a.order), 0);
    const newAssignment: TaskAssignment = { id: generateId(), taskId, dayId, hours, order: maxOrder + 1 };
    setAssignments((prev) => [...prev, newAssignment]);
  }, [assignments]);

  const totalTaskHours = tasks.reduce((sum, t) => sum + t.totalHours, 0);
  const totalAssignedHours = assignments.reduce((sum, a) => sum + a.hours, 0);

  const getTaskAssignedHours = (taskId: string) => {
    return assignments.filter((a) => a.taskId === taskId).reduce((sum, a) => sum + a.hours, 0);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.bgPrimary }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: `4px solid ${theme.borderPrimary}`,
            borderTopColor: theme.accent1, borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }}></div>
          <p style={{ color: theme.textSecondary, fontWeight: 500 }}>Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bgPrimary, transition: 'background 0.3s ease' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: `${theme.bgCard}ee`, backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.borderPrimary}`
      }}>
        <div style={{ maxWidth: 1800, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: theme.accent1, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, margin: 0 }}>Месячный планировщик</h1>
            </div>
          </div>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={prevMonth} style={{
              padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.textSecondary, transition: 'all 0.2s'
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.textPrimary, minWidth: 160, textAlign: 'center', margin: 0 }}>
              {getMonthName(currentMonth)} {currentYear}
            </h2>
            <button onClick={nextMonth} style={{
              padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: theme.textSecondary, transition: 'all 0.2s'
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={goToToday} style={{
              marginLeft: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500,
              background: `${theme.accent1}15`, color: theme.accent1,
              borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.2s'
            }}
              onMouseEnter={e => (e.currentTarget.style.background = `${theme.accent1}25`)}
              onMouseLeave={e => (e.currentTarget.style.background = `${theme.accent1}15`)}
            >
              Сегодня
            </button>
          </div>

          {/* Stats & Theme toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Theme toggle */}
            <button onClick={toggleTheme} style={{
              padding: 8, borderRadius: 8, border: `1px solid ${theme.borderPrimary}`,
              background: theme.bgSecondary, color: theme.textSecondary,
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = theme.bgSecondary)}
            >
              {mode === 'light' ? '🌙' : '☀️'}
              <span style={{ fontSize: 12 }}>{mode === 'light' ? 'Тёмная' : 'Светлая'}</span>
            </button>

            <div style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: getStorageMode() === 'supabase' ? `${theme.success}15` : theme.bgSecondary,
              color: getStorageMode() === 'supabase' ? theme.success : theme.textTertiary,
              border: `1px solid ${getStorageMode() === 'supabase' ? `${theme.success}30` : theme.borderPrimary}`
            }}>
              {getStorageMode() === 'supabase' ? '☁️ Облако' : '💾 Локально'}
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: theme.textTertiary }}>Задачи</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary }}>{tasks.length} шт / {totalTaskHours}ч</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: theme.textTertiary }}>Назначено</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent1 }}>{totalAssignedHours}ч</div>
            </div>
            <button
              onClick={() => {
                if (confirm('Очистить все данные?')) {
                  setTasks([]);
                  setAssignments([]);
                  localStorage.removeItem('planner-tasks');
                  localStorage.removeItem('planner-assignments');
                }
              }}
              style={{
                padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.danger)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.textTertiary)}
              title="Очистить все данные"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1800, margin: '0 auto', display: 'flex', gap: 16, padding: 16 }}>
        {/* Sidebar */}
        <aside style={{
          width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16,
          position: 'sticky', top: 72, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 88px)', overflowY: 'auto'
        }}>
          <div style={{
            background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`,
            padding: 16, boxShadow: theme.shadow
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke={theme.accent1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Мои задачи
            </h3>
            <TaskForm onAddTask={addTask} />
          </div>

          {tasks.length > 0 && (
            <div style={{
              background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`,
              padding: 16, boxShadow: theme.shadow
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, marginBottom: 12 }}>
                Список ({tasks.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedHours={getTaskAssignedHours(task.id)}
                    totalAssignedHours={getTaskAssignedHours(task.id)}
                    onDragStart={setDraggedTaskId}
                    onSplit={splitTask}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div style={{
              background: theme.bgSecondary, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`,
              padding: 24, textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: 14, color: theme.textTertiary }}>Создайте первую задачу,<br/>чтобы начать планирование</p>
            </div>
          )}
        </aside>

        {/* Main Board */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {showHint && (
            <div style={{
              marginBottom: 16, background: `${theme.accent1}10`, borderRadius: 16,
              border: `1px solid ${theme.accent1}30`, padding: 16, position: 'relative'
            }}>
              <button
                onClick={() => { setShowHint(false); localStorage.setItem('planner-hint-dismissed', '1'); }}
                style={{
                  position: 'absolute', top: 8, right: 8, padding: 4, borderRadius: 6,
                  border: 'none', cursor: 'pointer', background: 'transparent', color: theme.textTertiary
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: theme.accent1, marginBottom: 8 }}>💡 Как пользоваться</h4>
              <ul style={{ fontSize: 12, color: theme.textSecondary, listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>• <b>Создайте задачу</b> слева с оценкой в часах</li>
                <li>• <b>Перетащите</b> задачу на любой день — появится выбор часов</li>
                <li>• <b>Перетаскивайте блоки</b> между днями для перераспределения</li>
                <li>• <b>Разбивайте</b> задачу на части (✂️) или убирайте из дня (✕)</li>
                <li>• Каждый день = 8 рабочих часов, видно сколько свободно</li>
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {weeks.map((week) => (
              <WeekRow
                key={week.id}
                week={week}
                tasks={tasks}
                assignments={assignments}
                onDropTask={dropTask}
                onRemoveAssignment={removeAssignment}
                onSplitAssignment={splitAssignment}
                onMoveAssignment={moveAssignment}
              />
            ))}
          </div>

          {weeks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: theme.textTertiary }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
              <p>Нет рабочих дней в этом месяце</p>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={{
        maxWidth: 1800, margin: '32px auto 0', padding: '24px 16px',
        borderTop: `1px solid ${theme.borderPrimary}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: theme.textTertiary }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📅</span>
            <span>Месячный планировщик задач</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>Сделано с ❤️</span>
            <a href="https://github.com/lylelit/monthly-planner2" target="_blank" rel="noopener noreferrer"
              style={{ color: theme.textTertiary, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.accent1)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.textTertiary)}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface WeekRowProps {
  week: Week;
  tasks: Task[];
  assignments: TaskAssignment[];
  onDropTask: (taskId: string, dayId: string, hours: number) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onSplitAssignment: (assignmentId: string) => void;
  onMoveAssignment: (assignmentId: string, newDayId: string) => void;
}

function WeekRow({ week, tasks, assignments, onDropTask, onRemoveAssignment, onSplitAssignment, onMoveAssignment }: WeekRowProps) {
  const { theme } = useTheme();
  const weekNum = getWeekNumber(week.days[0].date);

  return (
    <div style={{
      background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`,
      boxShadow: theme.shadow, overflow: 'hidden'
    }}>
      <div style={{
        padding: '8px 16px', background: theme.bgSecondary,
        borderBottom: `1px solid ${theme.borderPrimary}`, display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: theme.textTertiary }}>Неделя {weekNum}</span>
        <span style={{ fontSize: 12, color: theme.borderPrimary }}>•</span>
        <span style={{ fontSize: 12, color: theme.textSecondary }}>
          {week.days[0].date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — {week.days[4].date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8, padding: 8
      }}>
        {week.days.map((day) => (
          <DayColumn
            key={day.id}
            day={day}
            tasks={tasks}
            assignments={assignments}
            onDropTask={onDropTask}
            onRemoveAssignment={onRemoveAssignment}
            onSplitAssignment={onSplitAssignment}
            onMoveAssignment={onMoveAssignment}
          />
        ))}
      </div>
    </div>
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default App;
