import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';

// Enhanced Types for 2025
type Theme = 'light' | 'dark' | 'system' | 'ocean' | 'sunset' | 'forest' | 'purple' | 'rose' | 'dynamic365' | 'windows2025';

// Theme names for better user experience
const THEME_NAMES: Record<Theme, string> = {
  'light': 'کلاسیک روشن',
  'dark': 'کلاسیک تاریک',
  'system': 'سیستم',
  'ocean': 'اقیانوس',
  'sunset': 'غروب',
  'forest': 'جنگل',
  'purple': 'بنفش',
  'rose': 'گل سرخ',
  'dynamic365': 'Microsoft Dynamic 365',
  'windows2025': 'ویندوز 2025'
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  actualTheme: 'light' | 'dark';
  themeName: string;
  getThemeName: (theme: Theme) => string;
}

// Create Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme Provider Component
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme: _defaultTheme = 'dynamic365' // تغییر پیش‌فرض به Microsoft Dynamic 365
}) => {
  // Load theme from localStorage on mount, fallback to 'dynamic365' if not found
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('app-theme') as Theme;
      if (savedTheme && THEME_NAMES[savedTheme]) {
        return savedTheme;
      }
    } catch (error) {
      console.error('Error reading theme from localStorage:', error);
    }
    // Default to 'dynamic365' if no saved theme found
    return 'dynamic365';
  });
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // Enhanced theme application for 2025
  const applyTheme = useCallback((newTheme: Theme) => {
    // Check if we're in browser environment
    if (typeof document === 'undefined' || !document.documentElement) {
      return;
    }
    
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all theme classes from both root and body
    const allThemes = ['light', 'dark', 'system', 'ocean', 'sunset', 'forest', 'purple', 'rose', 'dynamic365', 'windows2025'];
    root.classList.remove(...allThemes);
    if (body) {
      body.classList.remove(...allThemes);
    }
    
    let appliedTheme: 'light' | 'dark' = 'light';
    
    // Check if it's a special theme (not light/dark/system)
    const isSpecialTheme = ['ocean', 'sunset', 'forest', 'purple', 'rose', 'dynamic365', 'windows2025'].includes(newTheme);
    
    if (newTheme === 'system') {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      appliedTheme = systemPrefersDark ? 'dark' : 'light';
    } else if (isSpecialTheme) {
      // For special themes, check their dark mode variants
      if (newTheme === 'dynamic365' || newTheme === 'windows2025') {
        // Microsoft Dynamic 365 and Windows 2025 are light themes
        appliedTheme = 'light';
      } else if (newTheme.includes('dark') || newTheme.includes('dark')) {
        appliedTheme = 'dark';
      } else {
        // Special themes can be light or dark based on their nature
        appliedTheme = newTheme === 'sunset' ? 'dark' : 'light';
      }
    } else {
      appliedTheme = newTheme as 'light' | 'dark';
    }
    
    // Add theme class to both root and body
    root.classList.add(newTheme);
    if (body) {
      body.classList.add(newTheme);
    }
    
    // Set data attribute for CSS
    root.setAttribute('data-theme', newTheme);
    if (body) {
      body.setAttribute('data-theme', newTheme);
    }
    
    // Set meta theme-color for mobile browsers based on theme
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    let color = '#ffffff'; // default light
    
    switch (newTheme) {
      case 'dark':
        color = '#111827';
        break;
      case 'ocean':
        color = appliedTheme === 'dark' ? '#0c4a6e' : '#0891b2';
        break;
      case 'sunset':
        color = appliedTheme === 'dark' ? '#7c2d12' : '#ea580c';
        break;
      case 'forest':
        color = appliedTheme === 'dark' ? '#14532d' : '#16a34a';
        break;
      case 'purple':
        color = appliedTheme === 'dark' ? '#581c87' : '#7c3aed';
        break;
      case 'rose':
        color = appliedTheme === 'dark' ? '#881337' : '#e11d48';
        break;
      case 'dynamic365':
        color = '#0078d4'; // Microsoft Dynamic 365 primary color
        break;
      case 'windows2025':
        color = '#0284c7'; // Windows 2025 primary color
        break;
      case 'system':
        color = appliedTheme === 'dark' ? '#111827' : '#ffffff';
        break;
    }
    
    metaThemeColor.setAttribute('content', color);
    
    // Apply CSS custom properties based on theme
    applyThemeColors(root, newTheme, appliedTheme);
    if (body) {
      applyThemeColors(body, newTheme, appliedTheme);
      // Force reflow to ensure styles are applied
      void body.offsetHeight;
    }
    
    // Force reflow to ensure styles are applied
    void root.offsetHeight;
    
    setActualTheme(appliedTheme);
    
    console.log(`🎨 تم ${THEME_NAMES[newTheme]} اعمال شد به root و body`);
  }, []);

  // Apply theme-specific colors with enhanced palette
  const applyThemeColors = (element: HTMLElement, theme: Theme, actualTheme: 'light' | 'dark') => {
    const getColor = (light: string, dark: string) => actualTheme === 'dark' ? dark : light;
    
    switch (theme) {
      case 'ocean':
        // Ocean theme - Beautiful blue gradient
        element.style.setProperty('--bg-primary', getColor('#f0f9ff', '#0c4a6e'));
        element.style.setProperty('--bg-secondary', getColor('#e0f2fe', '#075985'));
        element.style.setProperty('--bg-tertiary', getColor('#bae6fd', '#0369a1'));
        element.style.setProperty('--text-primary', getColor('#0c4a6e', '#e0f2fe'));
        element.style.setProperty('--text-secondary', getColor('#0369a1', '#bae6fd'));
        element.style.setProperty('--text-tertiary', getColor('#0284c7', '#7dd3fc'));
        element.style.setProperty('--border-color', getColor('#0ea5e9', '#0369a1'));
        element.style.setProperty('--accent-primary', '#0891b2');
        element.style.setProperty('--accent-hover', '#0e7490');
        element.style.setProperty('--accent-light', '#67e8f9');
        element.style.setProperty('--shadow-color', getColor('rgba(2, 132, 199, 0.1)', 'rgba(2, 132, 199, 0.3)'));
        break;
        
      case 'sunset':
        // Sunset theme - Warm orange/red gradient
        element.style.setProperty('--bg-primary', getColor('#fff7ed', '#7c2d12'));
        element.style.setProperty('--bg-secondary', getColor('#fed7aa', '#9a3412'));
        element.style.setProperty('--bg-tertiary', getColor('#fdba74', '#c2410c'));
        element.style.setProperty('--text-primary', getColor('#7c2d12', '#fff7ed'));
        element.style.setProperty('--text-secondary', getColor('#9a3412', '#fed7aa'));
        element.style.setProperty('--text-tertiary', getColor('#c2410c', '#fdba74'));
        element.style.setProperty('--border-color', getColor('#ea580c', '#9a3412'));
        element.style.setProperty('--accent-primary', '#f97316');
        element.style.setProperty('--accent-hover', '#ea580c');
        element.style.setProperty('--accent-light', '#fb923c');
        element.style.setProperty('--shadow-color', getColor('rgba(234, 88, 12, 0.1)', 'rgba(234, 88, 12, 0.3)'));
        break;
        
      case 'forest':
        // Forest theme - Fresh green gradient
        element.style.setProperty('--bg-primary', getColor('#f0fdf4', '#14532d'));
        element.style.setProperty('--bg-secondary', getColor('#dcfce7', '#166534'));
        element.style.setProperty('--bg-tertiary', getColor('#bbf7d0', '#15803d'));
        element.style.setProperty('--text-primary', getColor('#14532d', '#dcfce7'));
        element.style.setProperty('--text-secondary', getColor('#166534', '#bbf7d0'));
        element.style.setProperty('--text-tertiary', getColor('#15803d', '#86efac'));
        element.style.setProperty('--border-color', getColor('#16a34a', '#166534'));
        element.style.setProperty('--accent-primary', '#22c55e');
        element.style.setProperty('--accent-hover', '#16a34a');
        element.style.setProperty('--accent-light', '#4ade80');
        element.style.setProperty('--shadow-color', getColor('rgba(22, 163, 74, 0.1)', 'rgba(22, 163, 74, 0.3)'));
        break;
        
      case 'purple':
        // Purple theme - Rich purple gradient
        element.style.setProperty('--bg-primary', getColor('#faf5ff', '#581c87'));
        element.style.setProperty('--bg-secondary', getColor('#f3e8ff', '#6b21a8'));
        element.style.setProperty('--bg-tertiary', getColor('#e9d5ff', '#7c3aed'));
        element.style.setProperty('--text-primary', getColor('#581c87', '#f3e8ff'));
        element.style.setProperty('--text-secondary', getColor('#6b21a8', '#e9d5ff'));
        element.style.setProperty('--text-tertiary', getColor('#7c3aed', '#c084fc'));
        element.style.setProperty('--border-color', getColor('#a855f7', '#7c3aed'));
        element.style.setProperty('--accent-primary', '#8b5cf6');
        element.style.setProperty('--accent-hover', '#7c3aed');
        element.style.setProperty('--accent-light', '#c084fc');
        element.style.setProperty('--shadow-color', getColor('rgba(147, 51, 234, 0.1)', 'rgba(147, 51, 234, 0.3)'));
        break;
        
      case 'rose':
        // Rose theme - Elegant pink/red gradient
        element.style.setProperty('--bg-primary', getColor('#fff1f2', '#881337'));
        element.style.setProperty('--bg-secondary', getColor('#ffe4e6', '#9f1239'));
        element.style.setProperty('--bg-tertiary', getColor('#fecdd3', '#be123c'));
        element.style.setProperty('--text-primary', getColor('#881337', '#fff1f2'));
        element.style.setProperty('--text-secondary', getColor('#9f1239', '#ffe4e6'));
        element.style.setProperty('--text-tertiary', getColor('#be123c', '#fda4af'));
        element.style.setProperty('--border-color', getColor('#e11d48', '#9f1239'));
        element.style.setProperty('--accent-primary', '#f43f5e');
        element.style.setProperty('--accent-hover', '#e11d48');
        element.style.setProperty('--accent-light', '#fb7185');
        element.style.setProperty('--shadow-color', getColor('rgba(225, 29, 72, 0.1)', 'rgba(225, 29, 72, 0.3)'));
        break;
        
      case 'dynamic365':
        // Microsoft Dynamic 365 theme - Professional blue
        element.style.setProperty('--bg-primary', '#ffffff');
        element.style.setProperty('--bg-secondary', '#f3f2f1');
        element.style.setProperty('--bg-tertiary', '#edebe9');
        element.style.setProperty('--text-primary', '#323130');
        element.style.setProperty('--text-secondary', '#605e5c');
        element.style.setProperty('--text-tertiary', '#8a8886');
        element.style.setProperty('--border-color', '#edebe9');
        element.style.setProperty('--accent-primary', '#0078d4');
        element.style.setProperty('--accent-hover', '#106ebe');
        element.style.setProperty('--accent-light', '#40a6ff');
        element.style.setProperty('--shadow-color', 'rgba(0, 120, 212, 0.1)');
        break;
        
      case 'windows2025':
        // Windows 2025 theme - Modern cyan/blue
        element.style.setProperty('--bg-primary', '#f0f9ff');
        element.style.setProperty('--bg-secondary', '#e0f2fe');
        element.style.setProperty('--bg-tertiary', '#bae6fd');
        element.style.setProperty('--text-primary', '#0c4a6e');
        element.style.setProperty('--text-secondary', '#0369a1');
        element.style.setProperty('--text-tertiary', '#0284c7');
        element.style.setProperty('--border-color', '#0ea5e9');
        element.style.setProperty('--accent-primary', '#0284c7');
        element.style.setProperty('--accent-hover', '#0369a1');
        element.style.setProperty('--accent-light', '#38bdf8');
        element.style.setProperty('--shadow-color', 'rgba(2, 132, 199, 0.1)');
        break;
        
      default: // light, dark, system
        if (actualTheme === 'dark') {
          element.style.setProperty('--bg-primary', '#111827');
          element.style.setProperty('--bg-secondary', '#1f2937');
          element.style.setProperty('--bg-tertiary', '#374151');
          element.style.setProperty('--text-primary', '#f9fafb');
          element.style.setProperty('--text-secondary', '#d1d5db');
          element.style.setProperty('--text-tertiary', '#9ca3af');
          element.style.setProperty('--border-color', '#374151');
          element.style.setProperty('--border-color-secondary', '#4b5563');
          element.style.setProperty('--accent-primary', '#3b82f6');
          element.style.setProperty('--accent-hover', '#2563eb');
          element.style.setProperty('--accent-light', '#60a5fa');
          element.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.3)');
        } else {
          element.style.setProperty('--bg-primary', '#ffffff');
          element.style.setProperty('--bg-secondary', '#f9fafb');
          element.style.setProperty('--bg-tertiary', '#f3f4f6');
          element.style.setProperty('--text-primary', '#111827');
          element.style.setProperty('--text-secondary', '#6b7280');
          element.style.setProperty('--text-tertiary', '#9ca3af');
          element.style.setProperty('--border-color', '#e5e7eb');
          element.style.setProperty('--border-color-secondary', '#d1d5db');
          element.style.setProperty('--accent-primary', '#3b82f6');
          element.style.setProperty('--accent-hover', '#2563eb');
          element.style.setProperty('--accent-light', '#60a5fa');
          element.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
        }
        break;
    }
  };

  // Set theme function
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Save to localStorage for persistence
    try {
      localStorage.setItem('app-theme', newTheme);
      console.log(`💾 تم "${newTheme}" در localStorage ذخیره شد`);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
    applyTheme(newTheme);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('theme-change', {
      detail: { theme: newTheme }
    }));
  };

  // Apply theme on initial load and when theme state changes
  useEffect(() => {
    // Only apply theme if document is ready
    if (typeof document !== 'undefined' && document.documentElement) {
      applyTheme(theme);
      
      // Force re-render of all components by dispatching a global event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-applied', {
          detail: { theme }
        }));
        
        // Also update all elements with data-theme attribute
        const allElements = document.querySelectorAll('[data-theme]');
        allElements.forEach(el => {
          el.setAttribute('data-theme', theme);
        });
      }
    }
  }, [theme, applyTheme]);

  // Listen for theme changes from localStorage or custom events
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent | StorageEvent) => {
      let newTheme: Theme | null = null;
      
      if (event instanceof CustomEvent && event.detail?.theme) {
        newTheme = event.detail.theme as Theme;
      } else if (event instanceof StorageEvent && event.key === 'app-theme' && event.newValue) {
        newTheme = event.newValue as Theme;
      }
      
      if (newTheme && THEME_NAMES[newTheme]) {
        // Check current theme state to avoid unnecessary updates
        setThemeState(prevTheme => {
          if (newTheme !== prevTheme) {
            console.log(`🔄 دریافت تغییر تم از event: ${prevTheme} -> ${newTheme}`);
            // applyTheme will be called by the useEffect that watches theme state
            return newTheme;
          }
          return prevTheme;
        });
      }
    };
    
    // Listen for custom theme-change events
    window.addEventListener('theme-change', handleThemeChange as EventListener);
    
    // Listen for storage events (for cross-tab sync)
    window.addEventListener('storage', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener);
      window.removeEventListener('storage', handleThemeChange as EventListener);
    };
  }, []); // Empty dependencies - only set up listeners once

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme, applyTheme]);

  // Calculate if current theme is dark (enhanced for all themes)
  const isDark = useMemo(() => {
    if (theme === 'dark') {
      return true;
    }
    if (theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    }
    // Special themes are generally light, but check system preference for some
    if (['ocean', 'sunset', 'forest', 'purple', 'rose'].includes(theme)) {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    }
    // dynamic365 and windows2025 are always light themes
    return false;
  }, [theme]);

  // Get theme name function
  const getThemeName = (themeToGet: Theme): string => {
    return THEME_NAMES[themeToGet] || 'نامشخص';
  };

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    actualTheme,
    themeName: THEME_NAMES[theme],
    getThemeName
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Utility hook for local storage
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// Theme toggle component
interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, setTheme, isDark, getThemeName } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '💻';
      case 'ocean':
        return '🌊';
      case 'sunset':
        return '🌅';
      case 'forest':
        return '🌲';
      case 'purple':
        return '🦄';
      case 'rose':
        return '🌹';
      case 'dynamic365':
        return '🏢';
      case 'windows2025':
        return '🪟';
      default:
        return '🎨';
    }
  };

  const getThemeLabel = () => {
    const themeNames = {
      'light': 'روشن',
      'dark': 'تاریک',
      'system': 'سیستم',
      'ocean': 'اقیانوس',
      'sunset': 'غروب',
      'forest': 'جنگل',
      'purple': 'بنفش',
      'rose': 'گل سرخ',
      'dynamic365': 'Microsoft Dynamic 365',
      'windows2025': 'ویندوز 2025'
    };
    return themeNames[theme] || 'تم';
  };

  // Cycle through themes for toggle
  const themeCycle: Theme[] = ['light', 'dark', 'system', 'ocean', 'sunset', 'forest', 'purple', 'rose', 'dynamic365', 'windows2025'];
  const currentIndex = themeCycle.indexOf(theme);
  const nextTheme = themeCycle[(currentIndex + 1) % themeCycle.length];

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
        isDark 
          ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' 
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      } ${className}`}
      title={`تغییر به ${getThemeName(nextTheme)}`}
    >
      <span className="text-lg" role="img" aria-label="theme-icon">
        {getThemeIcon()}
      </span>
      <span className="text-sm font-medium">
        {getThemeLabel()}
      </span>
    </button>
  );
};

// Theme-aware component wrapper
interface ThemedProps {
  children: ReactNode;
  className?: string;
}

export const Themed: React.FC<ThemedProps> = ({ children, className = '' }) => {
  const { isDark } = useTheme();
  
  return (
    <div className={`${isDark ? 'dark' : 'light'} ${className}`}>
      {children}
    </div>
  );
};

// Hook for responsive theme-aware styling
export const useResponsiveTheme = () => {
  const { isDark } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getResponsiveColor = (lightColor: string, darkColor: string) => {
    return isDark ? darkColor : lightColor;
  };

  const getResponsiveBg = (lightBg: string, darkBg: string) => {
    return isDark ? darkBg : lightBg;
  };

  const getMobileResponsiveSize = (desktopSize: string, mobileSize: string) => {
    return isMobile ? mobileSize : desktopSize;
  };

  return {
    isDark,
    isMobile,
    getResponsiveColor,
    getResponsiveBg,
    getMobileResponsiveSize
  };
};

export default ThemeProvider;