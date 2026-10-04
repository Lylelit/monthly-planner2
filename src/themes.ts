export const themes = {
  light: {
    // Backgrounds
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',
    bgCard: '#ffffff',
    bgHover: '#f8fafc',
    
    // Text
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    
    // Borders
    borderPrimary: '#e2e8f0',
    borderSecondary: '#cbd5e1',
    
    // Accents (from user palette)
    accent1: '#3996D3', // Blue
    accent2: '#EF7D00', // Orange
    accent3: '#87B4E1', // Light blue
    accent4: '#89BC6B', // Green
    accent5: '#F6A758', // Light orange
    
    // Status
    success: '#89BC6B',
    warning: '#F6A758',
    danger: '#EF7D00',
    
    // Shadows
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
  
  dark: {
    // Backgrounds
    bgPrimary: '#2C2C2C',
    bgSecondary: '#383838',
    bgTertiary: '#383838',
    bgCard: '#383838',
    bgHover: '#404040',
    
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#B8BCBF',
    textTertiary: '#8a8f93',
    
    // Borders
    borderPrimary: '#4a4a4a',
    borderSecondary: '#5a5a5a',
    
    // Accents (from user palette)
    accent1: '#3996D3', // Blue
    accent2: '#EF7D00', // Orange
    accent3: '#87B4E1', // Light blue
    accent4: '#89BC6B', // Green
    accent5: '#F6A758', // Light orange
    
    // Status
    success: '#89BC6B',
    warning: '#F6A758',
    danger: '#EF7D00',
    
    // Shadows
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.3)',
    shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
  },
};

export type Theme = typeof themes.light;
export type ThemeMode = 'light' | 'dark';
