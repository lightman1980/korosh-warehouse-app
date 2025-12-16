import React, { useState, useEffect } from 'react';
import { Settings, Palette, Bell, Mail, MessageSquare, AlertTriangle, CheckCircle, XCircle, Clock, Calendar, MapPin, Network, HardDrive, Cloud, Cpu, MemoryStick, Wifi, Bluetooth, Usb, Trash2, X, Eye, FileSpreadsheet, HelpCircle, Info, ArrowRight, ArrowLeft, Check, Plus, Filter, DatabaseZap, CloudDownload, FileQuestion, Plug, Settings2, ChevronDown, ChevronUp, User, Search, Calendar as CalendarIcon, Download as DownloadIcon, Filter as FilterIcon, Globe, RefreshCw, TestTube, Workflow, Users, UserCheck, FileText, BarChart, Zap, Activity, Download, Upload, Lock, Key, Monitor, Smartphone, Video, Phone, MessageCircle, Send, Edit3, Copy, Settings as SettingsIcon, Building2, Sparkles, Waves, Sun, TreePine, Gem, Heart } from 'lucide-react';
import { Tooltip } from '../Common/Tooltip';

// استفاده از useTheme موجود در پروژه
import { useTheme } from '../Contracts/ThemeProvider';

// Enhanced settings structure for 2025
const defaultSettings = {
  theme: 'dynamic365',
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
    maxDailyNotifications: 50,
    
    // WhatsApp settings
    whatsappNumbers: [],
    whatsappEnabled: false,
    whatsappTemplates: {
      warehouseReceipt: 'رسید انبار جدید صادر شد. شماره: {receiptNumber} | مقدار: {amount} {unit} | محصول: {productName}',
      deliverySlip: 'حواله انبار جدید صادر شد. شماره: {deliveryNumber} | مقدار: {amount} {unit} | محصول: {productName}',
      inventoryAdjustment: 'سند موجودی جدید ثبت شد. نوع: {type} | مقدار: {amount} {unit} | محصول: {productName}',
      lowInventory: 'هشدار کمبود موجودی! محصول: {productName} | موجودی فعلی: {currentAmount} {unit}',
      systemAlert: 'هشدار سیستم: {message}'
    }
  }
};

// Interface for WhatsApp number
interface WhatsAppNumber {
  id: string;
  name: string;
  phone: string;
  role?: string;
  enabled: boolean;
  notificationTypes: string[];
}

// Interface for notification event
interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  sent: boolean;
}

interface GeneralAppearanceAndNotificationsSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  applySettings: (settings: any) => void;
}

