import React, { useState, useEffect } from 'react';
import { 
Settings, Server, Database, Shield, Save, FolderOpen, TestTube, Workflow,
Users, UserCheck, FileText, Zap, Activity, RefreshCw, Download, Upload, Lock, Key,
Monitor, Smartphone, Mail, MessageSquare, AlertTriangle, CheckCircle, XCircle, Clock,
Calendar, MapPin, Network, HardDrive, Cloud, Cpu, MemoryStick, Wifi, Bluetooth, Usb,
Trash2, X, Eye, FileSpreadsheet, HelpCircle, Info, ArrowRight, ArrowLeft, Check, Plus,
Filter, DatabaseZap, CloudDownload, FileQuestion, Plug, Settings2, ChevronDown, ChevronUp,
User, Search, Calendar as CalendarIcon, Download as DownloadIcon, Filter as FilterIcon,
ArrowUpCircle
} from 'lucide-react';
import { DataStorage } from "../../utils/dataStorage";
import { formatPersianDate } from "../../utils/persian";
import { Tooltip } from "../Common/Tooltip";
import { saveAppSettingsToServer, loadAppSettingsFromServer } from "../../utils/settingsRemote";
// Import the separated components from the same directory
import { ServerSettings } from "./ServerSettings";
import { SecuritySettings } from "./SecuritySettings";
import { LoggingSettings } from "./LoggingSettings";
import { BackupSettings } from "./BackupSettings";
import { WorkflowSettings } from "./WorkflowSettings";
import { DatabaseSettings } from "./DatabaseSettings";
import { SyncSettings } from "./SyncSettings";
import { UserManagementSettings } from "./UserManagementSettings";
import { PerformanceAndReportingSettings } from "./PerformanceAndReportingSettings";
import { GeneralAppearanceAndNotificationsSettings } from "./GeneralAppearanceAndNotificationsSettings";
import { UpdateSettings } from "./UpdateSettings";

// Interfaces remain unchanged
interface AppSettings {
// Server Settings
serverAddress: string;
serverPort: number;
dataStoragePath: string;
maxConnections: number;
sslEnabled: boolean;
backupPath: string;
// Theme Settings
theme: string;
// Workflow Settings
workflowEnabled: boolean;
autoApproveSmallOrders: boolean;
maxOrderAmount: number;
orderApprovalLevels: number;
// Security Settings
security: SecuritySettings;
// Performance Settings
performance: PerformanceSettings;
// Integration Settings
integration: IntegrationSettings;
// User Management
userManagement: UserManagementSettings;
// Backup & Recovery
backup: BackupSettings;
// System Logs
logging: LoggingSettings;
// Inventory Limits
inventoryLimits: InventoryLimit[];
// Sync Settings
sync: SyncSettings;
}
interface SecuritySettings {
maxFailedAttempts: number;
sessionTimeoutMinutes: number;
passwordPolicy: PasswordPolicy;
twoFactorAuth: boolean;
ipWhitelist: string[];
sessionHistory: boolean;
encryptionEnabled: boolean;
auditLogEnabled: boolean;
}
interface PasswordPolicy {
minLength: number;
requireUppercase: boolean;
requireLowercase: boolean;
requireNumbers: boolean;
requireSpecialChars: boolean;
expireDays: number;
preventReuse: number;
}
interface PerformanceSettings {
cacheEnabled: boolean;
cacheSize: number;
autoOptimize: boolean;
dataCompression: boolean;
lazyLoading: boolean;
maxUploadSize: number;
connectionTimeout: number;
  automaticLoss: boolean;
  requireReceiptExtraInfo?: {
    consignment: boolean;
    owned: boolean;
  };
  requireDeliveryExtraInfo?: {
    consignment: boolean;
    owned: boolean;
  };
  requireConsignmentDeliveryExtraInfo?: boolean;
  requireOwnedDeliveryExtraInfo?: boolean;
openInNewTab: boolean;
}
interface IntegrationSettings {
erpEnabled: boolean;
erpEndpoint: string;
companyName?: string;
erpVersion?: string;
accountingEnabled: boolean;
accountingEndpoint: string;
accountingApiKey?: string;
economicCode?: string;
accountingType?: string;
crmEnabled: boolean;
crmEndpoint: string;
crmApiKey?: string;
organizationId?: string;
crmType?: string;
biEnabled: boolean;
biEndpoint: string;
biApiKey?: string;
workspaceId?: string;
biType?: string;
apiEnabled: boolean;
apiKey: string;
apiVersion?: string;
rateLimit?: number;
tokenExpiry?: number;
webhooks: WebhookSettings[];
}
interface WebhookSettings {
url: string;
events: string[];
active: boolean;
headers?: { key: string; value: string }[];
secret?: string;
retryCount?: number;
timeout?: number;
}
interface PermissionActionSet {
  create: boolean;
  edit: boolean;
  view: boolean;
  delete: boolean;
}

