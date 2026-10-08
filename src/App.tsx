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
  const [dayStatuses, setDayStatuses] = useState<Record<string, { status: 'vacation' | 'holiday' | 'short'; hours?: number }>>({});
  const [, setDraggedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showHint, setShowHint] = useState(() => !localStorage.getItem('planner-hint-dismissed'));
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
    if (!newState) localStorage.setItem('planner-hint-dismissed', 'true');
    else localStorage.removeItem('planner-hint-dismissed');
  };

  const handleExport = async (startDate: string, endDate: string) => {
    try { await exportToExcel(tasks, assignments, startDate, endDate); setShowExportModal(false); }
    catch (error) { console.error('Export error:', error); alert('Ошибка при экспорте: ' + (error as Error).message); }
  };

  useEffect(() => {
    const savedLogin = localStorage.getItem('planner-current-user');
    if (savedLogin) {
      try {
        const profiles = JSON.parse(localStorage.getItem('planner-profiles') || '[]');
        const profile = profiles.find((p: Profile) => p.login === savedLogin);
        if (profile) { setCurrentUser(profile); setCurrentProfile(profile); }
      } catch (e) { console.error('Error loading profile:', e); }
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!currentUser) { setIsLoading(false); return; }
      try {
        const [savedTasks, savedAssignments] = await Promise.all([loadTasks(), loadAssignments()]);
        if (savedTasks.length > 0) setTasks(savedTasks);
        if (savedAssignments.length > 0) setAssignments(savedAssignments);
        const savedDayStatuses = localStorage.getItem(`planner-day-statuses-${currentUser.login}`);
        if (savedDayStatuses) setDayStatuses(JSON.parse(savedDayStatuses));
      } catch (error) { console.error('Error loading ', error); }
      finally { setIsLoading(false); }
    }
    if (authChecked) loadData();
  }, [currentUser, authChecked]);

  useEffect(() => { if (!isLoading && currentUser) saveTasks(tasks); }, [tasks, isLoading, currentUser]);
  useEffect(() => { if (!isLoading && currentUser) saveAssignments(assignments); }, [assignments, isLoading, currentUser]);

  const weeksContainerRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLDivElement>(null);

  const weeks = useMemo(() => {
    const allWeeks: Week[] = [];
    for (let month = 0; month < 12; month++) {
      const monthWeeks = getMonthWeeks(currentYear, month);
      allWeeks.push(...monthWeeks);
    }
    const uniqueWeeks = allWeeks.filter((week, index, self) => {
      const firstDay = week.days[0].date.toDateString();
      return index === self.findIndex(w => w.days[0].date.toDateString() === firstDay);
    });
    const today = new Date();
    const currentWeekIndex = uniqueWeeks.findIndex(week => week.days.some(day => new Date(day.date).toDateString() === today.toDateString()));
    if (currentWeekIndex !== -1) {
      const weeksBefore = uniqueWeeks.slice(0, currentWeekIndex);
      const currentWeek = uniqueWeeks[currentWeekIndex];
      const weeksAfter = uniqueWeeks.slice(currentWeekIndex + 1);
      return [...weeksBefore, currentWeek, ...weeksAfter];
    }
    return uniqueWeeks;
  }, [currentYear]);

  const currentWeekId = useMemo(() => {
    const today = new Date();
    const week = weeks.find(w => w.days.some(day => new Date(day.date).toDateString() === today.toDateString()));
    return week?.id || null;
  }, [weeks]);

  const weeksRef = useRef(weeks);
  const visibleMonthRef = useRef(visibleMonth);
  useEffect(() => { weeksRef.current = weeks; visibleMonthRef.current = visibleMonth; }, [weeks, visibleMonth]);

  useEffect(() => {
    if (!isLoading && weeks.length > 0 && shouldScrollToCurrentWeek) {
      const timer = setTimeout(() => {
        const container = weeksContainerRef.current;
        const weekElement = currentWeekRef.current;
        if (container && weekElement) {
          const containerRect = container.getBoundingClientRect();
          const weekRect = weekElement.getBoundingClientRect();
          const scrollTop = weekRect.top - containerRect.top + container.scrollTop - 20;
          container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [weeks, isLoading, shouldScrollToCurrentWeek, currentWeekId]);

  useEffect(() => {
    const attachScrollHandler = () => {
      const container = weeksContainerRef.current;
      if (!container) { requestAnimationFrame(attachScrollHandler); return; }
      const handleScroll = () => {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        let closestWeek: Week | undefined;
        let minDistance = Infinity;
        weeksRef.current.forEach(week => {
          const weekElement = document.getElementById(`week-${week.id}`);
          if (weekElement) {
            const weekRect = weekElement.getBoundingClientRect();
            const weekCenter = weekRect.top + weekRect.height / 2;
            const distance = Math.abs(weekCenter - containerCenter);
            if (distance < minDistance) { minDistance = distance; closestWeek = week; }
          }
        });
        if (closestWeek) {
          const monthCounts: Record<string, number> = {};
          closestWeek.days.forEach(day => {
            const dayDate = new Date(day.date);
            const key = `${dayDate.getFullYear()}-${dayDate.getMonth()}`;
            monthCounts[key] = (monthCounts[key] || 0) + 1;
          });
          let maxMonth = '', maxCount = 0;
          Object.entries(monthCounts).forEach(([key, count]) => { if (count > maxCount) { maxCount = count; maxMonth = key; } });
          const [yearStr, monthStr] = maxMonth.split('-');
          const year = parseInt(yearStr), month = parseInt(monthStr);
          const currentVisibleMonth = visibleMonthRef.current;
          if (month !== currentVisibleMonth.month || year !== currentVisibleMonth.year) setVisibleMonth({ month, year });
        }
      };
      container.addEventListener('scroll', handleScroll);
      (container as any)._scrollHandler = handleScroll;
    };
    attachScrollHandler();
    return () => {
      const container = weeksContainerRef.current;
      if (container && (container as any)._scrollHandler) {
        container.removeEventListener('scroll', (container as any)._scrollHandler);
        delete (container as any)._scrollHandler;
      }
    };
  }, []);

  const scrollToMonth = (direction: -1 | 1) => {
    const container = weeksContainerRef.current;
    if (!container) return;
    let targetMonth = visibleMonth.month + direction;
    let targetYear = visibleMonth.year;
    if (targetMonth < 0) { targetMonth = 11; targetYear--; }
    else if (targetMonth > 11) { targetMonth = 0; targetYear++; }
    if (targetYear < currentYear || targetYear > currentYear) return;
    const targetWeek = weeks.find(week => {
      const firstDay = new Date(week.days[0].date);
      return firstDay.getMonth() === targetMonth && firstDay.getFullYear() === targetYear;
    });
    if (targetWeek) {
      const weekElement = document.getElementById(`week-${targetWeek.id}`);
      if (weekElement) {
        const containerRect = container.getBoundingClientRect();
        const weekRect = weekElement.getBoundingClientRect();
        const scrollTop = weekRect.top - containerRect.top + container.scrollTop - 100;
        container.scrollTo({ top: scrollTop, behavior: 'smooth' });
        setVisibleMonth({ month: targetMonth, year: targetYear });
      }
    }
  };

  const addTask = useCallback((task: Task) => { setTasks((prev) => [...prev, task]); }, []);
  const deleteTask = useCallback((taskId: string) => { setTasks((prev) => prev.filter((t) => t.id !== taskId)); setAssignments((prev) => prev.filter((a) => a.taskId !== taskId)); }, []);
  const completeTask = useCallback((taskId: string) => { setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() } : t)); }, []);
  const returnToNew = useCallback((taskId: string, additionalHours: number) => {
    const alreadyAssigned = assignments.filter(a => a.taskId === taskId).reduce((sum, a) => sum + a.hours, 0);
    const newTotalHours = alreadyAssigned + additionalHours;
    setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: 'new' as const, completedAt: undefined, totalHours: newTotalHours } : t));
  }, [assignments]);
  const editTask = useCallback((updatedTask: Task) => { setTasks((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t)); setEditingTask(null); }, []);
  const setDayStatus = useCallback((dayId: string, status: 'vacation' | 'holiday' | 'short' | 'working', hours?: number) => {
    setDayStatuses((prev) => {
      const updated = { ...prev };
      if (status === 'working') delete updated[dayId];
      else if (status === 'short') updated[dayId] = { status: 'short', hours };
      else updated[dayId] = { status };
      localStorage.setItem(`planner-day-statuses-${currentUser?.login}`, JSON.stringify(updated));
      return updated;
    });
  }, [currentUser]);
  const splitAssignment = useCallback((assignmentId: string, hoursToSplit: number) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment || hoursToSplit <= 0 || hoursToSplit >= assignment.hours) return;
    const rest = assignment.hours - hoursToSplit;
    setAssignments((prev) => { const filtered = prev.filter((a) => a.id !== assignmentId); return [...filtered, { ...assignment, hours: hoursToSplit }, { ...assignment, id: generateId(), hours: rest, order: assignment.order + 0.5 }]; });
  }, [assignments]);
  const removeAssignment = useCallback((assignmentId: string) => { setAssignments((prev) => prev.filter((a) => a.id !== assignmentId)); }, []);
  const moveAssignment = useCallback((assignmentId: string, newDayId: string) => {
    setAssignments((prev) => { const assignment = prev.find(a => a.id === assignmentId); if (!assignment) return prev; const maxOrder = prev.filter((a) => a.dayId === newDayId).reduce((max, a) => Math.max(max, a.order), 0); return prev.map(a => a.id === assignmentId ? { ...a, dayId: newDayId, order: maxOrder + 1 } : a); });
  }, []);
  const reorderAssignment = useCallback((sourceId: string, targetId: string) => {
    setAssignments((prev) => { const source = prev.find(a => a.id === sourceId); const target = prev.find(a => a.id === targetId); if (!source || !target) return prev; return prev.map(a => { if (a.id === sourceId) return { ...a, order: target.order }; if (a.id === targetId) return { ...a, order: source.order }; return a; }); });
  }, []);
  const mergeAssignments = useCallback((sourceId: string, targetId: string) => {
    setAssignments((prev) => { const source = prev.find(a => a.id === sourceId); const target = prev.find(a => a.id === targetId); if (!source || !target) return prev; if (source.taskId !== target.taskId) return prev; const newHours = source.hours + target.hours; return prev.filter(a => a.id !== sourceId).map(a => a.id === targetId ? { ...a, hours: newHours } : a); });
  }, []);
  const dropTask = useCallback((taskId: string, dayId: string, hours: number) => {
    const existing = assignments.find((a) => a.taskId === taskId && a.dayId === dayId);
    if (existing) { const dayTotal = assignments.filter((a) => a.dayId === dayId).reduce((sum, a) => sum + a.hours, 0); if (dayTotal + hours <= HOURS_PER_DAY) setAssignments((prev) => prev.map((a) => a.id === existing.id ? { ...a, hours: a.hours + hours } : a)); return; }
    const dayTotal = assignments.filter((a) => a.dayId === dayId).reduce((sum, a) => sum + a.hours, 0);
    if (dayTotal + hours > HOURS_PER_DAY) return;
    const maxOrder = assignments.filter((a) => a.dayId === dayId).reduce((max, a) => Math.max(max, a.order), 0);
    setAssignments((prev) => [...prev, { id: generateId(), taskId, dayId, hours, order: maxOrder + 1 }]);
  }, [assignments]);

  const totalTaskHours = tasks.reduce((sum, t) => sum + t.totalHours, 0);

  const totalAssignedHours = useMemo(() => {
    return assignments.reduce((sum, a) => {
      const dayId = a.dayId;
      const dayDateStr = dayId.replace('day-', '');
      const dayDate = new Date(dayDateStr);
      const isCurrentMonth = dayDate.getMonth() === currentMonth && dayDate.getFullYear() === currentYear;
      const dayStatus = dayStatuses[dayId];
      const isVacationOrHoliday = dayStatus?.status === 'vacation' || dayStatus?.status === 'holiday';
      return (isCurrentMonth && !isVacationOrHoliday) ? sum + a.hours : sum;
    }, 0);
  }, [assignments, currentMonth, currentYear, dayStatuses]);

  const totalWorkingHours = useMemo(() => {
    const currentMonthWeeks = getMonthWeeks(currentYear, currentMonth);
    return currentMonthWeeks.reduce((total, week) => {
      return total + week.days.reduce((dayTotal, day) => {
        const dayDate = new Date(day.date);
        const isCurrentMonth = dayDate.getMonth() === currentMonth && dayDate.getFullYear() === currentYear;
        if (!isCurrentMonth || !day.isWorkingDay) return dayTotal;
        const dayStatus = dayStatuses[day.id];
        if (dayStatus?.status === 'vacation' || dayStatus?.status === 'holiday') return dayTotal;
        if (dayStatus?.status === 'short' && dayStatus.hours) return dayTotal + dayStatus.hours;
        return dayTotal + HOURS_PER_DAY;
      }, 0);
    }, 0);
  }, [currentYear, currentMonth, dayStatuses]);

  const remainingWorkingHours = totalWorkingHours - totalAssignedHours;
  const getTaskAssignedHours = (taskId: string) => assignments.filter((a) => a.taskId === taskId).reduce((sum, a) => sum + a.hours, 0);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (statusFilter === 'new' && task.status === 'completed') return false;
      if (statusFilter === 'completed' && task.status !== 'completed') return false;
      if (searchQuery) { const query = searchQuery.toLowerCase(); return task.title.toLowerCase().includes(query); }
      return true;
    });
  }, [tasks, statusFilter, searchQuery]);

  const handleLogin = (profile: Profile) => { setCurrentUser(profile); setCurrentProfile(profile); localStorage.setItem('planner-current-user', profile.login); setIsLoading(true); };
  const handleSignOut = () => { setCurrentUser(null); setCurrentProfile(null); localStorage.removeItem('planner-current-user'); setTasks([]); setAssignments([]); };

  if (!authChecked) return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.bgPrimary }}><div style={{ textAlign: 'center' }}><div style={{ width: 48, height: 48, border: `4px solid ${theme.borderPrimary}`, borderTopColor: theme.accent1, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div><p style={{ color: theme.textSecondary, fontWeight: 500 }}>Загрузка...</p></div></div>);
  if (!currentUser) return <AuthScreen onLogin={handleLogin} />;
  if (isLoading) return (<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.bgPrimary }}><div style={{ textAlign: 'center' }}><div style={{ width: 48, height: 48, border: `4px solid ${theme.borderPrimary}`, borderTopColor: theme.accent1, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div><p style={{ color: theme.textSecondary, fontWeight: 500 }}>Загрузка данных...</p></div></div>);

  return (
    <div style={{ minHeight: '100vh', background: theme.bgPrimary, transition: 'background 0.3s ease' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: `${theme.bgCard}ee`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.borderPrimary}` }}>
        <div style={{ maxWidth: 1800, margin: '0 auto', padding: isMobile ? '8px 12px' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: isMobile ? 8 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 8, background: theme.accent1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} fill="none" stroke="white" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              {!isMobile && <h1 style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, margin: 0 }}>Твой планировщик</h1>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
            <button onClick={() => scrollToMonth(-1)} style={{ padding: isMobile ? 6 : 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: theme.textSecondary }}>
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: theme.textPrimary, minWidth: isMobile ? 120 : 160, textAlign: 'center', margin: 0 }}>{getMonthName(visibleMonth.month)} {visibleMonth.year}</h2>
            <button onClick={() => scrollToMonth(1)} style={{ padding: isMobile ? 6 : 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: theme.textSecondary }}>
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!showHint && <button onClick={toggleHint} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borderPrimary}`, background: theme.bgSecondary, color: theme.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Показать подсказку"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></button>}
            <button onClick={() => setShowExportModal(true)} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borderPrimary}`, background: theme.bgSecondary, color: theme.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Экспорт в Excel"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" fill="none" stroke={theme.textTertiary} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              <button onClick={toggleTheme} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: mode === 'dark' ? theme.accent1 : theme.bgTertiary, cursor: 'pointer', position: 'relative', transition: 'background 0.3s ease' }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: mode === 'dark' ? 23 : 3, transition: 'left 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}/></button>
              <svg width="16" height="16" fill="none" stroke={theme.textTertiary} viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8 }}>
              {!isMobile && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: theme.textTertiary }}>Профиль</div><div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>{currentUser.displayName}</div></div>}
              <button onClick={handleSignOut} style={{ padding: 8, borderRadius: 8, border: `1px solid ${theme.borderPrimary}`, background: theme.bgSecondary, color: theme.textSecondary, cursor: 'pointer' }} title="Выйти"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
            </div>
            {!isMobile && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: theme.textTertiary }}>Новые задачи</div><div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary }}>{tasks.filter(t => t.status !== 'completed').length} шт / {formatHours(tasks.filter(t => t.status !== 'completed').reduce((sum, t) => sum + t.totalHours, 0))}</div></div>}
            {!isMobile && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, color: theme.textTertiary }}>Рабочее время</div><div style={{ fontSize: 14, fontWeight: 700, color: remainingWorkingHours > 0 ? theme.accent4 : theme.accent2 }}>{formatHours(remainingWorkingHours)} / {formatHours(totalWorkingHours)}</div></div>}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1800, margin: '0 auto', display: 'flex', gap: isMobile ? 0 : 16, padding: isMobile ? 8 : 16, flexDirection: isMobile ? 'column' : 'row' }}>
        {isMobile && <button onClick={() => setShowSidebar(!showSidebar)} style={{ position: 'fixed', bottom: 20, right: 20, width: 56, height: 56, borderRadius: '50%', background: theme.accent1, color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>}
        <aside style={{ width: isMobile ? '100%' : 288, flexShrink: 0, display: isMobile && !showSidebar ? 'none' : 'flex', flexDirection: 'column', gap: 16, position: isMobile ? 'fixed' : 'sticky', top: isMobile ? 0 : 72, left: isMobile ? 0 : undefined, right: isMobile ? 0 : undefined, bottom: isMobile ? 0 : undefined, background: isMobile ? theme.bgPrimary : 'transparent', zIndex: isMobile ? 99 : 1, padding: isMobile ? 16 : 0, overflowY: isMobile ? 'auto' : undefined, maxHeight: isMobile ? '100vh' : 'calc(100vh - 88px)' }}>
          {isMobile && <button onClick={() => setShowSidebar(false)} style={{ alignSelf: 'flex-end', padding: 8, borderRadius: 8, border: 'none', background: theme.bgSecondary, color: theme.textSecondary, cursor: 'pointer', marginBottom: 8 }}><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
          <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`, padding: 16, boxShadow: theme.shadow }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, marginBottom: 12 }}>Мои задачи</h3>
            <TaskForm onAddTask={addTask} />
          </div>
          <SearchFilter searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />
          {filteredTasks.filter(t => t.status !== 'completed').length > 0 && (
            <div style={{ background: theme.bgCard, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`, padding: 16, boxShadow: theme.shadow }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary, marginBottom: 12 }}>Новые задачи ({filteredTasks.filter(t => t.status !== 'completed').length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredTasks.filter(t => t.status !== 'completed').map((task, index) => (
                  <TaskCard key={task.id} task={task} assignedHours={getTaskAssignedHours(task.id)} totalAssignedHours={getTaskAssignedHours(task.id)} onDragStart={setDraggedTaskId} onComplete={completeTask} onEdit={setEditingTask} onDelete={deleteTask} onReorder={(draggedId, targetId) => { const newTasks = [...tasks]; const draggedIndex = newTasks.findIndex(t => t.id === draggedId); const targetIndex = newTasks.findIndex(t => t.id === targetId); if (draggedIndex !== -1 && targetIndex !== -1) { const [draggedTask] = newTasks.splice(draggedIndex, 1); newTasks.splice(targetIndex, 0, draggedTask); setTasks(newTasks); } }} index={index} />
                ))}
              </div>
            </div>
          )}
          <CompletedTasksList tasks={filteredTasks} assignments={assignments} days={weeks.flatMap(w => w.days)} onReturnToNew={returnToNew} />
          {filteredTasks.filter(t => t.status !== 'completed').length === 0 && filteredTasks.filter(t => t.status === 'completed').length === 0 && (
            <div style={{ background: theme.bgSecondary, borderRadius: 16, border: `1px solid ${theme.borderPrimary}`, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <p style={{ fontSize: 14, color: theme.textTertiary }}>Создайте первую задачу,<br/>чтобы начать планирование</p>
            </div>
          )}
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          {showHint && (
            <div style={{ marginBottom: 16, background: `${theme.accent1}10`, borderRadius: 16, border: `1px solid ${theme.accent1}30`, padding: 16, position: 'relative' }}>
              <button onClick={toggleHint} style={{ position: 'absolute', top: 8, right: 8, padding: 4, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: theme.textTertiary }}><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: theme.accent1, marginBottom: 8 }}>💡 Как пользоваться</h4>
              <ul style={{ fontSize: 12, color: theme.textSecondary, listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>• <b>Создайте задачу</b> слева с оценкой в часах</li>
                <li>• <b>Перетащите</b> задачу на любой день — появится выбор часов</li>
                <li>• <b>Перетаскивайте блоки</b> между днями для перераспределения</li>
                <li>• <b>Разбивайте</b> задачу на части или убирайте из дня</li>
                <li>• Каждый день = 8 рабочих часов</li>
              </ul>
            </div>
          )}
          <div ref={weeksContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 8 }}>
            {weeks.map((week) => {
              const today = new Date();
              const isCurrentWeek = week.days.some(day => new Date(day.date).toDateString() === today.toDateString());
              return (<div key={week.id} id={`week-${week.id}`} ref={isCurrentWeek ? currentWeekRef : null}><WeekRow week={week} tasks={tasks} assignments={assignments} dayStatuses={dayStatuses} onDropTask={dropTask} onRemoveAssignment={removeAssignment} onSplitAssignment={splitAssignment} onMoveAssignment={moveAssignment} onSetDayStatus={setDayStatus} onReorderAssignment={reorderAssignment} onMergeAssignments={mergeAssignments} isMobile={isMobile} isCurrentWeek={isCurrentWeek} visibleMonth={visibleMonth} currentWeekId={currentWeekId} /></div>);
            })}
          </div>
        </main>
      </div>

      {editingTask && <EditTaskModal task={editingTask} onSave={editTask} onCancel={() => setEditingTask(null)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} onExport={handleExport} />}

      <footer style={{ maxWidth: 1800, margin: '32px auto 0', padding: '24px 16px', borderTop: `1px solid ${theme.borderPrimary}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: theme.textTertiary }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>📅</span><span>Твой планировщик задач</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><span>Сделано с ❤️</span><a href="https://github.com/lylelit/monthly-planner2" target="_blank" rel="noopener noreferrer" style={{ color: theme.textTertiary, textDecoration: 'none' }}>GitHub</a></div>
        </div>
      </footer>
    </div>
  );
}

interface WeekRowProps {
  week: Week; tasks: Task[]; assignments: TaskAssignment[];
  dayStatuses: Record<string, { status: 'vacation' | 'holiday' | 'short'; hours?: number }>;
  onDropTask: (taskId: string, dayId: string, hours: number) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onSplitAssignment: (assignmentId: string, hoursToSplit: number) => void;
  onMoveAssignment: (assignmentId: string, newDayId: string) => void;
  onSetDayStatus: (dayId: string, status: 'vacation' | 'holiday' | 'short' | 'working', hours?: number) => void;
  onReorderAssignment?: (sourceId: string, targetId: string) => void;
  onMergeAssignments?: (sourceId: string, targetId: string) => void;
  isMobile: boolean; isCurrentWeek?: boolean;
  visibleMonth: { month: number; year: number };
  currentWeekId: string | null;
}

function WeekRow({ week, tasks, assignments, dayStatuses, onDropTask, onRemoveAssignment, onSplitAssignment, onMoveAssignment, onSetDayStatus, onReorderAssignment, onMergeAssignments, isMobile, isCurrentWeek, visibleMonth, currentWeekId }: WeekRowProps) {
  const { theme } = useTheme();
  return (
    <div style={{ padding: isCurrentWeek ? 8 : 0, background: isCurrentWeek ? `${theme.accent1}08` : 'transparent', borderRadius: 12, border: isCurrentWeek ? `2px solid ${theme.accent1}30` : 'none', transition: 'all 0.3s ease' }}>
      <div style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? undefined : 'repeat(5, 1fr)', flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? 8 : 12 }}>
        {week.days.map((day) => {
          const dayDate = new Date(day.date);
          const isCurrentWeekDay = week.id === currentWeekId;
          const isDayInActiveMonth = dayDate.getMonth() === visibleMonth.month && dayDate.getFullYear() === visibleMonth.year;
          const isActiveDay = isCurrentWeekDay || isDayInActiveMonth;
          return (<DayColumn key={day.id} day={{ ...day, status: dayStatuses[day.id]?.status || 'working', shortHours: dayStatuses[day.id]?.hours }} tasks={tasks} assignments={assignments} onDropTask={onDropTask} onRemoveAssignment={onRemoveAssignment} onSplitAssignment={onSplitAssignment} onMoveAssignment={onMoveAssignment} onSetDayStatus={onSetDayStatus} onReorderAssignment={onReorderAssignment} onMergeAssignments={onMergeAssignments} isMobile={isMobile} isActiveMonth={isActiveDay} />);
        })}
      </div>
    </div>
  );
}

export default App;
