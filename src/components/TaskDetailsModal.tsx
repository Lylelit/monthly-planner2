import { createPortal } from 'react-dom';
import { Task } from '../types';
import { useTheme } from '../ThemeContext';
import { formatHours } from '../utils/timeFormat';

interface Props {
  task: Task;
  assignedHours: number;
  onClose: () => void;
  onEdit: () => void;
}

export default function TaskDetailsModal({ task, assignedHours, onClose, onEdit }: Props) {
  const { theme } = useTheme();

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: theme.bgCard,
          borderRadius: 12,
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: theme.shadowLg
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${theme.borderPrimary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: task.color
            }} />
            <h2 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: theme.textPrimary
            }}>
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: theme.textTertiary,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = theme.bgHover;
              e.currentTarget.style.color = theme.textPrimary;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.textTertiary;
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Название */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: theme.textTertiary,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Название
            </div>
            <div style={{
              fontSize: 16,
              color: theme.textPrimary,
              fontWeight: 500
            }}>
              {task.title}
            </div>
          </div>

          {/* Описание */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: theme.textTertiary,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Описание
            </div>
            <div style={{
              fontSize: 14,
              color: task.description ? theme.textPrimary : theme.textTertiary,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}>
              {task.description || 'тут пока пусто'}
            </div>
          </div>

          {/* Ссылка */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: theme.textTertiary,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Ссылка
            </div>
            {task.link ? (
              <a
                href={task.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 14,
                  color: theme.accent1,
                  textDecoration: 'none',
                  wordBreak: 'break-all'
                }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                {task.link}
              </a>
            ) : (
              <div style={{
                fontSize: 14,
                color: theme.textTertiary
              }}>
                тут пока пусто
              </div>
            )}
          </div>

          {/* Время */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: theme.textTertiary,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Время
            </div>
            <div style={{
              fontSize: 16,
              color: theme.textPrimary,
              fontWeight: 600
            }}>
              {formatHours(assignedHours)} / {formatHours(task.totalHours)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.borderPrimary}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8
        }}>
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
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = theme.bgHover;
              e.currentTarget.style.borderColor = theme.borderSecondary;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = theme.bgSecondary;
              e.currentTarget.style.borderColor = theme.borderPrimary;
            }}
          >
            Закрыть
          </button>
          <button
            onClick={onEdit}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: theme.accent1,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Редактировать
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
