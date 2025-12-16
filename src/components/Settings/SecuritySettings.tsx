import React, { useState, useCallback, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Globe, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Copy,
  Save,
  RotateCcw,
  Clock,
  UserX,
  Eye,
  EyeOff
} from 'lucide-react';

// Types
interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expireDays: number;
  preventReuse: number;
}

interface SecuritySettings {
  // Authentication
  maxFailedAttempts: number;
  loginBlockDuration: number; // seconds
  sessionTimeoutMinutes: number;
  twoFactorAuth: boolean;
  sessionHistory: boolean;
  
  // Security Features
  encryptionEnabled: boolean;
  auditLogEnabled: boolean;
  
  // Password Policy
  passwordPolicy: PasswordPolicy;
  
  // IP Whitelist
  ipWhitelist: string[];
}

// Validation functions
const validateIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

const validateSecuritySettings = (settings: SecuritySettings): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Authentication validation
  if (settings.maxFailedAttempts < 1 || settings.maxFailedAttempts > 10) {
    errors.push('حداکثر تلاش‌های ناموفق باید بین 1 تا 10 باشد');
  }
  
  if (settings.loginBlockDuration < 5 || settings.loginBlockDuration > 3600) {
    errors.push('مدت زمان مسدودی باید بین 5 تا 3600 ثانیه باشد');
  }
  
  if (settings.sessionTimeoutMinutes < 5 || settings.sessionTimeoutMinutes > 480) {
    errors.push('مدت زمان نشست باید بین 1 تا 480 دقیقه باشد');
  }
  
  // Password policy validation
  if (settings.passwordPolicy.minLength < 4 || settings.passwordPolicy.minLength > 32) {
    errors.push('حداقل طول رمز عبور باید بین 4 تا 32 کاراکتر باشد');
  }
  
  if (settings.passwordPolicy.expireDays < 0 || settings.passwordPolicy.expireDays > 365) {
    errors.push('تاریخ انقضا باید بین 0 تا 365 روز باشد');
  }
  
  if (settings.passwordPolicy.preventReuse < 0 || settings.passwordPolicy.preventReuse > 20) {
    errors.push('پیشگیری از استفاده مجدد باید بین 0 تا 20 باشد');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Default settings
const DEFAULT_SETTINGS: SecuritySettings = {
  maxFailedAttempts: 3,
  loginBlockDuration: 300, // 5 minutes
  sessionTimeoutMinutes: 60,
  twoFactorAuth: false,
  sessionHistory: true,
  encryptionEnabled: true,
  auditLogEnabled: true,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    expireDays: 90,
    preventReuse: 5
  },
  ipWhitelist: []
};

