import React, { useState, useEffect } from 'react';
import { Palette, Monitor, Sun, Moon, Contrast, Zap, Eye } from 'lucide-react';
import { DataStorage } from '../../utils/dataStorage';

interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto';
  colorScheme: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  animations: boolean;
  shadows: boolean;
  contrast: 'normal' | 'high';
  fontSize: 'small' | 'medium' | 'large';
}

interface ThemeManagerProps {
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

export const ThemeManager: React.FC<ThemeManagerProps> = ({ isDarkMode, setIsDarkMode }) => {
  const [settings, setSettings] = useState<ThemeSettings>({
    mode: 'light',
    colorScheme: 'blue',
    animations: true,
    shadows: true,
    contrast: 'normal',
    fontSize: 'medium'
  });

  const storage = DataStorage.getInstance();

  useEffect(() => {
    const savedSettings = storage.loadData('themeSettings');
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  useEffect(() => {
    storage.saveData('themeSettings', settings);
    applyTheme();
  }, [settings]);

  const applyTheme = () => {
    const root = document.documentElement;
    
    // Apply color scheme
    const colors = {
      blue: { primary: '#3b82f6', secondary: '#1e40af' },
      green: { primary: '#10b981', secondary: '#047857' },
      purple: { primary: '#8b5cf6', secondary: '#7c3aed' },
      orange: { primary: '#f59e0b', secondary: '#d97706' },
      red: { primary: '#ef4444', secondary: '#dc2626' }
    };
    
    const scheme = colors[settings.colorScheme];
    root.style.setProperty('--primary-color', scheme.primary);
    root.style.setProperty('--secondary-color', scheme.secondary);
    
    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.fontSize = fontSizes[settings.fontSize];
    
    // Apply animations
    if (!settings.animations) {
      root.style.setProperty('--animation-duration', '0s');
    } else {
      root.style.setProperty('--animation-duration', '0.3s');
    }
    
    // Apply shadows
    if (!settings.shadows) {
      root.style.setProperty('--box-shadow', 'none');
    } else {
      root.style.setProperty('--box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)');
    }
    
    // Apply contrast
    if (settings.contrast === 'high') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  };

  const handleModeChange = (mode: 'light' | 'dark' | 'auto') => {
    setSettings({ ...settings, mode });
    
    if (mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    } else {
      setIsDarkMode(mode === 'dark');
    }
  };

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تم و ظاهر</h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>تنظیمات ظاهری و تم برنامه</p>
          </div>
          <div className="flex items-center">
            <img 
              src="/لوگو صنعت غذایی کورش copy.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Theme Mode */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-blue-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>حالت تم</h3>
            </div>
            
            <div className="space-y-3">
              {[
                { id: 'light', name: 'روشن', icon: Sun, desc: 'تم روشن برای استفاده در روز' },
                { id: 'dark', name: 'تاریک', icon: Moon, desc: 'تم تاریک برای استفاده در شب' },
                { id: 'auto', name: 'خودکار', icon: Monitor, desc: 'تطبیق با تنظیمات سیستم' }
              ].map(({ id, name, icon: Icon, desc }) => (
                <label key={id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  settings.mode === id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="mode"
                    value={id}
                    checked={settings.mode === id}
                    onChange={(e) => handleModeChange(e.target.value as any)}
                    className="ml-3"
                  />
                  <Icon className="h-5 w-5 text-blue-600 ml-3" />
                  <div>
                    <div className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{name}</div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-blue-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>طرح رنگی</h3>
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              {[
                { id: 'blue', color: 'bg-blue-500', name: 'آبی' },
                { id: 'green', color: 'bg-green-500', name: 'سبز' },
                { id: 'purple', color: 'bg-purple-500', name: 'بنفش' },
                { id: 'orange', color: 'bg-orange-500', name: 'نارنجی' },
                { id: 'red', color: 'bg-red-500', name: 'قرمز' }
              ].map(({ id, color, name }) => (
                <button
                  key={id}
                  onClick={() => setSettings({ ...settings, colorScheme: id as any })}
                  className={`aspect-square rounded-lg ${color} relative transition-transform hover:scale-105 ${
                    settings.colorScheme === id ? 'ring-4 ring-offset-2 ring-gray-400' : ''
                  }`}
                  title={name}
                >
                  {settings.colorScheme === id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-blue-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تنظیمات پیشرفته</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>انیمیشن ها</span>
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={(e) => setSettings({ ...settings, animations: e.target.checked })}
                  className="toggle"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>سایه ها</span>
                <input
                  type="checkbox"
                  checked={settings.shadows}
                  onChange={(e) => setSettings({ ...settings, shadows: e.target.checked })}
                  className="toggle"
                />
              </label>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  کنتراست
                </label>
                <select
                  value={settings.contrast}
                  onChange={(e) => setSettings({ ...settings, contrast: e.target.value as any })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="normal">عادی</option>
                  <option value="high">بالا</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  اندازه فونت
                </label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: e.target.value as any })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="small">کوچک</option>
                  <option value="medium">متوسط</option>
                  <option value="large">بزرگ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-blue-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>پیش‌نمایش</h3>
            </div>
            
            <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                نمونه متن
              </div>
              <div className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                این یک نمونه متن برای نمایش تنظیمات تم است.
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                دکمه نمونه
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};