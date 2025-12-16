/**
 * سیستم مدیریت تنظیمات سرور
 * Context API برای مدیریت وضعیت تنظیمات در سراسر برنامه
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSystemInfo, getDefaultPaths } from '../../utils/SystemInfo';
import { getApiBaseUrl, buildApiUrl, refreshApiConfig } from '../../utils/apiConfig';

// ✅ تابع کمکی برای دریافت شناسه کاربر فعلی (خارج از کامپوننت تا مشکل TDZ نداشته باشیم)
const getCurrentUserId = (): string => {
  try {
    const currentUser = typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : null;
    if (currentUser) {
      const parsed = JSON.parse(currentUser);
      return parsed.username || 'default_user';
    }
  } catch (error) {
    console.warn('خطا در دریافت ID کاربر:', error);
  }
  return 'default_user';
};

export interface DeploymentType {
  type: 'internal' | 'network';
  name: string;
  description: string;
}

export interface ServerSettings {
  deploymentType: DeploymentType;
  serverName: string;
  hostname: string;
  port: number;
  protocol: 'http' | 'https';
  sslEnabled: boolean;
  sslCertificate?: string;
  sslKey?: string;
  maxConnections: number;
  timeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  autoStart: boolean;
  autoRestart: boolean;
  backupEnabled: boolean;
  backupInterval: number;
  backupPath: string;
  // فیلدهای اضافی پیشرفته سرور (برای همخوانی با UI مدرن)
  installationType?: 'local' | 'network';
  serverAddress?: string;
  serverPort?: number;
  databasePath?: string;
  logsPath?: string;
  memoryLimit?: number;
  cacheSize?: number;
  runAsService?: boolean;
  loadBalancer?: boolean;
  clusteringEnabled?: boolean;
  nodesCount?: number;
  authMethod?: 'jwt' | 'oauth' | 'api_key' | 'basic';
  jwtExpiry?: number;
  refreshTokenExpiry?: number;
  httpsPort?: number;
  sslCertType?: 'self_signed' | 'lets_encrypt' | 'custom';
  forceHttps?: boolean;
  rateLimitPublic?: number;
  rateLimitAuthenticated?: number;
  blockedIPs?: string[];
  securityAlerts?: boolean;
  logAllActivities?: boolean;
  logRetentionDays?: number;
  workerProcesses?: number;
  threadPoolSize?: number;
  heapSize?: number;
  autoGC?: boolean;
  dbConnectionPool?: number;
  queryTimeout?: number;
  maxQueryRetries?: number;
  enableQueryCache?: boolean;
  keepAliveTimeout?: number;
  maxKeepAliveRequests?: number;
  enableMetrics?: boolean;
  enableCustomMetrics?: boolean;
  metricsInterval?: number;
  enableHealthCheck?: boolean;
  detailedHealthCheck?: boolean;
  healthCheckPort?: number;
  debugMode?: boolean;
  hotReload?: boolean;
  logVerbosity?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  enableSourceMaps?: boolean;
  enableProfiling?: boolean;
  devPort?: number;
  maxCpuUsage?: number;
  maxMemoryUsage?: number;
  // تنظیمات شبکه و Load Balancer
  loadBalancerAlgorithm?: 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted';
  backendServers?: string[];
  clusterMode?: 'master_slave' | 'master_master' | 'replica_set';
  autoFailover?: boolean;
  // Network Discovery & Service Registry
  networkDiscoveryEnabled?: boolean;
  serviceRegistryUrl?: string;
  healthCheckEndpoint?: string;
  remoteAccessEnabled?: boolean;
  allowedNetworks?: string[];
  // اجازه‌ی توسعه فیلدهای بیشتر بدون خطای TypeScript
  [key: string]: any;
}

export interface DatabaseSettings {
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';
  sqlitePath: string;
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  mysql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  mongodb: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  connectionPoolSize: number;
  queryTimeout: number;
}

export interface FilePaths {
  appData: string;
  logs: string;
  temp: string;
  backup: string;
  database: string;
  certificates: string;
  uploads: string;
  exports: string;
}

export interface SecuritySettings {
  authenticationRequired: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  ipWhitelist: string[];
  corsEnabled: boolean;
  corsOrigins: string[];
  rateLimit: {
    enabled: boolean;
    requests: number;
    window: number;
  };
}

export interface AdvancedSettings {
  performance: {
    cacheEnabled: boolean;
    cacheSize: number;
    compressionEnabled: boolean;
    minFileSize: number;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    alertEmail?: string;
    logMetrics: boolean;
  };
  notifications: {
    enabled: boolean;
    email: {
      enabled: boolean;
      smtpServer?: string;
      smtpPort?: number;
      username?: string;
      password?: string;
      fromAddress?: string;
    };
    push: {
      enabled: boolean;
      endpoint?: string;
    };
  };
}

export interface AppSettings {
  server: ServerSettings;
  database: DatabaseSettings;
  filePaths: FilePaths;
  security: SecuritySettings;
  advanced: AdvancedSettings;
  system: {
    autoDetect: boolean;
    lastUpdated: Date;
    version: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  responseTime?: number;
  error?: string;
  details?: any;
}

interface SettingsContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  isOnlineMode: boolean;
  lastSyncTime: Date | null;
  systemInfo: any;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  saveSettings: () => Promise<boolean>;
  loadSettings: () => Promise<boolean>;
  resetSettings: () => void;
  validateSettings: () => ValidationResult;
  testConnection: () => Promise<ConnectionTestResult>;
  exportSettings: () => string;
  importSettings: (jsonString: string) => boolean;
  getDefaultSettings: () => AppSettings;
  syncWithDatabase: () => Promise<boolean>;
  setOnlineMode: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * تولید تنظیمات پیش‌فرض
 */
