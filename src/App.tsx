import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedLoginForm as LoginForm } from './components/Login/LoginForm';
import { authService } from './utils/AuthService';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardStats } from './components/Dashboard/DashboardStats';
import BaseDataManager from './components/BaseData/BaseDataManager';
import ContractManager from './components/Contracts/ContractManager';
import { WarehouseReceiptManager } from './components/WarehouseReceipt/WarehouseReceiptManager';
import WarehouseDeliveryManager from './components/WarehouseDelivery/WarehouseDeliveryManager';
import AccountingManager from './components/accounting/AccountingManager';
import { ReportsManager } from './components/Reports/ReportsManager';
import { InventoryLedgerManager } from './components/InventoryLedger/InventoryLedgerManager';
import { AnalyticsManager } from './components/Analytics/AnalyticsManager';
import { UserManagementManager } from './components/UserManagement/UserManagementManager';
import MessagingManager from './components/Messaging/MessagingManager';
import PersianDatePicker from './components/Common/PersianDatePicker';
import { DateSelectionWrapper } from './components/DateSelectionWrapper';
import { WorkflowManager } from './components/Workflow/WorkflowManager';
import { SystemManager } from './components/System/SystemManager';
import { InventoryAdjustmentManager } from './components/InventoryAdjustment/InventoryAdjustmentManager';
import { ProductConversionManager } from './components/ProductConversion/ProductConversionManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PermissionGuard } from './components/Common/PermissionGuard';
import { canView } from './utils/permissionHelpers';
import CompleteAdvancedSystem from './components/CompleteAdvancedSystem/CompleteAdvancedSystem';
import { ThemeProvider, useTheme } from './components/Contracts/ThemeProvider';
import { SettingsManager } from './components/Settings/SettingsManager';
import { SettingsProvider } from './components/Contracts/SettingsContext';
import { ServerSettings } from './components/Settings/ServerSettings';
import { DataStorage } from './utils/dataStorage';
import './utils/logger';
import { useAutoInvoiceChecker } from './hooks/useAutoInvoiceChecker';
import { useVersionChecker } from './hooks/useVersionChecker';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { useModuleChangeLogger, logLoginAction, logLogoutAction } from './hooks/useActivityLogger';


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
  'product-development': 'ساخت محصول جدید',
  'messaging': 'مکاتبات',
  'users': 'مدیریت کاربران',
  'settings': 'تنظیمات'
};

import './components/style/theme-support.css';