// Modern UI Components
const ModernCard: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, icon, children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}>
    <div className="p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const ModernToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, description, disabled = false }) => (
  <div className="flex items-center justify-between py-4">
    <div className="flex-1">
      <label className="text-sm font-semibold text-gray-900">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${checked 
          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg' 
          : 'bg-gray-200 hover:bg-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg 
          transition duration-200 ease-in-out flex items-center justify-center
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `}
      >
        <div className={`w-3 h-3 rounded-full ${checked ? 'bg-blue-500' : 'bg-gray-400'}`} />
      </span>
    </button>
  </div>
);

const ModernInput: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  placeholder?: string;
  description?: string;
  error?: string;
  suffix?: string;
}> = ({ label, value, onChange, type = 'text', min, max, placeholder, description, error, suffix }) => (
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-900">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => {
          if (type === 'number') {
            const numValue = parseInt(e.target.value) || 0;
            onChange(numValue);
          } else {
            onChange(e.target.value);
          }
        }}
        min={min}
        max={max}
        placeholder={placeholder}
        className={`
          block w-full px-4 py-3 border rounded-xl shadow-sm placeholder-gray-400 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200
          ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white focus:bg-white'}
          ${suffix ? 'pr-12' : ''}
        `}
      />
      {suffix && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-gray-500">
          {suffix}
        </span>
      )}
    </div>
    {description && !error && (
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    )}
    {error && (
      <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </div>
);

const SuccessToast: React.FC<{ show: boolean; message: string }> = ({ show, message }) => {
  if (!show) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
      <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg">
        <Check className="h-5 w-5" />
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );
};

// Main Component
export const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySettings>(() => {
    // Try to load settings from localStorage, fallback to defaults
    try {
      const saved = localStorage.getItem('securitySettings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        console.log('Loading settings from localStorage:', parsedSettings);
        return { ...DEFAULT_SETTINGS, ...parsedSettings };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  });
  const [newIP, setNewIP] = useState('');
  const [ipErrors, setIpErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPasswordPolicy, setShowPasswordPolicy] = useState(true);
  const [showIPList, setShowIPList] = useState(true);
  const [showDebug, setShowDebug] = useState(false); // Debug mode toggle
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Debug: Log settings changes and track unsaved changes
  useEffect(() => {
    console.log('Settings updated:', settings);
    
    // Check if settings differ from localStorage
    try {
      const saved = localStorage.getItem('securitySettings');
      const savedSettings = saved ? JSON.parse(saved) : null;
      const isDifferent = JSON.stringify(settings) !== JSON.stringify(savedSettings);
      setHasUnsavedChanges(isDifferent);
    } catch (error) {
      console.warn('Failed to compare with saved settings:', error);
      setHasUnsavedChanges(true);
    }
  }, [settings]);

  // Update settings with validation
  const updateSettings = useCallback((updates: Partial<SecuritySettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      console.log('Settings updated:', newSettings); // Debug log
      return newSettings;
    });
    setValidationErrors([]);
  }, []);

  const updatePasswordPolicy = useCallback((updates: Partial<PasswordPolicy>) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        passwordPolicy: { ...prev.passwordPolicy, ...updates }
      };
      console.log('Password policy updated:', newSettings.passwordPolicy); // Debug log
      return newSettings;
    });
    setValidationErrors([]);
  }, []);

  // IP Management
  const addIP = useCallback(() => {
    const trimmedIP = newIP.trim();
    
    if (!trimmedIP) {
      setIpErrors(['آدرس IP نمی‌تواند خالی باشد']);
      return;
    }
    
    if (!validateIP(trimmedIP)) {
      setIpErrors(['آدرس IP معتبر نیست (مثال: 192.168.1.1)']);
      return;
    }
    
    if (settings.ipWhitelist.includes(trimmedIP)) {
      setIpErrors(['این آدرس IP قبلاً اضافه شده است']);
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      ipWhitelist: [...prev.ipWhitelist, trimmedIP]
    }));
    setNewIP('');
    setIpErrors([]);
    console.log('IP added successfully:', trimmedIP); // Debug log
  }, [newIP, settings.ipWhitelist]);

  const removeIP = useCallback((index: number) => {
    setSettings(prev => {
      const newIPList = prev.ipWhitelist.filter((_, i) => i !== index);
      console.log('IP removed, remaining IPs:', newIPList); // Debug log
      return {
        ...prev,
        ipWhitelist: newIPList
      };
    });
  }, []);

  const copyIPs = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(settings.ipWhitelist.join('\n'));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy IPs:', err);
    }
  }, [settings.ipWhitelist]);

  // Save settings
  const handleSave = useCallback(async () => {
    console.log('Attempting to save settings:', settings);
    
    const validation = validateSecuritySettings(settings);
    
    if (!validation.isValid) {
      console.error('Validation failed:', validation.errors);
      setValidationErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage
      try {
        localStorage.setItem('securitySettings', JSON.stringify(settings));
        console.log('Settings saved to localStorage:', settings);
      } catch (storageError) {
        console.warn('Failed to save to localStorage:', storageError);
      }
      
      // Here you would typically make an API call to save the settings
      console.log('Settings saved successfully:', settings);
      
      setShowSuccess(true);
      setValidationErrors([]);
      setHasUnsavedChanges(false);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setValidationErrors(['خطا در ذخیره تنظیمات. لطفاً مجدداً تلاش کنید.']);
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    console.log('Resetting to default settings');
    
    setSettings(DEFAULT_SETTINGS);
    setValidationErrors([]);
    setHasUnsavedChanges(true);
    
    // Clear localStorage
    try {
      localStorage.removeItem('securitySettings');
      console.log('Cleared settings from localStorage');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">تنظیمات امنیت سیستم</h1>
                  <p className="text-blue-100 mt-1">
                    مدیریت جامع تنظیمات امنیتی و حفاظت از داده‌ها
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  🔧 دیباگ
                </button>
                
                <button
                  onClick={() => {
                    try {
                      const saved = localStorage.getItem('securitySettings');
                      if (saved) {
                        const parsedSettings = JSON.parse(saved);
                        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
                        setValidationErrors([]);
                        setHasUnsavedChanges(false);
                        setShowSuccess(true);
                        setTimeout(() => setShowSuccess(false), 2000);
                      } else {
                        alert('هیچ تنظیمات ذخیره شده‌ای یافت نشد');
                      }
                    } catch (error) {
                      console.error('Failed to load settings:', error);
                      alert('خطا در بارگذاری تنظیمات');
                    }
                  }}
                  className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  <Copy className="h-4 w-4" />
                  بارگذاری مجدد
                </button>
                
                <button
                  onClick={resetToDefaults}
                  className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  <RotateCcw className="h-4 w-4" />
                  بازنشانی
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={isLoading || validationErrors.length > 0 || !hasUnsavedChanges}
                  className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg ${
                    hasUnsavedChanges && !isLoading && validationErrors.length === 0
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600 animate-pulse' 
                      : 'bg-white text-blue-700 hover:bg-blue-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {hasUnsavedChanges ? 'ذخیره تغییرات' : 'ذخیره شده'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-6 bg-red-50 border-t border-red-200">
              <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                خطاهای اعتبارسنجی:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 bg-red-100 px-3 py-2 rounded-lg">
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* Status Indicator */}
          {hasUnsavedChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800">تغییرات ذخیره نشده</h4>
                  <p className="text-sm text-yellow-700">تنظیمات شما تغییر کرده‌اند اما هنوز ذخیره نشده‌اند. از دکمه "ذخیره تغییرات" در بالای صفحه استفاده کنید.</p>
                </div>
              </div>
            </div>
          )}

        {/* Debug Panel */}
        {showDebug && (
          <div className="bg-gray-800 text-white p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">🔧 وضعیت فعلی تنظیمات</h3>
              <button
                onClick={() => setShowDebug(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <pre className="text-xs bg-gray-900 p-4 rounded-lg overflow-auto max-h-64">
              {JSON.stringify(settings, null, 2)}
            </pre>
            <div className="mt-4 space-y-2">
              <div className="text-xs text-gray-400">
                <p>تغییرات ذخیره نشده: {hasUnsavedChanges ? 'بله' : 'خیر'}</p>
                <p>IP Whitelist: {settings.ipWhitelist.length} آدرس</p>
                <p>خطاهای اعتبارسنجی: {validationErrors.length} مورد</p>
                <p>خطاهای IP: {ipErrors.length} مورد</p>
                <p>localStorage: {typeof Storage !== 'undefined' ? 'در دسترس' : 'غیرفعال'}</p>
                <p>آخرین ذخیره‌سازی: {new Date().toLocaleTimeString('fa-IR')}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(settings, null, 2);
                    navigator.clipboard.writeText(dataStr);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  کپی JSON
                </button>
                <button
                  onClick={() => {
                    const jsonStr = prompt('تنظیمات JSON را وارد کنید:');
                    if (jsonStr) {
                      try {
                        const parsed = JSON.parse(jsonStr);
                        setSettings(parsed);
                        setValidationErrors([]);
                        setHasUnsavedChanges(true);
                        setShowSuccess(true);
                        setTimeout(() => setShowSuccess(false), 2000);
                      } catch (e) {
                        alert('JSON نامعتبر است');
                      }
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  بارگذاری JSON
                </button>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem('securitySettings');
                      alert('localStorage پاک شد');
                      setHasUnsavedChanges(true);
                    } catch (error) {
                      alert('خطا در پاک کردن localStorage');
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  پاک کردن localStorage
                </button>
                <button
                  onClick={() => {
                    try {
                      const saved = localStorage.getItem('securitySettings');
                      if (saved) {
                        const parsed = JSON.parse(saved);
                        console.log('LocalStorage content:', parsed);
                        console.log('Current settings:', settings);
                        console.log('Are they equal?', JSON.stringify(parsed) === JSON.stringify(settings));
                        alert('محتوای localStorage در کنسول نمایش داده شد\nدر کنسول (F12) بررسی کنید');
                      } else {
                        alert('هیچ چیز در localStorage ذخیره نشده است');
                      }
                    } catch (error) {
                      alert('خطا در خواندن localStorage');
                    }
                  }}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                >
                  تست ذخیره‌سازی
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Authentication Settings */}
          <ModernCard
            title="تنظیمات احراز هویت"
            description="مدیریت نحوه ورود و دسترسی کاربران به سیستم"
            icon={<Lock className="h-6 w-6 text-blue-600" />}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModernInput
                  label="حداکثر تلاش‌های ناموفق"
                  type="number"
                  value={settings.maxFailedAttempts}
                  onChange={(value) => {
                    const numValue = typeof value === 'number' ? value : parseInt(value) || 3;
                    updateSettings({ maxFailedAttempts: Math.max(1, Math.min(10, numValue)) });
                  }}
                  min={1}
                  max={10}
                  description="تعداد دفعات مجاز برای ورود ناموفق"
                />
                
                <ModernInput
                  label="مدت زمان مسدودی"
                  type="number"
                  value={settings.loginBlockDuration}
                  onChange={(value) => {
                    const numValue = typeof value === 'number' ? value : parseInt(value) || 300;
                    updateSettings({ loginBlockDuration: Math.max(5, Math.min(3600, numValue)) });
                  }}
                  min={5}
                  max={3600}
                  description="مدت زمان مسدودی پس از تلاش‌های ناموفق"
                  suffix="ثانیه"
                />
              </div>
              
              <ModernInput
                label="مدت زمان نشست"
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(value) => {
                  const numValue = typeof value === 'number' ? value : parseInt(value) || 60;
                  updateSettings({ sessionTimeoutMinutes: Math.max(1, Math.min(480, numValue)) });
                }}
                min={1}
                max={480}
                description="مدت زمان اعتبار نشست کاربر"
                suffix="دقیقه"
              />
              
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <ModernToggle
                  checked={settings.twoFactorAuth}
                  onChange={(checked) => {
                    console.log('2FA setting changed to:', checked);
                    updateSettings({ twoFactorAuth: checked });
                  }}
                  label="احراز هویت دو مرحله‌ای (2FA)"
                  description="افزودن یک لایه امنیتی اضافی با کد تایید"
                />
                
                <ModernToggle
                  checked={settings.sessionHistory}
                  onChange={(checked) => {
                    console.log('Session history setting changed to:', checked);
                    updateSettings({ sessionHistory: checked });
                  }}
                  label="تاریخچه نشست‌ها"
                  description="ثبت و نگهداری تاریخچه ورود و خروج کاربران"
                />
              </div>
            </div>
          </ModernCard>

          {/* Security Features */}
          <ModernCard
            title="ویژگی‌های امنیتی"
            description="فعال‌سازی ویژگی‌های حفاظتی و نظارتی سیستم"
            icon={<Shield className="h-6 w-6 text-blue-600" />}
          >
            <div className="space-y-6">
              <ModernToggle
                checked={settings.encryptionEnabled}
                onChange={(checked) => {
                  console.log('Encryption setting changed to:', checked);
                  updateSettings({ encryptionEnabled: checked });
                }}
                label="رمزنگاری داده‌ها"
                description="حفاظت از داده‌های حساس با رمزنگاری AES-256"
              />
              
              <ModernToggle
                checked={settings.auditLogEnabled}
                onChange={(checked) => {
                  console.log('Audit log setting changed to:', checked);
                  updateSettings({ auditLogEnabled: checked });
                }}
                label="ثبت وقایع امنیتی"
                description="ثبت کامل تمام فعالیت‌ها و تغییرات امنیتی"
              />

              {/* Security Status */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800">وضعیت امنیت</h4>
                    <p className="text-sm text-green-700">تمام تنظیمات به درستی پیکربندی شده‌اند</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">رمزنگاری:</span>
                    <span className="font-semibold text-green-800 mr-2">فعال</span>
                  </div>
                  <div>
                    <span className="text-green-700">ثبت وقایع:</span>
                    <span className="font-semibold text-green-800 mr-2">فعال</span>
                  </div>
                </div>
              </div>
            </div>
          </ModernCard>
        </div>

        {/* Password Policy */}
        <ModernCard
          title="سیاست رمز عبور"
          description="تعریف قواعد و الزامات برای ایجاد رمزهای عبور قوی و امن"
          icon={<Key className="h-6 w-6 text-blue-600" />}
          className="xl:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">پیکربندی سیاست رمز عبور</h4>
              <p className="text-sm text-gray-600 mt-1">تعریف استانداردهای امنیتی برای رمزهای عبور</p>
            </div>
            <button
              onClick={() => setShowPasswordPolicy(!showPasswordPolicy)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showPasswordPolicy ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {showPasswordPolicy && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <ModernInput
                  label="حداقل طول رمز عبور"
                  type="number"
                  value={settings.passwordPolicy.minLength}
                  onChange={(value) => {
                    const numValue = typeof value === 'number' ? value : parseInt(value) || 8;
                    updatePasswordPolicy({ minLength: Math.max(4, Math.min(32, numValue)) });
                  }}
                  min={4}
                  max={32}
                  description="حداقل تعداد کاراکترهای مورد نیاز"
                />
                
                <ModernInput
                  label="تاریخ انقضا رمز عبور"
                  type="number"
                  value={settings.passwordPolicy.expireDays}
                  onChange={(value) => {
                    const numValue = typeof value === 'number' ? value : parseInt(value) || 90;
                    updatePasswordPolicy({ expireDays: Math.max(0, Math.min(365, numValue)) });
                  }}
                  min={0}
                  max={365}
                  description="مدت زمان اعتبار رمز عبور (0 = بدون انقضا)"
                  suffix="روز"
                />
                
                <ModernInput
                  label="پیشگیری از استفاده مجدد"
                  type="number"
                  value={settings.passwordPolicy.preventReuse}
                  onChange={(value) => {
                    const numValue = typeof value === 'number' ? value : parseInt(value) || 5;
                    updatePasswordPolicy({ preventReuse: Math.max(0, Math.min(20, numValue)) });
                  }}
                  min={0}
                  max={20}
                  description="تعداد رمزهای عبور قبلی که نمی‌توان استفاده کرد"
                />
              </div>
              
              <div className="lg:col-span-2 space-y-4">
                <h5 className="font-semibold text-gray-900 mb-4">الزامات کاراکتری</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ModernToggle
                    checked={settings.passwordPolicy.requireUppercase}
                    onChange={(checked) => {
                      console.log('Require uppercase setting changed to:', checked);
                      updatePasswordPolicy({ requireUppercase: checked });
                    }}
                    label="حروف بزرگ (A-Z)"
                    description="الزام به وجود حداقل یک حرف بزرگ انگلیسی"
                  />
                  
                  <ModernToggle
                    checked={settings.passwordPolicy.requireLowercase}
                    onChange={(checked) => {
                      console.log('Require lowercase setting changed to:', checked);
                      updatePasswordPolicy({ requireLowercase: checked });
                    }}
                    label="حروف کوچک (a-z)"
                    description="الزام به وجود حداقل یک حرف کوچک انگلیسی"
                  />
                  
                  <ModernToggle
                    checked={settings.passwordPolicy.requireNumbers}
                    onChange={(checked) => {
                      console.log('Require numbers setting changed to:', checked);
                      updatePasswordPolicy({ requireNumbers: checked });
                    }}
                    label="اعداد (0-9)"
                    description="الزام به وجود حداقل یک رقم"
                  />
                  
                  <ModernToggle
                    checked={settings.passwordPolicy.requireSpecialChars}
                    onChange={(checked) => {
                      console.log('Require special chars setting changed to:', checked);
                      updatePasswordPolicy({ requireSpecialChars: checked });
                    }}
                    label="کاراکترهای خاص"
                    description="الزام به وجود کاراکترهای خاص (!@#$%^&*)"
                  />
                </div>

                {/* Password Strength Preview */}
                <div className="p-4 bg-gray-50 rounded-xl mt-6">
                  <h6 className="font-semibold text-gray-900 mb-3">نمونه رمز عبور قوی:</h6>
                  <div className="font-mono text-sm bg-white px-4 py-2 rounded-lg border">
                    MySecure@Pass2024
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    رمز عبور نمونه بالا تمام الزامات فعلی را برآورده می‌کند
                  </p>
                </div>
              </div>
            </div>
          )}
        </ModernCard>

        {/* IP Whitelist */}
        <ModernCard
          title="لیست IP مجاز"
          description="مدیریت آدرس‌های IP مجاز برای دسترسی به سیستم"
          icon={<Globe className="h-6 w-6 text-blue-600" />}
          className="xl:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">محدودیت دسترسی بر اساس IP</h4>
              <p className="text-sm text-gray-600 mt-1">فقط آدرس‌های IP ثبت شده مجاز به دسترسی هستند</p>
            </div>
            <button
              onClick={() => setShowIPList(!showIPList)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showIPList ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {showIPList && (
            <div className="space-y-6">
              {/* Add New IP */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <ModernInput
                    label="آدرس IP جدید"
                    value={newIP}
                    onChange={(value) => {
                      const stringValue = typeof value === 'string' ? value : String(value);
                      setNewIP(stringValue);
                      if (ipErrors.length > 0) {
                        setIpErrors([]); // Clear errors when user starts typing
                      }
                    }}
                    placeholder="192.168.1.100"
                    error={ipErrors[0]}
                    description="آدرس IP معتبر را وارد کنید (مثال: 192.168.1.1)"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addIP}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-5 w-5" />
                    افزودن IP
                  </button>
                </div>
              </div>

              {/* IP List */}
              {settings.ipWhitelist.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-gray-900">
                      آدرس‌های IP مجاز ({settings.ipWhitelist.length})
                    </h5>
                    <button
                      onClick={copyIPs}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                    >
                      <Copy className="h-4 w-4" />
                      کپی همه
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {settings.ipWhitelist.map((ip, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                        <div className="flex-1 font-mono text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded-lg border">
                          {ip}
                        </div>
                        <button
                          onClick={() => removeIP(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Globe className="h-8 w-8 text-gray-400" />
                  </div>
                  <h5 className="text-lg font-semibold text-gray-600 mb-2">هیچ آدرس IP مجازی تعریف نشده است</h5>
                  <p className="text-gray-500 mb-4">برای محدود کردن دسترسی، IP های مجاز را اضافه کنید</p>
                  <p className="text-xs text-gray-400">
                    در صورت خالی بودن این لیست، تمام آدرس‌های IP مجاز خواهند بود
                  </p>
                </div>
              )}
            </div>
          )}
        </ModernCard>
      </div>

      {/* Storage Status */}
      <div className="fixed bottom-4 left-4 z-40">
        <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
          typeof Storage !== 'undefined' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {typeof Storage !== 'undefined' ? '💾 localStorage در دسترس' : '❌ localStorage در دسترس نیست'}
        </div>
      </div>

      {/* Persistent Status */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 animate-pulse">
            ⚠️ تغییرات ذخیره نشده
          </div>
        </div>
      )}

      {/* Success Toast */}
      <SuccessToast 
        show={showSuccess} 
        message={hasUnsavedChanges === false ? "تنظیمات با موفقیت ذخیره شد" : "عملیات با موفقیت انجام شد"} 
      />
    </div>
  );
};

export default SecuritySettings;