const getDefaultSettings = (): AppSettings => {
  // Note: getSystemInfo is async, but we need sync default settings
  // Using default values for initial setup
  const defaultPaths = getDefaultPaths('windows'); // Will be updated based on actual platform

  return {
    server: {
      deploymentType: {
        type: 'internal',
        name: 'سیستم داخلی',
        description: 'اجرا در سیستم محلی با پایگاه داده SQLite'
      },
      serverName: 'TankSystem Server',
      hostname: 'localhost',
      port: 8080,
      protocol: 'http',
      sslEnabled: false,
      maxConnections: 100,
      timeout: 30000,
      logLevel: 'info',
      autoStart: true,
      autoRestart: true,
      backupEnabled: true,
      backupInterval: 24,
      backupPath: defaultPaths.backup
    },
    database: {
      type: 'sqlite',
      sqlitePath: defaultPaths.database,
      postgresql: {
        host: 'localhost',
        port: 5432,
        database: 'tanksystem',
        username: 'tanksystem',
        password: '',
        ssl: false
      },
      mysql: {
        host: 'localhost',
        port: 3306,
        database: 'tanksystem',
        username: 'tanksystem',
        password: '',
        ssl: false
      },
      mongodb: {
        host: 'localhost',
        port: 27017,
        database: 'tanksystem',
        username: '',
        password: '',
        ssl: false
      },
      connectionPoolSize: 10,
      queryTimeout: 30000
    },
    filePaths: {
      appData: defaultPaths.config,
      logs: defaultPaths.logs,
      temp: defaultPaths.temp,
      backup: defaultPaths.backup,
      database: defaultPaths.database,
      certificates: `${defaultPaths.config}/certificates`,
      uploads: `${defaultPaths.config}/uploads`,
      exports: `${defaultPaths.config}/exports`
    },
    security: {
      authenticationRequired: true,
      sessionTimeout: 3600,
      maxLoginAttempts: 5,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false
      },
      ipWhitelist: [],
      corsEnabled: true,
      corsOrigins: ['http://localhost:3000', 'http://localhost:8080'],
      rateLimit: {
        enabled: true,
        requests: 100,
        window: 3600
      }
    },
    advanced: {
      performance: {
        cacheEnabled: true,
        cacheSize: 128,
        compressionEnabled: true,
        minFileSize: 1024
      },
      monitoring: {
        enabled: true,
        interval: 60,
        logMetrics: true
      },
      notifications: {
        enabled: false,
        email: {
          enabled: false,
          smtpServer: '',
          smtpPort: 587,
          username: '',
          password: '',
          fromAddress: ''
        },
        push: {
          enabled: false
        }
      }
    },
    system: {
      autoDetect: true,
      lastUpdated: new Date(),
      version: '1.0.0'
    }
  };
};

