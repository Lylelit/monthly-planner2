import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Task, TaskAssignment, Week } from './types';
import { getMonthWeeks, getMonthName, generateId, HOURS_PER_DAY } from './utils/dateUtils';
import { formatHours } from './utils/timeFormat';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import DayColumn from './components/DayColumn';
import CompletedTasksList from './components/CompletedTasksList';
import EditTaskModal from './components/EditTaskModal';
import SearchFilter from './components/SearchFilter';
import ExportModal from './components/ExportModal';
import AuthScreen, { Profile } from './components/AuthScreen';
import { exportToExcel } from './utils/excelExport';
import { loadTasks, loadAssignments, saveTasks, saveAssignments, setCurrentProfile } from './services/storageService';
import { useTheme } from './ThemeContext';

function App() {
  const { theme, mode, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [dayStatuses, setDayStatuses] = useState<Record<string, 'vacation' | 'holiday'>>({});
  const [, setDraggedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHint, setShowHint] = useState(() => {
    const dismissed = localStorage.getItem('planner-hint-dismissed');
    return !dismissed;
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'completed'>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const [shouldScrollToCurrentWeek, setShouldScrollToCurrentWeek] = useState(true);

  const toggleHint = () => {
    const newState = !showHint;
    setShowHint(newState);
    if (!newState) {
      localStorage.setItem('planner-hint-dismissed', 'true');
    } else {
      localStorage.removeItem('planner-hint-dismissed');
    }
  };

  const handleExport = async (startDate: string, endDate: string) => {
    console.log('Starting export...', { startDate, endDate, tasksCount: tasks.length, assignmentsCount: assignments.length });
    try {
      await exportToExcel(tasks, assignments, startDate, endDate);
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте: ' + (error as Error).message);
    }
  };

  // Проверка авторизации при старте
  useEffect(() => {
    const savedLogin = localStorage.getItem('planner-current-user');
    if (savedLogin) {
      try {
        const profiles = JSON.parse(localStorage.getItem('planner-profiles') || '[]');
        const profile = profiles.find((p: Profile) => p.login === savedLogin);
        if (profile) {
          setCurrentUser(profile);
          setCurrentProfile(profile);
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    }
    setAuthChecked(true);
  }, []);

  // Отслеживание размера экрана
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Загрузка данных при входе
  useEffect(() => {
    async function loadData() {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const [savedTasks, savedAssignments] = await Promise.all([
          loadTasks(),
          loadAssignments(),
        ]);
        if (savedTasks.length > 0) setTasks(savedTasks);
        if (savedAssignments.length > 0) setAssignments(savedAssignments);

        // Загружаем статусы дней
        const savedDayStatuses = localStorage.getItem(`planner-day-statuses-${currentUser.login}`);
        if (savedDayStatuses) {
          setDayStatuses(JSON.parse(savedDayStatuses));
        }
      } catch (error) {
        console.error('Error loading ', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (authChecked) {
      loadData();
    }
  }, [currentUser, authChecked]);
  useEffect(() => { if (!isLoading && currentUser) saveTasks(tasks); }, [tasks, isLoading, currentUser]);
  useEffect(() => { if (!isLoading && currentUser) saveAssignments(assignments); }, [assignments, isLoading, currentUser]);

  const weeksContainerRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLDivElement>(null);

  // Загружаем недели из 3 месяцев: предыдущий, текущий, следующий
  const weeks = useMemo(() => {
    // Вычисляем предыдущий и следующий месяцы
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    
    const prevMonthWeeks = getMonthWeeks(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
    const currentMonthWeeks = getMonthWeeks(currentYear, currentMonth);
    const nextMonthWeeks = getMonthWeeks(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
    
    // Объединяем все недели
    const allWeeks = [...prevMonthWeeks, ...currentMonthWeeks, ...nextMonthWeeks];
    
    // Убираем дублирующиеся недели (недели с одинаковым первым днём)
    const uniqueWeeks = allWeeks.filter((week, index, self) => {
      const firstDay = week.days[0].date.toDateString();
      return index === self.findIndex(w => w.days[0].date.toDateString() === firstDay);
    });
    
    // Находим текущую неделю (неделю с сегодняшней датой)
    const today = new Date();
    const currentWeekIndex = uniqueWeeks.findIndex(week => {
      return week.days.some(day => {
        const dayDate = new Date(day.date);
        return dayDate.toDateString() === today.toDateString();
      });
    });
    
    // Если нашли текущую неделю, перестраиваем массив так, чтобы она была второй
    if (currentWeekIndex !== -1) {
      // Берём недели до текущей (включая предыдущий месяц)
      const weeksBefore = uniqueWeeks.slice(0, currentWeekIndex);
      // Текущая неделя
      const currentWeek = uniqueWeeks[currentWeekIndex];
      // Недели после текущей
      const weeksAfter = uniqueWeeks.slice(currentWeekIndex + 1);
      
      // Собираем: все недели до текущей, текущая неделя (вторая позиция), все недели после
      return [...weeksBefore, currentWeek, ...weeksAfter];
    }
    
    return uniqueWeeks;
  }, [currentYear, currentMonth]);

  // Автоматический скролл к текущей неделе при загрузке
  useEffect(() => {
    if (!isLoading && weeks.length > 0 && shouldScrollToCurrentWeek) {
      // Небольшая задержка для гарантии, что DOM полностью отрендерился
      const timer = setTimeout(() => {
        if (currentWeekRef.current && weeksContainerRef.current) {
          const container = weeksContainerRef.current;
          const weekElement = currentWeekRef.current;
          
          // Получаем позицию элемента относительно контейнера
          const containerRect = container.getBoundingClientRect();
          const weekRect = weekElement.getBoundingClientRect();
          
          // Вычисляем позицию для скролла (текущая неделя должна быть второй сверху)
          const scrollTop = weekRect.top - containerRect.top + container.scrollTop - 20;
          
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [weeks, isLoading, shouldScrollToCurrentWeek]);

  // Обработчик скролла для определения активного месяца
  useEffect(() => {
    const container = weeksContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;
      
      // Находим неделю, которая находится ближе всего к центру контейнера
      let closestWeek: Week | undefined;
      let minDistance = Infinity;
      
      weeks.forEach(week => {
        const weekElement = document.getElementById(`week-${week.id}`);
        if (weekElement) {
          const weekRect = weekElement.getBoundingClientRect();
          const weekCenter = weekRect.top + weekRect.height / 2;
          const distance = Math.abs(weekCenter - containerCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestWeek = week;
          }
        }
      });
      
      // Определяем месяц ближайшей недели по большинству дней
      if (closestWeek) {
        // Считаем сколько дней из недели принадлежит каждому месяцу
        const monthCounts: Record<string, number> = {};
        closestWeek.days.forEach(day => {
          const dayDate = new Date(day.date);
          const key = `${dayDate.getFullYear()}-${dayDate.getMonth()}`;
          monthCounts[key] = (monthCounts[key] || 0) + 1;
        });
        
        // Находим месяц с максимальным количеством дней
        let maxMonth = '';
        let maxCount = 0;
        Object.entries(monthCounts).forEach(([key, count]) => {
          if (count > maxCount) {
            maxCount = count;
            maxMonth = key;
          }
        });
        
        // Парсим год и месяц
        const [yearStr, monthStr] = maxMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        
        // Обновляем видимый месяц если он изменился
        if (month !== visibleMonth.month || year !== visibleMonth.year) {
          setVisibleMonth({ month, year });
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [weeks, visibleMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
    setVisibleMonth({ month: currentMonth === 0 ? 11 : currentMonth - 1, year: currentMonth === 0 ? currentYear - 1 : currentYear });
    setShouldScrollToCurrentWeek(false);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
    setVisibleMonth({ month: currentMonth === 11 ? 0 : currentMonth + 1, year: currentMonth === 11 ? currentYear + 1 : currentYear });
    setShouldScrollToCurrentWeek(false);
  };

  const goToToday = () => { 
    setCurrentYear(now.getFullYear()); 
    setCurrentMonth(now.getMonth());
    setVisibleMonth({ month: now.getMonth(), year: now.getFullYear() });
    setShouldScrollToCurrentWeek(true);
  };

  const addTask = useCallback((task: Task) => { setTasks((prev) => [...prev, task]); }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setAssignments((prev) => prev.filter((a) => a.taskId !== taskId));
  }, []);

  const completeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.map(t => 
      t.id === taskId ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t
    ));
  }, []);

  const returnToNew = useCallback((taskId: string, additionalHours: number) => {
    // Вычисляем сколько уже потрачено на эту задачу
    const alreadyAssigned = assignments
      .filter(a => a.taskId === taskId)
      .reduce((sum, a) => sum + a.hours, 0);
    
    // Новое общее время = уже потрачено + время на доработку
    const newTotalHours = alreadyAssigned + additionalHours;
    
    setTasks((prev) => prev.map(t => 
      t.id === taskId ? { ...t, status: 'new' as const, completedAt: undefined, totalHours: newTotalHours } : t
    ));
  }, [assignments]);

  const editTask = useCallback((updatedTask: Task) => {
    setTasks((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
  }, []);

  const setDayStatus = useCallback((dayId: string, status: 'vacation' | 'holiday' | 'working') => {
    setDayStatuses((prev) => {
      const updated = { ...prev };
      if (status === 'working') {
        delete updated[dayId];
      } else {
        updated[dayId] = status;
      }
      localStorage.setItem(`planner-day-statuses-${currentUser?.login}`, JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);

  const splitAssignment = useCallback((assignmentId: string, hoursToSplit: number) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || hoursToSplit <= 0 || hoursToSplit >= assignment.hours) return;
    const rest = assignment.hours - hoursToSplit;
    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.id !== assignmentId);
      return [...filtered, { ...assignment, hours: hoursToSplit }, { ...assignment, id: generateId(), hours: rest, order: assignment.order + 0.5 }];
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

  const reorderAssignment = useCallback((sourceId: string, targetId: string) => {
    setAssignments((prev) => {
      const source = prev.find(a => a.id === sourceId);
      const target = prev.find(a => a.id === targetId);
      if (!source || !target) return prev;
      
      // Меняем order местами
      return prev.map(a => {
        if (a.id === sourceId) return { ...a, order: target.order };
        if (a.id === targetId) return { ...a, order: source.order };
        return a;
      });
    });
  }, []);

  const mergeAssignments = useCallback((sourceId: string, targetId: string) => {
    setAssignments((prev) => {
      const source = prev.find(a => a.id === sourceId);
      const target = prev.find(a => a.id === targetId);
      if (!source || !target) return prev;
      
      // Проверяем что это одна и та же задача
      if (source.taskId !== target.taskId) return prev;
      
      // Объединяем время и удаляем source
      const newHours = source.hours + target.hours;
      return prev
        .filter(a => a.id !== sourceId)
        .map(a => a.id === targetId ? { ...a, hours: newHours } : a);
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
  
  // Считаем назначенные часы только для текущего месяца и только в РАБОЧИЕ дни
  const totalAssignedHours = useMemo(() => {
    return assignments.reduce((sum, a) => {
      // Проверяем что назначение принадлежит текущему месяцу
      const dayId = a.dayId;
      const dayDateStr = dayId.replace('day-', '');
      const dayDate = new Date(dayDateStr);
      const isCurrentMonth = dayDate.getMonth() === currentMonth && dayDate.getFullYear() === currentYear;
      
      // Проверяем что день НЕ является отпускным или выходным
      const isVacationOrHoliday = dayStatuses[dayId] === 'vacation' || dayStatuses[dayId] === 'holiday';
      
      // Учитываем только если это текущий месяц И день рабочий
      return (isCurrentMonth && !isVacationOrHoliday) ? sum + a.hours : sum;
    }, 0);
  }, [assignments, currentMonth, currentYear, dayStatuses]);

  // Расчёт общего рабочего времени за текущий выбранный месяц (8 часов × рабочие дни, исключая отпуск/праздники)
  const currentMonthWeeks = useMemo(() => {
    return getMonthWeeks(currentYear, currentMonth);
  }, [currentYear, currentMonth]);
  
  const workingDaysInMonth = currentMonthWeeks.reduce((count, week) => {
    return count + week.days.filter(day => {
      // Проверяем что день принадлежит текущему месяцу
      const dayDate = new Date(day.date);
      const isCurrentMonth = dayDate.getMonth() === currentMonth && dayDate.getFullYear() === currentYear;
      return isCurrentMonth && day.isWorkingDay && !dayStatuses[day.id];
    }).length;
  }, 0);
  const totalWorkingHours = workingDaysInMonth * HOURS_PER_DAY;
  const remainingWorkingHours = totalWorkingHours - totalAssignedHours;

  const getTaskAssignedHours = (taskId: string) => {
    return assignments.filter((a) => a.taskId === taskId).reduce((sum, a) => sum + a.hours, 0);
  };

  // Фильтрация задач для поиска
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Фильтр по статусу
      if (statusFilter === 'new' && task.status === 'completed') return false;
      if (statusFilter === 'completed' && task.status !== 'completed') return false;
      
      // Фильтр по поисковому запросу
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return task.title.toLowerCase().includes(query);
      }
      
      return true;
    });
  }, [tasks, statusFilter, searchQuery]);

  const handleLogin = (profile: Profile) => {
    setCurrentUser(profile);
    setCurrentProfile(profile);
    localStorage.setItem('planner-current-user', profile.login);
    setIsLoading(true);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setCurrentProfile(null);
    localStorage.removeItem('planner-current-user');
    setTasks([]);
    setAssignments([]);
  };

  // Экран авторизации
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.bgPrimary }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: `4px solid ${theme.borderPrimary}`,
            borderTopColor: theme.accent1, borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }}></div>
          <p style={{ color: theme.textSecondary, fontWeight: 500 }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

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
        <div style={{ 
          maxWidth: 1800, 
          margin: '0 auto', 
          padding: isMobile ? '8px 12px' : '12px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: isMobile ? 8 : 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: isMobile ? 28 : 32, 
                height: isMobile ? 28 : 32, 
                borderRadius: 8,
                background: theme.accent1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              {!isMobile && (
                <h1 style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, margin: 0 }}>Твой планировщик</h1>
              )}
            </div>
          </div>

          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
            <button onClick={prevMonth} style={{
              padding: isMobile ? 6 : 8, 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer',
              background: 'transparent', 
              color: theme.textSecondary, 
              transition: 'all 0.2s'
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 style={{ 
              fontSize: isMobile ? 14 : 16, 
              fontWeight: 600, 
              color: theme.textPrimary, 
              minWidth: isMobile ? 120 : 160, 
              textAlign: 'center', 
              margin: 0 
            }}>
              {getMonthName(visibleMonth.month)} {visibleMonth.year}
            </h2>
            <button onClick={nextMonth} style={{
              padding: isMobile ? 6 : 8, 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer',
              background: 'transparent', 
              color: theme.textSecondary, 
              transition: 'all 0.2s'
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {!isMobile && (
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
            )}
          </div>

          {/* Stats & Theme toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Hint toggle */}
            {!showHint && (
              <button onClick={toggleHint} style={{
                padding: 8, borderRadius: 8, border: `1px solid ${theme.borderPrimary}`,
                background: theme.bgSecondary, color: theme.textSecondary,
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center'
              }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
                onMouseLeave={e => (e.currentTarget.style.background = theme.bgSecondary)}
                title="Показать подсказку"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
            )}

            {/* Export button */}
            <button 
              onClick={() => setShowExportModal(true)}
              style={{
                padding: 8, borderRadius: 8, border: `1px solid ${theme.borderPrimary}`,
                background: theme.bgSecondary, color: theme.textSecondary,
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = theme.bgSecondary)}
              title="Экспорт в Excel"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* Theme toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke={theme.textTertiary} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5"/>
                <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <button 
                onClick={toggleTheme}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: mode === 'dark' ? theme.accent1 : theme.bgTertiary,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s ease'
                }}
              >
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: mode === 'dark' ? 23 : 3,
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}/>
              </button>
              <svg width="16" height="16" fill="none" stroke={theme.textTertiary} viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </div>

            {/* User info & logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
              {!isMobile && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: theme.textTertiary }}>Профиль</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
                    {currentUser.displayName}
                  </div>
                </div>
              )}
              <button onClick={handleSignOut} style={{
                padding: 8, borderRadius: 8, border: `1px solid ${theme.borderPrimary}`,
                background: theme.bgSecondary, color: theme.textSecondary,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.danger;
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = theme.danger;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = theme.bgSecondary;
                  e.currentTarget.style.color = theme.textSecondary;
                  e.currentTarget.style.borderColor = theme.borderPrimary;
                }}
                title="Выйти из профиля"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>

            {!isMobile && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: theme.textTertiary }}>Новые задачи</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary }}>
                  {tasks.filter(t => t.status !== 'completed').length} шт / {formatHours(tasks.filter(t => t.status !== 'completed').reduce((sum, t) => sum + t.totalHours, 0))}
                </div>
              </div>
            )}

            {!isMobile && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: theme.textTertiary }}>Рабочее время</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: remainingWorkingHours > 0 ? theme.accent4 : theme.accent2 }}>
                  {formatHours(remainingWorkingHours)} / {formatHours(totalWorkingHours)}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (confirm('Очистить все данные текущего профиля?')) {
                  setTasks([]);
                  setAssignments([]);
                }
              }}
              style={{
                padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', color: theme.textTertiary, transition: 'all 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = theme.danger)}
              onMouseLeave={e => (e.currentTarget.style.color = theme.textTertiary)}
              title="Очистить данные профиля"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div style={{ 
        maxWidth: 1800, 
        margin: '0 auto', 
        display: 'flex', 
        gap: isMobile ? 0 : 16, 
        padding: isMobile ? 8 : 16,
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {/* Mobile menu button */}
        {isMobile && (
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: theme.accent1,
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {/* Sidebar */}
        <aside style={{
          width: isMobile ? '100%' : 288, 
          flexShrink: 0, 
          display: isMobile && !showSidebar ? 'none' : 'flex',
          flexDirection: 'column', 
          gap: 16,
          position: isMobile ? 'fixed' : 'sticky',
          top: isMobile ? 0 : 72,
          left: isMobile ? 0 : undefined,
          right: isMobile ? 0 : undefined,
          bottom: isMobile ? 0 : undefined,
          background: isMobile ? theme.bgPrimary : 'transparent',
          zIndex: isMobile ? 99 : 1,
          padding: isMobile ? 16 : 0,
          overflowY: isMobile ? 'auto' : undefined,
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 88px)'
        }}>
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={() => setShowSidebar(false)}
              style={{
                alignSelf: 'flex-end',
                padding: 8,
                borderRadius: 8,
                border: 'none',
                background: theme.bgSecondary,
                color: theme.textSecondary,
                cursor: 'pointer',
                marginBottom: 8
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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

          {/* Поиск и фильтрация */}
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          {/* Новые задачи */}
          {filteredTasks.filter(t => t.status !== 'completed').length > 0 && (
            <div style={{
              background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`,
              padding: 16, boxShadow: theme.shadow
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, marginBottom: 12 }}>
                Новые задачи ({filteredTasks.filter(t => t.status !== 'completed').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredTasks.filter(t => t.status !== 'completed').map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignedHours={getTaskAssignedHours(task.id)}
                    totalAssignedHours={getTaskAssignedHours(task.id)}
                    onDragStart={setDraggedTaskId}
                    onComplete={completeTask}
                    onEdit={setEditingTask}
                    onDelete={deleteTask}
                    onReorder={(draggedId, targetId) => {
                      const newTasks = [...tasks];
                      const draggedIndex = newTasks.findIndex(t => t.id === draggedId);
                      const targetIndex = newTasks.findIndex(t => t.id === targetId);
                      if (draggedIndex !== -1 && targetIndex !== -1) {
                        const [draggedTask] = newTasks.splice(draggedIndex, 1);
                        newTasks.splice(targetIndex, 0, draggedTask);
                        setTasks(newTasks);
                      }
                    }}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Выполненные задачи */}
          <CompletedTasksList
            tasks={filteredTasks}
            assignments={assignments}
            days={weeks.flatMap(w => w.days)}
            onReturnToNew={returnToNew}
          />

          {filteredTasks.filter(t => t.status !== 'completed').length === 0 && filteredTasks.filter(t => t.status === 'completed').length === 0 && (
            <div style={{
              background: theme.bgSecondary, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`,
              padding: 24, textAlign: 'center'
            }}>
              <svg width="32" height="32" fill="none" stroke={theme.textTertiary} viewBox="0 0 24 24" style={{ marginBottom: 8 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
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
                onClick={toggleHint}
                style={{
                  position: 'absolute', top: 8, right: 8, padding: 4, borderRadius: 6,
                  border: 'none', cursor: 'pointer', background: 'transparent', color: theme.textTertiary
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: theme.accent1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                Как пользоваться
              </h4>
              <ul style={{ fontSize: 12, color: theme.textSecondary, listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>• <b>Создайте задачу</b> слева с оценкой в часах</li>
                <li>• <b>Перетащите</b> задачу на любой день — появится выбор часов</li>
                <li>• <b>Перетаскивайте блоки</b> между днями для перераспределения</li>
                <li>• <b>Разбивайте</b> задачу на части (✂️) или убирайте из дня (✕)</li>
                <li>• Каждый день = 8 рабочих часов, видно сколько не запланировано</li>
              </ul>
            </div>
          )}

          {/* Контейнер с прокруткой для недель */}
          <div 
            ref={weeksContainerRef}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 16,
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              paddingRight: 8
            }}
          >
            {weeks.map((week) => {
              // Проверяем является ли эта неделя текущей
              const today = new Date();
              const isCurrentWeek = week.days.some(day => {
                const dayDate = new Date(day.date);
                return dayDate.toDateString() === today.toDateString();
              });
              
              return (
                <div key={week.id} id={`week-${week.id}`} ref={isCurrentWeek ? currentWeekRef : null}>
                  <WeekRow
                    week={week}
                    tasks={tasks}
                    assignments={assignments}
                    dayStatuses={dayStatuses}
                    onDropTask={dropTask}
                    onRemoveAssignment={removeAssignment}
                    onSplitAssignment={splitAssignment}
                    onMoveAssignment={moveAssignment}
                    onSetDayStatus={setDayStatus}
                    onReorderAssignment={reorderAssignment}
                    onMergeAssignments={mergeAssignments}
                    isMobile={isMobile}
                    isCurrentWeek={isCurrentWeek}
                    visibleMonth={visibleMonth}
                  />
                </div>
              );
            })}
          </div>

          {weeks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: theme.textTertiary }}>
              <svg width="40" height="40" fill="none" stroke={theme.textTertiary} viewBox="0 0 24 24" style={{ marginBottom: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p>Нет рабочих дней в этом месяце</p>
            </div>
          )}
        </main>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={editTask}
          onCancel={() => setEditingTask(null)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}

      {/* Footer */}
      <footer style={{
        maxWidth: 1800, margin: '32px auto 0', padding: '24px 16px',
        borderTop: `1px solid ${theme.borderPrimary}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: theme.textTertiary }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
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
  dayStatuses: Record<string, 'vacation' | 'holiday'>;
  onDropTask: (taskId: string, dayId: string, hours: number) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onSplitAssignment: (assignmentId: string, hoursToSplit: number) => void;
  onMoveAssignment: (assignmentId: string, newDayId: string) => void;
  onSetDayStatus: (dayId: string, status: 'vacation' | 'holiday' | 'working') => void;
  onReorderAssignment?: (sourceId: string, targetId: string) => void;
  onMergeAssignments?: (sourceId: string, targetId: string) => void;
  isMobile: boolean;
  isCurrentWeek?: boolean;
  visibleMonth: { month: number; year: number };
}

function WeekRow({ week, tasks, assignments, dayStatuses, onDropTask, onRemoveAssignment, onSplitAssignment, onMoveAssignment, onSetDayStatus, onReorderAssignment, onMergeAssignments, isMobile, isCurrentWeek, visibleMonth }: WeekRowProps & { isMobile: boolean }) {
  const { theme } = useTheme();
  
  return (
    <div style={{
      padding: isCurrentWeek ? 8 : 0,
      background: isCurrentWeek ? `${theme.accent1}08` : 'transparent',
      borderRadius: 12,
      border: isCurrentWeek ? `2px solid ${theme.accent1}30` : 'none',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        display: isMobile ? 'flex' : 'grid',
        gridTemplateColumns: isMobile ? undefined : 'repeat(5, 1fr)',
        flexDirection: isMobile ? 'column' : undefined,
        gap: isMobile ? 8 : 12
      }}>
        {week.days.map((day) => {
          // Определяем активность каждого дня динамически
          const dayDate = new Date(day.date);
          const isDayInActiveMonth = dayDate.getMonth() === visibleMonth.month && dayDate.getFullYear() === visibleMonth.year;
          
          return (
            <DayColumn
              key={day.id}
              day={{ ...day, status: dayStatuses[day.id] || 'working' }}
              tasks={tasks}
              assignments={assignments}
              onDropTask={onDropTask}
              onRemoveAssignment={onRemoveAssignment}
              onSplitAssignment={onSplitAssignment}
              onMoveAssignment={onMoveAssignment}
              onSetDayStatus={onSetDayStatus}
              onReorderAssignment={onReorderAssignment}
              onMergeAssignments={onMergeAssignments}
              isMobile={isMobile}
              isActiveMonth={isDayInActiveMonth}
            />
          );
        })}
      </div>
    </div>
  );
}

export default App;
