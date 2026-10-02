import { useState, useCallback, useMemo, useEffect } from 'react';
import { Task, TaskAssignment, Week } from './types';
import { getMonthWeeks, getMonthName, generateId, HOURS_PER_DAY } from './utils/dateUtils';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import DayColumn from './components/DayColumn';

function App() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('planner-tasks');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    // Demo tasks
    return [
      { id: 'demo-1', title: 'Разработка API', totalHours: 12, color: '#6366f1' },
      { id: 'demo-2', title: 'Дизайн интерфейса', totalHours: 8, color: '#ec4899' },
      { id: 'demo-3', title: 'Тестирование', totalHours: 6, color: '#22c55e' },
    ];
  });
  const [assignments, setAssignments] = useState<TaskAssignment[]>(() => {
    try {
      const saved = localStorage.getItem('planner-assignments');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    // Demo assignments
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

  useEffect(() => {
    localStorage.setItem('planner-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('planner-assignments', JSON.stringify(assignments));
  }, [assignments]);

  const weeks = useMemo(() => getMonthWeeks(currentYear, currentMonth), [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setAssignments((prev) => prev.filter((a) => a.taskId !== taskId));
  }, []);

  const splitTask = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const totalAssigned = assignments
      .filter((a) => a.taskId === taskId)
      .reduce((sum, a) => sum + a.hours, 0);
    const remaining = task.totalHours - totalAssigned;
    if (remaining <= 1) return;

    const splitHours = Math.floor(remaining / 2);
    const newTask: Task = {
      ...task,
      id: generateId(),
      title: `${task.title} (часть 2)`,
      totalHours: remaining - splitHours,
    };
    // Update original task to have only the first part of remaining hours
    setTasks((prev) => [
      ...prev.map((t) => t.id === taskId ? { ...t, totalHours: totalAssigned + splitHours } : t),
      newTask,
    ]);
  }, [tasks, assignments]);

  const splitAssignment = useCallback((assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || assignment.hours <= 1) return;

    const half = Math.floor(assignment.hours / 2);
    const rest = assignment.hours - half;

    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.id !== assignmentId);
      return [
        ...filtered,
        { ...assignment, hours: half },
        { ...assignment, id: generateId(), hours: rest, order: assignment.order + 0.5 },
      ];
    });
  }, [assignments]);

  const removeAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }, []);

  const moveAssignment = useCallback((assignmentId: string, newDayId: string) => {
    setAssignments((prev) => {
      const assignment = prev.find(a => a.id === assignmentId);
      if (!assignment) return prev;
      const maxOrder = prev
        .filter((a) => a.dayId === newDayId)
        .reduce((max, a) => Math.max(max, a.order), 0);
      return prev.map(a => a.id === assignmentId ? { ...a, dayId: newDayId, order: maxOrder + 1 } : a);
    });
  }, []);

  const dropTask = useCallback((taskId: string, dayId: string, hours: number) => {
    // Check if there's already an assignment for this task on this day
    const existing = assignments.find((a) => a.taskId === taskId && a.dayId === dayId);
    if (existing) {
      // Add hours to existing assignment
      const dayTotal = assignments
        .filter((a) => a.dayId === dayId)
        .reduce((sum, a) => sum + a.hours, 0);
      if (dayTotal + hours <= HOURS_PER_DAY) {
        setAssignments((prev) =>
          prev.map((a) => a.id === existing.id ? { ...a, hours: a.hours + hours } : a)
        );
      }
      return;
    }

    // Check capacity
    const dayTotal = assignments
      .filter((a) => a.dayId === dayId)
      .reduce((sum, a) => sum + a.hours, 0);
    if (dayTotal + hours > HOURS_PER_DAY) return;

    const maxOrder = assignments
      .filter((a) => a.dayId === dayId)
      .reduce((max, a) => Math.max(max, a.order), 0);

    const newAssignment: TaskAssignment = {
      id: generateId(),
      taskId,
      dayId,
      hours,
      order: maxOrder + 1,
    };
    setAssignments((prev) => [...prev, newAssignment]);
  }, [assignments]);

  // Calculate stats
  const totalTaskHours = tasks.reduce((sum, t) => sum + t.totalHours, 0);
  const totalAssignedHours = assignments.reduce((sum, a) => sum + a.hours, 0);

  // Calculate per-task assigned hours
  const getTaskAssignedHours = (taskId: string) => {
    return assignments
      .filter((a) => a.taskId === taskId)
      .reduce((sum, a) => sum + a.hours, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-slate-800">Месячный планировщик</h1>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-base font-semibold text-slate-700 min-w-[160px] text-center">
              {getMonthName(currentMonth)} {currentYear}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 
                         rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Сегодня
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500">Задачи</div>
              <div className="text-sm font-bold text-slate-700">{tasks.length} шт / {totalTaskHours}ч</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Назначено</div>
              <div className="text-sm font-bold text-indigo-600">{totalAssignedHours}ч</div>
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
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Очистить все данные"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto flex gap-4 p-4">
        {/* Sidebar - Tasks */}
        <aside className="w-72 flex-shrink-0 space-y-4 sticky top-[72px] self-start max-h-[calc(100vh-88px)] overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Мои задачи
            </h3>
            <TaskForm onAddTask={addTask} />
          </div>

          {tasks.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Список ({tasks.length})
              </h3>
              <div className="space-y-2">
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
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm text-slate-500">Создайте первую задачу,<br/>чтобы начать планирование</p>
            </div>
          )}
        </aside>

        {/* Main Board */}
        <main className="flex-1 min-w-0">
          {/* Hint */}
          {showHint && (
            <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4 relative">
              <button
                onClick={() => { setShowHint(false); localStorage.setItem('planner-hint-dismissed', '1'); }}
                className="absolute top-2 right-2 p-1 rounded-md hover:bg-white/80 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h4 className="text-sm font-semibold text-indigo-800 mb-2">💡 Как пользоваться</h4>
              <ul className="text-xs text-indigo-700 space-y-1">
                <li>• <b>Создайте задачу</b> слева с оценкой в часах</li>
                <li>• <b>Перетащите</b> задачу на любой день — появится выбор часов</li>
                <li>• <b>Перетаскивайте блоки</b> между днями для перераспределения</li>
                <li>• <b>Разбивайте</b> задачу на части (✂️) или убирайте из дня (✕)</li>
                <li>• Каждый день = 8 рабочих часов, видно сколько свободно</li>
              </ul>
            </div>
          )}

          <div className="space-y-4">
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
            <div className="text-center py-20 text-slate-400">
              <div className="text-4xl mb-4">📅</div>
              <p>Нет рабочих дней в этом месяце</p>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="max-w-[1800px] mx-auto px-4 py-6 mt-8 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Месячный планировщик задач</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Сделано с ❤️</span>
            <a 
              href="https://github.com/lylelit/monthly-planner2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-indigo-500 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
  const weekNum = getWeekNumber(week.days[0].date);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400">Неделя {weekNum}</span>
        <span className="text-xs text-slate-300">•</span>
        <span className="text-xs text-slate-500">
          {week.days[0].date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — {week.days[4].date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-0 divide-x divide-slate-100">
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