export const GeneralAppearanceAndNotificationsSettings: React.FC<GeneralAppearanceAndNotificationsSettingsProps> = ({
  settings,
  setSettings,
  applySettings
}) => {
  // State for visual feedback
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [themeApplied, setThemeApplied] = useState(false);
  
  // Local theme state to ensure Microsoft Dynamic 365 is default
  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'system' | 'ocean' | 'sunset' | 'forest' | 'purple' | 'rose' | 'windows2025' | 'dynamic365'>('dynamic365');
  
  // استفاده از ThemeProvider موجود در پروژه (fallback to local state if not available)
  let theme, setTheme, isDark;
  try {
    const themeContext = useTheme();
    theme = themeContext.theme || localTheme;
    setTheme = (newTheme: any) => {
      themeContext.setTheme?.(newTheme);
      setLocalTheme(newTheme);
    };
    isDark = themeContext.isDark;
  } catch (error) {
    // Fallback to local state if ThemeProvider not available
    theme = localTheme;
    setTheme = setLocalTheme;
    isDark = localTheme === 'dark';
  }

  // WhatsApp specific states
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [selectedNumberForEdit, setSelectedNumberForEdit] = useState<WhatsAppNumber | null>(null);
  const [showAddNumberModal, setShowAddNumberModal] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<NotificationEvent[]>([]);
  const [testMessage, setTestMessage] = useState('');

  // Enhanced theme types for 2025
  const applyThemeChange = (newTheme: 'light' | 'dark' | 'system' | 'ocean' | 'sunset' | 'forest' | 'purple' | 'rose' | 'windows2025' | 'dynamic365') => {
    setThemeApplied(true);
    
    // Update both global theme and local theme
    setTheme(newTheme);
    
    // Save theme to localStorage with key 'app-theme' for ThemeProvider
    try {
      localStorage.setItem('app-theme', newTheme);
      console.log(`💾 تم "${newTheme}" در localStorage با کلید 'app-theme' ذخیره شد`);
      
      // Force immediate theme application to root and body
      if (typeof document !== 'undefined' && document.documentElement) {
        const root = document.documentElement;
        const body = document.body;
        const allThemes = ['light', 'dark', 'system', 'ocean', 'sunset', 'forest', 'purple', 'rose', 'dynamic365', 'windows2025'];
        
        // Remove all theme classes
        root.classList.remove(...allThemes);
        if (body) {
          body.classList.remove(...allThemes);
        }
        
        // Add new theme class
        root.classList.add(newTheme);
        if (body) {
          body.classList.add(newTheme);
        }
        
        // Set data attributes
        root.setAttribute('data-theme', newTheme);
        if (body) {
          body.setAttribute('data-theme', newTheme);
        }
        
        // Force reflow to ensure styles are applied
        void root.offsetHeight;
        if (body) {
          void body.offsetHeight;
        }
      }
      
      // Dispatch custom event to notify ThemeProvider about theme change
      window.dispatchEvent(new CustomEvent('theme-change', {
        detail: { theme: newTheme }
      }));
      
      // Dispatch theme-applied event for immediate update
      window.dispatchEvent(new CustomEvent('theme-applied', {
        detail: { theme: newTheme }
      }));
      
      // Also trigger storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'app-theme',
        newValue: newTheme,
        storageArea: localStorage
      }));
      
      console.log('🔄 تم در root و body اعمال شد و Event برای به‌روزرسانی تم در تمام صفحات ارسال شد');
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
    
    // Update settings to persist the theme choice
    const currentSettings = getSettings();
    const newSettings = { ...currentSettings, theme: newTheme };
    setSettings(newSettings);
    applySettings(newSettings);
    
    // Also save to appSettings for backup
    try {
      localStorage.setItem('appSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
    
    const themeNames = {
      'light': 'روشن',
      'dark': 'تاریک', 
      'system': 'سیستم',
      'ocean': 'اقیانوس',
      'sunset': 'غروب',
      'forest': 'جنگل',
      'purple': 'بنفش',
      'rose': 'گل سرخ',
      'windows2025': 'ویندوز 2025',
      'dynamic365': 'Microsoft Dynamic 365'
    };
    
    console.log(`🎨 تم ${themeNames[newTheme as keyof typeof themeNames]} اعمال شد | Local: ${localTheme} -> ${newTheme}`);
    
    // Remove the visual feedback after a short delay
    setTimeout(() => setThemeApplied(false), 1500);
  };

  // Simulate saving settings with visual feedback
  const saveWithFeedback = async (newSettings: any) => {
    setIsSaving(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Save to localStorage as backup
    try {
      localStorage.setItem('appSettings', JSON.stringify(newSettings));
      
      // Also save theme separately to 'app-theme' for ThemeProvider
      if (newSettings.theme) {
        localStorage.setItem('app-theme', newSettings.theme);
        console.log(`💾 تم "${newSettings.theme}" در localStorage با کلید 'app-theme' ذخیره شد (از saveWithFeedback)`);
        
        // Dispatch custom event to notify ThemeProvider about theme change
        window.dispatchEvent(new CustomEvent('theme-change', {
          detail: { theme: newSettings.theme }
        }));
        
        // Also trigger storage event for cross-tab sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'app-theme',
          newValue: newSettings.theme,
          storageArea: localStorage
        }));
        
        console.log('🔄 Event برای به‌روزرسانی تم در تمام صفحات ارسال شد (از saveWithFeedback)');
      }
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
    
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

  // Set default theme to Microsoft Dynamic 365 on component mount
  useEffect(() => {
    const currentSettings = getSettings();
    console.log('🔍 بررسی تم فعلی:', currentSettings.theme, '| Local theme:', localTheme);
    
    if (!currentSettings.theme || currentSettings.theme === 'light' || currentSettings.theme === 'system') {
      console.log('🎨 تنظیم تم پیش‌فرض Microsoft Dynamic 365...');
      applyThemeChange('dynamic365');
    }
  }, []);

  // Force theme state update when component mounts
  useEffect(() => {
    const currentSettings = getSettings();
    if (theme !== 'dynamic365' && (!currentSettings.theme || currentSettings.theme === 'light' || currentSettings.theme === 'system')) {
      console.log('🔄 هماهنگ‌سازی تم با Microsoft Dynamic 365...');
      setTheme('dynamic365');
    }
  }, [theme, localTheme]);

  // WhatsApp helper functions
  const saveWhatsAppNumbers = async (numbers: WhatsAppNumber[]) => {
    const currentSettings = getSettings();
    const newSettings = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        whatsappNumbers: numbers
      }
    };
    
    setSettings(newSettings);
    applySettings(newSettings);
    await saveWithFeedback(newSettings);
  };

  const addWhatsAppNumber = async (number: Omit<WhatsAppNumber, 'id'>) => {
    const newNumber: WhatsAppNumber = {
      ...number,
      id: `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedNumbers = [...whatsappNumbers, newNumber];
    setWhatsappNumbers(updatedNumbers);
    await saveWhatsAppNumbers(updatedNumbers);
  };

  const updateWhatsAppNumber = async (id: string, updates: Partial<WhatsAppNumber>) => {
    const updatedNumbers = whatsappNumbers.map(num => 
      num.id === id ? { ...num, ...updates } : num
    );
    setWhatsappNumbers(updatedNumbers);
    await saveWhatsAppNumbers(updatedNumbers);
  };

  const deleteWhatsAppNumber = async (id: string) => {
    const updatedNumbers = whatsappNumbers.filter(num => num.id !== id);
    setWhatsappNumbers(updatedNumbers);
    await saveWhatsAppNumbers(updatedNumbers);
  };

  const sendTestMessage = async (number: WhatsAppNumber, message: string) => {
    try {
      console.log(`📱 ارسال پیام تست به ${number.phone}:`, message);
      
      // چک کردن فعال بودن واتس‌اپ در تنظیمات
      const settings = getSettings();
      if (!settings.notifications.whatsappEnabled) {
        throw new Error('واتس‌اپ در تنظیمات غیرفعال است');
      }
      
      // ارسال پیام واقعی از طریق API
      const response = await sendWhatsAppMessage(number.phone, message);
      
      const testEvent: NotificationEvent = {
        id: `test_${Date.now()}`,
        type: 'test',
        title: 'پیام تست واتس‌اپ',
        message: message,
        data: { to: number.phone, responseId: response.messageId },
        timestamp: new Date(),
        sent: true
      };
      
      const updatedHistory = [testEvent, ...notificationHistory];
      setNotificationHistory(updatedHistory.slice(0, 50));
      
      console.log('✅ پیام با موفقیت ارسال شد:', response);
      alert('✅ پیام تست با موفقیت ارسال شد!');
      
    } catch (error) {
      console.error('❌ خطا در ارسال پیام:', error);
      
      const errorEvent: NotificationEvent = {
        id: `error_${Date.now()}`,
        type: 'error',
        title: 'خطا در ارسال پیام تست',
        message: error instanceof Error ? error.message : 'خطای ناشناخته',
        data: { to: number.phone, error: error },
        timestamp: new Date(),
        sent: false
      };
      
      const updatedHistory = [errorEvent, ...notificationHistory];
      setNotificationHistory(updatedHistory.slice(0, 50));
      
      alert(`❌ خطا در ارسال پیام: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
    }
  };

  // Real WhatsApp API Integration Function
  const sendWhatsAppMessage = async (phone: string, message: string) => {
    // این تابع را با API واقعی خودتان جایگزین کنید
    const settings = getSettings();
    const whatsappSettings = settings.notifications.whatsappSettings || {};
    
    // تنظیمات API
    const apiUrl = whatsappSettings.apiUrl || 'https://api.whatsapp.com/send'; // URL API شما
    const apiToken = whatsappSettings.token; // توکن API شما
    
    if (!apiToken) {
      throw new Error('توکن API واتس‌اپ تنظیم نشده است. لطفاً در بخش تنظیمات واتس‌اپ توکن را وارد کنید.');
    }
    
    // آماده‌سازی پیام
    const messageData = {
      phone: phone.replace(/\D/g, ''), // حذف همه کاراکترهای غیر عددی
      message: message,
      type: 'text',
      timestamp: new Date().toISOString()
    };
    
    console.log('📡 در حال ارسال پیام از طریق API...', messageData);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
          'User-Agent': 'Warehouse-Management/1.0'
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`خطای API: ${response.status} - ${errorData}`);
      }
      
      const result = await response.json();
      
      console.log('✅ پاسخ API دریافت شد:', result);
      
      return {
        success: true,
        messageId: result.messageId || `msg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        response: result
      };
      
    } catch (error) {
      console.error('❌ خطای اتصال به API:', error);
      
      // در صورت خطای شبکه، fallback به تلگرام یا روش جایگزین
      if (navigator.onLine) {
        // تلگرام Bot API (اختیاری)
        const telegramBotToken = settings.notifications.telegramToken;
        const telegramChatId = settings.notifications.telegramChatId;
        
        if (telegramBotToken && telegramChatId) {
          console.log('🔄 استفاده از تلگرام به عنوان روش جایگزین...');
          return await sendTelegramMessage(telegramChatId, `📱 واتس‌اپ - به ${phone}: ${message}`);
        }
      }
      
      throw error;
    }
  };

  // Fallback Telegram Integration
  const sendTelegramMessage = async (chatId: string, message: string) => {
    const settings = getSettings();
    const telegramToken = settings.notifications.telegramToken;
    
    if (!telegramToken) {
      throw new Error('تلگرام Bot Token تنظیم نشده است');
    }
    
    const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      throw new Error(`خطای تلگرام: ${response.status}`);
    }
    
    return await response.json();
  };

  // Load WhatsApp numbers on component mount
  useEffect(() => {
    const savedNumbers = getSettings().notifications.whatsappNumbers || [];
    setWhatsappNumbers(savedNumbers);
  }, []);

  // Load notification history
  useEffect(() => {
    const savedHistory = localStorage.getItem('notificationHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setNotificationHistory(parsed);
      } catch (error) {
        console.error('خطا در بارگذاری تاریخچه اعلان‌ها:', error);
      }
    }
  }, []);

  // Save notification history
  useEffect(() => {
    localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
  }, [notificationHistory]);

  // این useEffect حذف شد - تم از localStorage خوانده می‌شود و نیازی به force کردن نیست

  // Debug theme status
  console.log('🎨 وضعیت تم فعلی - Theme:', theme, '| Local:', localTheme, '| Settings:', getSettings().theme);

  return (
    <div className="space-y-6">
      {/* Debug info - remove in production */}
      <div className={`p-2 rounded-lg text-xs ${
        isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="text-blue-800">
          Debug: Theme={theme} | LocalTheme={localTheme} | SettingsTheme={getSettings().theme}
        </div>
      </div>
      
      {/* Appearance Settings */}
      <div className={`p-6 rounded-lg border transition-colors ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center ${
          isDark ? 'text-gray-100' : 'text-gray-900'
        }`}>
          <Palette className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات ظاهر
          <Tooltip 
            title="تنظیمات ظاهر"
            text="در این بخش می‌توانید ظاهر و زبان برنامه را پیکربندی کنید. این تنظیمات برای تمام صفحات برنامه اعمال می‌شود."
          />
        </h2>
        
        <div className="space-y-6">
          {/* قالب رنگی - عملکرد واقعی */}
          <div className="max-w-md">
            <label className={`block text-sm font-semibold mb-3 flex items-center ${
              isDark ? 'text-gray-200' : 'text-gray-800'
            }`}>
              <Palette className="h-4 w-4 ml-2 text-blue-600" />
              قالب رنگي
              <span className="mr-2 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold rounded-full shadow-lg">پیش‌فرض: Microsoft Dynamic 365</span>
              <Tooltip 
                title="قالب رنگی"
                text="قالب رنگی برنامه را انتخاب کنید. این تنظیم بلافاصله برای تمام صفحات اعمال می‌شود. Microsoft Dynamic 365 به عنوان تم پیش‌فرض تنظیم شده است."
              />
            </label>
            
            {/* Radio buttons برای انتخاب بهتر */}
            <div className="space-y-3">
              <div className={`flex items-center p-4 border rounded-lg transition-colors ${
                isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
              } ${theme === 'light' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
                <input
                  type="radio"
                  id="light-theme"
                  name="theme"
                  value="light"
                  checked={theme === 'light'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'light' | 'dark' | 'system';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="light-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-white border border-gray-300 rounded-lg ml-3 flex items-center justify-center shadow-sm">
                      <div className="w-6 h-6 bg-gradient-to-br from-white to-gray-100 rounded"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>حالت روشن</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>پس‌زمینه سفید و متن تیره</div>
                    </div>
                  </div>
                </label>
              </div>
              
              <div className={`flex items-center p-4 border rounded-lg transition-colors ${
                isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
              } ${theme === 'dark' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
                <input
                  type="radio"
                  id="dark-theme"
                  name="theme"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'light' | 'dark' | 'system';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="dark-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-800 border border-gray-600 rounded-lg ml-3 flex items-center justify-center shadow-sm">
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-700 to-gray-900 rounded"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>حالت تاریک</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>پس‌زمینه تیره و متن روشن</div>
                    </div>
                  </div>
                </label>
              </div>
              
              <div className={`flex items-center p-4 border rounded-lg transition-colors ${
                isDark ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
              } ${theme === 'system' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
                <input
                  type="radio"
                  id="system-theme"
                  name="theme"
                  value="system"
                  checked={theme === 'system'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'light' | 'dark' | 'system';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="system-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-800 border border-gray-300 rounded-lg ml-3 flex items-center justify-center shadow-sm">
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-700 rounded"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>پیش‌فرض سیستم</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>تبعیت از تنظیمات سیستم عامل</div>
                    </div>
                  </div>
                </label>
              </div>
              
              {/* Ocean Theme */}
              <div className={`flex items-center p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'border-gray-600 hover:bg-gradient-to-r hover:from-blue-900/40 hover:to-sky-900/40' : 'border-gray-200 hover:bg-gradient-to-r hover:from-blue-200/80 hover:to-sky-300/80'
              } ${theme === 'ocean' ? 'ring-2 ring-blue-500 ring-opacity-80 shadow-lg' : ''}`}>
                <input
                  type="radio"
                  id="ocean-theme"
                  name="theme"
                  value="ocean"
                  checked={theme === 'ocean'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'ocean';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="ocean-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600/95 to-sky-600/95 border border-blue-400/60 rounded-xl ml-3 flex items-center justify-center shadow-lg backdrop-blur-sm relative overflow-hidden group shadow-blue-500/25">
                      <div className="absolute inset-0 bg-gradient-to-br from-sky-400/20 via-transparent to-blue-800/30 backdrop-blur-sm"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-sky-300 rounded-full animate-pulse shadow-lg shadow-sky-300/50"></div>
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400/80 to-sky-500/80 rounded backdrop-blur-sm"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>اقیانوس</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>آبی عمیق و آرامش‌بخش</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Sunset Theme */}
              <div className={`flex items-center p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'border-gray-600 hover:bg-gradient-to-r hover:from-orange-900/40 hover:to-red-900/40' : 'border-gray-200 hover:bg-gradient-to-r hover:from-orange-200/80 hover:to-red-300/80'
              } ${theme === 'sunset' ? 'ring-2 ring-orange-500 ring-opacity-80 shadow-lg' : ''}`}>
                <input
                  type="radio"
                  id="sunset-theme"
                  name="theme"
                  value="sunset"
                  checked={theme === 'sunset'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'sunset';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="sunset-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-600/95 to-red-600/95 border border-orange-400/60 rounded-xl ml-3 flex items-center justify-center shadow-lg backdrop-blur-sm relative overflow-hidden group shadow-orange-500/25">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-red-800/30 backdrop-blur-sm"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full animate-pulse shadow-lg shadow-yellow-300/50"></div>
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-400/80 to-red-500/80 rounded backdrop-blur-sm"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>غروب</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>نارنجی گرم و دلپذیر</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Forest Theme */}
              <div className={`flex items-center p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'border-gray-600 hover:bg-gradient-to-r hover:from-green-900/40 hover:to-emerald-900/40' : 'border-gray-200 hover:bg-gradient-to-r hover:from-green-200/80 hover:to-emerald-300/80'
              } ${theme === 'forest' ? 'ring-2 ring-green-500 ring-opacity-80 shadow-lg' : ''}`}>
                <input
                  type="radio"
                  id="forest-theme"
                  name="theme"
                  value="forest"
                  checked={theme === 'forest'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'forest';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="forest-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-600/95 to-emerald-600/95 border border-green-400/60 rounded-xl ml-3 flex items-center justify-center shadow-lg backdrop-blur-sm relative overflow-hidden group shadow-green-500/25">
                      <div className="absolute inset-0 bg-gradient-to-br from-lime-400/20 via-transparent to-green-800/30 backdrop-blur-sm"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-lime-300 rounded-full animate-pulse shadow-lg shadow-lime-300/50"></div>
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400/80 to-emerald-500/80 rounded backdrop-blur-sm"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>جنگل</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>سبز طبیعی و تازه</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Purple Theme */}
              <div className={`flex items-center p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'border-gray-600 hover:bg-gradient-to-r hover:from-purple-900/40 hover:to-violet-900/40' : 'border-gray-200 hover:bg-gradient-to-r hover:from-purple-200/80 hover:to-violet-300/80'
              } ${theme === 'purple' ? 'ring-2 ring-purple-500 ring-opacity-80 shadow-lg' : ''}`}>
                <input
                  type="radio"
                  id="purple-theme"
                  name="theme"
                  value="purple"
                  checked={theme === 'purple'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'purple';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="purple-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600/95 to-violet-600/95 border border-purple-400/60 rounded-xl ml-3 flex items-center justify-center shadow-lg backdrop-blur-sm relative overflow-hidden group shadow-purple-500/25">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 via-transparent to-purple-800/30 backdrop-blur-sm"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-pink-300 rounded-full animate-pulse shadow-lg shadow-pink-300/50"></div>
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-400/80 to-violet-500/80 rounded backdrop-blur-sm"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>بنفش</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>بنفش سلطنتی و زیبا</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Rose Theme */}
              <div className={`flex items-center p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'border-gray-600 hover:bg-gradient-to-r hover:from-rose-900/40 hover:to-pink-900/40' : 'border-gray-200 hover:bg-gradient-to-r hover:from-rose-200/80 hover:to-pink-300/80'
              } ${theme === 'rose' ? 'ring-2 ring-rose-500 ring-opacity-80 shadow-lg' : ''}`}>
                <input
                  type="radio"
                  id="rose-theme"
                  name="theme"
                  value="rose"
                  checked={theme === 'rose'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'rose';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="rose-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-600/95 to-pink-600/95 border border-rose-400/60 rounded-xl ml-3 flex items-center justify-center shadow-lg backdrop-blur-sm relative overflow-hidden group shadow-rose-500/25">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 via-transparent to-rose-800/30 backdrop-blur-sm"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-pink-300 rounded-full animate-pulse shadow-lg shadow-pink-300/50"></div>
                      <div className="w-6 h-6 bg-gradient-to-br from-rose-400/80 to-pink-500/80 rounded backdrop-blur-sm"></div>
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>گل سرخ</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>صورتی نرم و دوست‌داشتنی</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Windows 2025 Theme */}
              <div className={`flex items-center p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'border-gray-600 hover:bg-gradient-to-r hover:from-sky-900/40 hover:to-cyan-900/40' : 'border-gray-200 hover:bg-gradient-to-r hover:from-sky-200/80 hover:to-cyan-300/80'
              } ${theme === 'windows2025' ? 'ring-2 ring-sky-500 ring-opacity-90 shadow-xl' : ''}`}>
                <input
                  type="radio"
                  id="windows2025-theme"
                  name="theme"
                  value="windows2025"
                  checked={theme === 'windows2025'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'windows2025';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="windows2025-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-500/95 via-cyan-500/90 to-blue-600/95 border border-cyan-400/60 rounded-xl ml-3 flex items-center justify-center shadow-xl backdrop-blur-sm relative overflow-hidden group shadow-sky-500/25">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-300 rounded-full animate-pulse shadow-lg shadow-cyan-300/50"></div>
                      <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-sky-300 rounded-full animate-pulse shadow-lg shadow-sky-300/50" style={{animationDelay: '0.7s'}}></div>
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent animate-pulse shadow-lg shadow-cyan-400/30"></div>
                      <Sparkles className="relative z-10 w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>ویندوز 2025</div>
                        <div className="px-2 py-0.5 bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-xs font-bold rounded-full shadow-lg">2025</div>
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>آکریلیک مدرن با طیف‌های نئونی</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Dynamic 365 Theme - DEFAULT THEME */}
              <div className={`flex items-center p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                isDark ? 'border-gray-600 hover:bg-gradient-to-r hover:from-blue-900/40 hover:to-indigo-900/40' : 'border-gray-200 hover:bg-gradient-to-r hover:from-blue-200/80 hover:to-cyan-300/80'
              } ${theme === 'dynamic365' ? 'ring-2 ring-blue-500 ring-opacity-90 shadow-xl bg-gradient-to-r from-blue-50 to-cyan-50' : ''}`}>
                <input
                  type="radio"
                  id="dynamic365-theme"
                  name="theme"
                  value="dynamic365"
                  checked={theme === 'dynamic365' || !theme || theme === 'system' || theme === 'light'}
                  onChange={async (e) => {
                    const newTheme = e.target.value as 'dynamic365';
                    applyThemeChange(newTheme);
                  }}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                />
                <label htmlFor="dynamic365-theme" className="mr-3 flex-1 cursor-pointer">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600/95 via-cyan-500/90 to-indigo-700/95 border border-cyan-400/60 rounded-xl ml-3 flex items-center justify-center shadow-xl backdrop-blur-sm relative overflow-hidden group shadow-blue-500/25">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 via-transparent to-blue-900/40 backdrop-blur-sm"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-300 rounded-full animate-pulse shadow-lg shadow-cyan-300/50"></div>
                      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse shadow-lg shadow-blue-300/50" style={{animationDelay: '0.5s'}}></div>
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent animate-pulse shadow-lg shadow-cyan-400/30"></div>
                      <Building2 className="relative z-10 w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Microsoft Dynamic 365</div>
                        <div className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold rounded-full shadow-lg">PRO</div>
                        <div className="px-2 py-0.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">پیش‌فرض</div>
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>طراحی شیشه‌ای حرفه‌ای با افکت‌های Microsoft</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* نمایش وضعیت فعلی */}
            <div className={`mt-4 p-4 rounded-lg border ${
              isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-900'
            }`}>
              <div className={`flex items-center text-sm ${
                isDark ? 'text-blue-300' : 'text-blue-800'
              }`}>
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
                   (() => {
                     const themeNames = {
                       'light': 'کلاسیک روشن',
                       'dark': 'کلاسیک تاریک',
                       'system': 'سیستم',
                       'ocean': 'اقیانوس',
                       'sunset': 'غروب',
                       'forest': 'جنگل',
                       'purple': 'بنفش',
                       'rose': 'گل سرخ',
                       'windows2025': 'ویندوز 2025',
                       'dynamic365': 'Microsoft Dynamic 365'
                     };
                     return themeNames[theme as keyof typeof themeNames] || 'نامشخص';
                   })()}
                </span>
                {lastSaved && !isSaving && (
                  <span className={`text-xs mr-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    آخرین ذخیره: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Configuration - New Professional Section */}
      <div className={`p-6 rounded-lg border transition-colors ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-semibold flex items-center ${
            isDark ? 'text-gray-100' : 'text-gray-900'
          }`}>
            <MessageSquare className="h-5 w-5 mr-2 text-green-500" />
            اعلان‌هاي واتس‌اپ - نسخه 2025
            <Tooltip 
              title="اعلان‌های واتس‌اپ حرفه‌ای"
              text="تنظیم حرفه‌ای اعلان‌های واتس‌اپ برای ارسال پیام خودکار بر اساس عملکردهای سیستم شامل رسید انبار، حواله انبار، تنظیمات موجودی و غیره."
            />
          </h2>
          
          <div className="flex items-center gap-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={getSettings().notifications.whatsappEnabled}
                onChange={(e) => handleCheckboxChange('whatsappEnabled', e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className={`mr-2 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                فعال‌سازی واتس‌اپ
              </span>
            </label>
            
            <button
              onClick={() => setShowWhatsAppConfig(!showWhatsAppConfig)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              {showWhatsAppConfig ? 'بستن تنظیمات' : 'پیکربندی'}
            </button>
          </div>
        </div>

        {/* WhatsApp Configuration Panel */}
        {showWhatsAppConfig && (
          <div className={`p-6 rounded-lg border ${
            isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            
            {/* Phone Numbers Management */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-md font-semibold flex items-center ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  <Phone className="w-4 h-4 ml-2 text-green-600" />
                  مدیریت شماره تماس‌ها
                </h3>
                <button
                  onClick={() => setShowAddNumberModal(true)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  افزودن شماره
                </button>
              </div>

              {/* Phone Numbers List */}
              {whatsappNumbers.length > 0 ? (
                <div className="space-y-3">
                  {whatsappNumbers.map((number) => (
                    <div key={number.id} className={`p-4 rounded-lg border ${
                      isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              number.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                {number.name} {number.role && <span className="text-sm text-gray-500">({number.role})</span>}
                              </div>
                              <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {number.phone}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                              انواع اعلان:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {number.notificationTypes.map((type) => (
                                <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {type === 'warehouseReceipt' ? 'رسید انبار' :
                                   type === 'deliverySlip' ? 'حواله انبار' :
                                   type === 'inventoryAdjustment' ? 'تنظیم موجودی' :
                                   type === 'lowInventory' ? 'کمبود موجودی' :
                                   type === 'systemAlert' ? 'هشدار سیستم' : type}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={number.enabled}
                              onChange={(e) => updateWhatsAppNumber(number.id, { enabled: e.target.checked })}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <span className={`mr-1 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                              فعال
                            </span>
                          </label>
                          
                          <button
                            onClick={() => setSelectedNumberForEdit(number)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => deleteWhatsAppNumber(number.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>هنوز شماره تماسی تعریف نشده است</p>
                  <p className="text-sm">برای شروع روی دکمه "افزودن شماره" کلیک کنید</p>
                </div>
              )}
            </div>

            {/* WhatsApp API Settings */}
            <div className="mb-6">
              <h3 className={`text-md font-semibold mb-4 flex items-center ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>
                <Settings className="w-4 h-4 ml-2 text-blue-600" />
                تنظیمات API
              </h3>
              
              <div className="space-y-4">
                {/* API URL */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    آدرس API
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.whatsapp.com/send"
                    value={getSettings().notifications.whatsappSettings?.apiUrl || ''}
                    onChange={(e) => {
                      const settings = getSettings();
                      settings.notifications.whatsappSettings = {
                        ...settings.notifications.whatsappSettings,
                        apiUrl: e.target.value
                      };
                      setSettings(settings);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* API Token */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    توکن API
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="توکن API خود را وارد کنید"
                      value={getSettings().notifications.whatsappSettings?.token || ''}
                      onChange={(e) => {
                        const settings = getSettings();
                        settings.notifications.whatsappSettings = {
                          ...settings.notifications.whatsappSettings,
                          token: e.target.value
                        };
                        setSettings(settings);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${
                        isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Test API Connection Button */}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const testResponse = await sendWhatsAppMessage('+1234567890', '🔧 پیام تست اتصال API');
                        alert('✅ اتصال API موفق بود!');
                      } catch (error) {
                        alert(`❌ خطا در اتصال API: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                    تست اتصال
                  </button>
                  
                  <div className="text-xs text-gray-500 flex items-center">
                    <Info className="w-4 h-4 ml-1" />
                    برای فعال‌سازی واتس‌اپ، ابتدا توکن API را تنظیم کنید
                  </div>
                </div>
              </div>
            </div>

            {/* Message Templates */}
            <div className="mb-6">
              <h3 className={`text-md font-semibold mb-4 flex items-center ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>
                <MessageCircle className="w-4 h-4 ml-2 text-blue-600" />
                قالب‌های پیام
              </h3>
              
              <div className="space-y-4">
                {Object.entries(getSettings().notifications.whatsappTemplates).map(([type, template]) => (
                  <div key={type} className={`p-4 rounded-lg border ${
                    isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {type === 'warehouseReceipt' ? 'رسید انبار جدید' :
                         type === 'deliverySlip' ? 'حواله انبار جدید' :
                         type === 'inventoryAdjustment' ? 'تنظیم موجودی' :
                         type === 'lowInventory' ? 'هشدار کمبود موجودی' :
                         type === 'systemAlert' ? 'هشدار سیستم' : type}
                      </div>
                      <button
                        onClick={() => {
                          // کپی قالب به کلیپ‌بورد
                          navigator.clipboard.writeText(template as string);
                          alert('قالب کپی شد!');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className={`text-sm p-3 rounded bg-gray-50 ${
                      isDark ? 'bg-gray-700 text-gray-200' : 'text-gray-700'
                    }`}>
                      {template as string}
                    </div>
                    <div className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      متغیرهای موجود: {'{receiptNumber}'}, {'{deliveryNumber}'}, {'{amount}'}, {'{unit}'}, {'{productName}'}, {'{type}'}, {'{message}'}, {'{currentAmount}'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Message Section */}
            <div>
              <h3 className={`text-md font-semibold mb-4 flex items-center ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>
                <Send className="w-4 h-4 ml-2 text-purple-600" />
                تست ارسال پیام
              </h3>
              
              <div className={`p-4 rounded-lg border ${
                isDark ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'
              }`}>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      انتخاب شماره تماس:
                    </label>
                    <select
                      id="testPhoneSelect"
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    >
                      <option value="">انتخاب شماره...</option>
                      {whatsappNumbers.filter(n => n.enabled).map((number) => (
                        <option key={number.id} value={number.id}>
                          {number.name} - {number.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      متن پیام تست:
                    </label>
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="متن پیام تست را وارد کنید..."
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    />
                  </div>
                  
                  <button
                    onClick={() => {
                      const select = document.getElementById('testPhoneSelect') as HTMLSelectElement;
                      const selectedId = select.value;
                      const number = whatsappNumbers.find(n => n.id === selectedId);
                      
                      if (!number || !testMessage.trim()) {
                        alert('لطفاً شماره تماس و متن پیام را انتخاب کنید');
                        return;
                      }
                      
                      sendTestMessage(number, testMessage);
                      setTestMessage('');
                    }}
                    disabled={!testMessage.trim() || !whatsappNumbers.some(n => n.enabled)}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    ارسال پیام تست
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className={`p-6 rounded-lg border transition-colors ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center ${
          isDark ? 'text-gray-100' : 'text-gray-900'
        }`}>
          <Bell className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات اعلان‌ها
          <Tooltip 
            title="تنظیمات اعلان‌ها"
            text="در این بخش می‌توانید انواع اعلان‌های سیستم را پیکربندی کنید."
          />
        </h2>
        
        {/* نمایش وضعیت ذخیره */}
        {isSaving && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center text-sm text-yellow-800">
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              <span>در حال ذخیره تنظیمات اعلان‌ها...</span>
            </div>
          </div>
        )}
        
        {lastSaved && !isSaving && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
          }`}>
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
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
          }`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center ${
              isDark ? 'text-blue-300' : 'text-blue-900'
            }`}>
              <Settings className="h-4 w-4 ml-1" />
              اعلان‌های سیستمی
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="lowInventoryAlert" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    هشدار کم شدن موجودي
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>اعلان هنگام رسیدن موجودی به حد آستانه</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="newUserNotification" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلام تعريف کاربر جديد
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>اعلان هنگام ثبت‌نام کاربر جدید</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="systemErrorAlerts" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلام خطاهاي سيستمي
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>اعلان هنگام بروز خطاهای سیستمی</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="securityAlerts" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    هشدارهای امنیتی
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>اعلان ورود مشکوک یا تغییرات امنیتی</p>
                </div>
              </div>
            </div>
          </div>

          {/* دسته بندی 2: روش‌های ارسال */}
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-green-900/20 border-green-700' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'
          }`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center ${
              isDark ? 'text-green-300' : 'text-green-900'
            }`}>
              <MessageSquare className="h-4 w-4 ml-1" />
              روش‌های ارسال اعلان
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="emailNotifications" className={`text-sm font-medium cursor-pointer flex items-center ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي ايميل
                    <Mail className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ارسال اعلان از طریق ایمیل</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="pushNotifications" className={`text-sm font-medium cursor-pointer flex items-center ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي push
                    <Bell className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>اعلان‌های مرورگر و موبایل</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="smsNotifications" className={`text-sm font-medium cursor-pointer flex items-center ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي پيامکي
                    <Smartphone className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ارسال پیامک فوری</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="desktopNotifications" className={`text-sm font-medium cursor-pointer flex items-center ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي دسکتاپ
                    <Monitor className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>نمایش در نوار اعلان سیستم</p>
                </div>
              </div>
            </div>
          </div>

          {/* دسته بندی 3: شبکه‌های اجتماعی */}
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-purple-900/20 border-purple-700' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100'
          }`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center ${
              isDark ? 'text-purple-300' : 'text-purple-900'
            }`}>
              <Globe className="h-4 w-4 ml-1" />
              شبکه‌های اجتماعی و پیام‌رسان‌ها
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="whatsappNotifications" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي واتس‌اپ
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ارسال از طریق واتس‌اپ بیزینس</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="telegramNotifications" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي تليگرام
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ارسال از طریق ربات تلگرام</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="slackNotifications" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي Slack
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ارسال به کانال‌های تیم</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="discordNotifications" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌هاي Discord
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ارسال به سرور دیسکورد</p>
                </div>
              </div>
            </div>
          </div>

          {/* دسته بندی 4: تنظیمات پیشرفته */}
          <div className={`p-4 rounded-lg border ${
            isDark ? 'bg-gray-900/20 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
          }`}>
            <h4 className={`text-sm font-semibold mb-3 flex items-center ${
              isDark ? 'text-gray-300' : 'text-gray-800'
            }`}>
              <Settings2 className="h-4 w-4 ml-1" />
              تنظیمات پیشرفته
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="notificationSound" className={`text-sm font-medium cursor-pointer flex items-center ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    صدا براي اعلان‌ها
                    <Activity className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>پخش صدا هنگام دریافت اعلان</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="vibrationNotifications" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    لرزش برای موبایل
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لرزش دستگاه موبایل</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="urgentNotifications" className={`text-sm font-medium cursor-pointer ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    اعلان‌های فوری
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>اعلان فوری برای موارد حساس</p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg shadow-sm border ${
                isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
              }`}>
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
                  <label htmlFor="weeklyReports" className={`text-sm font-medium cursor-pointer flex items-center ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    گزارش هفتگی
                    <FileText className="h-3 w-3 mr-1 text-gray-400" />
                  </label>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>دریافت گزارش‌های هفتگی</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* تنظیمات عددی اعلان‌ها */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 ${
                isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
              }`}
              min="1"
              max="100"
              placeholder="1-100"
            />
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>مقدار بین 1 تا 100 درصد</p>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 flex items-center ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}>
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 ${
                isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
              }`}
              min="0"
              step="0.1"
              placeholder="0"
            />
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>مقدار برحسب کیلوگرم</p>
          </div>
        </div>

        {/* تنظیمات پیشرفته اعلان‌ها */}
        <div className={`mt-6 p-4 rounded-lg ${
          isDark ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <h4 className={`text-sm font-semibold mb-3 flex items-center ${
            isDark ? 'text-gray-200' : 'text-gray-800'
          }`}>
            <Settings className="h-4 w-4 ml-1" />
            تنظیمات پیشرفته
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
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
                className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
                  isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
                min="5"
                max="300"
              />
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
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
                className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
                  isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
                min="1"
                max="1000"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* General Settings */}
      <div className={`p-6 rounded-lg border transition-colors ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center ${
          isDark ? 'text-gray-100' : 'text-gray-900'
        }`}>
          <Settings className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات عمومی
          <Tooltip 
            title="تنظیمات عمومی"
            text="در این بخش می‌توانید اطلاعات کلی سیستم را مشاهده کنید."
          />
        </h2>
        
        <div className={`p-6 rounded-lg mb-6 border ${
          isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
        }`}>
          <h4 className={`font-medium mb-4 flex items-center ${
            isDark ? 'text-blue-300' : 'text-blue-900'
          }`}>
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
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>نسخه برنامه: 2.0.0 (2025)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>تاريخ آخرين بروزرساني: 2025-11-30</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>تعداد کاربران فعال: 156</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>حجم پايگاه داده: 15.7 گيگابايت</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>مرورگر: {navigator.userAgent.split(' ').slice(-2).join(' ')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>پلتفرم: {navigator.platform}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>وضعیت سرور: آنلاین</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>نسخه API: v3.2.1</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>آدرس IP: {window.location.hostname}</span>
            </div>
          </div>
          
          {/* نوار وضعیت سیستم */}
          <div className={`mt-4 pt-4 border-t ${
            isDark ? 'border-blue-700' : 'border-blue-200'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className={isDark ? 'text-blue-300' : 'text-blue-700'}>وضعیت کلی سیستم</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className={isDark ? 'text-blue-300' : 'text-blue-700'}>عالی</span>
              </div>
            </div>
            <div className={`mt-2 rounded-full h-1 ${
              isDark ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div className="bg-gradient-to-r from-green-400 to-green-500 h-1 rounded-full" style={{width: '95%'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Add WhatsApp Number Modal */}
      {showAddNumberModal && (
        <WhatsAppNumberModal
          onClose={() => setShowAddNumberModal(false)}
          onSave={addWhatsAppNumber}
          whatsappNumbers={whatsappNumbers}
          isDark={isDark}
        />
      )}

      {/* Edit WhatsApp Number Modal */}
      {selectedNumberForEdit && (
        <WhatsAppNumberModal
          onClose={() => setSelectedNumberForEdit(null)}
          onSave={(number) => updateWhatsAppNumber(selectedNumberForEdit.id, number)}
          initialData={selectedNumberForEdit}
          isEdit={true}
          whatsappNumbers={whatsappNumbers}
          isDark={isDark}
        />
      )}
    </div>
  );
};

// WhatsApp Number Modal Component
interface WhatsAppNumberModalProps {
  onClose: () => void;
  onSave: (data: Omit<WhatsAppNumber, 'id'> | Partial<WhatsAppNumber>) => void;
  initialData?: WhatsAppNumber;
  isEdit?: boolean;
  whatsappNumbers: WhatsAppNumber[];
  isDark: boolean;
}

const WhatsAppNumberModal: React.FC<WhatsAppNumberModalProps> = ({
  onClose,
  onSave,
  initialData,
  isEdit = false,
  whatsappNumbers,
  isDark
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    role: initialData?.role || '',
    enabled: initialData?.enabled ?? true,
    notificationTypes: initialData?.notificationTypes || []
  });

  const notificationTypeOptions = [
    { id: 'warehouseReceipt', label: 'رسید انبار جدید' },
    { id: 'deliverySlip', label: 'حواله انبار جدید' },
    { id: 'inventoryAdjustment', label: 'تنظیم موجودی' },
    { id: 'lowInventory', label: 'هشدار کمبود موجودی' },
    { id: 'systemAlert', label: 'هشدار سیستم' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('لطفاً نام و شماره تماس را وارد کنید');
      return;
    }

    // بررسی تکراری نبودن شماره
    const isDuplicate = whatsappNumbers.some(num => 
      num.phone === formData.phone && (!isEdit || num.id !== initialData?.id)
    );
    
    if (isDuplicate) {
      alert('این شماره تماس قبلاً تعریف شده است');
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`max-w-md w-full mx-4 rounded-lg border shadow-2xl ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {isEdit ? 'ویرایش شماره تماس' : 'افزودن شماره تماس جدید'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}>
                نام *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="نام شخص یا بخش"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}>
                شماره تماس *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="مثال: 09123456789"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}>
                نقش (اختیاری)
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="مثال: مدیر انبار، اپراتور، و..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}>
                انواع اعلان‌ها
              </label>
              <div className="space-y-2">
                {notificationTypeOptions.map(option => (
                  <label key={option.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notificationTypes.includes(option.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            notificationTypes: [...prev.notificationTypes, option.id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            notificationTypes: prev.notificationTypes.filter(type => type !== option.id)
                          }));
                        }
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className={`mr-2 text-sm ${
                      isDark ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className={`mr-2 text-sm ${
                isDark ? 'text-gray-200' : 'text-gray-700'
              }`}>
                فعال
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {isEdit ? 'بروزرسانی' : 'افزودن'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                لغو
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

