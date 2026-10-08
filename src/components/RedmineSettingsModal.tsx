import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../ThemeContext';
import { getRedmineSettings, saveRedmineSettings, RedmineSettings } from '../services/redmineService';

interface Props {
  onClose: () => void;
  onSave: (settings: RedmineSettings) => void;
}

export default function RedmineSettingsModal({ onClose, onSave }: Props) {
  const { theme } = useTheme();
  const [baseUrl, setBaseUrl] = useState('https://rm.yarkiy.ru');
  const [apiKey, setApiKey] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const settings = getRedmineSettings();
    if (settings) {
      setBaseUrl(settings.baseUrl);
      setApiKey(settings.apiKey);
      setUserId(settings.userId.toString());
    }
  }, []);

  const handleSave = () => {
    if (!baseUrl.trim()) {
      setError('Укажите URL Redmine');
      return;
    }
    if (!apiKey.trim()) {
      setError('Укажите API-ключ');
      return;
    }
    if (!userId.trim() || isNaN(Number(userId))) {
      setError('Укажите корректный ID пользователя');
      return;
    }

    const settings: RedmineSettings = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      userId: Number(userId),
    };

    saveRedmineSettings(settings);
    onSave(settings);
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
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
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
            Настройки Redmine
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

        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: theme.textSecondary,
                marginBottom: 8,
              }}
            >
              URL Redmine
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://rm.yarkiy.ru"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${theme.borderPrimary}`,
                background: theme.bgSecondary,
                color: theme.textPrimary,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: theme.textSecondary,
                marginBottom: 8,
              }}
            >
              API-ключ
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ваш API-ключ из профиля Redmine"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${theme.borderPrimary}`,
                background: theme.bgSecondary,
                color: theme.textPrimary,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 12, color: theme.textTertiary, marginTop: 4 }}>
              Находится в настройках профиля Redmine
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: theme.textSecondary,
                marginBottom: 8,
              }}
            >
              ID пользователя
            </label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Ваш ID в Redmine"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${theme.borderPrimary}`,
                background: theme.bgSecondary,
                color: theme.textPrimary,
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 12, color: theme.textTertiary, marginTop: 4 }}>
              Можно найти в URL вашего профиля в Redmine
            </div>
          </div>

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

          <div
            style={{
              padding: 12,
              background: `${theme.accent1}10`,
              borderRadius: 8,
              fontSize: 13,
              color: theme.textSecondary,
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            <strong>⚠️ Безопасность:</strong> API-ключ хранится только локально в вашем браузере и не передаётся третьим лицам.
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${theme.borderPrimary}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
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
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: theme.accent1,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
