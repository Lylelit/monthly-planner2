import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../ThemeContext';
import { fetchRedmineTasks, getRedmineTaskUrl, RedmineTask, RedmineSettings } from '../services/redmineService';
import { Task } from '../types';
import { generateId } from '../utils/dateUtils';
import { parseTimeInput } from '../utils/timeFormat';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

interface Props {
  settings: RedmineSettings;
  onClose: () => void;
  onImport: (tasks: Task[]) => void;
}

interface SelectedTask {
  task: RedmineTask;
  hours: string;
  color: string;
}

export default function RedmineImportModal({ settings, onClose, onImport }: Props) {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<RedmineTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedTasks = await fetchRedmineTasks(settings);
      setTasks(fetchedTasks);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки задач');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (task: RedmineTask) => {
    const existing = selectedTasks.find((st) => st.task.id === task.id);
    if (existing) {
      setSelectedTasks(selectedTasks.filter((st) => st.task.id !== task.id));
    } else {
      setSelectedTasks([...selectedTasks, { task, hours: '', color: COLORS[selectedTasks.length % COLORS.length] }]);
    }
  };

  const updateSelectedTask = (taskId: number, field: 'hours' | 'color', value: string) => {
    setSelectedTasks(
      selectedTasks.map((st) => (st.task.id === taskId ? { ...st, [field]: value } : st))
    );
  };

  const handleImport = () => {
    const importedTasks: Task[] = [];
    
    selectedTasks.forEach((st) => {
      if (st.hours.trim() === '') return;
      
      const parsedHours = parseTimeInput(st.hours);
      if (parsedHours === null || parsedHours <= 0) return;

      importedTasks.push({
        id: generateId(),
        title: st.task.subject,
        totalHours: parsedHours,
        color: st.color,
        link: getRedmineTaskUrl(settings.baseUrl, st.task.id),
        status: 'new',
        createdAt: new Date().toISOString(),
      });
    });

    if (importedTasks.length === 0) {
      setError('Выберите хотя бы одну задачу и укажите время');
      return;
    }

    onImport(importedTasks);
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.bgCard,
          borderRadius: 12,
          maxWidth: 800,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadowLg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${theme.borderPrimary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: theme.textPrimary }}>
            Импорт задач из Redmine
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: theme.textTertiary,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  border: `4px solid ${theme.borderPrimary}`,
                  borderTopColor: theme.accent1,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <p style={{ color: theme.textSecondary }}>Загрузка задач из Redmine...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 12,
                background: `${theme.danger}15`,
                border: `1px solid ${theme.danger}30`,
                borderRadius: 8,
                color: theme.danger,
                fontSize: 14,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {!loading && tasks.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: 40, color: theme.textSecondary }}>
              Задачи не найдены
            </div>
          )}

          {!loading && tasks.length > 0 && (
            <>
              <div style={{ marginBottom: 16, fontSize: 14, color: theme.textSecondary }}>
                Найдено задач: {tasks.length}. Выберите задачи для импорта.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tasks.map((task) => {
                  const isSelected = selectedTasks.some((st) => st.task.id === task.id);
                  const selectedData = selectedTasks.find((st) => st.task.id === task.id);

                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        border: `1px solid ${isSelected ? theme.accent1 : theme.borderPrimary}`,
                        background: isSelected ? `${theme.accent1}05` : theme.bgSecondary,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTask(task)}
                          style={{ marginTop: 4, cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>
                            #{task.id} {task.subject}
                          </div>
                          {task.status && (
                            <div style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 4 }}>
                              Статус: {task.status.name}
                            </div>
                          )}
                          {task.due_date && (
                            <div style={{ fontSize: 12, color: theme.textTertiary }}>
                              Дедлайн: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                            </div>
                          )}

                          {isSelected && (
                            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 4, display: 'block' }}>
                                  Время (чч:мм)
                                </label>
                                <input
                                  type="text"
                                  value={selectedData?.hours || ''}
                                  onChange={(e) => updateSelectedTask(task.id, 'hours', e.target.value)}
                                  placeholder="2:30"
                                  style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: `1px solid ${theme.borderPrimary}`,
                                    background: theme.bgCard,
                                    color: theme.textPrimary,
                                    fontSize: 13,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 4, display: 'block' }}>
                                  Цвет
                                </label>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {COLORS.map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => updateSelectedTask(task.id, 'color', color)}
                                      style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: color,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transform: selectedData?.color === color ? 'scale(1.2)' : 'scale(1)',
                                        boxShadow:
                                          selectedData?.color === color
                                            ? `0 0 0 2px ${theme.bgCard}, 0 0 0 4px ${theme.textTertiary}`
                                            : 'none',
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {!loading && tasks.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${theme.borderPrimary}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 14, color: theme.textSecondary }}>
              Выбрано задач: {selectedTasks.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${theme.borderPrimary}`,
                  background: theme.bgSecondary,
                  color: theme.textSecondary,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleImport}
                disabled={selectedTasks.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: theme.accent1,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: selectedTasks.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedTasks.length === 0 ? 0.5 : 1,
                }}
              >
                Импортировать ({selectedTasks.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
