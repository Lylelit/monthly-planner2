import { useState } from 'react';
import { useTheme } from '../ThemeContext';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'new' | 'completed';
  onStatusFilterChange: (filter: 'all' | 'new' | 'completed') => void;
}

export default function SearchFilter({ 
  searchQuery, 
  onSearchChange, 
  statusFilter, 
  onStatusFilterChange 
}: Props) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={{
      background: theme.bgCard,
      borderRadius: 12,
      padding: 12,
      border: `1px solid ${theme.borderPrimary}`,
      boxShadow: theme.shadow,
      marginBottom: 16
    }}>
      {/* Кнопка сворачивания */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: 0,
          background: 'none',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: theme.textPrimary
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" fill="none" stroke={theme.accent1} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Поиск и фильтр</span>
          {searchQuery && (
            <span style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 8,
              background: `${theme.accent1}20`,
              color: theme.accent1
            }}>
              «{searchQuery}»
            </span>
          )}
        </div>
        <svg
          width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <>
      {/* Поле поиска */}
      <div style={{ position: 'relative', marginTop: 12, marginBottom: 12 }}>
        <svg
          width="16"
          height="16"
          fill="none"
          stroke={theme.textTertiary}
          viewBox="0 0 24 24"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Поиск задач..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            borderRadius: 8,
            border: `1px solid ${theme.borderPrimary}`,
            background: theme.bgSecondary,
            color: theme.textPrimary,
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = theme.accent1}
          onBlur={(e) => e.currentTarget.style.borderColor = theme.borderPrimary}
        />
      </div>

      {/* Фильтр по статусу */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onStatusFilterChange('all')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${statusFilter === 'all' ? theme.accent1 : theme.borderPrimary}`,
            background: statusFilter === 'all' ? theme.accent1 : 'transparent',
            color: statusFilter === 'all' ? '#fff' : theme.textSecondary,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Все
        </button>
        <button
          onClick={() => onStatusFilterChange('new')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${statusFilter === 'new' ? theme.accent1 : theme.borderPrimary}`,
            background: statusFilter === 'new' ? theme.accent1 : 'transparent',
            color: statusFilter === 'new' ? '#fff' : theme.textSecondary,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Новые
        </button>
        <button
          onClick={() => onStatusFilterChange('completed')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${statusFilter === 'completed' ? theme.accent1 : theme.borderPrimary}`,
            background: statusFilter === 'completed' ? theme.accent1 : 'transparent',
            color: statusFilter === 'completed' ? '#fff' : theme.textSecondary,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Выполненные
        </button>
      </div>
        </>
      )}
    </div>
  );
}
