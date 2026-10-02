import React, { useState } from 'react';
import { Task } from '../types';
import { generateId } from '../utils/dateUtils';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

interface Props {
  onAddTask: (task: Task) => void;
}

export default function TaskForm({ onAddTask }: Props) {
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hours) return;

    const task: Task = {
      id: generateId(),
      title: title.trim(),
      totalHours: parseFloat(hours),
      color,
    };
    onAddTask(task);
    setTitle('');
    setHours('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 
                   text-slate-500 hover:border-indigo-400 hover:text-indigo-500 
                   transition-all duration-200 flex items-center justify-center gap-2
                   hover:bg-indigo-50/50"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Новая задача
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      <input
        type="text"
        placeholder="Название задачи..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 
                   focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">Часы</label>
          <input
            type="number"
            min="0.5"
            max="80"
            step="0.5"
            placeholder="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 
                       focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Цвет</label>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 py-2 px-3 bg-indigo-500 text-white rounded-lg text-sm font-medium
                     hover:bg-indigo-600 transition-colors"
        >
          Создать
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="py-2 px-3 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium
                     hover:bg-slate-200 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
