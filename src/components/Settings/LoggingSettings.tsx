import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  Database,
  HardDrive,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Maximize2,
  FileSpreadsheet,
  FileCode,
  File,
  Sliders,
  Archive,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  MapPin,
  Smartphone,
  Monitor,
  FolderOpen,
  Folder,
  Edit3,
  Check,
  AlertCircle,
  FolderPlus,
  FolderInput,
  Globe,
  Server,
  Link
} from 'lucide-react';
import { formatPersianDate, formatPersianNumber } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';
import { PersianDatePicker } from '../Common/PersianDatePicker';
import { 
  LoggerService, 
  LogEntry, 
  LogFieldConfig, 
  LogPathConfig, 
  StoragePathConfig, 
  LogFileInfo,
  DEFAULT_LOG_FIELD_CONFIG,
  DEFAULT_LOG_PATH_CONFIG,
  logActivity
} from '../../utils/loggerService';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface LoggingSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  userActivityLogs: any[];
  showLogViewer: boolean;
  setShowLogViewer: (show: boolean) => void;
  downloadLogs: () => void;
}

interface UserActivityEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: string;
  status: 'success' | 'failed' | 'warning';
  details?: any;
  ipAddress: string;
  page: string;
  field?: string;
  selection?: string;
  logType: 'system' | 'user';
  logNature: string;
}

// حالت‌های نمایش فعالیت‌های کاربر
type ActivityViewMode = 
  | 'individual'   // مشاهده لاگ هر کاربر به صورت تکی
  | 'online'       // مشاهده تعداد کاربران آنلاین
  | 'save_only';   // فقط ذخیره در آدرس بدون نمایش

interface ActivityViewSettings {
  viewMode: ActivityViewMode;
  selectedUserId: string | null;  // کاربر انتخاب شده برای مشاهده لاگ‌های تکی
  showInRealTime: boolean;        // نمایش در زمان واقعی
  saveToPath: boolean;            // ذخیره در مسیر انتخابی
  fieldConfig: LogFieldConfig;    // پیکربندی فیلدهای لاگ
}

interface FilterState {
  search: string;
  level: ('error' | 'warn' | 'info' | 'debug')[];
  category: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  userId: string;
}

// دسته‌بندی‌های لاگ برای انتخاب کاربر
interface LogCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const LOG_CATEGORIES: LogCategory[] = [
  { id: 'basic_info', name: 'اطلاعات پایه', icon: 'Database', description: 'لاگ اطلاعات پایه سیستم' },
  { id: 'contracts', name: 'قراردادها', icon: 'FileText', description: 'لاگ قراردادها و توافق‌نامه‌ها' },
  { id: 'receipt', name: 'رسید انبار', icon: 'FolderPlus', description: 'لاگ رسیدهای انبار' },
  { id: 'release', name: 'حواله انبار', icon: 'FolderInput', description: 'لاگ حواله‌های انبار' },
  { id: 'adjustment', name: 'کسر/اضافه انبار', icon: 'TrendingUp', description: 'لاگ کسر و اضافه انبار' },
  { id: 'conversion', name: 'تبدیل کالا', icon: 'RefreshCw', description: 'لاگ تبدیل کالاها' },
  { id: 'invoice', name: 'صدور فاکتور', icon: 'FileSpreadsheet', description: 'لاگ صدور فاکتورها' },
  { id: 'correspondence', name: 'مکاتبات', icon: 'Mail', description: 'لاگ مکاتبات سیستم' },
  { id: 'users', name: 'مدیریت کاربران', icon: 'Users', description: 'لاگ مدیریت کاربران' },
  { id: 'settings', name: 'تنظیمات', icon: 'Settings', description: 'لاگ تغییرات تنظیمات' }
];

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_STORAGE_PATH_CONFIG: StoragePathConfig = {
  type: 'local',
  localPath: 'C:\\Logs\\Makhazen',
  serverUrl: '',
  serverHost: ''
};