interface ModulePermission extends PermissionActionSet {
  moduleId: string;
}

interface SystemModule {
  id: string;
  name: string;
  category: string;
}

interface UserGroup {
  id: string;
  name: string;
  description: string;
  permissions: ModulePermission[];
}

interface UserAccessOverride {
  moduleId: string;
  actions: PermissionActionSet;
}

interface UserAccessEntry {
  userId: string;
  username: string;
  displayName?: string;
  groups: string[];
  overrides: UserAccessOverride[];
}

interface UserManagementSettings {
  selfRegistration: boolean;
  emailVerification: boolean;
  defaultRole: string;
  permissionCatalog: SystemModule[];
  userGroups: UserGroup[];
  userAccess: UserAccessEntry[];
}
interface BackupSettings {
autoBackup: boolean;
backupSchedule: 'daily' | 'weekly' | 'monthly';
backupRetention: number;
compressionEnabled: boolean;
encryptionEnabled: boolean;
cloudBackup: boolean;
cloudProvider: 'none' | 'google' | 'azure' | 'aws';
cloudCredentials: CloudCredentials;
}
interface CloudCredentials {
accessKey: string;
secretKey: string;
region: string;
bucket: string;
}
interface LoggingSettings {
logLevel: 'error' | 'warn' | 'info' | 'debug';
logToFile: boolean;
logToDatabase: boolean;
maxLogSize: number;
logRetention: number;
logCategories: string[];
}
interface InventoryLimit {
siteId: string;
tankId: string;
productId: string;
minAmount: number;
maxAmount: number;
}
interface LogEntry {
timestamp: string;
level: 'error' | 'warn' | 'info' | 'debug';
category: string;
message: string;
details?: string;
}
// Enhanced User Activity Log Interface
interface UserActivityLog {
id: string;
userId: string;
userName: string;
userEmail: string;
action: string;
actionType: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'settings';
timestamp: string;
ipAddress: string;
userAgent: string;
details?: string;
category: 'system' | 'security' | 'inventory' | 'user' | 'reporting' | 'settings' | 'integration';
status: 'success' | 'failed' | 'warning';
}
// Enhanced Sync Settings Interface
interface SyncSettings {
syncMode: 'manual' | 'automatic' | 'conditional';
syncTime: string; // فرمت HH:MM
excelExportPath: string;
lastSyncTime: string | null;
syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'warning';
microsoftFinanceOps: {
enabled: boolean;
endpoint: string;
apiKey: string;
databaseName: string;
tableName: string;
useCompression: boolean;
batchProcessing: boolean;
batchSize: number;
};
powerBI: {
enabled: boolean;
workspaceId: string;
datasetId: string;
apiKey: string;
refreshInterval: number; // in minutes
autoRefresh: boolean;
incrementalRefresh: boolean;
dataMapping: {
sourceField: string;
targetField: string;
transformFunction?: string;
}[];
};
apiSettings: {
enabled: boolean;
apiKey: string;
allowExternalAccess: boolean;
rateLimitPerMinute: number;
timeoutSeconds: number;
retryAttempts: number;
externalApis: ExternalApi[];
};
conditionalSync: {
enabled: boolean;
conditions: SyncCondition[];
};
integration: IntegrationSettings;
}
interface SyncCondition {
id: string;
name: string;
field: string;
operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
value: string;
active: boolean;
}
interface ExternalApi {
id: string;
name: string;
endpoint: string;
apiKey: string;
enabled: boolean;
lastSync: string | null;
}
const initialSettings: AppSettings = {
// Server Settings
serverAddress: 'localhost',
serverPort: 3000,
dataStoragePath: '/data/warehouse',
maxConnections: 1000,
sslEnabled: false,
backupPath: '/backup/warehouse',
// Theme Settings
theme: 'Microsoft Dynamic 365',
// Workflow Settings
workflowEnabled: false,
autoApproveSmallOrders: false,
maxOrderAmount: 1000000,
orderApprovalLevels: 2,
// Security Settings
security: {
maxFailedAttempts: 3,
sessionTimeoutMinutes: 60,
passwordPolicy: {
minLength: 8,
requireUppercase: true,
requireLowercase: true,
requireNumbers: true,
requireSpecialChars: true,
expireDays: 90,
preventReuse: 5
},
twoFactorAuth: false,
ipWhitelist: [],
sessionHistory: true,
encryptionEnabled: true,
auditLogEnabled: true
},
// Performance Settings
  performance: {
  cacheEnabled: true,
  cacheSize: 512,
  autoOptimize: true,
  dataCompression: true,
  lazyLoading: true,
  maxUploadSize: 10,
    connectionTimeout: 30,
    automaticLoss: true,
    requireReceiptExtraInfo: {
    consignment: false,
    owned: false
  },
  requireDeliveryExtraInfo: {
    consignment: false,
    owned: false
  },
  requireConsignmentDeliveryExtraInfo: false,
  requireOwnedDeliveryExtraInfo: false
},
// Integration Settings
integration: {
erpEnabled: false,
erpEndpoint: '',
accountingEnabled: false,
accountingEndpoint: '',
crmEnabled: false,
crmEndpoint: '',
biEnabled: false,
biEndpoint: '',
apiEnabled: false,
apiKey: '',
webhooks: []
},
// User Management
userManagement: {
  selfRegistration: false,
  emailVerification: true,
  defaultRole: 'admin',
  automaticLoss: true,
  permissionCatalog: [
  { id: 'dashboard', name: 'داشبورد', category: 'داشبورد' },
  { id: 'base_data', name: 'اطلاعات پایه', category: 'اطلاعات پایه' },
  { id: 'consignment_receipt', name: 'رسید انبار امانی', category: 'انبار' },
  { id: 'ownership_receipt', name: 'رسید انبار تملیکی', category: 'انبار' },
  { id: 'consignment_delivery', name: 'حواله اماني', category: 'انبار' },
  { id: 'ownership_delivery', name: 'حواله تملکي', category: 'انبار' },
  { id: 'warehouse_delivery', name: 'تحويل/ارسال انبار', category: 'انبار' },
  { id: 'inventory_adjustment', name: 'کسر/اضافه انبار', category: 'انبار' },
  { id: 'product_conversion', name: 'تبدیل کالا', category: 'انبار' },
  { id: 'invoice', name: 'صدور فاکتور', category: 'مالی' },
  { id: 'inventory_ledger', name: 'کاردکس موجودی', category: 'گزارش' },
  { id: 'analytics', name: 'تحلیل و بررسی', category: 'گزارش' },
  { id: 'contracts', name: 'مديريت قراردادها', category: 'قراردادها' },
  { id: 'correspondence', name: 'مکاتبات', category: 'سیستم' },
  { id: 'user_management', name: 'مدیریت کاربران', category: 'سیستم' },
  { id: 'settings', name: 'تنظیمات', category: 'سیستم' },
  { id: 'backup', name: 'پشتيبان گيري و بازيابي', category: 'سيستم' },
  { id: 'logging', name: 'لاگ و رويدادها', category: 'سيستم' }
  ],
  userGroups: [
  {
  id: 'admin',
  name: 'مدير سيستم',
  description: 'دسترسي کامل به تمام بخش‌ها',
  permissions: [
  { moduleId: 'dashboard', create: true, edit: true, view: true, delete: true },
  { moduleId: 'base_data', create: true, edit: true, view: true, delete: true },
  { moduleId: 'consignment_receipt', create: true, edit: true, view: true, delete: true },
  { moduleId: 'ownership_receipt', create: true, edit: true, view: true, delete: true },
  { moduleId: 'consignment_delivery', create: true, edit: true, view: true, delete: true },
  { moduleId: 'ownership_delivery', create: true, edit: true, view: true, delete: true },
  { moduleId: 'warehouse_delivery', create: true, edit: true, view: true, delete: true },
  { moduleId: 'inventory_adjustment', create: true, edit: true, view: true, delete: true },
  { moduleId: 'product_conversion', create: true, edit: true, view: true, delete: true },
  { moduleId: 'invoice', create: true, edit: true, view: true, delete: true },
  { moduleId: 'inventory_ledger', create: true, edit: true, view: true, delete: true },
  { moduleId: 'analytics', create: true, edit: true, view: true, delete: true },
  { moduleId: 'contracts', create: true, edit: true, view: true, delete: true },
  { moduleId: 'correspondence', create: true, edit: true, view: true, delete: true },
  { moduleId: 'user_management', create: true, edit: true, view: true, delete: true },
  { moduleId: 'settings', create: true, edit: true, view: true, delete: true },
  { moduleId: 'backup', create: true, edit: true, view: true, delete: true },
  { moduleId: 'logging', create: true, edit: true, view: true, delete: true }
  ]
  },
  {
  id: 'finance',
  name: 'گروه مالي',
  description: 'تمرين دسترسي مالي و گزارشات',
  permissions: [
  { moduleId: 'contracts', create: true, edit: true, view: true, delete: false },
  { moduleId: 'inventory_reports', create: false, edit: false, view: true, delete: false },
  { moduleId: 'logging', create: false, edit: false, view: true, delete: false }
  ]
  },
  {
  id: 'planning',
  name: 'گروه برنامه‌ريزي',
  description: 'دسترسي برنامه‌ريزي عمليات و موجودي',
  permissions: [
  { moduleId: 'consignment_delivery', create: true, edit: true, view: true, delete: false },
  { moduleId: 'ownership_delivery', create: true, edit: true, view: true, delete: false },
  { moduleId: 'inventory_adjustment', create: false, edit: true, view: true, delete: false }
  ]
  },
  {
  id: 'warehouse',
  name: 'گروه انبار',
  description: 'دسترسي عمليات روزمره انبار',
  permissions: [
  { moduleId: 'warehouse_delivery', create: true, edit: true, view: true, delete: false },
  { moduleId: 'consignment_delivery', create: true, edit: true, view: true, delete: false },
  { moduleId: 'inventory_reports', create: false, edit: false, view: true, delete: false }
  ]
  }
  ],
  userAccess: []
  },
// Backup & Recovery
backup: {
autoBackup: true,
backupSchedule: 'daily',
backupRetention: 30,
compressionEnabled: true,
encryptionEnabled: true,
cloudBackup: false,
cloudProvider: 'none',
cloudCredentials: {
accessKey: '',
secretKey: '',
region: '',
bucket: ''
}
},
// System Logs
logging: {
logLevel: 'info',
logToFile: true,
logToDatabase: true,
maxLogSize: 100,
logRetention: 90,
logCategories: ['system', 'security', 'inventory', 'user']
},
// Inventory Limits
inventoryLimits: [],
// Enhanced Sync Settings
sync: {
syncMode: 'manual',
syncTime: '00:00',
excelExportPath: '/exports/sync',
lastSyncTime: null,
syncStatus: 'idle',
microsoftFinanceOps: {
enabled: false,
endpoint: '',
apiKey: '',
databaseName: '',
tableName: '',
useCompression: true,
batchProcessing: true,
batchSize: 1000
},
powerBI: {
enabled: false,
workspaceId: '',
datasetId: '',
apiKey: '',
refreshInterval: 60,
autoRefresh: false,
incrementalRefresh: true,
dataMapping: []
},
apiSettings: {
enabled: false,
apiKey: '',
allowExternalAccess: false,
rateLimitPerMinute: 60,
timeoutSeconds: 30,
retryAttempts: 3,
externalApis: []
},
conditionalSync: {
enabled: false,
conditions: []
},
integration: {
erpEnabled: false,
erpEndpoint: '',
accountingEnabled: false,
accountingEndpoint: '',
crmEnabled: false,
crmEndpoint: '',
biEnabled: false,
biEndpoint: '',
apiEnabled: false,
apiKey: '',
webhooks: []
}
}
};