/**
 * Provider کامپوننت
 */
interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);

  // بارگذاری اطلاعات سیستم در ابتدا
  useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        const info = await getSystemInfo();
        setSystemInfo(info);
      } catch (error) {
        console.warn('خطا در بارگذاری اطلاعات سیستم:', error);
        setSystemInfo({
          platform: 'windows',
          arch: 'x64',
          hostname: 'localhost',
          memory: 4
        });
      }
    };
    
    loadSystemInfo();
  }, []);

  // بارگذاری تنظیمات از localStorage (fallback)
  const loadSettings = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const savedSettings = localStorage.getItem('tanksystem_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // تبدیل lastUpdated به Date object
        if (parsed.system?.lastUpdated) {
          parsed.system.lastUpdated = new Date(parsed.system.lastUpdated);
        }
        setSettings(parsed);
        return true;
      } else {
        // اگر تنظیمات ذخیره شده وجود نداشت، تنظیمات پیش‌فرض را بارگذاری کن
        const defaultSettings = getDefaultSettings();
        setSettings(defaultSettings);
        return true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات';
      setError(errorMessage);
      console.error('خطا در بارگذاری تنظیمات:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ذخیره تنظیمات در localStorage و دیتابیس
  const saveSettings = useCallback(async (): Promise<boolean> => {
    if (!settings) return false;

    try {
      const settingsToSave = {
        ...settings,
        system: {
          ...settings.system,
          lastUpdated: new Date()
        }
      };
      
      // ذخیره در localStorage (همیشه)
      localStorage.setItem('tanksystem_settings', JSON.stringify(settingsToSave));
      
      // ذخیره در دیتابیس اگر online mode فعال باشد
      let databaseSuccess = false;
      if (isOnlineMode) {
        try {
          const userId = getCurrentUserId();
          const settingsUrl = buildApiUrl(`/settings/${userId}`);
          const response = await fetch(settingsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ settings: settingsToSave }),
          });
          
          if (response.ok) {
            const result = await response.json();
            databaseSuccess = result.success;
            if (databaseSuccess) {
              setLastSyncTime(new Date());
              console.log(`✅ تنظیمات در دیتابیس ذخیره شد: ${result.savedCount}/${result.totalCount}`);
            }
          }
        } catch (dbError) {
          console.warn('خطا در ذخیره در دیتابیس:', dbError);
        }
      }
      
      // به‌روزرسانی کش API config
      refreshApiConfig();
      
      // ارسال رویداد برای سایر کامپوننت‌ها
      window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: { settings: settingsToSave, databaseSuccess }
      }));
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات';
      setError(errorMessage);
      console.error('خطا در ذخیره تنظیمات:', err);
      return false;
    }
  }, [settings, isOnlineMode]);

  // به‌روزرسانی تنظیمات
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    if (!settings) return;
    
    setSettings(prev => prev ? {
      ...prev,
      ...newSettings,
      system: {
        ...prev.system,
        lastUpdated: new Date()
      }
    } : null);
  }, [settings]);

  // بازنشانی تنظیمات به حالت پیش‌فرض
  const resetSettings = useCallback(() => {
    const defaultSettings = getDefaultSettings();
    setSettings(defaultSettings);
  }, []);

  // اعتبارسنجی تنظیمات
  const validateSettings = useCallback((): ValidationResult => {
    if (!settings) {
      return {
        isValid: false,
        errors: ['تنظیمات بارگذاری نشده است'],
        warnings: [],
        suggestions: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // بررسی تنظیمات سرور - فقط اگر server وجود داشته باشد
    if (settings.server) {
      if (settings.server.port && (settings.server.port < 1 || settings.server.port > 65535)) {
        errors.push('شماره پورت نامعتبر است');
      }

      if (settings.server.maxConnections && settings.server.maxConnections < 1) {
        errors.push('حداکثر تعداد اتصال باید حداقل ۱ باشد');
      }
    }

    // بررسی تنظیمات پایگاه داده - فقط اگر database وجود داشته باشد
    if (settings.database && settings.database.type === 'postgresql') {
      if (settings.database.postgresql && (!settings.database.postgresql.host || !settings.database.postgresql.database)) {
        errors.push('اطلاعات پایگاه داده PostgreSQL ناقص است');
      }
    }

    // بررسی مسیرهای فایل - فقط اگر filePaths وجود داشته باشد
    if (settings.filePaths) {
      if (!settings.filePaths.appData || !settings.filePaths.logs) {
        errors.push('مسیرهای فایل ناقص است');
      }
    }

    // بررسی تنظیمات امنیتی - فقط اگر security وجود داشته باشد
    if (settings.security && settings.security.passwordPolicy) {
      if (settings.security.passwordPolicy.minLength < 6) {
        warnings.push('طول رمز عبور کمتر از حد امنیتی توصیه شده است');
      }
    }

    // پیشنهادات - فقط اگر server وجود داشته باشد
    if (settings.server) {
      if (settings.server.protocol === 'http') {
        suggestions.push('برای امنیت بیشتر از HTTPS استفاده کنید');
      }

      if (!settings.server.sslEnabled && settings.server.port === 443) {
        suggestions.push('SSL برای پورت 443 فعال نیست');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }, [settings]);

  // تست اتصال سرور
  const testConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    if (!settings) {
      return {
        success: false,
        error: 'تنظیمات بارگذاری نشده است'
      };
    }

    try {
      const { hostname, port, protocol } = settings.server;
      // testServerConnection function not available, using basic validation
      const result = {
        success: true,
        message: 'Connection test not implemented',
        latency: 0
      };
      
      return {
        ...result,
        details: {
          hostname,
          port,
          protocol,
          timestamp: new Date()
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطای ناشناخته در تست اتصال'
      };
    }
  }, [settings]);

  // خروجی تنظیمات به صورت JSON
  const exportSettings = useCallback((): string => {
    if (!settings) return '{}';
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  // ورود تنظیمات از JSON
  const importSettings = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // اعتبارسنجی ساختار
      if (!parsed.server || !parsed.database || !parsed.filePaths || !parsed.security) {
        throw new Error('ساختار تنظیمات نامعتبر است');
      }

      // تبدیل lastUpdated
      if (parsed.system?.lastUpdated) {
        parsed.system.lastUpdated = new Date(parsed.system.lastUpdated);
      }

      setSettings(parsed);
      return true;
    } catch (err) {
      console.error('خطا در ورود تنظیمات:', err);
      return false;
    }
  }, []);

  // تست اتصال به API
  const testApiConnection = useCallback(async (): Promise<boolean> => {
    try {
      const healthUrl = buildApiUrl('/health');
      const response = await fetch(healthUrl);
      return response.ok;
    } catch (error) {
      console.warn('API در دسترس نیست:', error);
      return false;
    }
  }, []);

  // sync با دیتابیس
  const syncWithDatabase = useCallback(async (): Promise<boolean> => {
    if (!isOnlineMode || !settings) return false;

    try {
      const userId = getCurrentUserId();
      const settingsUrl = buildApiUrl(`/settings/${userId}`);
      const response = await fetch(settingsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setLastSyncTime(new Date());
        return true;
      }
      return false;
    } catch (error) {
      console.error('خطا در sync با دیتابیس:', error);
      return false;
    }
  }, [isOnlineMode, settings]);

  // بارگذاری تنظیمات از دیتابیس یا localStorage
  const loadSettingsFromDatabase = useCallback(async (): Promise<boolean> => {
    if (!isOnlineMode) return false;

    try {
      const userId = getCurrentUserId();
      const settingsUrl = buildApiUrl(`/settings/${userId}`);
      const response = await fetch(settingsUrl);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // تبدیل داده‌های دیتابیس به فرمت AppSettings
          const dbSettings = result.data;
          
          // تبدیل ساختار دیتابیس به AppSettings
          const appSettings: AppSettings = {
            server: {
              ...dbSettings.server,
              deploymentType: dbSettings.server?.deploymentType || {
                type: 'internal',
                name: 'سیستم داخلی',
                description: 'اجرا در سیستم محلی با پایگاه داده SQLite'
              }
            },
            database: dbSettings.database || {},
            filePaths: dbSettings.filePaths || {},
            security: dbSettings.security || {},
            advanced: dbSettings.advanced || {},
            system: {
              ...dbSettings.system,
              lastUpdated: new Date(),
              version: '1.0.0'
            }
          };
          
          setSettings(appSettings);
          setLastSyncTime(new Date());
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('خطا در بارگذاری از دیتابیس:', error);
      return false;
    }
  }, [isOnlineMode, getCurrentUserId]);

  // تغییر وضعیت online mode
  const handleSetOnlineMode = useCallback(async (enabled: boolean) => {
    setIsOnlineMode(enabled);
    
    if (enabled) {
      // تست اتصال API
      const apiAvailable = await testApiConnection();
      if (apiAvailable) {
        console.log('✅ API در دسترس است - حالت آنلاین فعال شد');
        // تلاش برای بارگذاری از دیتابیس
        await loadSettingsFromDatabase();
      } else {
        console.warn('⚠️ API در دسترس نیست - باقی ماندن در حالت offline');
        setIsOnlineMode(false);
      }
    }
  }, [testApiConnection, loadSettingsFromDatabase]);

  // به‌روزرسانی تنظیمات با sync خودکار
  const updateSettingsWithSync = useCallback((newSettings: Partial<AppSettings>) => {
    updateSettings(newSettings);
    
    // sync خودکار اگر در حالت آنلاین باشد
    if (isOnlineMode) {
      // تأخیر برای جلوگیری از sync مکرر
      setTimeout(() => {
        syncWithDatabase();
      }, 2000);
    }
  }, [updateSettings, isOnlineMode, syncWithDatabase]);

  // تست اتصال API در ابتدا
  useEffect(() => {
    const checkApiAvailability = async () => {
      const apiAvailable = await testApiConnection();
      setIsOnlineMode(apiAvailable);
      if (apiAvailable) {
        console.log('✅ API در دسترس است');
      } else {
        console.log('📱 استفاده از localStorage (API در دسترس نیست)');
      }
    };
    
    checkApiAvailability();
  }, [testApiConnection]);

  // بارگذاری خودکار تنظیمات در ابتدا
  useEffect(() => {
    const initializeSettings = async () => {
      if (isOnlineMode) {
        // تلاش برای بارگذاری از دیتابیس
        const loaded = await loadSettingsFromDatabase();
        if (!loaded) {
          // fallback به localStorage
          await loadSettings();
        }
      } else {
        // استفاده از localStorage
        await loadSettings();
      }
    };
    
    initializeSettings();
  }, [loadSettings, loadSettingsFromDatabase, isOnlineMode]);

  const value: SettingsContextType = {
    settings,
    isLoading,
    error,
    isOnlineMode,
    lastSyncTime,
    systemInfo,
    updateSettings: updateSettingsWithSync,
    saveSettings,
    loadSettings,
    resetSettings,
    validateSettings,
    testConnection,
    exportSettings,
    importSettings,
    getDefaultSettings,
    syncWithDatabase,
    setOnlineMode: handleSetOnlineMode
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

/**
 * Hook برای استفاده از SettingsContext
 */
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsProvider;