import { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { signIn, signUp } from '../services/authService';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!username.trim()) {
          throw new Error('Введите имя пользователя');
        }
        await signUp(email, password, username);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // Более понятные сообщения об ошибках
      let errorMessage = 'Произошла ошибка';
      
      if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Не удалось подключиться к серверу. Проверьте подключение к интернету.';
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Неверный email или пароль';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Email не подтверждён. Проверьте почту или обратитесь к администратору.';
      } else if (err.message?.includes('User already registered')) {
        errorMessage = 'Пользователь с таким email уже существует';
      } else if (err.message?.includes('Password')) {
        errorMessage = 'Пароль должен быть не менее 6 символов';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme.bgPrimary,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: theme.bgCard,
        borderRadius: '16px',
        padding: '32px',
        boxShadow: theme.shadow
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            background: theme.accent1,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: theme.textPrimary, margin: '0 0 8px' }}>
            Месячный планировщик
          </h1>
          <p style={{ fontSize: '14px', color: theme.textSecondary, margin: 0 }}>
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: theme.textSecondary,
              marginBottom: '8px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: theme.bgSecondary,
                border: `1px solid ${theme.borderPrimary}`,
                borderRadius: '8px',
                color: theme.textPrimary,
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = theme.accent1}
              onBlur={(e) => e.currentTarget.style.borderColor = theme.borderPrimary}
            />
          </div>

          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: theme.textSecondary,
                marginBottom: '8px'
              }}>
                Имя пользователя
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: theme.bgSecondary,
                  border: `1px solid ${theme.borderPrimary}`,
                  borderRadius: '8px',
                  color: theme.textPrimary,
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = theme.accent1}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.borderPrimary}
              />
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: theme.textSecondary,
              marginBottom: '8px'
            }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px',
                background: theme.bgSecondary,
                border: `1px solid ${theme.borderPrimary}`,
                borderRadius: '8px',
                color: theme.textPrimary,
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = theme.accent1}
              onBlur={(e) => e.currentTarget.style.borderColor = theme.borderPrimary}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: `${theme.danger}15`,
              border: `1px solid ${theme.danger}30`,
              borderRadius: '8px',
              color: theme.danger,
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? theme.textTertiary : theme.accent1,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: theme.accent1,
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </button>
        </div>
      </div>
    </div>
  );
}
