import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../ThemeContext';

interface Props {
  onClose: () => void;
  onExport: (startDate: string, endDate: string) => void;
}

export default function ExportModal({ onClose, onExport }: Props) {
  const { theme } = useTheme();
  
  // По умолчанию - текущий месяц
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(startDate, endDate);
  };

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
          <h2 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: theme.textPrimary
          }}>
            Экспорт выполненных задач
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
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: theme.textSecondary,
                marginBottom: 8
              }}>
                Период экспорта
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    color: theme.textTertiary,
                    marginBottom: 4
                  }}>
                    С даты
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.borderPrimary}`,
                      background: theme.bgSecondary,
                      color: theme.textPrimary,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = theme.accent1}
                    onBlur={e => e.currentTarget.style.borderColor = theme.borderPrimary}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    color: theme.textTertiary,
                    marginBottom: 4
                  }}>
                    По дату
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${theme.borderPrimary}`,
                      background: theme.bgSecondary,
                      color: theme.textPrimary,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = theme.accent1}
                    onBlur={e => e.currentTarget.style.borderColor = theme.borderPrimary}
                  />
                </div>
              </div>
            </div>

            <div style={{
              padding: 12,
              background: `${theme.accent1}10`,
              borderRadius: 8,
              fontSize: 13,
              color: theme.textSecondary,
              lineHeight: 1.5
            }}>
              <strong>Столбцы в Excel:</strong><br/>
              • Дата создания задачи<br/>
              • Дата переноса в "выполненные"<br/>
              • Время затраченное на работу<br/>
              • Цвет задачи (текстом)<br/>
              • Название задачи<br/>
              • Описание задачи<br/>
              • Ссылка из задачи
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
              type="button"
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
              Отмена
            </button>
            <button
              type="submit"
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
              Экспортировать
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
