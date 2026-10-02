import { useState } from 'react';
import { Day, Task, TaskAssignment } from '../types';
import { HOURS_PER_DAY, formatDate, getDayName } from '../utils/dateUtils';

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
    // Only set false if we're actually leaving the column
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

    // If dropping an existing assignment from another day
    if (assignmentId && sourceDayId && sourceDayId !== day.id) {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment && freeHours >= assignment.hours) {
        onMoveAssignment(assignmentId, day.id);
        return;
      }
      // If not enough space, show menu
      if (freeHours > 0) {
        setPendingTaskId(taskId);
        setPendingAssignmentId(assignmentId);
        setShowDropMenu(true);
      }
      return;
    }

    // If dropping from sidebar (new assignment)
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
      // If moving an existing assignment
      if (pendingAssignmentId) {
        const existingAssignment = assignments.find(a => a.id === pendingAssignmentId);
        if (existingAssignment) {
          onRemoveAssignment(pendingAssignmentId);
        }
      }
      onDropTask(pendingTaskId, day.id, hours);
      setShowDropMenu(false);
      setPendingTaskId(null);
      setPendingAssignmentId(null);
    }
  };

  const getTaskForAssignment = (assignment: TaskAssignment) => {
    return tasks.find((t) => t.id === assignment.taskId);
  };

  const isToday = new Date().toDateString() === day.date.toDateString();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col transition-all duration-200 min-h-[180px]
        ${!day.isWorkingDay ? 'opacity-30 bg-slate-50' : ''}
        ${day.isWorkingDay && isToday ? 'bg-indigo-50/30 ring-1 ring-inset ring-indigo-200' : ''}
        ${day.isWorkingDay && !isToday && isDragOver ? 'bg-indigo-50 shadow-inner ring-2 ring-inset ring-indigo-300' : ''}
        ${day.isWorkingDay && !isToday && !isDragOver ? 'bg-white hover:bg-slate-50/50' : ''}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-100/80">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{getDayName(day.dayOfWeek)}</span>
            <span className={`text-sm font-bold ml-1 ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
              {formatDate(day.date)}
            </span>
          </div>
          {day.isWorkingDay && (
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              freeHours === 0 ? 'bg-red-50 text-red-600' : 
              freeHours <= 2 ? 'bg-amber-50 text-amber-600' : 
              'bg-emerald-50 text-emerald-600'
            }`}>
              {freeHours}ч
            </div>
          )}
        </div>
        {/* Hours bar */}
        {day.isWorkingDay && (
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fillPercent >= 100 ? 'bg-gradient-to-r from-red-400 to-red-500' : 
                fillPercent >= 75 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                'bg-gradient-to-r from-emerald-400 to-emerald-500'
              }`}
              style={{ width: `${Math.min(fillPercent, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Task blocks */}
      <div className="flex-1 p-2 space-y-1.5">
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
              className="group relative rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing
                         transition-all hover:shadow-md hover:scale-[1.02]"
              style={{
                backgroundColor: `${task.color}12`,
                borderLeft: `3px solid ${task.color}`,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold truncate" style={{ color: task.color }}>
                  {task.title}
                </span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: `${task.color}20`, color: task.color }}>
                    {assignment.hours}ч
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSplitAssignment(assignment.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/90 text-slate-400 hover:text-indigo-500 transition-all"
                    title="Разделить на части"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveAssignment(assignment.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/90 text-slate-400 hover:text-red-500 transition-all"
                    title="Убрать из дня"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Drop zone indicator */}
        {day.isWorkingDay && isDragOver && !showDropMenu && (
          <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 
                          bg-indigo-50/50 flex items-center justify-center animate-pulse">
            <span className="text-xs text-indigo-500 font-medium">Отпустите здесь</span>
          </div>
        )}
      </div>

      {/* Drop menu */}
      {showDropMenu && pendingTaskId && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl z-10 flex flex-col items-center justify-center p-4 shadow-xl border-2 border-indigo-300">
          <p className="text-xs text-slate-600 mb-1 font-medium">Сколько часов назначить?</p>
          <p className="text-[10px] text-slate-400 mb-3">Свободно: {freeHours}ч из 8ч</p>
          <div className="flex flex-wrap gap-1.5 justify-center max-w-[200px]">
            {Array.from({ length: Math.min(Math.floor(freeHours), 8) }, (_, i) => i + 1).map((h) => (
              <button
                key={h}
                onClick={() => handleQuickDrop(h)}
                className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm
                           hover:bg-indigo-500 hover:text-white transition-all hover:scale-110
                           border border-indigo-100"
              >
                {h}
              </button>
            ))}
            {freeHours >= 0.5 && freeHours % 1 !== 0 && (
              <button
                onClick={() => handleQuickDrop(Math.floor(freeHours * 2) / 2)}
                className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px]
                           hover:bg-indigo-500 hover:text-white transition-all hover:scale-110
                           border border-indigo-100"
              >
                {freeHours}
              </button>
            )}
          </div>
          <button
            onClick={() => { setShowDropMenu(false); setPendingTaskId(null); setPendingAssignmentId(null); }}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}