interface SettingsManagerProps {
  settings?: AppSettings;
  setSettings?: (settings: AppSettings) => void;
  applySettings?: (settings: AppSettings) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings: externalSettings,
  setSettings: externalSetSettings,
  applySettings: externalApplySettings
}) => {
const [settings, setSettings] = useState<AppSettings>(externalSettings || initialSettings);
const [activeTab, setActiveTab] = useState<string>('server');
const [testResults, setTestResults] = useState<Record<string, boolean>>({});
const [isLoading, setIsLoading] = useState<boolean>(false);
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
const [logs, setLogs] = useState<LogEntry[]>([]);
const [userActivityLogs, setUserActivityLogs] = useState<UserActivityLog[]>([]);
const [showLogViewer, setShowLogViewer] = useState<boolean>(false);
  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    loadLogs();
    loadUserActivityLogs();

    // Listen for new user activity logs
    const handleNewActivity = (event: any) => {
      const newActivity = event.detail;
      setUserActivityLogs(prev => [newActivity, ...prev].slice(0, 1000));
    };

    window.addEventListener('user-activity-logged', handleNewActivity);
    return () => window.removeEventListener('user-activity-logged', handleNewActivity);
  }, []);
const loadSettings = async () => {
  try {
    // ۱) تلاش برای بارگذاری از سرور (SQLite API) در صورت در دسترس بودن
    const remoteSettings = await loadAppSettingsFromServer();
    if (remoteSettings) {
      const finalRemote: AppSettings = {
        ...initialSettings,
        ...(remoteSettings as AppSettings),
        theme: (remoteSettings as any).theme || 'Microsoft Dynamic 365',
      };
      setSettings(finalRemote);
      if (externalSetSettings) {
        externalSetSettings(finalRemote);
      }
      if (externalApplySettings) {
        externalApplySettings(finalRemote);
      } else {
        applySettings(finalRemote);
      }
      return; // چون از سرور بارگذاری شد، دیگر نیاز به fallback نیست
    }

    // ۲) اگر از سرور چیزی نبود، از localStorage (DataStorage) استفاده می‌کنیم
      const storage = DataStorage.getInstance();
      const savedSettings = storage.loadData('settings') as AppSettings | null;
      if (savedSettings) {
        // Ensure all top-level properties from initialSettings are present
        // and do a shallow merge for second-level objects to prevent undefined errors
        const finalSettings: AppSettings = { 
          ...initialSettings, 
          ...savedSettings,
          security: { ...initialSettings.security, ...(savedSettings.security || {}) },
          performance: { ...initialSettings.performance, ...(savedSettings.performance || {}) },
          integration: { ...initialSettings.integration, ...(savedSettings.integration || {}) },
          userManagement: { ...initialSettings.userManagement, ...(savedSettings.userManagement || {}) },
          backup: { ...initialSettings.backup, ...(savedSettings.backup || {}) },
          logging: { ...initialSettings.logging, ...(savedSettings.logging || {}) },
          sync: { ...initialSettings.sync, ...(savedSettings.sync || {}) },
          theme: (savedSettings as any).theme || 'Microsoft Dynamic 365'
        };
        setSettings(finalSettings);

      if (externalSetSettings) {
        externalSetSettings(finalSettings);
      }
      // Apply loaded settings immediately
      if (externalApplySettings) {
        externalApplySettings(finalSettings);
      } else {
        applySettings(finalSettings);
      }
    } else if (externalSettings) {
      // فقط اگر هیچ تنظیم ذخیره‌شده‌ای وجود نداشت، از props اولیه استفاده کن
      setSettings(externalSettings);
      if (externalApplySettings) {
        externalApplySettings(externalSettings);
      } else {
        applySettings(externalSettings);
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    // Use external settings if available, otherwise use initial
    if (externalSettings) {
      setSettings(externalSettings);
    } else {
      setSettings(initialSettings);
    }
  }
};
const loadLogs = () => {
try {
// Generate sample logs for demonstration
const sampleLogs: LogEntry[] = [
{
timestamp: new Date(Date.now() - 3600000).toISOString(),
level: 'info',
category: 'system',
message: 'سيستم با موفقيت راه‌اندازی شد'
},
{
timestamp: new Date(Date.now() - 1800000).toISOString(),
level: 'warn',
category: 'security',
message: 'تلاش برای ورود ناموفق از آدرس IP: 192.168.1.100'
},
{
timestamp: new Date(Date.now() - 600000).toISOString(),
level: 'error',
category: 'database',
message: 'خطا در اتصال به پایگاه داده',
details: 'Connection timeout after 30 seconds'
},
{
timestamp: new Date(Date.now() - 300000).toISOString(),
level: 'info',
category: 'user',
message: 'کاربر جدید با نام کاربری admin ایجاد شد'
},
{
timestamp: new Date().toISOString(),
level: 'debug',
category: 'performance',
message: 'پرس‌وجوی پایگاه داده در 120 میلی‌ثانیه اجرا شد'
}
];
setLogs(sampleLogs);
} catch (error) {
console.error('Error loading logs:', error);
}
};
  const loadUserActivityLogs = () => {
    try {
      const storage = DataStorage.getInstance();
      const storedActivities = storage.loadData('userActivities') as UserActivityLog[] | null;
      if (storedActivities && Array.isArray(storedActivities)) {
        setUserActivityLogs(storedActivities);
      } else {
        // Fallback to sample data only if no real data exists
        const sampleLogs: UserActivityLog[] = [
          {
            id: '1',
            userId: 'admin',
            userName: 'مدیر سیستم',
            userEmail: 'admin@example.com',
            action: 'ورود به سیستم',
            actionType: 'login',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            category: 'security',
            status: 'success'
          }
        ];
        setUserActivityLogs(sampleLogs);
      }
    } catch (error) {
      console.error('Error loading user activity logs:', error);
    }
  };
// Apply settings function
const applySettings = (settingsToApply: AppSettings) => {
// Apply theme changes immediately
const theme = settingsToApply.theme;
console.log(`🎨 تم فعال: ${theme}`);
// Apply theme to document
document.documentElement.setAttribute('data-theme', theme);
// Apply language settings
document.documentElement.lang = 'fa'; // Persian is default
// Apply currency settings
document.documentElement.setAttribute('data-currency', 'rial'); // Rial is default
// Apply calendar settings
document.documentElement.setAttribute('data-calendar', 'persian'); // Persian calendar is default
// Apply date format
document.documentElement.setAttribute('data-date-format', 'yyyy/MM/dd');
// Apply time format
document.documentElement.setAttribute('data-time-format', '24h');
};
const tabs = [
{ id: 'server', name: 'تنظيمات سرور', icon: Server },
{ id: 'database', name: 'پايگاه داده', icon: Database },
{ id: 'security', name: 'امنيت', icon: Shield },
{ id: 'workflow', name: 'گردش کار', icon: Workflow },
{ id: 'performance', name: 'عملکرد', icon: Zap },
{ id: 'users', name: 'کاربران', icon: Users },
{ id: 'backup', name: 'پشتيبان', icon: HardDrive },
{ id: 'logging', name: 'لاگ‌ها', icon: FileText },
{ id: 'sync', name: 'همگام‌سازی', icon: RefreshCw },
{ id: 'update', name: 'بروز رسانی', icon: ArrowUpCircle },
{ id: 'general', name: 'عمومي', icon: Settings }
];

// Debug: بررسی تعداد تب‌ها
console.log('🔍 تعداد تب‌ها:', tabs.length, 'تب‌ها:', tabs.map(t => t.name));
const handleSave = async () => {
setIsLoading(true);
setSaveStatus('saving');
try {
const storage = DataStorage.getInstance();
await storage.saveData('settings', settings);
// ذخیره موازی در سرور تنظیمات (در صورت در دسترس بودن)
saveAppSettingsToServer(settings).catch((err) => {
  console.warn('ذخیره تنظیمات در سرور با خطا مواجه شد (اما در localStorage ذخیره شد):', err);
});
// Apply settings immediately
applySettings(settings);
// Save theme to localStorage with key 'app-theme' for ThemeProvider
if (settings.theme) {
  try {
    localStorage.setItem('app-theme', settings.theme);
    console.log(`💾 تم "${settings.theme}" در localStorage با کلید 'app-theme' ذخیره شد (از handleSave)`);
    
    // Dispatch custom event to notify ThemeProvider about theme change
    window.dispatchEvent(new CustomEvent('theme-change', {
      detail: { theme: settings.theme }
    }));
    
    // Also trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'app-theme',
      newValue: settings.theme,
      storageArea: localStorage
    }));
    
    console.log('🔄 Event برای به‌روزرسانی تم در تمام صفحات ارسال شد');
  } catch (error) {
    console.error('Error saving theme to localStorage:', error);
  }
}
setSaveStatus('success');
setTimeout(() => setSaveStatus('idle'), 3000);
} catch (error) {
console.error('Error saving settings:', error);
setSaveStatus('error');
setTimeout(() => setSaveStatus('idle'), 3000);
} finally {
setIsLoading(false);
}
};

