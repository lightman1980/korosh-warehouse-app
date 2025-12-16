import React, { useState } from 'react';
import { Settings, Palette, Bell, Mail, MessageSquare, AlertTriangle, CheckCircle, XCircle, Clock, Calendar, MapPin, Network, HardDrive, Cloud, Cpu, MemoryStick, Wifi, Bluetooth, Usb, Trash2, X, Eye, FileSpreadsheet, HelpCircle, Info, ArrowRight, ArrowLeft, Check, Plus, Filter, DatabaseZap, CloudDownload, FileQuestion, Plug, Settings2, ChevronDown, ChevronUp, User, Search, Calendar as CalendarIcon, Download as DownloadIcon, Filter as FilterIcon, Globe, RefreshCw, TestTube, Workflow, Users, UserCheck, FileText, BarChart, Zap, Activity, Download, Upload, Lock, Key, Monitor, Smartphone, Video } from 'lucide-react';
import { Tooltip } from '../Common/Tooltip';

interface GeneralAppearanceAndNotificationsSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  applySettings: (settings: any) => void;
}

// Default settings structure
const defaultSettings = {
  colorScheme: 'light',
  notifications: {
    // System alerts
    lowInventoryAlert: false,
    newUserNotification: false,
    systemErrorAlerts: false,
    securityAlerts: false,
    
    // Delivery methods
    emailNotifications: false,
    pushNotifications: false,
    smsNotifications: false,
    desktopNotifications: false,
    
    // Social networks
    whatsappNotifications: false,
    telegramNotifications: false,
    slackNotifications: false,
    discordNotifications: false,
    
    // Advanced settings
    notificationSound: false,
    vibrationNotifications: false,
    urgentNotifications: false,
    weeklyReports: false,
    
    // Numeric settings
    priceChangeThreshold: 5,
    minInventoryAmount: 10,
    notificationTimeout: 30,
    maxDailyNotifications: 50
  }
};

