import { Task } from '../types';

interface Props {
  task: Task;
  assignedHours: number;
  totalAssignedHours: number;
  onDragStart: (taskId: string) => void;
  onSplit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, assignedHours, totalAssignedHours, onDragStart, onSplit, onDelete }: Props) {
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
      className="group relative rounded-lg p-3 cursor-grab active:cursor-grabbing 
                 border border-slate-200 hover:shadow-md transition-all duration-200
                 hover:border-slate-300 bg-white"
      style={{ borderLeftWidth: '4px', borderLeftColor: task.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-800 truncate">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">
              {totalAssignedHours} / {task.totalHours} ч
            </span>
            {remaining > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                ({remaining} ч свободно)
              </span>
            )}
            {remaining === 0 && (
              <span className="text-xs text-green-600 font-medium">✓</span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onSplit(task.id)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            title="Разбить задачу"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
            title="Удалить задачу"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress * 100}%`, backgroundColor: task.color }}
        />
      </div>
    </div>
  );
}