// ذخیره خودکار تنظیمات هنگام خروج از صفحه/بستن برنامه
useEffect(() => {
  const handleBeforeUnload = () => {
    try {
      const storage = DataStorage.getInstance();
      storage.saveData('settings', settings);
      // تلاش برای sync با سرور تنظیمات (اگر در دسترس باشد)
      saveAppSettingsToServer(settings).catch(() => {
        // اگر سرور در دسترس نبود، فقط localStorage کافی است
      });
    } catch (e) {
      // در رویداد beforeunload نباید خطا پرتاب کنیم
      console.warn('خطا در ذخیره خودکار تنظیمات قبل از خروج:', e);
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [settings]);
const selectFolder = async (type: 'data' | 'backup') => {
try {
// Check if File System Access API is available
if ('showDirectoryPicker' in window) {
const dirHandle = await (window as any).showDirectoryPicker();
const path = dirHandle.name;
if (type === 'data') {
setSettings({ ...settings, dataStoragePath: path });
} else {
setSettings({ ...settings, backupPath: path });
}
} else {
// Fallback to prompt for older browsers
const path = prompt(`لطفا مسير ${type === 'data' ? 'ذخيره سازي داده ها' : 'پشتيبان گيري'} را وارد کنید:`, 
type === 'data' ? settings.dataStoragePath : settings.backupPath);
if (path) {
if (type === 'data') {
setSettings({ ...settings, dataStoragePath: path });
} else {
setSettings({ ...settings, backupPath: path });
}
}
}
} catch (error) {
console.error('Error selecting folder:', error);
alert('خطا در انتخاب پوشه');
}
};
const createBackup = async () => {
setIsLoading(true);
try {
const storage = DataStorage.getInstance();
const allData = storage.getAllData();
// Create backup file
const backupData = {
timestamp: new Date().toISOString(),
version: '1.0.0',
settings: settings,
data: allData
};
// Create proper JSON backup
const jsonStr = JSON.stringify(backupData, null, 2);
const BOM = '\uFEFF';
const blob = new Blob([BOM + jsonStr], { 
type: 'application/json;charset=utf-8' 
});
// Try to save to the specified path
if ('showSaveFilePicker' in window) {
try {
const fileHandle = await (window as any).showSaveFilePicker({
suggestedName: `warehouse_backup_${new Date().toISOString().split('T')[0]}.json`,
types: [
{
description: 'JSON files',
accept: {
'application/json': ['.json'],
},
},
],
});
const writable = await fileHandle.createWritable();
await writable.write(blob);
await writable.close();
alert(`فايل پشتيبان با موفقيت ايجاد شد در مسير: ${fileHandle.name}`);
} catch (err) {
console.error('Error saving file:', err);
// Fallback to download
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `warehouse_backup_${new Date().toISOString().split('T')[0]}.json`;
link.click();
alert('فايل پشتيبان با موفقيت ايجاد شد و براي دانلود آماده شد');
}
} else {
// Fallback to download
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `warehouse_backup_${new Date().toISOString().split('T')[0]}.json`;
link.click();
alert('فايل پشتيبان با موفقيت ايجاد شد و براي دانلود آماده شد');
}
} catch (error) {
console.error('Backup error:', error);
alert('خطا در ايجاد فايل پشتيبان');
} finally {
setIsLoading(false);
}
};
const restoreBackup = () => {
const input = document.createElement('input');
input.type = 'file';
input.accept = '.json';
input.onchange = (e) => {
const file = (e.target as HTMLInputElement).files?.[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (event) => {
try {
const backupData = JSON.parse(event.target?.result as string);
if (backupData.settings) {
setSettings(backupData.settings);
applySettings(backupData.settings);
alert('تنظيمات با موفقيت بازيابي شد');
} else {
alert('فايل پشتيبان معتبر نيست');
}
} catch (error) {
console.error('Restore error:', error);
alert('خطا در بازيابي فايل پشتيبان');
}
};
reader.readAsText(file);
};
input.click();
};
const resetSettings = () => {
if (confirm('آيا از بازنشاني تنظيمات به حالت پيش‌فرض اطمينان داريد؟')) {
setSettings(initialSettings);
applySettings(initialSettings);
alert('تنظيمات به حالت پيش‌فرض بازنشاني شد');
}
};
const clearCache = () => {
if (confirm('آيا از پاک کردن کش اطمينان داريد؟')) {
try {
// Clear localStorage
localStorage.clear();
// Clear service worker cache if available
if ('caches' in window) {
caches.keys().then(cacheNames => {
cacheNames.forEach(cacheName => {
caches.delete(cacheName);
});
});
}
// Clear IndexedDB if available
if ('indexedDB' in window) {
indexedDB.databases().then(databases => {
databases.forEach(db => {
indexedDB.deleteDatabase(db.name!);
});
});
}
alert('کش با موفقيت پاک شد');
} catch (error) {
console.error('Clear cache error:', error);
alert('خطا در پاک کردن کش');
}
}
};
const downloadLogs = () => {
try {
// Create log file content
const logContent = logs.map(log => {
return `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.details ? ` - ${log.details}` : ''}`;
}).join('\n');
const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = `system_logs_${new Date().toISOString().split('T')[0]}.log`;
link.click();
alert('لاگ‌ها با موفقيت دانلود شدند');
} catch (error) {
console.error('Download logs error:', error);
alert('خطا در دانلود لاگ‌ها');
}
};
// تابع رندر محتواي تب‌ها
const renderTabContent = () => {
switch (activeTab) {
case 'server': 
return (
<ServerSettings 
settings={settings}
setSettings={setSettings}
isLoading={isLoading}
testResults={testResults}
setTestResults={setTestResults}
/>
);
case 'database': 
return (
<DatabaseSettings 
settings={settings}
setSettings={setSettings}
isLoading={isLoading}
testResults={testResults}
setTestResults={setTestResults}
selectFolder={selectFolder}
/>
);
case 'security': 
return (
<SecuritySettings 
settings={settings}
setSettings={setSettings}
/>
);
case 'workflow': 
return (
<WorkflowSettings 
settings={settings}
setSettings={setSettings}
/>
);
case 'performance': 
return (
<PerformanceAndReportingSettings 
settings={settings}
setSettings={setSettings}
/>
);
case 'users': 
return (
<UserManagementSettings 
settings={settings}
setSettings={setSettings}
/>
);
case 'backup': 
return (
<BackupSettings 
settings={settings}
setSettings={setSettings}
isLoading={isLoading}
createBackup={createBackup}
restoreBackup={restoreBackup}
/>
);
case 'logging': 
return (
<LoggingSettings 
settings={settings}
setSettings={setSettings}
userActivityLogs={userActivityLogs}
showLogViewer={showLogViewer}
setShowLogViewer={setShowLogViewer}
downloadLogs={downloadLogs}
/>
);
case 'sync': 
return (
<SyncSettings 
settings={settings}
setSettings={setSettings}
isLoading={isLoading}
setIsLoading={setIsLoading}
formatPersianDate={formatPersianDate}
/>
);
case 'update': 
return (
<UpdateSettings 
settings={settings}
setSettings={setSettings}
/>
);
case 'general': 
return (
<GeneralAppearanceAndNotificationsSettings 
settings={settings}
setSettings={setSettings}
applySettings={applySettings}
/>
);
default: 
return (
<ServerSettings 
settings={settings}
setSettings={setSettings}
isLoading={isLoading}
testResults={testResults}
setTestResults={setTestResults}
/>
);
}
};
return (
<div className="min-h-screen bg-gray-50 p-4 md:p-8">
<div className="max-w-6xl mx-auto">
<div className="bg-white rounded-xl shadow-lg overflow-hidden">
<div className="p-6 border-b border-gray-200">
<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
<Settings className="h-6 w-6" />
مديريت تنظيمات سيستم
</h1>
<p className="text-gray-600 mt-1">تنظيمات مختلف سيستم را مديريت و پيکربندي کنيد</p>
</div>
<div className="flex flex-col md:flex-row">
{/* تب‌ها */}
<div className="w-full md:w-64 bg-gray-50 border-r border-gray-200">
<nav className="p-2 space-y-1">
{tabs.map((tab) => (
<button
key={tab.id}
onClick={() => setActiveTab(tab.id)}
className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
activeTab === tab.id
? 'bg-blue-100 text-blue-700'
: 'text-gray-700 hover:bg-gray-100'
}`}
>
<tab.icon className="h-5 w-5" />
{tab.name}
</button>
))}
</nav>
</div>
{/* محتواي تب فعال */}
<div className="flex-1 p-6">
<div className="mb-6">
<h2 className="text-xl font-semibold text-gray-900">
{tabs.find(tab => tab.id === activeTab)?.name}
</h2>
</div>
<div className="space-y-6">
{renderTabContent()}
</div>
</div>
</div>
{/* دکمه ذخيره */}
<div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
<div>
{saveStatus === 'saving' && (
<span className="text-blue-600 flex items-center gap-2">
<RefreshCw className="h-4 w-4 animate-spin" />
در حال ذخيره‌سازي...
</span>
)}
{saveStatus === 'success' && (
<span className="text-green-600 flex items-center gap-2">
<CheckCircle className="h-4 w-4" />
تنظيمات با موفقيت ذخيره شد
</span>
)}
{saveStatus === 'error' && (
<span className="text-red-600 flex items-center gap-2">
<XCircle className="h-4 w-4" />
خطا در ذخيره‌سازي تنظيمات
</span>
)}
</div>
<button
onClick={handleSave}
disabled={isLoading}
className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
>
<Save className="h-4 w-4" />
ذخيره تنظيمات
</button>
</div>
</div>
</div>
</div>
);
};