const AppContent: React.FC = () => {
  const { isDark, theme } = useTheme();
  
  useVersionChecker({
    enabled: true,
    checkInterval: 60000,
    autoReload: true
  });
  
  const getInitialModule = (): string => {
    try {
      const hash = window.location.hash;
      if (hash) {
        const match = hash.match(/#module=([^&]+)/);
        if (match && match[1]) {
          const moduleFromHash = match[1];
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          localStorage.setItem('activeModule', moduleFromHash);
          return moduleFromHash;
        }
      }
      
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
  const [sharedData, setSharedData] = useState<any>({
    baseData: {},
    contracts: [],
    permits: [],
    receipts: [],
    adjustments: [],
    additions: [],
    deductions: [],
  });
  const [settings, setSettings] = useState<any>(null);

  const currentModuleName = moduleNames[activeModule] || activeModule;
  useModuleChangeLogger(activeModule, currentModuleName);

  const { lastCheckTime, isChecking } = useAutoInvoiceChecker(true);
  const storage = DataStorage.getInstance();

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
      setSharedData({
        baseData: {},
        contracts: [],
        permits: [],
        receipts: [],
        adjustments: [],
        additions: [],
        deductions: [],
      });
    }
  }, [storage]);

  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      try {
        try {
          const savedSettings = storage.loadData('appSettings');
          if (savedSettings) {
            setSettings(savedSettings);
          }
        } catch (error) {
          console.warn('خطا در بارگذاری تنظیمات:', error);
        }

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
        setAppInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [loadSharedData, storage]);

  const updateSharedData = useCallback((key: string, data: any) => {
    setSharedData(prev => ({
      ...prev,
      [key]: data,
    }));
    storage.saveData(key, data);
  }, [storage]);

  const applySettings = useCallback((newSettings: any) => {
    setSettings(newSettings);
    storage.saveData('appSettings', newSettings);
  }, [storage]);

  const handleLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const result = await authService.authenticate(username, password);
        
        if (result.success && result.user) {
          setCurrentUser(result.user);
          setIsLoggedIn(true);
          logLoginAction(username, true);
          return true;
        }
        logLoginAction(username, false);
        return false;
      } catch (error) {
        console.error('Login error:', error);
        logLoginAction(username, false);
        return false;
      }
    },
    []
  );

    const handleLogout = useCallback(() => {
      const username = currentUser?.username || 'unknown';
      logLogoutAction(username);
      authService.logout();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setActiveModule('dashboard');
      localStorage.removeItem('activeModule');
    }, [currentUser]);

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
      return 60;
    }, []);

    useSessionTimeout({
      timeoutMinutes: getSessionTimeout(),
      onTimeout: handleLogout,
      enabled: isLoggedIn
    });

  const handleDateSelect = useCallback((date: Date | null) => {
    setSelectedDate(date);
  }, []);

  const handleRefreshData = useCallback(() => {
    loadSharedData();
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
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const getPermissionModuleId = (moduleId: string): string => {
    const mapping: Record<string, string> = {
      'dashboard': 'dashboard',
      'base-data': 'base_data',
      'contracts': 'contracts',
      'warehouse-receipt': 'consignment_receipt',
      'warehouse-delivery': 'warehouse_delivery',
      'Deduction-Addition': 'inventory_adjustment',
      'product-conversion': 'product_conversion',
      'invoice-generation': 'invoice',
      'reports': 'reports',
      'inventory-ledger': 'inventory_ledger',
      'analytics': 'analytics',
      'analytics-main': 'analytics',
      'speech-to-text': 'speech-to-text',
      'speech-demo': 'speech-to-text',
      'oil-converter': 'speech-to-text',
      'messaging': 'correspondence',
      'users': 'user_management',
      'settings': 'settings',
      'workflow': 'workflow',
      'server': 'settings',
      'system': 'settings',
      'calendar': 'dashboard'
    };
    return mapping[moduleId] || moduleId;
  };

  const renderActiveModule = () => {
    const permissionModuleId = getPermissionModuleId(activeModule);
    
    if (!canView(permissionModuleId)) {
      return (
        <div className="p-6">
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <div>در حال بارگذاری...</div>
          </PermissionGuard>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <DashboardStats onLogout={handleLogout} />
          </PermissionGuard>
        );
      case 'base-data':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <BaseDataManager />
          </PermissionGuard>
        );
      case 'contracts':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <ContractManager />
          </PermissionGuard>
        );
      case 'warehouse-receipt':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <WarehouseReceiptManager />
          </PermissionGuard>
        );
      case 'warehouse-delivery':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <WarehouseDeliveryManager
              sharedData={sharedData}
              updateSharedData={updateSharedData}
              onRefresh={handleRefreshData}
            />
          </PermissionGuard>
        );
      case 'Deduction-Addition':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <InventoryAdjustmentManager />
          </PermissionGuard>
        );
      case 'product-conversion':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <ProductConversionManager />
          </PermissionGuard>
        );
      case 'invoice-generation':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <AccountingManager
              lastAutoInvoiceCheck={lastCheckTime}
              isAutoChecking={isChecking}
            />
          </PermissionGuard>
        );
      case 'reports':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <ReportsManager />
          </PermissionGuard>
        );
      case 'inventory-ledger':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <InventoryLedgerManager />
          </PermissionGuard>
        );
      case 'analytics':
      case 'analytics-main':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <AnalyticsManager />
          </PermissionGuard>
        );
      case 'speech-to-text':
      case 'speech-demo':
      case 'oil-converter':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <CompleteAdvancedSystem />
          </PermissionGuard>
        );
      case 'messaging':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <MessagingManager />
          </PermissionGuard>
        );
      case 'users':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <UserManagementManager />
          </PermissionGuard>
        );
      case 'settings':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <SettingsManager
              settings={settings}
              setSettings={setSettings}
              applySettings={applySettings}
            />
          </PermissionGuard>
        );
      case 'workflow':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <WorkflowManager />
          </PermissionGuard>
        );
      case 'server':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <div className="p-6">
              <ServerSettings />
            </div>
          </PermissionGuard>
        );
      case 'system':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
            <SystemManager />
          </PermissionGuard>
        );
      case 'calendar':
        return (
          <PermissionGuard moduleId={permissionModuleId} action="view">
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
          </PermissionGuard>
        );
      default:
        return (
          <PermissionGuard moduleId="dashboard" action="view">
            <DashboardStats onLogout={handleLogout} />
          </PermissionGuard>
        );
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
          <Sidebar
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            currentUser={currentUser}
            isDark={isDark}
            settings={settings}
          />
          <div className="flex-1 flex flex-col">
            <Header
              currentUser={currentUser}
              onLogout={handleLogout}
              isDarkMode={isDark}
              setIsDarkMode={() => {}}
              onCalendarClick={() => {}}
              activeModule={activeModule}
            />
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
            <main className="flex-1 overflow-auto">
              {renderActiveModule()}
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

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
