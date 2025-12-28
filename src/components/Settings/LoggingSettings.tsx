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
import { logUserActivity, UserActivityEntry as UtilityUserActivityEntry, LoggerService, LogFileInfo, LogEntry as UtilityLogEntry, LogFieldConfig, LogPathConfig, StoragePathConfig } from '../../utils/logger';
import { PersianDatePicker } from '../Common/PersianDatePicker';

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

type LogEntry = UtilityLogEntry;

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

const DEFAULT_LOG_FIELD_CONFIG: LogFieldConfig = {
  userName: true,
  timestamp: true,
  page: true,
  field: true,
  selection: true,
  logType: true,
  logNature: true,
  ipAddress: true
};

const DEFAULT_LOG_PATH_CONFIG: LogPathConfig = {
  path: 'C:\\Logs\\Makhazen',
  createDailyFiles: true,
  maxFilesPerCategory: 10,
  compressOldLogs: true,
  backupCount: 5,
  exportFormat: 'xlsx'
};

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
  const [expandedSections, setExpandedSections] = useState<string[]>(['general', 'path']);
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
  
  // Available users for individual view mode
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([]);
  
  // Online users count (simulated)
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  // ============================================================================
  // Filtering Logic
  // ============================================================================

  useEffect(() => {
    let result = [...logs];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.userName && log.userName.toLowerCase().includes(searchLower)) ||
        (log.page && log.page.toLowerCase().includes(searchLower)) ||
        (log.field && log.field.toLowerCase().includes(searchLower))
      );
    }

    // Level filter
    if (filters.level.length > 0) {
      result = result.filter(log => filters.level.includes(log.level));
    }

    // Category filter
    if (filters.category.length > 0) {
      result = result.filter(log => filters.category.includes(log.category));
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromTime = filters.dateFrom.getTime();
      result = result.filter(log => new Date(log.timestamp).getTime() >= fromTime);
    }
    if (filters.dateTo) {
      const toTime = filters.dateTo.getTime() + (24 * 60 * 60 * 1000) - 1; // End of day
      result = result.filter(log => new Date(log.timestamp).getTime() <= toTime);
    }

    // User filter
    if (filters.userId) {
      result = result.filter(log => log.userId === filters.userId);
    }

    setFilteredLogs(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [logs, filters]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validatePath = (path: string): boolean => {
    if (!path || !path.trim()) {
      setPathValidationError('مسیر نمی‌تواند خالی باشد');
      return false;
    }
    // Basic validation for Windows or Unix paths
    const winPathRegex = /^[a-zA-Z]:\\.*$/;
    const unixPathRegex = /^\/.*$/;
    if (!winPathRegex.test(path) && !unixPathRegex.test(path) && !path.startsWith('./') && !path.startsWith('../')) {
      setPathValidationError('فرمت مسیر معتبر نیست');
      return false;
    }
    setPathValidationError('');
    return true;
  };

  const loadLogs = useCallback(async () => {
    try {
      const allFiles = await logger.getLogFiles();
      let allEntries: LogEntry[] = [];
      
      for (const file of allFiles) {
        const content = await logger.readLogFile(file.path);
        const entries = await logger.parseLogEntries(content);
        allEntries = [...allEntries, ...entries];
      }
      
      // Also add in-memory logs from activity view
      const activityLogs = userActivityLogs.map(al => ({
        id: al.id,
        timestamp: al.timestamp,
        level: (al.status === 'failed' ? 'error' : al.status === 'warning' ? 'warn' : 'info') as LogEntry['level'],
        category: al.category,
        message: al.action,
        userName: al.userName,
        ipAddress: al.ipAddress,
        page: al.page,
        field: al.field,
        selection: al.selection,
        logType: al.logType || 'user',
        logNature: al.logNature || al.status
      }));
      
      const combined = [...allEntries, ...activityLogs].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setLogs(combined);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }, [logger, userActivityLogs]);

  const refreshLogFiles = useCallback(async () => {
    try {
      const files = await logger.getLogFiles();
      setLogFiles(files);
    } catch (error) {
      console.error('Error refreshing log files:', error);
    }
  }, [logger]);

  const updateLoggingSettings = (updates: any) => {
    const newLogging = {
      ...(settings.logging || {}),
      ...updates
    };
    setSettings({
      ...settings,
      logging: newLogging
    });
    // Also update logger service if needed
    if (updates.logLevel) {
      // Logic to update logger service level
    }
  };

  const updateStoragePathConfig = (updates: Partial<StoragePathConfig>) => {
    const newConfig = { ...storagePathConfig, ...updates };
    setStoragePathConfig(newConfig);
    storage.saveData('storagePathConfig', newConfig);
    logger.setStorageConfig(newConfig);
  };

  const updatePathConfig = (updates: Partial<LogPathConfig>) => {
    const newConfig = { ...logPathConfig, ...updates };
    setLogPathConfig(newConfig);
    storage.saveData('logPathConfig', newConfig);
    logger.setConfig(newConfig);
  };

  const saveLogPath = () => {
    if (validatePath(tempPath)) {
      updateStoragePathConfig({ localPath: tempPath });
      updatePathConfig({ path: tempPath });
      setPathSuccess(true);
      setIsEditingPath(false);
      setTimeout(() => setPathSuccess(false), 3000);
    }
  };

  const clearAllLogs = async () => {
    if (confirm('آیا از حذف تمام لاگ‌ها اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      try {
        const allFiles = await logger.getLogFiles();
        for (const file of allFiles) {
          const key = `logfile_${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const metaKey = key.replace('logfile_', 'logmeta_');
          localStorage.removeItem(key);
          localStorage.removeItem(metaKey);
        }
        // Also clear activities if needed
        storage.saveData('userActivities', []);
        loadLogs();
        refreshLogFiles();
        alert('تمامی لاگ‌ها با موفقیت حذف شدند');
      } catch (error) {
        console.error('Error clearing logs:', error);
        alert('خطا در حذف لاگ‌ها');
      }
    }
  };

  const downloadLogFile = async (file: LogFileInfo) => {
    try {
      const content = await logger.readLogFile(file.path);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.path.split('/').pop() || 'log.txt';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('خطا در دانلود فایل');
    }
  };

  const deleteLogFile = async (filePath: string) => {
    if (confirm(`آیا از حذف فایل ${filePath} اطمینان دارید؟`)) {
      try {
        const key = `logfile_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const metaKey = key.replace('logfile_', 'logmeta_');
        localStorage.removeItem(key);
        localStorage.removeItem(metaKey);
        refreshLogFiles();
        alert('فایل با موفقیت حذف شد');
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('خطا در حذف فایل');
      }
    }
  };

  // ============================================================================
  // Folder Selection Functions
  // ============================================================================

  // Handle folder selection via native dialog
  // Note: This function requires a backend API (e.g., Electron's ipcRenderer or Tauri's commands)
  // to invoke the native folder selection dialog. The actual implementation depends on
  // the desktop framework being used:
  // - For Electron: Use dialog.showOpenDialog with properties: ['openDirectory']
  // - For Tauri: Use @tauri-apps/api/dialog.open()
  // - For web: Fallback to webkit directory picker (limited support)
  const handleSelectPath = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        // Since we can't get the absolute system path in standard browser JS for security reasons,
        // we'll use the folder name but allow the user to see and edit the full path string.
        const selectedPath = dirHandle.name;
        
        // For a desktop-like experience, we'll suggest appending to a base if possible
        // but primarily let the user know they can type the full path
        const fullPath = prompt('پوشه انتخاب شد. برای اطمینان، مسیر کامل محلی را وارد یا تایید کنید:', `C:\\Logs\\${selectedPath}`);
        if (fullPath) {
          updateStoragePathConfig({ localPath: fullPath });
          setTempPath(fullPath);
          setPathSuccess(true);
          setTimeout(() => setPathSuccess(false), 3000);
        }
      } else {
        const path = prompt('لطفا مسیر کامل پوشه ذخیره‌سازی را وارد کنید:', storagePathConfig.localPath);
        if (path) {
          updateStoragePathConfig({ localPath: path });
          setTempPath(path);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        alert('خطا در انتخاب پوشه: ' + (error.message || 'خطای نامشخص'));
      }
    }
  };

  const selectServerPath = async () => {
    const url = prompt('لطفا آدرس سایت یا هاست را وارد کنید:', storagePathConfig.serverUrl);
    if (url) {
      updateStoragePathConfig({ serverUrl: url });
    }
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Get the first selected folder path
      const selectedPath = files[0].webkitRelativePath || files[0].path || './logs';
      // Extract just the folder path without the file
      const folderPath = selectedPath.split('/').slice(0, -1).join('/') || './logs';
      
      setTempPath(folderPath);
      setIsEditingPath(true);
      validatePath(folderPath);
    }
    // Reset the input
    event.target.value = '';
  };

  const openFolderPicker = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  // ============================================================================
  // Activity View Settings Functions
  // ============================================================================

  const updateActivityViewSettings = (updates: Partial<ActivityViewSettings>) => {
    const newSettings = {
      ...activityViewSettings,
      ...updates
    };
    setActivityViewSettings(newSettings);
    storage.saveData('activityViewSettings', newSettings);
  };

  const loadActivityViewSettings = useCallback(() => {
    const savedSettings = storage.loadData('activityViewSettings') as ActivityViewSettings | null;
    if (savedSettings) {
      setActivityViewSettings(savedSettings);
    }
  }, []);

  const getFilteredActivityLogs = useCallback(() => {
    let filteredLogs = [...userActivityLogs];
    
    switch (activityViewSettings.viewMode) {
      case 'individual':
        // نمایش لاگ‌های کاربر انتخاب شده
        if (activityViewSettings.selectedUserId) {
          filteredLogs = filteredLogs.filter(log => log.userId === activityViewSettings.selectedUserId);
        }
        break;
      case 'online':
        // نمایش لاگ‌های کاربران آنلاین (فقط کاربران فعال در آخرین بازه زمانی)
        const recentTime = Date.now() - 5 * 60 * 1000; // 5 دقیقه اخیر
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp).getTime() > recentTime
        );
        break;
      case 'save_only':
        // در حالت ذخیره‌سازی، لاگ‌ها نمایش داده نمی‌شوند
        filteredLogs = [];
        break;
    }
    
    return filteredLogs;
  }, [userActivityLogs, activityViewSettings]);

    // Load activity view settings on mount
    useEffect(() => {
      loadActivityViewSettings();
      loadLogs();
      refreshLogFiles();
    }, [loadActivityViewSettings, loadLogs, refreshLogFiles]);

  // Update available users based on activity logs
  useEffect(() => {
    const usersMap = new Map<string, string>();
    userActivityLogs.forEach(log => {
      if (log.userId && log.userName) {
        usersMap.set(log.userId, log.userName);
      }
    });
    setAvailableUsers(Array.from(usersMap.entries()).map(([id, name]) => ({ id, name })));
  }, [userActivityLogs]);

  // Update online users count
  useEffect(() => {
    const recentTime = Date.now() - 5 * 60 * 1000;
    const onlineCount = new Set(
      userActivityLogs
        .filter(log => new Date(log.timestamp).getTime() > recentTime)
        .map(log => log.userId)
    ).size;
    setOnlineUsersCount(onlineCount);
  }, [userActivityLogs]);

  // ============================================================================
  // Excel Export Functions
  // ============================================================================

  const exportToExcel = (data: any[], filename: string) => {
    // Create CSV content (works as Excel compatible format)
    const headers = ['شناسه', 'تاریخ', 'ساعت', 'نام کاربر', 'اقدام', 'دسته‌بندی', 'وضعیت', 'آدرس IP', 'جزئیات'];
    const rows = data.map(item => [
      item.id,
      formatPersianDate(new Date(item.timestamp)),
      new Date(item.timestamp).toLocaleTimeString('fa-IR'),
      item.userName || '-',
      item.action || '-',
      item.category || '-',
      item.status === 'success' ? 'موفق' : item.status === 'failed' ? 'ناموفق' : 'هشدار',
      item.ipAddress || '-',
      item.details ? JSON.stringify(item.details) : '-'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM for proper Persian display in Excel
    const bom = '\uFEFF';
    
    // Create blob and download
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportActivitiesToExcel = () => {
    const activities = storage.loadData('userActivities') as any[] | null;
    if (activities && activities.length > 0) {
      const sortedActivities = [...activities].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const dateStr = new Date().toISOString().split('T')[0];
      exportToExcel(sortedActivities, `activities_${dateStr}`);
    } else {
      alert('هیچ فعالیتی برای خروجی وجود ندارد');
    }
  };

  // Track previous realTimeMode value
  const prevRealTimeModeRef = useRef(realTimeMode);

  // Auto-export activities when real-time mode is turned off
  useEffect(() => {
    // Check if realTimeMode changed from true to false
    if (prevRealTimeModeRef.current === true && realTimeMode === false) {
      handleExportActivitiesToExcel();
    }
    // Update the ref for next render
    prevRealTimeModeRef.current = realTimeMode;
  }, [realTimeMode, handleExportActivitiesToExcel]);

  const handleExportLogsToExcel = useCallback(() => {
    if (filteredLogs.length === 0) {
      alert('هیچ لاگی برای خروجی گرفتن وجود ندارد');
      return;
    }

    try {
      // Prepare data for Excel export with the 7 required fields + extras
      const worksheetData = filteredLogs.map(log => ({
        'نام کاربری': log.userName || '-',
        'تاریخ': formatPersianDate(new Date(log.timestamp)),
        'ساعت': new Date(log.timestamp).toLocaleTimeString('fa-IR'),
        'صفحه عملکرد': log.page || '-',
        'منو / فیلد': log.field || '-',
        'گزینه انتخاب شده': log.selection || log.message,
        'نوع لاگ': log.logType === 'user' ? 'کاربری' : 'سیستمی',
        'جنس لاگ': log.level === 'error' ? 'خطا' : log.level === 'warn' ? 'هشدار' : 'عملکردی',
        'دسته‌بندی': LOG_CATEGORIES.find(c => c.id === log.category)?.name || log.category,
        'آدرس IP': log.ipAddress || '-',
        'جزئیات': log.details || '-'
      }));

      // Create worksheet from JSON data
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'لاگ‌های سیستم');

      // Generate filename with current date
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `system_logs_${dateStr}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('خطا در تهیه فایل اکسل');
    }
  }, [filteredLogs]);

  const exportLogs = (format: 'json' | 'csv' | 'xml' | 'txt') => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs;
    
    let content = '';
    let mimeType = '';
    let extension = '';

    switch (format) {
      case 'json':
        content = JSON.stringify(logsToExport, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        // Fix CSV format: add BOM and proper headers
        const headers = ['نام کاربری', 'تاریخ', 'ساعت', 'صفحه', 'فیلد', 'پیام', 'نوع', 'جنس', 'IP'];
        content = headers.join(',') + '\n';
        logsToExport.forEach(log => {
          const row = [
            log.userName || '',
            formatPersianDate(new Date(log.timestamp)),
            new Date(log.timestamp).toLocaleTimeString('fa-IR'),
            log.page || '',
            log.field || '',
            log.message.replace(/,/g, ' '),
            log.logType || 'system',
            log.level,
            log.ipAddress || ''
          ];
          content += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        // Add BOM for Persian support in Excel
        content = '\uFEFF' + content;
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
        break;
      case 'xml':
        content = '<?xml version="1.0" encoding="UTF-8"?>\n<logs>\n';
        logsToExport.forEach(log => {
          content += `  <log id="${log.id}" timestamp="${log.timestamp}" level="${log.level}" category="${log.category}">\n`;
          content += `    <message><![CDATA[${log.message}]]></message>\n`;
          if (log.userName) content += `    <user>${log.userName}</user>\n`;
          if (log.page) content += `    <page>${log.page}</page>\n`;
          if (log.field) content += `    <field>${log.field}</field>\n`;
          if (log.ipAddress) content += `    <ip>${log.ipAddress}</ip>\n`;
          content += `  </log>\n`;
        });
        content += '</logs>';
        mimeType = 'application/xml';
        extension = 'xml';
        break;
      case 'txt':
        logsToExport.forEach(log => {
          content += `[${new Date(log.timestamp).toLocaleString('fa-IR')}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}\n`;
          if (log.userName) content += `  User: ${log.userName}\n`;
          if (log.page) content += `  Page: ${log.page}\n`;
          if (log.field) content += `  Field: ${log.field}\n`;
          if (log.ipAddress) content += `  IP: ${log.ipAddress}\n`;
          content += '\n';
        });
        mimeType = 'text/plain';
        extension = 'txt';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system_logs_${new Date().toISOString().split('T')[0]}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug': return <Activity className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warn': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'debug': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * logsPerPage;
    const end = start + logsPerPage;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, currentPage, logsPerPage]);

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.category))).sort();
  }, [logs]);

  // Get unique users
  const users = useMemo(() => {
    return Array.from(new Set(logs.filter(log => log.userName).map(log => ({ id: log.userId || '', name: log.userName || '' }))));
  }, [logs]);

  // Get selected categories from settings
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
                <span className="font-semibold text-gray-900">تنظیمات پیشرفته مسیر</span>
              </div>
              {expandedSections.includes('path') ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.includes('path') && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Create Daily Files */}
                  <div>
                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
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
                  </div>

                  {/* Compress Old Logs */}
                  <div>
                    <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={logPathConfig.compressOldLogs}
                        onChange={(e) => updatePathConfig({ compressOldLogs: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">فشرده‌سازی لاگ‌های قدیمی</div>
                        <div className="text-sm text-gray-500">فشرده‌سازی خودکار فایل‌های قدیمی</div>
                      </div>
                    </label>
                  </div>

                  {/* Max Files Per Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      حداکثر تعداد فایل در هر دسته‌بندی
                      <span className="text-xs text-gray-500 block mt-1">
                        حداکثر تعداد فایل لاگ برای نگهداری در هر دسته‌بندی
                      </span>
                    </label>
                    <input
                      type="number"
                      value={logPathConfig.maxFilesPerCategory}
                      onChange={(e) => updatePathConfig({ maxFilesPerCategory: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="100"
                    />
                  </div>

                  {/* Backup Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تعداد پشتیبان
                      <span className="text-xs text-gray-500 block mt-1">
                        تعداد فایل‌های پشتیبان برای نگهداری
                      </span>
                    </label>
                    <input
                      type="number"
                      value={logPathConfig.backupCount}
                      onChange={(e) => updatePathConfig({ backupCount: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Log Files List */}
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

            <div className="max-h-64 overflow-y-auto">
              {logFiles.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>فایل لاگی یافت نشد</p>
                  <p className="text-sm mt-1">لاگ‌های جدید پس از اولین ثبت نمایش داده می‌شوند</p>
                </div>
              ) : (
                  <div className="divide-y divide-gray-200">
                    {logFiles.slice(0, 15).map((file, index) => (
                      <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{file.path}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <span className="bg-gray-100 px-2 py-0.5 rounded">{file.entryCount} ورودی</span>
                              <span>•</span>
                              <span>تغییر: {formatPersianDate(file.lastModified)}</span>
                              <span>•</span>
                              <span className="font-mono">{formatFileSize(file.size)}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadLogFile(file)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="دانلود فایل"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => deleteLogFile(file.path)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف فایل"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

              )}
            </div>

            {logFiles.length > 10 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
                <span className="text-sm text-gray-600">
                  و {logFiles.length - 10} فایل دیگر...
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={clearAllLogs}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              پاک کردن تمام لاگ‌ها
            </button>
            <button
              onClick={() => exportLogs('txt')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              خروجی گرفتن از تمام لاگ‌ها
            </button>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Live View Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('liveView')}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-gray-200 flex items-center justify-between hover:bg-purple-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-gray-900">مشاهده زنده لاگ</span>
              </div>
              {expandedSections.includes('liveView') ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.includes('liveView') && (
              <div className="p-6 space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings.logging?.enableLiveView !== false}
                        onChange={(e) => updateLoggingSettings({ enableLiveView: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settings.logging?.enableLiveView !== false ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <Eye className={`h-5 w-5 ${settings.logging?.enableLiveView !== false ? 'text-purple-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">فعال‌سازی مشاهده زنده لاگ</div>
                        <div className="text-sm text-gray-500">
                          با فعال کردن این گزینه، لاگ‌های انتخاب شده به صورت آنلاین در صفحه نمایش داده می‌شوند
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <strong>راهنما:</strong> با فعال کردن این گزینه، تمام لاگ‌های صفحات انتخاب شده در قسمت «دسته‌بندی‌های فعال» به صورت زنده در صفحه «مشاهده لاگ‌ها» نمایش داده می‌شوند. با غیرفعال کردن این گزینه، دیگر لاگ‌های سیستم در صفحه نمایش داده نخواهند شد.
                </p>
              </div>
            )}
          </div>

            {/* Log Field Configuration Settings */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('fieldConfig')}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Sliders className="h-5 w-5 text-indigo-600" />
                  <span className="font-semibold text-gray-900">پیکربندی فیلدهای لاگ (انتخاب فیلدهای ثبت‌شونده)</span>
                </div>
                {expandedSections.includes('fieldConfig') ? 
                  <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                }
              </button>
              
              {expandedSections.includes('fieldConfig') && (
                <div className="p-6 space-y-6">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-indigo-600" />
                      <div>
                        <div className="font-medium text-indigo-900">تعیین فیلدهای اطلاعاتی لاگ</div>
                        <div className="text-sm text-indigo-700">
                          در این بخش مشخص کنید که کدامیک از ۷ مورد زیر در لاگ برنامه ثبت شوند
                        </div>
                      </div>
                    </div>
                  </div>
  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { id: 'userName', name: 'نام کاربری', icon: User },
                      { id: 'timestamp', name: 'تاریخ و ساعت عملکرد', icon: Clock },
                      { id: 'page', name: 'صفحه عملکرد', icon: Monitor },
                      { id: 'field', name: 'منو و یا فیلد انتخابی', icon: Edit3 },
                      { id: 'selection', name: 'گزینه انتخاب شده', icon: CheckCircle },
                      { id: 'logType', name: 'نوع یا دسته‌بندی لاگ', icon: Folder },
                      { id: 'logNature', name: 'جنس لاگ (هشدار/خطا/...)', icon: AlertCircle },
                      { id: 'ipAddress', name: 'آدرس IP و سیستم', icon: Globe }
                    ].map((field) => {
                      const isEnabled = activityViewSettings.fieldConfig[field.id as keyof LogFieldConfig];
                      const Icon = field.icon;
                      return (
                        <label
                          key={field.id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            isEnabled
                              ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                updateActivityViewSettings({
                                  fieldConfig: {
                                    ...activityViewSettings.fieldConfig,
                                    [field.id]: e.target.checked
                                  }
                                });
                              }}
                              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${isEnabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${isEnabled ? 'text-indigo-900' : 'text-gray-600'}`}>
                                {field.name}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Log Export Format Settings */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('exportSettings')}
                className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Save className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-gray-900">فرمت ذخیره‌سازی لاگ‌ها</span>
                </div>
                {expandedSections.includes('exportSettings') ? 
                  <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                }
              </button>
              
              {expandedSections.includes('exportSettings') && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'xlsx', name: 'Excel (XLSX)', icon: FileSpreadsheet, desc: 'فرمت استاندارد اکسل' },
                      { id: 'txt', name: 'Text (TXT)', icon: FileText, desc: 'فایل متنی ساده' },
                      { id: 'log', name: 'Log (Standard)', icon: FileCode, desc: 'فرمت استاندارد لاگ دنیا' }
                    ].map((format) => (
                      <label
                        key={format.id}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          logPathConfig.exportFormat === format.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="exportFormat"
                          value={format.id}
                          checked={logPathConfig.exportFormat === format.id}
                          onChange={() => updatePathConfig({ exportFormat: format.id as any })}
                          className="hidden"
                        />
                        <div className="flex items-center gap-3 mb-2">
                          <format.icon className={`h-6 w-6 ${logPathConfig.exportFormat === format.id ? 'text-green-600' : 'text-gray-400'}`} />
                          <div className="font-medium text-gray-900">{format.name}</div>
                        </div>
                        <p className="text-xs text-gray-500">{format.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>


          {/* Active Categories Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('categories')}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200 flex items-center justify-between hover:bg-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">دسته‌بندی‌های فعال</span>
              </div>
              {expandedSections.includes('categories') ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.includes('categories') && (
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">انتخاب دسته‌بندی‌های لاگ</div>
                      <div className="text-sm text-blue-700">
                        با فعال یا غیرفعال کردن هر مورد، تعیین کنید که لاگ کدام صفحات ذخیره و نمایش داده شوند
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LOG_CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <label
                        key={category.id}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newCategories = e.target.checked
                                ? [...selectedCategories, category.id]
                                : selectedCategories.filter((c: string) => c !== category.id);
                              updateLoggingSettings({ activeCategories: newCategories });
                            }}
                            className="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{category.name}</span>
                              {isSelected && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  فعال
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{category.description}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Select All / Deselect All */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const allIds = LOG_CATEGORIES.map(c => c.id);
                      updateLoggingSettings({ activeCategories: allIds });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Check className="h-4 w-4" />
                    انتخاب همه
                  </button>
                  <button
                    onClick={() => {
                      updateLoggingSettings({ activeCategories: [] });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <X className="h-4 w-4" />
                    لغو انتخاب همه
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedCategories.length} از {LOG_CATEGORIES.length} دسته‌بندی انتخاب شده
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* General Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('general')}
              className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-gray-900">تنظیمات عمومی</span>
              </div>
              {expandedSections.includes('general') ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.includes('general') && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      سطح لاگ
                      <span className="text-xs text-gray-500 block mt-1">
                        حداقل سطح لاگ‌هایی که ثبت می‌شوند
                      </span>
                    </label>
                    <select
                      value={settings.logging.logLevel}
                      onChange={(e) => updateLoggingSettings({ logLevel: e.target.value as any })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="error">خطا (Error)</option>
                      <option value="warn">هشدار (Warning)</option>
                      <option value="info">اطلاعات (Info)</option>
                      <option value="debug">اشکال‌زدایی (Debug)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      حداکثر اندازه لاگ (MB)
                      <span className="text-xs text-gray-500 block mt-1">
                        حداکثر اندازه فایل لاگ قبل از چرخش
                      </span>
                    </label>
                    <input
                      type="number"
                      value={settings.logging.maxLogSize}
                      onChange={(e) => updateLoggingSettings({ maxLogSize: parseInt(e.target.value) || 100 })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      min="10"
                      max="1000"
                      step="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مدت نگهداری (روز)
                      <span className="text-xs text-gray-500 block mt-1">
                        تعداد روزهای نگهداری لاگ‌ها قبل از حذف خودکار
                      </span>
                    </label>
                    <input
                      type="number"
                      value={settings.logging.logRetention}
                      onChange={(e) => updateLoggingSettings({ logRetention: parseInt(e.target.value) || 90 })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      min="1"
                      max="365"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activity View Mode Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('activityView')}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-gray-200 flex items-center justify-between hover:bg-purple-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-gray-900">نحوه نمایش فعالیت‌های کاربران</span>
              </div>
              {expandedSections.includes('activityView') ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.includes('activityView') && (
              <div className="p-6 space-y-6">
                {/* View Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    حالت نمایش فعالیت‌ها
                    <span className="text-xs text-gray-500 block mt-1">
                        انتخاب کنید چگونه می‌خواهید فعالیت‌های کاربران را مشاهده کنید
                    </span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Option 1: Individual User */}
                    <label 
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        activityViewSettings.viewMode === 'individual'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="viewMode"
                        value="individual"
                        checked={activityViewSettings.viewMode === 'individual'}
                        onChange={() => updateActivityViewSettings({ viewMode: 'individual' })}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3 mb-2">
                        <User className={`h-6 w-6 ${
                          activityViewSettings.viewMode === 'individual' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className="font-medium text-gray-900">مشاهده تکی</div>
                      </div>
                      <p className="text-xs text-gray-500">
                        مشاهده لاگ هر کاربر به صورت جداگانه
                      </p>
                      {activityViewSettings.viewMode === 'individual' && (
                        <div className="mt-3">
                          <select
                            value={activityViewSettings.selectedUserId || ''}
                            onChange={(e) => updateActivityViewSettings({ selectedUserId: e.target.value || null })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">همه کاربران</option>
                            {availableUsers.map(user => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </label>
                    
                    {/* Option 2: Online Users */}
                    <label 
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        activityViewSettings.viewMode === 'online'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="viewMode"
                        value="online"
                        checked={activityViewSettings.viewMode === 'online'}
                        onChange={() => updateActivityViewSettings({ viewMode: 'online' })}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3 mb-2">
                        <Smartphone className={`h-6 w-6 ${
                          activityViewSettings.viewMode === 'online' ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <div className="font-medium text-gray-900">کاربران آنلاین</div>
                      </div>
                      <p className="text-xs text-gray-500">
                        مشاهده تعداد و فعالیت کاربران آنلاین
                      </p>
                      {activityViewSettings.viewMode === 'online' && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium text-green-700">
                            {onlineUsersCount} کاربر آنلاین
                          </span>
                        </div>
                      )}
                    </label>
                    
                    {/* Option 3: Save Only */}
                    <label 
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        activityViewSettings.viewMode === 'save_only'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="viewMode"
                        value="save_only"
                        checked={activityViewSettings.viewMode === 'save_only'}
                        onChange={() => updateActivityViewSettings({ viewMode: 'save_only' })}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3 mb-2">
                        <HardDrive className={`h-6 w-6 ${
                          activityViewSettings.viewMode === 'save_only' ? 'text-orange-600' : 'text-gray-400'
                        }`} />
                        <div className="font-medium text-gray-900">فقط ذخیره</div>
                      </div>
                      <p className="text-xs text-gray-500">
                        ذخیره در آدرس بدون نمایش در برنامه
                      </p>
                    </label>
                  </div>
                </div>
                
                {/* Additional Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={activityViewSettings.showInRealTime}
                      onChange={(e) => updateActivityViewSettings({ showInRealTime: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">نمایش زنده</div>
                      <div className="text-sm text-gray-500">به‌روزرسانی خودکار صفحه</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={activityViewSettings.saveToPath}
                      onChange={(e) => updateActivityViewSettings({ saveToPath: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">ذخیره در مسیر</div>
                      <div className="text-sm text-gray-500">ذخیره خودکار در پوشه انتخابی</div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Viewer Tab */}
      {activeTab === 'viewer' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="جستجو در لاگ‌ها..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Sliders className="h-5 w-5" />
                فیلترها
                {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v) && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {[
                      filters.search,
                      filters.level.length < 4 ? filters.level.length : 0,
                      filters.category.length,
                      filters.dateFrom,
                      filters.dateTo,
                      filters.userId
                    ].filter(Boolean).length}
                  </span>
                )}
              </button>

                  <div className="flex gap-2">
                    <button
                      onClick={handleExportLogsToExcel}
                      className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <FileSpreadsheet className="h-5 w-5" />
                      خروجی به اکسل (XLSX)
                    </button>

                  <div className="relative group">
                    <button
                      className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Download className="h-5 w-5" />
                      خروجی (سایر فرمت‌ها)
                    </button>
                    <div className="absolute left-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 invisible group-hover:visible">
                      <button onClick={() => exportLogs('json')} className="w-full px-4 py-2 text-right hover:bg-gray-100 text-sm">JSON</button>
                      <button onClick={() => exportLogs('csv')} className="w-full px-4 py-2 text-right hover:bg-gray-100 text-sm">CSV (Excel)</button>
                      <button onClick={() => exportLogs('xml')} className="w-full px-4 py-2 text-right hover:bg-gray-100 text-sm">XML</button>
                      <button onClick={() => exportLogs('txt')} className="w-full px-4 py-2 text-right hover:bg-gray-100 text-sm">Text</button>
                    </div>
                  </div>
                  
                  <button
                    onClick={clearAllLogs}
                    className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                    پاک کردن
                  </button>
                </div>

            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">سطح لاگ</label>
                  <div className="space-y-2">
                    {(['error', 'warn', 'info', 'debug'] as const).map(level => (
                      <label key={level} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.level.includes(level)}
                          onChange={(e) => {
                            const newLevels = e.target.checked
                              ? [...filters.level, level]
                              : filters.level.filter(l => l !== level);
                            setFilters({ ...filters, level: newLevels });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">دسته‌بندی</label>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {categories.map(category => (
                      <label key={category} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.category.includes(category)}
                          onChange={(e) => {
                            const newCategories = e.target.checked
                              ? [...filters.category, category]
                              : filters.category.filter(c => c !== category);
                            setFilters({ ...filters, category: newCategories });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        از تاریخ
                      </label>
                      <PersianDatePicker
                        value={filters.dateFrom}
                        onChange={(date) => setFilters({ ...filters, dateFrom: date })}
                        placeholder="تاریخ شروع"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        تا تاریخ
                      </label>
                      <PersianDatePicker
                        value={filters.dateTo}
                        onChange={(date) => setFilters({ ...filters, dateTo: date })}
                        placeholder="تاریخ پایان"
                      />
                    </div>
                    {users.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">کاربر</label>
                      <select
                        value={filters.userId}
                        onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">همه کاربران</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logs List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  نمایش {((currentPage - 1) * logsPerPage) + 1} تا {Math.min(currentPage * logsPerPage, filteredLogs.length)} از {filteredLogs.length} لاگ
                </span>
                <select
                  value={logsPerPage}
                  onChange={(e) => {
                    setLogsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="25">25 در صفحه</option>
                  <option value="50">50 در صفحه</option>
                  <option value="100">100 در صفحه</option>
                  <option value="200">200 در صفحه</option>
                </select>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {paginatedLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>لاگی یافت نشد</p>
                  {settings.logging?.enableLiveView === false && (
                    <p className="text-sm mt-2 text-yellow-600">
                      گزینه «مشاهده زنده لاگ» غیرفعال است. برای نمایش لاگ‌ها، این گزینه را در تب تنظیمات فعال کنید.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                    {paginatedLogs.map(log => (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${getLevelColor(log.level)}`}>
                              {getLevelIcon(log.level)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded ${getLevelColor(log.level)}`}>
                                    {log.level.toUpperCase()}
                                  </span>
                                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    {LOG_CATEGORIES.find(c => c.id === log.category)?.name || log.category}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium">{log.userName || 'ناشناس'}</span>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatPersianDate(new Date(log.timestamp))}</span>
                                  <span className="mr-1">{new Date(log.timestamp).toLocaleTimeString('fa-IR')}</span>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Monitor className="h-3 w-3 text-purple-500" />
                                  <span className="font-medium">صفحه: {log.page || '-'}</span>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Edit3 className="h-3 w-3 text-orange-500" />
                                  <span className="font-medium">فیلد: {log.field || '-'}</span>
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-900 font-medium">{log.message}</p>
                              
                              {log.ipAddress && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                                  <MapPin className="h-2.5 w-2.5" />
                                  <span>{log.ipAddress}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Eye className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  قبلی
                </button>
                <span className="text-sm text-gray-600">
                  صفحه {currentPage} از {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  بعدی
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for folder picker */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {/* Folder Picker Dialog Modal */}
      {showFolderPicker && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFolderPicker(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                انتخاب محل ذخیره‌سازی
              </h3>
              <button
                onClick={() => setShowFolderPicker(false)}
                className="p-2 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm">
                لطفاً یکی از گزینه‌های زیر را برای محل ذخیره‌سازی انتخاب کنید:
              </p>
              
              {/* Option 1: Local Folder */}
              <div 
                onClick={handleSelectPath}
                className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                    <Folder className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">پوشه محلی</div>
                    <div className="text-sm text-gray-500">انتخاب پوشه از کامپیوتر</div>
                  </div>
                </div>
              </div>
              
              {/* Option 2: Custom Path */}
              <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <HardDrive className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">آدرس سفارشی</div>
                    <div className="text-sm text-gray-500">وارد کردن مسیر دستی</div>
                  </div>
                </div>
                <input
                  type="text"
                  value={tempPath}
                  onChange={(e) => {
                    setTempPath(e.target.value);
                    setIsEditingPath(true);
                    validatePath(e.target.value);
                  }}
                  placeholder="مسیر را وارد کنید..."
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    pathValidationError ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {pathValidationError && (
                  <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {pathValidationError}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => {
                    if (validatePath(tempPath)) {
                      saveLogPath();
                      setShowFolderPicker(false);
                    }
                  }}
                  disabled={!!pathValidationError || !tempPath.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-5 w-5" />
                  تأیید و ذخیره
                </button>
                <button
                  onClick={() => setShowFolderPicker(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  <X className="h-5 w-5" />
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => {
          setSelectedLog(null);
          setShowLogViewer(false);
        }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">جزئیات لاگ</h3>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setShowLogViewer(false);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">سطح</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg inline-flex items-center gap-2 ${getLevelColor(selectedLog.level)}`}>
                    {getLevelIcon(selectedLog.level)}
                    <span className="font-medium">{selectedLog.level.toUpperCase()}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">دسته‌بندی</label>
                  <p className="mt-1 text-gray-900">{selectedLog.category}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">پیام</label>
                <p className="mt-1 text-gray-900">{selectedLog.message}</p>
              </div>
              
              {selectedLog.details && (
                <div>
                  <label className="text-sm font-medium text-gray-600">جزئیات</label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedLog.details}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">زمان</label>
                  <p className="mt-1 text-gray-900">
                    {formatPersianDate(new Date(selectedLog.timestamp))} {new Date(selectedLog.timestamp).toLocaleTimeString('fa-IR')}
                  </p>
                </div>
                {selectedLog.userName && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">کاربر</label>
                    <p className="mt-1 text-gray-900">{selectedLog.userName}</p>
                  </div>
                )}
              </div>
              
              {selectedLog.ipAddress && (
                <div>
                  <label className="text-sm font-medium text-gray-600">آدرس IP</label>
                  <p className="mt-1 text-gray-900">{selectedLog.ipAddress}</p>
                </div>
              )}
              
              {selectedLog.userAgent && (
                <div>
                  <label className="text-sm font-medium text-gray-600">User Agent</label>
                  <p className="mt-1 text-gray-900 text-sm">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoggingSettings;
