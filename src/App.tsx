import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedLoginForm as LoginForm } from './components/Login/LoginForm';
import { authService } from './utils/AuthService';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardStats } from './components/Dashboard/DashboardStats';
import BaseDataManager from './components/BaseData/BaseDataManager';
import ContractManager from './components/Contracts/ContractManager';
import { WarehouseReceiptManager } from './components/WarehouseReceipt/WarehouseReceiptManager';
// تغییر اصلی: وارد کردن ماژول جدید به صورت ماژولار
import WarehouseDeliveryManager from './components/WarehouseDelivery/WarehouseDeliveryManager.tsx';
import AccountingManager from './components/accounting/AccountingManager';
import { ReportsManager } from './components/Reports/ReportsManager';
import { InventoryLedgerManager } from './components/InventoryLedger/InventoryLedgerManager';
import { AnalyticsManager } from './components/Analytics/AnalyticsManager';
import { UserManagementManager } from './components/UserManagement/UserManagementManager';
import MessagingManager from './components/Messaging/MessagingManager';
import PersianDatePicker from './components/Common/PersianDatePicker';
import { DateSelectionWrapper } from './components/DateSelectionWrapper';
import { WorkflowManager } from './components/Workflow/WorkflowManager';
// 🔧 تغییر از ServerManager به ServerSettings برای سیستم تنظیمات جدید
import { SystemManager } from './components/System/SystemManager';
import { InventoryAdjustmentManager } from './components/InventoryAdjustment/InventoryAdjustmentManager';
import { ProductConversionManager } from './components/ProductConversion/ProductConversionManager';
import { ErrorBoundary } from './components/ErrorBoundary';

// Import Complete Advanced System
import CompleteAdvancedSystem from './components/CompleteAdvanced/CompleteAdvancedSystem';

// Import Oil Product Creator
import OilProductCreator from './components/CompleteAdvanced/OilProductCreator_Final';

// 🔧 وارد کردن ThemeProvider و کامپوننت جدید - مسیرهای واقعی که کاربر استفاده کرده
import { ThemeProvider, useTheme } from './components/Contracts/ThemeProvider';
// ✅ تغییر اصلی: Import کردن SettingsManager به جای GeneralAppearanceAndNotificationsSettings
import { SettingsManager } from './components/Settings/SettingsManager';

// 🔧 اضافه کردن SettingsProvider برای سیستم تنظیمات سرور
import { SettingsProvider } from './components/Contracts/SettingsContext';

// 🔧 وارد کردن فایل‌های جدید سیستم تنظیمات
import { ServerSettings } from './components/Settings/ServerSettings';

import { DataStorage } from './utils/dataStorage';
import { useAutoInvoiceChecker } from './hooks/useAutoInvoiceChecker';
import { useVersionChecker } from './hooks/useVersionChecker';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { initTabManager, updateTabModule, cleanupTabManager } from './utils/tabManager';

// Mapping نام منوها برای نمایش در title
const moduleNames: Record<string, string> = {
  'dashboard': 'داشبورد',
  'base-data': 'اطلاعات پایه',
  'contracts': 'قرار داد ها',
  'warehouse-receipt': 'رسید انبار',
  'warehouse-delivery': 'حواله انبار',
  'Deduction-Addition': 'کسر/اضافه انبار',
  'product-conversion': 'تبدیل کالا',
  'invoice-generation': 'صدور فاکتور',
  'reports': 'گزارشات',
  'inventory-ledger': 'کاردکس موجودی',
  'analytics': 'تحلیل و بررسی',
  'analytics-main': 'تحلیل و بررسی اصلی',
  'speech-to-text': 'گپ متن',
  'speech-demo': 'دموی گپ متن',
  'oil-converter': 'مبدل روغن خوراکی',
  'complete-system': 'سیستم پیشرفته یکپارچه',
  'oil-product-creator': 'ساخت محصول جدید روغن خوراکی',
  'messaging': 'مکاتبات',
  'users': 'مدیریت کاربران',
  'settings': 'تنظیمات'
};