export const GeneralAppearanceAndNotificationsSettings: React.FC<GeneralAppearanceAndNotificationsSettingsProps> = ({
  settings,
  setSettings,
  applySettings
}) => {
  // State for visual feedback
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [themeApplied, setThemeApplied] = useState(false);

  // Apply theme immediately when color scheme changes
  const applyThemeChange = (colorScheme: 'light' | 'dark' | 'system') => {
    setThemeApplied(true);
    
    // Remove existing theme classes
    document.documentElement.classList.remove('dark', 'light');
    
    // Apply new theme
    if (colorScheme === 'system') {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(systemPrefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add(colorScheme);
    }
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colorScheme === 'dark' ? '#1f2937' : '#ffffff');
    }
    
    // Force global theme application to all elements
    const applyGlobalTheme = () => {
      if (colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        // Dark theme styles
        document.body.style.backgroundColor = '#111827';
        document.body.style.color = '#f9fafb';
        // Apply to all containers
        const containers = document.querySelectorAll('div, section, main, nav, aside');
        containers.forEach(el => {
          if (el.classList.contains('bg-white')) {
            el.style.backgroundColor = '#1f2937';
            el.style.color = '#f9fafb';
            el.style.borderColor = '#374151';
          }
          if (el.classList.contains('text-gray-900')) {
            el.style.color = '#f9fafb';
          }
        });
      } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        // Light theme styles
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#111827';
        // Reset all containers to light theme
        const containers = document.querySelectorAll('div, section, main, nav, aside');
        containers.forEach(el => {
          if (el.classList.contains('bg-white')) {
            el.style.backgroundColor = '#ffffff';
            el.style.color = '#111827';
            el.style.borderColor = '#e5e7eb';
          }
          if (el.classList.contains('text-gray-900')) {
            el.style.color = '#111827';
          }
        });
      }
    };
    
    // Apply global theme immediately and after a short delay for better coverage
    applyGlobalTheme();
    setTimeout(applyGlobalTheme, 100);
    setTimeout(applyGlobalTheme, 500);
    
    console.log(`🎨 تم ${colorScheme === 'light' ? 'روشن' : colorScheme === 'dark' ? 'تاریک' : 'سیستم'} اعمال شد`);
    
    // Remove the visual feedback after a short delay
    setTimeout(() => setThemeApplied(false), 1500);
  };

  // Simulate saving settings with visual feedback
  const saveWithFeedback = async (newSettings: any) => {
    setIsSaving(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Save to localStorage as backup
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    
    setIsSaving(false);
    setLastSaved(new Date());
  };

  // Safe access to settings with defaults
  const getSettings = () => ({ 
    ...defaultSettings, 
    ...settings, 
    notifications: { 
      ...defaultSettings.notifications, 
      ...settings?.notifications 
    } 
  });

  // Helper function for checkbox change with better logging
  const handleCheckboxChange = async (key: string, checked: boolean) => {
    const currentSettings = getSettings();
    const newNotifications = { ...currentSettings.notifications, [key]: checked };
    const newSettings = { ...currentSettings, notifications: newNotifications };
    
    setSettings(newSettings);
    applySettings(newSettings);
    await saveWithFeedback(newSettings);
    
    console.log(`🔔 ${key} ${checked ? 'فعال' : 'غیرفعال'} شد`);
  };

  // Helper function for numeric field changes
  const handleNumericChange = (key: string, value: number, min: number, max: number) => {
    const currentSettings = getSettings();
    const clampedValue = Math.max(min, Math.min(max, value));
    const newNotifications = { ...currentSettings.notifications, [key]: clampedValue };
    const newSettings = { ...currentSettings, notifications: newNotifications };
    
    setSettings(newSettings);
    applySettings(newSettings);
  };

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Palette className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات ظاهر
          <Tooltip 
            title="تنظیمات ظاهر"
            text="در این بخش می‌توانید ظاهر و زبان برنامه را پیکربندی کنید."
          />
        </h2>
        
        <div className="space-y-6">
          {/* قالب رنگی - عملکرد واقعی */}
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <Palette className="h-4 w-4 ml-2 text-blue-600" />
              قالب رنگي
              <Tooltip 
                title="قالب رنگی"
                text="قالب رنگی برنامه را انتخاب کنید. این تنظیم بلافاصله اعمال می‌شود."
              />
            </label>
            
            {/* Radio buttons برای انتخاب بهتر */}
            <div className="space-y-3">
              <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <input
                  type="radio"
                  id="light-theme"
                  name="colorScheme"
                  value="light"
                  checked={getSettings().colorScheme === 'light'}
                  onChange={async (e) => {
                    const newColorScheme = e.target.value as 'light' | 'dark' | 'system';
                    const newSettings = { ...settings, colorScheme: newColorScheme };
                    
                    // Apply theme immediately
                    applyThemeChange(newColorScheme);
                    
                    // Update settings
                    setSettings(newSettings);
                    applySettings(newSettings);
                    
                    // Save with feedback
                    await saveWithFeedback(newSettings);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="light-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white border border-gray-300 rounded-md ml-2 flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-sm"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">حالت روشن</div>
                      <div className="text-xs text-gray-500">پس‌زمینه سفید و متن تیره</div>
                    </div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <input
                  type="radio"
                  id="dark-theme"
                  name="colorScheme"
                  value="dark"
                  checked={getSettings().colorScheme === 'dark'}
                  onChange={async (e) => {
                    const newColorScheme = e.target.value as 'light' | 'dark' | 'system';
                    const newSettings = { ...settings, colorScheme: newColorScheme };
                    
                    // Apply theme immediately
                    applyThemeChange(newColorScheme);
                    
                    // Update settings
                    setSettings(newSettings);
                    applySettings(newSettings);
                    
                    // Save with feedback
                    await saveWithFeedback(newSettings);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="dark-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-800 border border-gray-600 rounded-md ml-2 flex items-center justify-center">
                      <div className="w-6 h-6 bg-gray-700 rounded-sm"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">حالت تاریک</div>
                      <div className="text-xs text-gray-500">پس‌زمینه تیره و متن روشن</div>
                    </div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <input
                  type="radio"
                  id="system-theme"
                  name="colorScheme"
                  value="system"
                  checked={getSettings().colorScheme === 'system'}
                  onChange={async (e) => {
                    const newColorScheme = e.target.value as 'light' | 'dark' | 'system';
                    const newSettings = { ...settings, colorScheme: newColorScheme };
                    
                    // Apply theme immediately
                    applyThemeChange(newColorScheme);
                    
                    // Update settings
                    setSettings(newSettings);
                    applySettings(newSettings);
                    
                    // Save with feedback
                    await saveWithFeedback(newSettings);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="system-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-white to-gray-800 border border-gray-300 rounded-md ml-2 flex items-center justify-center">
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-700 rounded-sm"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">پیش‌فرض سیستم</div>
                      <div className="text-xs text-gray-500">تبعیت از تنظیمات سیستم عامل</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* نمایش وضعیت فعلی */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center text-sm text-blue-800">
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                ) : themeApplied ? (
                  <Check className="w-4 h-4 ml-2 text-green-500" />
                ) : (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                )}
                <span>وضعیت: </span>
                <span className="font-semibold mr-1">
                  {isSaving ? 'در حال ذخیره...' : 
                   themeApplied ? 'تم اعمال شد!' :
                   getSettings().colorScheme === 'light' ? 'روشن' : 
                   getSettings().colorScheme === 'dark' ? 'تاریک' : 'پیش‌فرض سیستم'}
                </span>
                {lastSaved && !isSaving && (
                  <span className="text-xs text-blue-600 mr-2">
                    آخرین ذخیره: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification Settings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات اعلان‌ها
          <Tooltip 
            title="تنظیمات اعلان‌ها"
            text="در این بخش می‌توانید انواع اعلان‌های سیستم را پیکربندی کنید."
          />
        </h2>
        
        {/* نمایش وضعیت ذخیره */}
        {isSaving && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-sm text-yellow-800">
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              <span>در حال ذخیره تنظیمات اعلان‌ها...</span>
            </div>
          </div>
        )}
        
        {lastSaved && !isSaving && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-sm text-green-800">
              <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
              <span>تنظیمات با موفقیت ذخیره شد</span>
              <span className="mr-2">• {lastSaved.toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* گروه‌بندی اعلان‌ها */}
        <div className="space-y-6">
          
          {/* دسته بندی 1: اعلان‌های سیستمی */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
              <Settings className="h-4 w-4 ml-1" />
              اعلان‌های سیستمی
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="lowInventoryAlert"
                  checked={getSettings().notifications.lowInventoryAlert}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, lowInventoryAlert: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('lowInventoryAlert', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="lowInventoryAlert" className="text-sm font-medium text-gray-900 cursor-pointer">
                    هشدار کم شدن موجودي
                  </label>
                  <p className="text-xs text-gray-500 mt-1">اعلان هنگام رسیدن موجودی به حد آستانه</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="newUserNotification"
                  checked={getSettings().notifications.newUserNotification}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, newUserNotification: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('newUserNotification', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="newUserNotification" className="text-sm font-medium text-gray-900 cursor-pointer">
                    اعلام تعريف کاربر جديد
                  </label>
                  <p className="text-xs text-gray-500 mt-1">اعلان هنگام ثبت‌نام کاربر جدید</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="systemErrorAlerts"
                  checked={getSettings().notifications.systemErrorAlerts}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, systemErrorAlerts: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('systemErrorAlerts', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="systemErrorAlerts" className="text-sm font-medium text-gray-900 cursor-pointer">
                    اعلام خطاهاي سيستمي
                  </label>
                  <p className="text-xs text-gray-500 mt-1">اعلان هنگام بروز خطاهای سیستمی</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="securityAlerts"
                  checked={getSettings().notifications.securityAlerts}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, securityAlerts: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('securityAlerts', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="securityAlerts" className="text-sm font-medium text-gray-900 cursor-pointer">
                    هشدارهای امنیتی
                  </label>
                  <p className="text-xs text-gray-500 mt-1">اعلان ورود مشکوک یا تغییرات امنیتی</p>
                </div>
              </div>
            </div>
          </div>

          {/* دسته بندی 2: روش‌های ارسال */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
            <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
              <MessageSquare className="h-4 w-4 ml-1" />
              روش‌های ارسال اعلان
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={getSettings().notifications.emailNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, emailNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('emailNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center">
                    اعلان‌هاي ايميل
                    <Mail className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">ارسال اعلان از طریق ایمیل</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="pushNotifications"
                  checked={getSettings().notifications.pushNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, pushNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('pushNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="pushNotifications" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center">
                    اعلان‌هاي push
                    <Bell className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">اعلان‌های مرورگر و موبایل</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="smsNotifications"
                  checked={getSettings().notifications.smsNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, smsNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('smsNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="smsNotifications" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center">
                    اعلان‌هاي پيامکي
                    <Smartphone className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">ارسال پیامک فوری</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="desktopNotifications"
                  checked={getSettings().notifications.desktopNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, desktopNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('desktopNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="desktopNotifications" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center">
                    اعلان‌هاي دسکتاپ
                    <Monitor className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">نمایش در نوار اعلان سیستم</p>
                </div>
              </div>
            </div>
          </div>

          {/* دسته بندی 3: شبکه‌های اجتماعی */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
            <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
              <Globe className="h-4 w-4 ml-1" />
              شبکه‌های اجتماعی و پیام‌رسان‌ها
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="whatsappNotifications"
                  checked={getSettings().notifications.whatsappNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, whatsappNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('whatsappNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="whatsappNotifications" className="text-sm font-medium text-gray-900 cursor-pointer">
                    اعلان‌هاي واتس‌اپ
                  </label>
                  <p className="text-xs text-gray-500 mt-1">ارسال از طریق واتس‌اپ بیزینس</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="telegramNotifications"
                  checked={getSettings().notifications.telegramNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, telegramNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('telegramNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="telegramNotifications" className="text-sm font-medium text-gray-900 cursor-pointer">
                    اعلان‌هاي تليگرام
                  </label>
                  <p className="text-xs text-gray-500 mt-1">ارسال از طریق ربات تلگرام</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="slackNotifications"
                  checked={getSettings().notifications.slackNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, slackNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('slackNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="slackNotifications" className="text-sm font-medium text-gray-900 cursor-pointer">
                    اعلان‌هاي Slack
                  </label>
                  <p className="text-xs text-gray-500 mt-1">ارسال به کانال‌های تیم</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="discordNotifications"
                  checked={getSettings().notifications.discordNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, discordNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('discordNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="discordNotifications" className="text-sm font-medium text-gray-900 cursor-pointer">
                    اعلان‌هاي Discord
                  </label>
                  <p className="text-xs text-gray-500 mt-1">ارسال به سرور دیسکورد</p>
                </div>
              </div>
            </div>
          </div>

          {/* دسته بندی 4: تنظیمات پیشرفته */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <Settings2 className="h-4 w-4 ml-1" />
              تنظیمات پیشرفته
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="notificationSound"
                  checked={getSettings().notifications.notificationSound}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, notificationSound: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('notificationSound', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="notificationSound" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center">
                    صدا براي اعلان‌ها
                    <Activity className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">پخش صدا هنگام دریافت اعلان</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="vibrationNotifications"
                  checked={getSettings().notifications.vibrationNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, vibrationNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('vibrationNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="vibrationNotifications" className="text-sm font-medium text-gray-900 cursor-pointer">
                    لرزش برای موبایل
                  </label>
                  <p className="text-xs text-gray-500 mt-1">لرزش دستگاه موبایل</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="urgentNotifications"
                  checked={getSettings().notifications.urgentNotifications}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, urgentNotifications: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('urgentNotifications', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="urgentNotifications" className="text-sm font-medium text-gray-900 cursor-pointer">
                    اعلان‌های فوری
                  </label>
                  <p className="text-xs text-gray-500 mt-1">اعلان فوری برای موارد حساس</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                <input
                  type="checkbox"
                  id="weeklyReports"
                  checked={getSettings().notifications.weeklyReports}
                  onChange={(e) => {
                    const newNotifications = { ...settings.notifications, weeklyReports: e.target.checked };
                    const newSettings = { ...settings, notifications: newNotifications };
                    
                    setSettings(newSettings);
                    applySettings(newSettings);
                  }}
                  onBlur={(e) => handleCheckboxChange('weeklyReports', e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <label htmlFor="weeklyReports" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center">
                    گزارش هفتگی
                    <FileText className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">دریافت گزارش‌های هفتگی</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* تنظیمات عددی اعلان‌ها */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              آستانه تغيير نرخ (%)
              <Tooltip 
                title="آستانه تغییر نرخ"
                text="درصد تغییر نرخ کالاها که در صورت عبور از آن، اعلان نمایش داده می‌شود."
              />
            </label>
            <input
              type="number"
              value={getSettings().notifications.priceChangeThreshold}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 5;
                handleNumericChange('priceChangeThreshold', value, 1, 100);
              }}
              onBlur={async (e) => {
                const value = parseInt(e.target.value) || 5;
                const clampedValue = Math.max(1, Math.min(100, value));
                
                const currentSettings = getSettings();
                const newNotifications = { ...currentSettings.notifications, priceChangeThreshold: clampedValue };
                const newSettings = { ...currentSettings, notifications: newNotifications };
                
                console.log(`💰 آستانه تغییر نرخ تنظیم شد: ${clampedValue}%`);
                await saveWithFeedback(newSettings);
              }}
              disabled={isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50"
              min="1"
              max="100"
              placeholder="1-100"
            />
            <p className="mt-1 text-xs text-gray-500">مقدار بین 1 تا 100 درصد</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              حداقل موجودي (کيلوگرم)
              <Tooltip 
                title="حداقل موجودی"
                text="حداقل موجودی کالاها که در صورت رسیدن به آن، اعلان کمبود موجودی نمایش داده می‌شود."
              />
            </label>
            <input
              type="number"
              value={getSettings().notifications.minInventoryAmount}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 10;
                handleNumericChange('minInventoryAmount', value, 0, Infinity);
              }}
              onBlur={async (e) => {
                const value = parseFloat(e.target.value) || 10;
                const clampedValue = Math.max(0, value);
                
                const currentSettings = getSettings();
                const newNotifications = { ...currentSettings.notifications, minInventoryAmount: clampedValue };
                const newSettings = { ...currentSettings, notifications: newNotifications };
                
                console.log(`📦 حداقل موجودی تنظیم شد: ${clampedValue} کیلوگرم`);
                await saveWithFeedback(newSettings);
              }}
              disabled={isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 disabled:opacity-50"
              min="0"
              step="0.1"
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">مقدار برحسب کیلوگرم</p>
          </div>
        </div>

        {/* تنظیمات پیشرفته اعلان‌ها */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
            <Settings className="h-4 w-4 ml-1" />
            تنظیمات پیشرفته
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                زمان نگهداری اعلان (دقیقه)
              </label>
              <input
                type="number"
                value={getSettings().notifications.notificationTimeout}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 30;
                  handleNumericChange('notificationTimeout', value, 5, 300);
                }}
                onBlur={async (e) => {
                  const value = parseInt(e.target.value) || 30;
                  const clampedValue = Math.max(5, Math.min(300, value));
                  
                  const currentSettings = getSettings();
                  const newNotifications = { ...currentSettings.notifications, notificationTimeout: clampedValue };
                  const newSettings = { ...currentSettings, notifications: newNotifications };
                  
                  console.log(`⏰ زمان نگهداری اعلان تنظیم شد: ${clampedValue} دقیقه`);
                  await saveWithFeedback(newSettings);
                }}
                disabled={isSaving}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                min="5"
                max="300"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                حداکثر تعداد اعلان روزانه
              </label>
              <input
                type="number"
                value={getSettings().notifications.maxDailyNotifications}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 50;
                  handleNumericChange('maxDailyNotifications', value, 1, 1000);
                }}
                onBlur={async (e) => {
                  const value = parseInt(e.target.value) || 50;
                  const clampedValue = Math.max(1, Math.min(1000, value));
                  
                  const currentSettings = getSettings();
                  const newNotifications = { ...currentSettings.notifications, maxDailyNotifications: clampedValue };
                  const newSettings = { ...currentSettings, notifications: newNotifications };
                  
                  console.log(`📊 حداکثر اعلان روزانه تنظیم شد: ${clampedValue}`);
                  await saveWithFeedback(newSettings);
                }}
                disabled={isSaving}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                min="1"
                max="1000"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* General Settings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات عمومی
          <Tooltip 
            title="تنظیمات عمومی"
            text="در این بخش می‌توانید اطلاعات کلی سیستم را مشاهده کنید."
          />
        </h2>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border border-blue-100">
          <h4 className="font-medium text-blue-900 mb-4 flex items-center">
            <Monitor className="h-5 w-5 ml-2" />
            اطلاعات سيستم - نسخه 2025
            <Tooltip 
              title="اطلاعات سیستم"
              text="اطلاعات کلی سیستم و آخرین وضعیت به‌روزرسانی‌ها در این بخش نمایش داده می‌شود."
            />
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-700">نسخه برنامه: 2.0.0 (2025)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-700">تاريخ آخرين بروزرساني: 2025-11-22</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-gray-700">تعداد کاربران فعال: 156</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-700">حجم پايگاه داده: 15.7 گيگابايت</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span className="text-gray-700">مرورگر: {navigator.userAgent.split(' ').slice(-2).join(' ')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span className="text-gray-700">پلتفرم: {navigator.platform}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-gray-700">وضعیت سرور: آنلاین</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-gray-700">نسخه API: v3.2.1</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-gray-700">آدرس IP: {window.location.hostname}</span>
            </div>
          </div>
          
          {/* نوار وضعیت سیستم */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between text-xs text-blue-700">
              <span>وضعیت کلی سیستم</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>عالی</span>
              </div>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-1">
              <div className="bg-gradient-to-r from-green-400 to-green-500 h-1 rounded-full" style={{width: '95%'}}></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};