const DEFAULT_ACTIVITY_VIEW_SETTINGS: ActivityViewSettings = {
  viewMode: 'individual',
  selectedUserId: null,
  showInRealTime: true,
  saveToPath: true,
  fieldConfig: DEFAULT_LOG_FIELD_CONFIG
};

// ============================================================================
// Main Component
// ============================================================================

export const LoggingSettings: React.FC<LoggingSettingsProps> = ({
  settings,
  setSettings,
  userActivityLogs,
  showLogViewer,
  setShowLogViewer,
  downloadLogs: originalDownloadLogs
}) => {
  const storage = DataStorage.getInstance();
  const logger = LoggerService.getInstance();
  
  // State management
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'viewer' | 'path'>(showLogViewer ? 'viewer' : 'settings');
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(50);
  const [expandedSections, setExpandedSections] = useState<string[]>(['general', 'path', 'fieldConfig']);
  const [showFilters, setShowFilters] = useState(false);
  
  // Path configuration state
  const [logPathConfig, setLogPathConfig] = useState<LogPathConfig>(DEFAULT_LOG_PATH_CONFIG);
  const [storagePathConfig, setStoragePathConfig] = useState<StoragePathConfig>(DEFAULT_STORAGE_PATH_CONFIG);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [tempPath, setTempPath] = useState('');
  const [pathValidationError, setPathValidationError] = useState('');
  const [pathSuccess, setPathSuccess] = useState(false);
  const [logFiles, setLogFiles] = useState<LogFileInfo[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    level: ['error', 'warn', 'info', 'debug'],
    category: [],
    dateFrom: null,
    dateTo: null,
    userId: ''
  });

  // Folder picker ref
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  
  // Activity view settings state
  const [activityViewSettings, setActivityViewSettings] = useState<ActivityViewSettings>(DEFAULT_ACTIVITY_VIEW_SETTINGS);

  const updateLoggingSettings = (updates: any) => {
    setSettings({
      ...settings,
      logging: {
        ...settings.logging,
        ...updates
      }
    });
  };

  // Available users for individual view mode
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([]);
  
  // Online users count (simulated)
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  // ============================================================================
  // Path Configuration Functions
  // ============================================================================

  const updatePathConfig = (updates: Partial<LogPathConfig>) => {
    const newConfig = { ...logPathConfig, ...updates };
    setLogPathConfig(newConfig);
    logger.setConfig(newConfig);
    storage.saveData('logPathConfig', newConfig);
  };

  const updateStoragePathConfig = (updates: Partial<StoragePathConfig>) => {
    const newConfig = { ...storagePathConfig, ...updates };
    setStoragePathConfig(newConfig);
    logger.setStorageConfig(newConfig);
    storage.saveData('storagePathConfig', newConfig);
  };

  const handleSelectPath = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const selectedPath = dirHandle.name;
        updateStoragePathConfig({ localPath: selectedPath });
        setPathSuccess(true);
        setTimeout(() => setPathSuccess(false), 3000);
      } else {
        const path = prompt('لطفا مسیر کامل پوشه ذخیره‌سازی را وارد کنید:', storagePathConfig.localPath);
        if (path) {
          updateStoragePathConfig({ localPath: path });
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        alert('خطا در انتخاب پوشه');
      }
    }
  };

  const selectServerPath = () => {
    const url = prompt('لطفا آدرس سایت یا هاست را وارد کنید:', storagePathConfig.serverUrl);
    if (url) updateStoragePathConfig({ serverUrl: url });
  };

  // ============================================================================
  // Log Management Functions
  // ============================================================================

  const refreshLogFiles = useCallback(async () => {
    const files = await logger.getLogFiles();
    setLogFiles(files);
  }, [logger]);

  const loadLogs = useCallback(async () => {
    try {
      const activityLogs = storage.loadData('userActivities') as any[] | null;
      const systemLogs = storage.loadData('systemLogs') as LogEntry[] | null;
      
      const formattedActivityLogs = (activityLogs || []).map(log => ({
        ...log,
        level: log.status === 'failed' ? 'error' : log.status === 'warning' ? 'warn' : 'info',
        logType: 'user',
        logNature: log.status === 'failed' ? 'error' : log.status === 'warning' ? 'warn' : 'info'
      }));

      const combined = [...(formattedActivityLogs), ...(systemLogs || [])];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      const sorted = unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(sorted as LogEntry[]);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }, [storage]);

  useEffect(() => {
    loadLogs();
    refreshLogFiles();
    const interval = setInterval(() => {
      if (realTimeMode) {
        loadLogs();
        refreshLogFiles();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadLogs, refreshLogFiles, realTimeMode]);

  const applyFilters = useCallback(() => {
    let filtered = [...logs];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(l => 
        l.message.toLowerCase().includes(s) || 
        l.userName?.toLowerCase().includes(s) ||
        l.page?.toLowerCase().includes(s)
      );
    }
    if (filters.level.length < 4) filtered = filtered.filter(l => filters.level.includes(l.level));
    if (filters.dateFrom) filtered = filtered.filter(l => new Date(l.timestamp) >= filters.dateFrom!);
    if (filters.dateTo) filtered = filtered.filter(l => new Date(l.timestamp) <= filters.dateTo!);
    if (filters.userId) filtered = filtered.filter(l => l.userId === filters.userId);
    
    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleExportToExcel = useCallback(() => {
    if (filteredLogs.length === 0) {
      alert('هیچ لاگی برای خروجی گرفتن وجود ندارد');
      return;
    }

    try {
      const worksheetData = filteredLogs.map(log => ({
        'نام کاربری': log.userName || '-',
        'تاریخ': formatPersianDate(new Date(log.timestamp)),
        'ساعت': new Date(log.timestamp).toLocaleTimeString('fa-IR'),
        'صفحه عملکرد': log.page || '-',
        'منو / فیلد': log.field || '-',
        'گزینه انتخاب شده': log.selection || log.message,
        'نوع لاگ': log.logType === 'user' ? 'کاربری' : 'سیستمی',
        'جنس لاگ': log.level === 'error' ? 'خطا' : log.level === 'warn' ? 'هشدار' : 'عملکردی',
        'آدرس IP': log.ipAddress || '-',
        'جزئیات': log.details || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'لاگ‌های سیستم');
      XLSX.writeFile(workbook, `system_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('خطا در تهیه فایل اکسل');
    }
  }, [filteredLogs]);

  const clearAllLogs = async () => {
    if (confirm('آیا از پاک کردن تمام لاگ‌ها اطمینان دارید؟')) {
      storage.saveData('systemLogs', []);
      storage.saveData('userActivities', []);
      setLogs([]);
      alert('تمام لاگ‌ها پاک شدند');
    }
  };

  const deleteLogFile = async (path: string) => {
    if (confirm('آیا از حذف این فایل لاگ اطمینان دارید؟')) {
      const key = `logfile_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.removeItem(key);
      localStorage.removeItem(`logmeta_${path.replace(/[^a-zA-Z0-9]/g, '_')}`);
      refreshLogFiles();
    }
  };

  const downloadLogFile = async (file: LogFileInfo) => {
    const content = await logger.readLogFile(file.path);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'log.txt';
    a.click();
  };

  const updateActivityViewSettings = (updates: Partial<ActivityViewSettings>) => {
    const newSettings = { ...activityViewSettings, ...updates };
    setActivityViewSettings(newSettings);
    storage.saveData('activityViewSettings', newSettings);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warn': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);
  const selectedCategories = settings.logging?.activeCategories || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            مدیریت لاگ‌ها و فعالیت‌های سیستم
          </h3>
          
          <div className="flex items-center gap-3">
            {/* Real-time Status Indicator */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              realTimeMode 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                realTimeMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {realTimeMode ? 'مشاهده زنده لاگ فعال' : 'مشاهده زنده لاگ غیرفعال'}
              </span>
            </div>
            
            {/* Toggle Real-time Mode */}
            <button
              onClick={() => setRealTimeMode(!realTimeMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                realTimeMode 
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {realTimeMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {realTimeMode ? 'غیرفعال کردن' : 'فعال کردن'}
            </button>
            
            <button
              onClick={() => {
                loadLogs();
                refreshLogFiles();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow-md"
            >
              <RefreshCw className="h-4 w-4" />
              بروزرسانی
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-gray-600">لاگ‌ها:</span>
            <span className="font-semibold text-gray-900">{filteredLogs.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-600">فعالیت‌ها:</span>
            <span className="font-semibold text-gray-900">{userActivityLogs.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">مسیر:</span>
            <span className="font-mono text-gray-900 text-xs">
              {storagePathConfig.type === 'local' ? storagePathConfig.localPath : 'سرور'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto mt-4 pt-2">
          <button
            onClick={() => setActiveTab('path')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'path'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              مسیر ذخیره‌سازی
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              تنظیمات
            </div>
          </button>
          <button
            onClick={() => setActiveTab('viewer')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'viewer'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              مشاهده لاگ‌ها ({filteredLogs.length})
            </div>
          </button>
        </div>
      </div>

      {/* Path Configuration Tab */}

        {activeTab === 'path' && (

          <div className="space-y-6">
            {/* Local Storage Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <HardDrive className="h-6 w-6" />
                  مسیر ذخیره‌سازی محلی
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  تعیین محل ذخیره‌سازی لاگ‌ها روی سیستم لوکال
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    آدرس فولدر ذخیره‌سازی
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={storagePathConfig.localPath}
                      onChange={(e) => updateStoragePathConfig({ localPath: e.target.value })}
                      placeholder="مثال: C:\Logs\Makhazen"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleSelectPath}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      انتخاب فولدر
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Storage Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 bg-gradient-to-r from-green-600 to-green-700">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Globe className="h-6 w-6" />
                  آدرس هاست و سرور
                </h3>
                <p className="text-green-100 text-sm mt-1">
                  تعیین آدرس سایت و هاست برای ذخیره‌سازی ابری لاگ‌ها
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      آدرس سایت یا سرور
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={storagePathConfig.serverUrl}
                        onChange={(e) => updateStoragePathConfig({ serverUrl: e.target.value })}
                        placeholder="مثال: https://logs.mysite.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <button
                        onClick={selectServerPath}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Server className="h-4 w-4" />
                        انتخاب هاست
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      آدرس هاست (IP/Domain)
                    </label>
                    <input
                      type="text"
                      value={storagePathConfig.serverHost}
                      onChange={(e) => updateStoragePathConfig({ serverHost: e.target.value })}
                      placeholder="مثال: 192.168.1.50 یا logs.server.local"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Path Settings */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('path')}
                className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">تنظیمات پیشرفته ذخیره‌سازی</span>
                </div>
                {expandedSections.includes('path') ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.includes('path') && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={logPathConfig.createDailyFiles}
                        onChange={(e) => updatePathConfig({ createDailyFiles: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">ایجاد فایل روزانه</div>
                        <div className="text-sm text-gray-500">ایجاد فایل لاگ جداگانه برای هر روز</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={logPathConfig.compressOldLogs}
                        onChange={(e) => updatePathConfig({ compressOldLogs: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">فشرده‌سازی لاگ‌های قدیمی</div>
                        <div className="text-sm text-gray-500">کاهش حجم فایل‌های قدیمی</div>
                      </div>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">حداکثر تعداد فایل</label>
                      <input
                        type="number"
                        value={logPathConfig.maxFilesPerCategory}
                        onChange={(e) => updatePathConfig({ maxFilesPerCategory: parseInt(e.target.value) || 10 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">تعداد پشتیبان</label>
                      <input
                        type="number"
                        value={logPathConfig.backupCount}
                        onChange={(e) => updatePathConfig({ backupCount: parseInt(e.target.value) || 5 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Existing Log Files */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  فایل‌های لاگ موجود
                </h4>
                <button
                  onClick={refreshLogFiles}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  بروزرسانی
                </button>
              </div>

              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {logFiles.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">فایل لاگی یافت نشد</div>
                ) : (
                  logFiles.map((file, idx) => (
                    <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <FileCode className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.path}</p>
                          <p className="text-xs text-gray-500">{formatPersianNumber(file.entryCount)} ورودی - {Math.round(file.size / 1024)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => downloadLogFile(file)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Download className="h-4 w-4" /></button>
                        <button onClick={() => deleteLogFile(file.path)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* General Log Settings */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('general')}
                className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Sliders className="h-5 w-5 text-indigo-600" />
                  <span className="font-semibold text-gray-900">تنظیمات عمومی لاگ</span>
                </div>
                {expandedSections.includes('general') ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.includes('general') && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">سطح لاگ</label>
                    <select
                      value={settings.logging.logLevel}
                      onChange={(e) => updateLoggingSettings({ logLevel: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="error">خطا (Error)</option>
                      <option value="warn">هشدار (Warning)</option>
                      <option value="info">اطلاعات (Info)</option>
                      <option value="debug">اشکال‌زدایی (Debug)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">مدت نگهداری (روز)</label>
                    <input
                      type="number"
                      value={settings.logging.logRetention}
                      onChange={(e) => updateLoggingSettings({ logRetention: parseInt(e.target.value) || 90 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Log Field Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('fieldConfig')}
                className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-gray-900">پیکربندی فیلدهای لاگ (۷ مورد اصلی)</span>
                </div>
                {expandedSections.includes('fieldConfig') ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.includes('fieldConfig') && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'userName', name: 'نام کاربری', icon: User },
                    { id: 'timestamp', name: 'تاریخ و ساعت', icon: Clock },
                    { id: 'page', name: 'صفحه عملکرد', icon: Monitor },
                    { id: 'field', name: 'منو / فیلد', icon: Edit3 },
                    { id: 'selection', name: 'گزینه انتخاب شده', icon: CheckCircle },
                    { id: 'logType', name: 'نوع لاگ (سیستمی/کاربری)', icon: Database },
                    { id: 'logNature', name: 'جنس لاگ (خطا/هشدار/...)', icon: AlertTriangle },
                    { id: 'ipAddress', name: 'آدرس IP', icon: Globe }
                  ].map((field) => (
                    <label key={field.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(activityViewSettings.fieldConfig as any)[field.id]}
                        onChange={(e) => updateActivityViewSettings({
                          fieldConfig: { ...activityViewSettings.fieldConfig, [field.id]: e.target.checked }
                        })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <field.icon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{field.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Settings */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('viewMode')}
                className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">نحوه نمایش فعالیت‌ها</span>
                </div>
                {expandedSections.includes('viewMode') ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>
              
              {expandedSections.includes('viewMode') && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'individual', name: 'مشاهده تکی', icon: User, desc: 'هر کاربر جداگانه' },
                      { id: 'online', name: 'کاربران آنلاین', icon: Smartphone, desc: 'فقط کاربران فعال' },
                      { id: 'save_only', name: 'فقط ذخیره', icon: HardDrive, desc: 'بدون نمایش در برنامه' }
                    ].map((mode) => (
                      <label key={mode.id} className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${activityViewSettings.viewMode === mode.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                        <input
                          type="radio"
                          name="viewMode"
                          value={mode.id}
                          checked={activityViewSettings.viewMode === mode.id}
                          onChange={() => updateActivityViewSettings({ viewMode: mode.id as any })}
                          className="hidden"
                        />
                        <div className="flex items-center gap-3 mb-2">
                          <mode.icon className={`h-6 w-6 ${activityViewSettings.viewMode === mode.id ? 'text-purple-600' : 'text-gray-400'}`} />
                          <div className="font-medium text-gray-900">{mode.name}</div>
                        </div>
                        <p className="text-xs text-gray-500">{mode.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Log Viewer Tab */}
        {activeTab === 'viewer' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex-1 min-w-[300px] relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="جستجو در نام کاربر، پیام یا صفحه..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all">
                  <FileSpreadsheet className="h-4 w-4" />
                  خروجی به اکسل (XLSX)
                </button>
                <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  <Filter className="h-4 w-4" />
                  فیلترهای پیشرفته
                </button>
                <button onClick={clearAllLogs} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
                  <Trash2 className="h-4 w-4" />
                  پاک کردن
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">محدوده تاریخ</label>
                  <div className="space-y-2">
                    <PersianDatePicker value={filters.dateFrom} onChange={(d) => setFilters({ ...filters, dateFrom: d })} placeholder="از تاریخ" />
                    <PersianDatePicker value={filters.dateTo} onChange={(d) => setFilters({ ...filters, dateTo: d })} placeholder="تا تاریخ" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">سطح لاگ</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['error', 'warn', 'info', 'debug'].map(l => (
                      <label key={l} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={filters.level.includes(l as any)} onChange={(e) => {
                          const newLevels = e.target.checked ? [...filters.level, l as any] : filters.level.filter(x => x !== l);
                          setFilters({ ...filters, level: newLevels });
                        }} className="rounded text-blue-600" />
                        {l === 'error' ? 'خطا' : l === 'warn' ? 'هشدار' : l === 'info' ? 'اطلاعات' : 'اشکال‌زدایی'}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">کاربر خاص</label>
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">همه کاربران</option>
                    {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">ردیف</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">کاربر</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">تاریخ و ساعت</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">صفحه</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">فیلد / منو</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">پیام / انتخاب</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">نوع</th>
                      <th className="px-4 py-3 text-sm font-bold text-gray-700">جنس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedLogs.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">موردی یافت نشد</td></tr>
                    ) : (
                      paginatedLogs.map((log, index) => (
                        <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                          <td className="px-4 py-3 text-xs text-gray-500">{formatPersianNumber((currentPage - 1) * logsPerPage + index + 1)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.userName || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <div className="flex flex-col">
                              <span>{formatPersianDate(new Date(log.timestamp))}</span>
                              <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString('fa-IR')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{log.page || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{log.field || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{log.selection || log.message}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${log.logType === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {log.logType === 'user' ? 'کاربری' : 'سیستمی'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${getLevelColor(log.level)}`}>
                              {getLevelIcon(log.level)}
                              {log.level === 'error' ? 'خطا' : log.level === 'warn' ? 'هشدار' : 'عملکردی'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">صفحه {formatPersianNumber(currentPage)} از {formatPersianNumber(totalPages)}</span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">نمایش {formatPersianNumber(paginatedLogs.length)} مورد از {formatPersianNumber(filteredLogs.length)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                <h3 className="font-bold">جزئیات کامل لاگ</h3>
                <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-white/20 rounded-full"><X className="h-6 w-6" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 mb-1">کاربر</p>
                    <p className="font-bold text-gray-900">{selectedLog.userName || 'ناشناس'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 mb-1">تاریخ و زمان</p>
                    <p className="font-bold text-gray-900">{formatPersianDate(new Date(selectedLog.timestamp))} - {new Date(selectedLog.timestamp).toLocaleTimeString('fa-IR')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 mb-1">صفحه</p>
                    <p className="font-bold text-gray-900">{selectedLog.page || '-'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-500 mb-1">فیلد / منو</p>
                    <p className="font-bold text-gray-900">{selectedLog.field || '-'}</p>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] text-blue-600 mb-1">پیام / اقدام</p>
                  <p className="text-sm font-semibold text-blue-900">{selectedLog.selection || selectedLog.message}</p>
                </div>
                {selectedLog.details && (
                  <div className="p-4 bg-gray-900 rounded-xl">
                    <p className="text-[10px] text-gray-400 mb-2 font-mono">DEBUG DETAILS (JSON)</p>
                    <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{selectedLog.details}</pre>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-gray-400 px-2">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedLog.ipAddress || '127.0.0.1'}</span>
                  <span>ID: {selectedLog.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  export default LoggingSettings;