// ✅ اضافه کردن import CSS برای تم
import './components/style/theme-support.css';

// کامپوننت داخلی App که به ThemeProvider دسترسی دارد
const AppContent: React.FC = () => {
  const { isDark, theme } = useTheme();
  
  // استفاده از version checker برای به‌روزرسانی خودکار
  useVersionChecker({
    enabled: true,
    checkInterval: 60000, // چک هر 60 ثانیه
    autoReload: true
  });
  
  // خواندن ماژول از localStorage یا استفاده از مقدار پیش‌فرض
  const getInitialModule = (): string => {
    try {
      // ابتدا بررسی hash URL (برای تب‌های جدید)
      const hash = window.location.hash;
      if (hash) {
        const match = hash.match(/#module=([^&]+)/);
        if (match && match[1]) {
          const moduleFromHash = match[1];
          // پاک کردن hash از URL بعد از خواندن
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          // ذخیره در localStorage
          localStorage.setItem('activeModule', moduleFromHash);
          return moduleFromHash;
        }
      }
      
      // اگر hash وجود نداشت، از localStorage بخوان
      const savedModule = localStorage.getItem('activeModule');
      if (savedModule && savedModule !== 'dashboard') {
        return savedModule;
      }
    } catch (error) {
      console.warn('خطا در خواندن ماژول از localStorage:', error);
    }
    return 'dashboard';
  };

  const [activeModule, setActiveModule] = useState<string>(getInitialModule);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isFloatingCalendarOpen, setIsFloatingCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  
  // ذخیره ماژول فعلی در localStorage هر زمان که تغییر کند
  useEffect(() => {
    if (isLoggedIn && appInitialized) {
      try {
        localStorage.setItem('activeModule', activeModule);
      } catch (error) {
        console.warn('خطا در ذخیره ماژول در localStorage:', error);
      }
    }
  }, [activeModule, isLoggedIn, appInitialized]);
  
  // Initialize Tab Manager و تنظیم title
  useEffect(() => {
    if (isLoggedIn && appInitialized) {
      // Initialize tab manager
      initTabManager(activeModule, () => {
        window.focus();
      });
      
      // تنظیم title صفحه
      const moduleName = moduleNames[activeModule] || 'سیستم انبار';
      document.title = `${moduleName} - سیستم انبار`;
      
      return () => {
        cleanupTabManager();
      };
    }
  }, [isLoggedIn, appInitialized, activeModule]);
  
  // به‌روزرسانی ماژول در tab manager وقتی تغییر می‌کند
  useEffect(() => {
    if (isLoggedIn && appInitialized) {
      updateTabModule(activeModule);
      // به‌روزرسانی title
      const moduleName = moduleNames[activeModule] || 'سیستم انبار';
      document.title = `${moduleName} - سیستم انبار`;
    }
  }, [activeModule, isLoggedIn, appInitialized]);
  
  // Debug: Log module changes
  useEffect(() => {
    console.log('Active module changed to:', activeModule);
  }, [activeModule]);

  // اضافه کردن state برای مدیریت داده‌های مشترک بین کامپوننت‌ها
  const [sharedData, setSharedData] = useState<any>({
    baseData: {},
    contracts: [],
    permits: [],
    receipts: [],
    adjustments: [],
    additions: [],
    deductions: [],
  });

  // اضافه کردن state برای تنظیمات
  const [settings, setSettings] = useState<any>({});

  const storage = DataStorage.getInstance();

  // Default users
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      fullName: 'مدیر سیستم',
      role: 'admin',
      department: 'مدیریت',
    },
    {
      username: 'warehouse',
      password: 'warehouse123',
      fullName: 'کاربر انبار',
      role: 'user',
      department: 'مخازن انزلی',
    },
    {
      username: 'finance',
      password: 'finance123',
      fullName: 'کاربر مالی',
      role: 'user',
      department: 'مالی',
    },
  ];

  // Load shared data from storage - MUST be defined before useEffect
  const loadSharedData = useCallback(async () => {
    try {
      const baseData = storage.loadData('baseData') || {};
      const contracts = storage.loadData('contracts') || [];
      const permits = storage.loadData('permits') || [];
      const receipts = storage.loadData('receipts') || [];
      
      setSharedData({
        baseData,
        contracts: Array.isArray(contracts) ? contracts : [],
        permits: Array.isArray(permits) ? permits : [],
        receipts: Array.isArray(receipts) ? receipts : [],
        adjustments: [],
        additions: [],
        deductions: [],
      });
    } catch (error) {
      console.error('خطا در بارگذاری داده‌های مشترک:', error);
      // Set default empty data on error
      setSharedData({
        baseData: {},
        contracts: [] as any[],
        permits: [] as any[],
        receipts: [] as any[],
        adjustments: [] as any[],
        additions: [] as any[],
        deductions: [] as any[],
      });
    }
  }, [storage]);

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      try {
        // بارگذاری تنظیمات ذخیره شده
        try {
          const savedSettings = storage.loadData('appSettings');
          if (savedSettings) {
            setSettings(savedSettings);
          }
        } catch (error) {
          console.warn('خطا در بارگذاری تنظیمات:', error);
        }

        // بررسی کاربر فعلی از AuthService
        try {
          if (authService.isLoggedIn()) {
            const user = authService.getCurrentUser();
            if (user) {
              setCurrentUser(user);
              setIsLoggedIn(true);
            }
          }
        } catch (error) {
          console.warn('خطا در بارگذاری اطلاعات کاربر:', error);
          localStorage.removeItem('currentUser');
        }

        await loadSharedData();
        setAppInitialized(true);
      } catch (error) {
        console.error('خطا در راه‌اندازی برنامه:', error);
        // Even on error, set initialized to true so app can continue
        setAppInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [loadSharedData, storage]);

  // Update shared data across components
  const updateSharedData = useCallback((key: string, data: any) => {
    setSharedData(prev => ({
      ...prev,
      [key]: data,
    }));
    
    // ذخیره در localStorage
    storage.saveData(key, data);
  }, [storage]);

  // استفاده از hook چک خودکار فاکتور
  const {
    lastCheckTime,
    isChecking,
  } = useAutoInvoiceChecker(true);

  // اعمال تنظیمات
  const applySettings = useCallback((newSettings: any) => {
    setSettings(newSettings);
    storage.saveData('appSettings', newSettings);
  }, [storage]);

  // Handle login using AuthService
  const handleLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const result = await authService.authenticate(username, password);
        
        if (result.success && result.user) {
          setCurrentUser(result.user);
          setIsLoggedIn(true);
          // AuthService already handles session storage
          return true;
        }
        return false;
      } catch (error) {
        console.error('Login error:', error);
        return false;
      }
    },
    []
  );

    const handleLogout = useCallback(() => {
      authService.logout();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setActiveModule('dashboard');
      // پاک کردن ماژول ذخیره شده هنگام logout
      localStorage.removeItem('activeModule');
    }, []);

    // Session timeout handler
    const getSessionTimeout = useCallback(() => {
      try {
        const securitySettings = localStorage.getItem('securitySettings');
        if (securitySettings) {
          const parsed = JSON.parse(securitySettings);
          return parsed.sessionTimeoutMinutes || 60;
        }
      } catch (error) {
        console.warn('Failed to load session timeout setting:', error);
      }
      return 60; // Default 60 minutes
    }, []);

    // Use session timeout hook
    useSessionTimeout({
      timeoutMinutes: getSessionTimeout(),
      onTimeout: handleLogout,
      enabled: isLoggedIn
    });

  const handleDateSelect = useCallback((date: Date | null) => {
    setSelectedDate(date);
    console.log('Selected date:', date);
  }, []);

  const handleRefreshData = useCallback(() => {
    // بارگذاری مجدد داده‌های مشترک
    loadSharedData();
    // Trigger data refresh across all components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refreshData'));
    }
  }, [loadSharedData]);

  if (!appInitialized || isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-100'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>در حال بارگذاری برنامه...</p>
          {/* نمایش وضعیت تم */}
          <p className={`text-xs mt-2 ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            تم فعلی: {theme === 'light' ? 'روشن' : theme === 'dark' ? 'تاریک' : 'سیستم'}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardStats onLogout={handleLogout} />;
      case 'base-data':
        return <BaseDataManager />;
      case 'contracts':
        return <ContractManager />;
      case 'warehouse-receipt':
        return <WarehouseReceiptManager />;
      case 'warehouse-delivery':
        return (
          <WarehouseDeliveryManager
            sharedData={sharedData}
            updateSharedData={updateSharedData}
            onRefresh={handleRefreshData}
          />
        );
      case 'Deduction-Addition':
        return <InventoryAdjustmentManager />;
      case 'product-conversion':
        return <ProductConversionManager />;
      case 'invoice-generation':
        return (
          <AccountingManager
            lastAutoInvoiceCheck={lastCheckTime}
            isAutoChecking={isChecking}
          />
        );
      case 'reports':
        return <ReportsManager />;
      case 'inventory-ledger':
        return <InventoryLedgerManager />;
      case 'analytics':
        return <AnalyticsManager />;
      case 'analytics-main':
        return <AnalyticsManager />;
      case 'speech-to-text':
        return <CompleteAdvancedSystem />;
      case 'speech-demo':
        return <CompleteAdvancedSystem />;
      case 'oil-converter':
        return <CompleteAdvancedSystem />;
      case 'complete-system':
        return <CompleteAdvancedSystem />;
      case 'oil-product-creator':
        return <OilProductCreator />;
      case 'messaging':
        return <MessagingManager />;
      case 'users':
        return <UserManagementManager />;
      
      // ✅ تغییر اصلی: استفاده از SettingsManager به جای GeneralAppearanceAndNotificationsSettings
      case 'settings':
        return (
          <SettingsManager
            settings={settings}
            setSettings={setSettings}
            applySettings={applySettings}
          />
        );
      
      case 'workflow':
        return <WorkflowManager />;
      
      // ❌ حذف کلاس قدیمی ThemeManager - حالا در settings قرار دارد
      /*
      case 'theme':
        return (
          <ThemeManager isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        );
      */
      
      // 🔧 تغییر اصلی: استفاده از ServerSettings با SettingsProvider
      case 'server':
        return (
          <div className="p-6">
            <ServerSettings />
          </div>
        );
      case 'system':
        return <SystemManager />;
      case 'calendar':
        return (
          <div className="p-6">
            <h1 className={`text-2xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              تقویم شمسی
            </h1>
            <div className="max-w-md mx-auto">
              <DateSelectionWrapper
                value={selectedDate}
                onChange={handleDateSelect}
              />
              {selectedDate && (
                <div className={`mt-4 p-4 rounded-lg ${
                  isDark ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-800'
                }`}>
                  <p className="text-center">
                    تاریخ انتخاب شده: {selectedDate.toLocaleDateString('fa-IR')}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return <DashboardStats onLogout={handleLogout} />;
    }
  };

  return (
    <ErrorBoundary>
      <div
        className={`min-h-screen transition-colors duration-200 ${
          isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}
      >
        <div className="flex">
          {/* Sidebar */}
          <Sidebar
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            currentUser={currentUser}
            isDark={isDark}
            settings={settings}
          />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <Header
              currentUser={currentUser}
              onLogout={handleLogout}
              isDarkMode={isDark}
              setIsDarkMode={() => {}}
              onCalendarClick={() => {}}
              activeModule={activeModule}
            />
            
            {/* Floating Calendar */}
            {isFloatingCalendarOpen && (
              <div className="fixed top-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    تقویم شمسی
                  </h3>
                  <button
                    onClick={() => setIsFloatingCalendarOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    ×
                  </button>
                </div>
                <PersianDatePicker
                  value={selectedDate}
                  onChange={handleDateSelect}
                  isOpen={true}
                />
              </div>
            )}
            
            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              {renderActiveModule()}
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

// کامپوننت اصلی App با ThemeProvider
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ThemeProvider>
  );
};

export default App;