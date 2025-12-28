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
import { formatPersianDate } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';

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

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: string;
  message: string;
  details?: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface LogPathConfig {
  path: string;
  createDailyFiles: boolean;
  maxFilesPerCategory: number;
  compressOldLogs: boolean;
  backupCount: number;
}

// روش‌های ذخیره‌سازی
type StorageType = 'local' | 'server';

interface StoragePathConfig {
  type: StorageType;
  localPath: string;
  serverUrl: string;
  serverHost: string;
  serverPort: number;
  useHttps: boolean;
  apiKey: string;
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
}

interface FilterState {
  search: string;
  level: ('error' | 'warn' | 'info' | 'debug')[];
  category: string[];
  dateFrom: string;
  dateTo: string;
  userId: string;
}

interface LogFileInfo {
  path: string;
  size: number;
  lastModified: Date;
  entryCount: number;
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

const DEFAULT_LOG_PATH_CONFIG: LogPathConfig = {
  path: './logs',
  createDailyFiles: true,
  maxFilesPerCategory: 10,
  compressOldLogs: true,
  backupCount: 5
};

const DEFAULT_STORAGE_PATH_CONFIG: StoragePathConfig = {
  type: 'local',
  localPath: './logs',
  serverUrl: '',
  serverHost: '',
  serverPort: 443,
  useHttps: true,
  apiKey: ''
};

const DEFAULT_ACTIVITY_VIEW_SETTINGS: ActivityViewSettings = {
  viewMode: 'individual',
  selectedUserId: null,
  showInRealTime: true,
  saveToPath: true
};

// ============================================================================
// Logger Service Class
// ============================================================================

class LoggerService {
  private static instance: LoggerService;
  private config: LogPathConfig | null = null;
  private storageConfig: StoragePathConfig | null = null;
  private logBuffer: LogEntry[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_FLUSH_INTERVAL = 30000; // 30 seconds
  private readonly MAX_BUFFER_SIZE = 100;

  private constructor() {
    this.initializeBufferFlush();
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private initializeBufferFlush(): void {
    this.bufferFlushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.BUFFER_FLUSH_INTERVAL);
  }

  setConfig(config: LogPathConfig): void {
    this.config = config;
    this.ensureDirectoryExists(config.path);
  }

  setStorageConfig(config: StoragePathConfig): void {
    this.storageConfig = config;
  }

  getConfig(): LogPathConfig | null {
    return this.config;
  }

  getStorageConfig(): StoragePathConfig | null {
    return this.storageConfig;
  }

  private ensureDirectoryExists(path: string): void {
    // In browser environment, we use localStorage as virtual directory
    // In a real Node.js environment, you would use fs.mkdir
    try {
      const storage = DataStorage.getInstance();
      const directories = storage.loadData('logDirectories') as string[] | null;
      if (!directories?.includes(path)) {
        storage.saveData('logDirectories', [...(directories || []), path]);
      }
    } catch (error) {
      console.warn('Could not create directory:', path);
    }
  }

  private getLogFilePath(category: string, date?: Date): string {
    if (!this.config) {
      return './logs/default.log';
    }

    const targetDate = date || new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate() + 1).padStart(2, '0');

    if (this.config.createDailyFiles) {
      return `${this.config.path}/${category}_${year}-${month}-${day}.log`;
    }
    return `${this.config.path}/${category}.log`;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const userInfo = entry.userName ? ` [User: ${entry.userName}]` : '';
    const ipInfo = entry.ipAddress ? ` [IP: ${entry.ipAddress}]` : '';
    const details = entry.details ? `\n    Details: ${entry.details}` : '';
    
    return `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}${userInfo}${ipInfo}${details}\n`;
  }

  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: LogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    this.logBuffer.push(fullEntry);

    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  async logToFile(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    await this.log(entry);
  }

  async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const entriesToFlush = [...this.logBuffer];
    this.logBuffer = [];

    const storage = DataStorage.getInstance();
    
    // Group entries by category and date
    const groupedEntries = new Map<string, LogEntry[]>();
    
    entriesToFlush.forEach(entry => {
      const filePath = this.getLogFilePath(entry.category);
      if (!groupedEntries.has(filePath)) {
        groupedEntries.set(filePath, []);
      }
      groupedEntries.get(filePath)!.push(entry);
    });

    // Write to files
    groupedEntries.forEach((entries, filePath) => {
      const logContent = entries.map(e => this.formatLogEntry(e)).join('');
      this.appendToFile(filePath, logContent);
    });
  }

  private appendToFile(filePath: string, content: string): void {
    try {
      const storage = DataStorage.getInstance();
      const key = `logfile_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const existingContent = storage.loadData(key) as string | null;
      storage.saveData(key, (existingContent || '') + content);
      
      // Update file metadata
      this.updateFileMetadata(filePath);
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  private updateFileMetadata(filePath: string): void {
    try {
      const storage = DataStorage.getInstance();
      const metadataKey = `logmeta_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const existingMetadata = storage.loadData(metadataKey) as any;
      
      const newMetadata = {
        path: filePath,
        lastModified: new Date().toISOString(),
        lastEntry: new Date().toISOString()
      };
      
      storage.saveData(metadataKey, newMetadata);
    } catch (error) {
      console.warn('Could not update file metadata:', error);
    }
  }

  async readLogFile(filePath: string): Promise<string> {
    try {
      const storage = DataStorage.getInstance();
      const key = `logfile_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      return (storage.loadData(key) as string) || '';
    } catch (error) {
      console.error('Error reading log file:', error);
      return '';
    }
  }

  async parseLogEntries(content: string): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    const timestampRegex = /\[(.*?)\]/;
    const levelRegex = /\[(ERROR|WARN|INFO|DEBUG)\]/i;
    const categoryRegex = /\[(.*?)\]/;
    
    lines.forEach((line, index) => {
      const timestampMatch = line.match(timestampRegex);
      const levelMatch = line.match(levelRegex);
      const categoryMatch = line.match(categoryRegex);
      
      if (timestampMatch && levelMatch && categoryMatch) {
        const messageStart = line.indexOf('] [', line.indexOf(categoryMatch[0]) + categoryMatch[0].length) + 3;
        const messageEnd = line.indexOf(' [User:', messageStart);
        const message = messageEnd > -1 ? line.substring(messageStart, messageEnd) : line.substring(messageStart);
        
        const userMatch = line.match(/\[User: (.*?)\]/);
        const ipMatch = line.match(/\[IP: (.*?)\]/);
        const detailsMatch = line.match(/Details: (.*)/);
        
        entries.push({
          id: `parsed-${index}`,
          timestamp: timestampMatch[1],
          level: levelMatch[1].toLowerCase() as LogEntry['level'],
          category: categoryMatch[1],
          message: message.trim(),
          details: detailsMatch?.[1],
          userName: userMatch?.[1],
          ipAddress: ipMatch?.[1]
        });
      }
    });
    
    return entries;
  }

  async getLogFiles(): Promise<LogFileInfo[]> {
    const files: LogFileInfo[] = [];
    const storage = DataStorage.getInstance();
    
    try {
      const directories = storage.loadData('logDirectories') as string[] | null;
      if (!directories) return files;
      
      directories.forEach(dirPath => {
        const allKeys = Object.keys(localStorage).filter(key => key.startsWith('logfile_'));
        
        allKeys.forEach(key => {
          const content = storage.loadData(key) as string;
          const metadataKey = key.replace('logfile_', 'logmeta_');
          const metadata = storage.loadData(metadataKey) as any;
          
          if (content) {
            const entryCount = content.split('\n').filter((l: string) => l.trim()).length;
            files.push({
              path: key.replace('logfile_', '').replace(/_/g, '/'),
              size: new Blob([content]).size,
              lastModified: metadata?.lastModified ? new Date(metadata.lastModified) : new Date(),
              entryCount
            });
          }
        });
      });
    } catch (error) {
      console.error('Error getting log files:', error);
    }
    
    return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  async cleanupOldLogs(keepCount: number = 5): Promise<void> {
    const files = await this.getLogFiles();
    const sortedFiles = files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    
    const filesToDelete = sortedFiles.slice(keepCount);
    
    filesToDelete.forEach(file => {
      const storage = DataStorage.getInstance();
      const key = `logfile_${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const metaKey = `logmeta_${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      storage.saveData(key, '');
      storage.saveData(metaKey, null);
    });
  }

  destroy(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    this.flushBuffer();
  }
}

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
  const [activeTab, setActiveTab] = useState<'settings' | 'viewer' | 'activity' | 'path'>(showLogViewer ? 'viewer' : 'settings');
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
    dateFrom: '',
    dateTo: '',
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
      // Check if we're in an Electron environment
      if ((window as any).electronAPI && (window as any).electronAPI.openDirectoryDialog) {
        // Electron implementation
        const result = await (window as any).electronAPI.openDirectoryDialog();
        if (result && !result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          setTempPath(selectedPath);
          setIsEditingPath(true);
          validatePath(selectedPath);
        }
      } else if ((window as any).tauri && (window as any).tauri.dialog) {
        // Tauri implementation
        const selectedPath = await (window as any).tauri.dialog.open({
          directory: true,
          multiple: false
        });
        if (selectedPath && typeof selectedPath === 'string') {
          setTempPath(selectedPath);
          setIsEditingPath(true);
          validatePath(selectedPath);
        }
      } else {
        // Fallback for web environment - trigger webkit directory picker
        openFolderPicker();
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      setPathValidationError('خطا در انتخاب پوشه. لطفاً از روش دستی استفاده کنید.');
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
  }, [loadActivityViewSettings]);

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

  const exportActivitiesToExcel = () => {
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
      handleExportToExcel();
    }
    // Update the ref for next render
    prevRealTimeModeRef.current = realTimeMode;
  }, [realTimeMode]);

  // Export to Excel function using xlsx library
  const handleExportToExcel = useCallback(() => {
    if (userActivityLogs.length === 0) {
      return;
    }

    try {
      // Prepare data for Excel export
      const worksheetData = userActivityLogs.map(log => ({
        'کاربر': log.userName || '-',
        'اقدام': log.action || '-',
        'دسته‌بندی': log.category || '-',
        'وضعیت': log.status === 'success' ? 'موفق' : log.status === 'failed' ? 'ناموفق' : 'هشدار',
        'تاریخ و زمان': new Date(log.timestamp).toLocaleString('fa-IR'),
        'آدرس IP': log.ipAddress || '-',
        'جزئیات': log.details ? JSON.stringify(log.details) : '-'
      }));

      // Create worksheet from JSON data
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'فعالیت کاربران');

      // Generate filename with current date
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `user_activity_${dateStr}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  }, [userActivityLogs]);

  // ============================================================================
  // Path Configuration Functions
  // ============================================================================

  const validatePath = (path: string): boolean => {
    if (!path.trim()) {
      setPathValidationError('مسیر ذخیره‌سازی نمی‌تواند خالی باشد');
      return false;
    }
    
    if (path.length < 3) {
      setPathValidationError('مسیر ذخیره‌سازی باید حداقل ۳ کاراکتر باشد');
      return false;
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      setPathValidationError('مسیر ذخیره‌سازی شامل کاراکترهای نامعتبر است');
      return false;
    }
    
    setPathValidationError('');
    return true;
  };

  const saveLogPath = useCallback(async () => {
    if (!validatePath(tempPath)) {
      return;
    }

    try {
      const newConfig: LogPathConfig = {
        ...logPathConfig,
        path: tempPath
      };

      setLogPathConfig(newConfig);
      logger.setConfig(newConfig);
      
      // Save to storage
      storage.saveData('logPathConfig', newConfig);
      
      setPathSuccess(true);
      setIsEditingPath(false);
      
      // Refresh log files list
      await refreshLogFiles();
      
      // Clear success message after 3 seconds
      setTimeout(() => setPathSuccess(false), 3000);
    } catch (error) {
      setPathValidationError('خطا در ذخیره‌سازی مسیر. لطفاً مجدداً تلاش کنید');
    }
  }, [tempPath, logPathConfig]);

  const refreshLogFiles = useCallback(async () => {
    const files = await logger.getLogFiles();
    setLogFiles(files);
  }, []);

  const openPathEditor = () => {
    setTempPath(logPathConfig.path);
    setIsEditingPath(true);
    setPathValidationError('');
    setPathSuccess(false);
  };

  const cancelPathEdit = () => {
    setIsEditingPath(false);
    setTempPath(logPathConfig.path);
    setPathValidationError('');
  };

  // Initialize tempPath when logPathConfig changes
  useEffect(() => {
    if (!isEditingPath) {
      setTempPath(logPathConfig.path);
    }
  }, [logPathConfig.path, isEditingPath]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ============================================================================
  // Log Management Functions
  // ============================================================================

  // Load configuration on mount
  useEffect(() => {
    const savedConfig = storage.loadData('logPathConfig') as LogPathConfig | null;
    if (savedConfig) {
      setLogPathConfig(savedConfig);
      logger.setConfig(savedConfig);
    } else {
      // Set default path
      logger.setConfig(DEFAULT_LOG_PATH_CONFIG);
    }

    // Load storage path config
    const savedStorageConfig = storage.loadData('storagePathConfig') as StoragePathConfig | null;
    if (savedStorageConfig) {
      setStoragePathConfig(savedStorageConfig);
      logger.setStorageConfig(savedStorageConfig);
    }
    
    // Load activity view settings
    loadActivityViewSettings();
    
    refreshLogFiles();
  }, []);

  // ============================================================================
  // Real-time Activity Tracking
  // ============================================================================

  // Load and track user activities in real-time
  useEffect(() => {
    const trackActivities = async () => {
      if (realTimeMode) {
        // Check for new activities in storage
        const storedActivities = storage.loadData('userActivities') as any[] | null;
        if (storedActivities && storedActivities.length > 0) {
          // Log new activities to file system
          const lastLogged = storage.loadData('lastLoggedActivity') as string | null;
          const newActivities = storedActivities.filter(a => 
            !lastLogged || new Date(a.timestamp) > new Date(lastLogged)
          );
          
          for (const activity of newActivities.slice(0, 10)) {
            await logger.log({
              level: activity.status === 'failed' ? 'error' : activity.status === 'warning' ? 'warn' : 'info',
              category: activity.category || 'user',
              message: `${activity.userName || 'کاربر'} - ${activity.action || 'اقدام'}`,
              details: JSON.stringify(activity, null, 2),
              userId: activity.userId,
              userName: activity.userName,
              ipAddress: activity.ipAddress
            });
          }
          
          if (newActivities.length > 0) {
            storage.saveData('lastLoggedActivity', newActivities[0].timestamp);
          }
        }
      }
    };

    if (realTimeMode) {
      trackActivities();
      const interval = setInterval(trackActivities, 2000); // Track every 2 seconds
      return () => clearInterval(interval);
    }
  }, [realTimeMode]);

  // Load logs from storage
  useEffect(() => {
    loadLogs();
    const interval = setInterval(() => {
      if (realTimeMode) {
        loadLogs();
        refreshLogFiles();
      }
    }, 3000); // Update every 3 seconds in real-time mode for faster refresh
    
    return () => {
      clearInterval(interval);
      logger.destroy();
    };
  }, [realTimeMode]);

  // Sync with external showLogViewer prop
  useEffect(() => {
    if (showLogViewer && activeTab !== 'viewer') {
      setActiveTab('viewer');
    }
  }, [showLogViewer]);

  // Apply filters when logs or filters change
  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  // Log path change handler
  useEffect(() => {
    if (settings.logging?.logPath) {
      const newConfig = {
        ...logPathConfig,
        path: settings.logging.logPath
      };
      setLogPathConfig(newConfig);
      logger.setConfig(newConfig);
    }
  }, [settings.logging?.logPath]);

  const loadLogs = async () => {
    try {
      // First try to load from file-based storage
      const pathLogs = await loadLogsFromPath();
      if (pathLogs.length > 0) {
        setLogs(pathLogs);
        return;
      }
      
      // Fall back to stored logs
      const savedLogs = storage.loadData('systemLogs') as LogEntry[] | null;
      if (savedLogs && Array.isArray(savedLogs)) {
        setLogs(savedLogs);
      } else {
        // Generate sample logs if none exist
        const sampleLogs: LogEntry[] = generateSampleLogs();
        setLogs(sampleLogs);
        storage.saveData('systemLogs', sampleLogs);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      setLogs([]);
    }
  };

  const loadLogsFromPath = async (): Promise<LogEntry[]> => {
    try {
      const config = logger.getConfig();
      if (!config) return [];

      const categories = ['system', 'security', 'database', 'user', 'inventory', 'reporting', 'settings', 'integration'];
      const allEntries: LogEntry[] = [];

      for (const category of categories) {
        const filePath = logger.getLogFilePath(category);
        const content = await logger.readLogFile(filePath);
        
        if (content) {
          const entries = await logger.parseLogEntries(content);
          allEntries.push(...entries);
        }
      }

      return allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.warn('Could not load logs from path:', error);
      return [];
    }
  };

  const generateSampleLogs = (): LogEntry[] => {
    const categories = ['system', 'security', 'database', 'user', 'inventory', 'reporting', 'settings', 'integration'];
    const levels: ('error' | 'warn' | 'info' | 'debug')[] = ['error', 'warn', 'info', 'debug'];
    const messages = [
      'سیستم با موفقیت راه‌اندازی شد',
      'اتصال به پایگاه داده برقرار شد',
      'کاربر جدید وارد سیستم شد',
      'پشتیبان‌گیری با موفقیت انجام شد',
      'خطا در اتصال به سرور',
      'هشدار: استفاده از حافظه بالا است',
      'به‌روزرسانی تنظیمات انجام شد',
      'گزارش جدید تولید شد',
      'کوئری پایگاه داده با موفقیت اجرا شد',
      'احراز هویت کاربر تأیید شد',
      'درخواست API با موفقیت پردازش شد',
      'خطای timeout در اتصال به سرویس خارجی',
      'هشدار: فضای دیسک در حال پر شدن است',
      'به‌روزرسانی خودکار تنظیمات امنیتی انجام شد',
      'گزارش عملکرد ماهانه تولید شد'
    ];

    const logs: LogEntry[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 100; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      
      logs.push({
        id: `log-${i + 1}`,
        timestamp,
        level,
        category,
        message,
        details: level === 'error' ? `Stack trace:\n    at module.exports (line 42)\n    at Object.<anonymous> (line 18)\n    at EventEmitter.<anonymous> (line 156)` : undefined,
        userId: Math.random() > 0.5 ? `user-${Math.floor(Math.random() * 5) + 1}` : undefined,
        userName: Math.random() > 0.5 ? ['علی احمدی', 'فاطمه رضایی', 'محمد کریمی', 'زهرا محمدی', 'حسین رضایی'][Math.floor(Math.random() * 5)] : undefined,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
    }
    
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower) ||
        log.details?.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower)
      );
    }

    // Level filter
    if (filters.level.length > 0 && filters.level.length < 4) {
      filtered = filtered.filter(log => filters.level.includes(log.level));
    }

    // Category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter(log => filters.category.includes(log.category));
    }

    // Date filter
    if (filters.dateFrom) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
    }

    // User filter
    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const updateLoggingSettings = (updates: Partial<typeof settings.logging>) => {
    const newSettings = {
      ...settings,
      logging: {
        ...settings.logging,
        ...updates
      }
    };
    
    setSettings(newSettings);
    storage.saveData('settings', newSettings);
  };

  const updatePathConfig = (updates: Partial<LogPathConfig>) => {
    const newConfig = {
      ...logPathConfig,
      ...updates
    };
    
    setLogPathConfig(newConfig);
    logger.setConfig(newConfig);
    storage.saveData('logPathConfig', newConfig);
    
    if (updates.path) {
      logger.setConfig(newConfig);
    }
  };

  // ============================================================================
  // Storage Path Configuration Functions
  // ============================================================================

  const updateStoragePathConfig = (updates: Partial<StoragePathConfig>) => {
    const newConfig = {
      ...storagePathConfig,
      ...updates
    };
    
    setStoragePathConfig(newConfig);
    logger.setStorageConfig(newConfig);
    storage.saveData('storagePathConfig', newConfig);
  };

  // ============================================================================
  // Activity Logging Functions
  // ============================================================================

  // Log user activity to storage and file
  const logUserActivity = useCallback(async (
    userId: string,
    userName: string,
    action: string,
    category: string,
    status: 'success' | 'failed' | 'warning',
    details?: any
  ) => {
    const activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      category,
      status,
      details,
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 255) // Get actual IP in real app
    };

    // Save to storage
    const storedActivities = storage.loadData('userActivities') as any[] | null;
    const activities = storedActivities || [];
    activities.unshift(activity);
    
    // Keep only last 500 activities in memory
    if (activities.length > 500) {
      activities.splice(500);
    }
    
    storage.saveData('userActivities', activities);

    // Also log to file system
    await logger.log({
      level: status === 'failed' ? 'error' : status === 'warning' ? 'warn' : 'info',
      category: category || 'user',
      message: `${userName} - ${action}`,
      details: JSON.stringify(activity, null, 2),
      userId,
      userName,
      ipAddress: activity.ipAddress
    });

    return activity;
  }, []);

  // Export activities for external use
  useEffect(() => {
    // Make logUserActivity available globally for tracking user actions
    (window as any).logUserActivity = logUserActivity;
    return () => {
      delete (window as any).logUserActivity;
    };
  }, [logUserActivity]);

  const clearAllLogs = async () => {
    if (confirm('آیا از پاک کردن تمام لاگ‌ها اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
      try {
        // Clear buffer
        await logger.flushBuffer();
        
        // Clear stored logs
        setLogs([]);
        storage.saveData('systemLogs', []);
        setFilteredLogs([]);
        
        // Clear file-based logs
        await logger.cleanupOldLogs(0);
        await refreshLogFiles();
        
        alert('تمام لاگ‌ها با موفقیت پاک شدند');
      } catch (error) {
        console.error('Error clearing logs:', error);
        alert('خطا در پاک کردن لاگ‌ها');
      }
    }
  };

  const clearLogs = () => {
    if (confirm('آیا از پاک کردن تمام لاگ‌ها اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
      setLogs([]);
      storage.saveData('systemLogs', []);
      setFilteredLogs([]);
    }
  };

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
        content = 'ID,Timestamp,Level,Category,Message,Details,User,IP Address\n';
        logsToExport.forEach(log => {
          content += `"${log.id}","${log.timestamp}","${log.level}","${log.category}","${log.message}","${log.details || ''}","${log.userName || ''}","${log.ipAddress || ''}"\n`;
        });
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'xml':
        content = '<?xml version="1.0" encoding="UTF-8"?>\n<logs>\n';
        logsToExport.forEach(log => {
          content += `  <log id="${log.id}" timestamp="${log.timestamp}" level="${log.level}" category="${log.category}">\n`;
          content += `    <message><![CDATA[${log.message}]]></message>\n`;
          if (log.details) content += `    <details><![CDATA[${log.details}]]></details>\n`;
          if (log.userName) content += `    <user>${log.userName}</user>\n`;
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
          if (log.details) content += `  Details: ${log.details}\n`;
          if (log.userName) content += `  User: ${log.userName}\n`;
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
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              فعالیت کاربران ({userActivityLogs.length})
            </div>
          </button>
        </div>
      </div>

      {/* Path Configuration Tab */}
      {activeTab === 'path' && (
        <div className="space-y-6">
          {/* Main Path Configuration Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <FolderOpen className="h-6 w-6" />
                مسیر فعلی ذخیره‌سازی
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                تعیین محل ذخیره‌سازی لاگ‌ها (لوکال یا سرور)
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Storage Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  نوع ذخیره‌سازی
                  <span className="text-xs text-gray-500 block mt-1">
                    انتخاب کنید که لاگ‌ها در کجا ذخیره شوند
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local Storage Option */}
                  <label 
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      storagePathConfig.type === 'local'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="storageType"
                      value="local"
                      checked={storagePathConfig.type === 'local'}
                      onChange={() => updateStoragePathConfig({ type: 'local' })}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        storagePathConfig.type === 'local' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <HardDrive className={`h-6 w-6 ${
                          storagePathConfig.type === 'local' ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">ذخیره‌سازی محلی</div>
                        <div className="text-sm text-gray-500">ذخیره در کامپیوتر</div>
                      </div>
                    </div>
                  </label>
                  
                  {/* Server Storage Option */}
                  <label 
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      storagePathConfig.type === 'server'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="storageType"
                      value="server"
                      checked={storagePathConfig.type === 'server'}
                      onChange={() => updateStoragePathConfig({ type: 'server' })}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        storagePathConfig.type === 'server' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Server className={`h-6 w-6 ${
                          storagePathConfig.type === 'server' ? 'text-green-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">ذخیره‌سازی در سرور</div>
                        <div className="text-sm text-gray-500">ارسال به سایت و سرور</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Local Path Configuration */}
              {storagePathConfig.type === 'local' && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <HardDrive className="h-5 w-5 text-blue-600" />
                    مسیر محلی
                  </h4>
                  
                  {/* Current Path Display */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-8 w-8 text-blue-500" />
                        <div>
                          <div className="text-sm text-gray-500">مسیر فعلی:</div>
                          <div className="font-mono text-gray-900">{logPathConfig.path}</div>
                        </div>
                      </div>
                      <button
                        onClick={openPathEditor}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        تغییر مسیر
                      </button>
                    </div>
                  </div>

                  {/* Path Editor (shown when editing) */}
                  {isEditingPath && (
                    <div className="bg-white rounded-lg border border-blue-200 p-4 mt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <FolderOpen className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">ویرایش مسیر</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مسیر جدید
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tempPath}
                              onChange={(e) => {
                                setTempPath(e.target.value);
                                setIsEditingPath(true);
                                validatePath(e.target.value);
                              }}
                              placeholder="مثال: C:\Logs\Makhazen"
                              className={`flex-1 px-4 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                pathValidationError ? 'border-red-400' : 'border-gray-300'
                              }`}
                            />
                            <button
                              onClick={handleSelectPath}
                              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                              <FolderOpen className="h-4 w-4" />
                              انتخاب پوشه
                            </button>
                          </div>
                          {pathValidationError && (
                            <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              {pathValidationError}
                            </div>
                          )}
                          {pathSuccess && (
                            <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                              <CheckCircle className="h-4 w-4" />
                              مسیر با موفقیت ذخیره شد!
                            </div>
                          )}
                        </div>

                        {/* Quick paths */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            مسیرهای پیشنهادی
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'پیش‌فرض', path: './logs' },
                              { label: 'داکیومنت‌ها', path: './documents/logs' },
                              { label: 'دایرکتوری داده', path: './data/logs' }
                            ].map((quickPath) => (
                              <button
                                key={quickPath.path}
                                onClick={() => {
                                  setTempPath(quickPath.path);
                                  validatePath(quickPath.path);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                              >
                                {quickPath.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={saveLogPath}
                          disabled={!!pathValidationError || !tempPath.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="h-4 w-4" />
                          تأیید
                        </button>
                        <button
                          onClick={cancelPathEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Server Path Configuration */}
              {storagePathConfig.type === 'server' && (
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <Server className="h-5 w-5 text-green-600" />
                    تنظیمات سرور
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Server URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        آدرس سرور
                        <span className="text-xs text-gray-500 block mt-1">
                          آدرس کامل API سرور برای ارسال لاگ‌ها
                        </span>
                      </label>
                      <div className="relative">
                        <Globe className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="url"
                          value={storagePathConfig.serverUrl}
                          onChange={(e) => updateStoragePathConfig({ serverUrl: e.target.value })}
                          placeholder="https://api.example.com/logs"
                          className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Server Host */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        هاست سرور
                        <span className="text-xs text-gray-500 block mt-1">
                          آدرس هاست یا دامنه سرور
                        </span>
                      </label>
                      <div className="relative">
                        <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={storagePathConfig.serverHost}
                          onChange={(e) => updateStoragePathConfig({ serverHost: e.target.value })}
                          placeholder="api.example.com"
                          className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        />
                      </div>
                    </div>

                    {/* Server Port */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        پورت سرور
                        <span className="text-xs text-gray-500 block mt-1">
                          پورت اتصال به سرور
                        </span>
                      </label>
                      <input
                        type="number"
                        value={storagePathConfig.serverPort}
                        onChange={(e) => updateStoragePathConfig({ serverPort: parseInt(e.target.value) || 443 })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                        min="1"
                        max="65535"
                      />
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        کلید API
                        <span className="text-xs text-gray-500 block mt-1">
                          کلید احراز هویت برای ارسال لاگ‌ها
                        </span>
                      </label>
                      <input
                        type="password"
                        value={storagePathConfig.apiKey}
                        onChange={(e) => updateStoragePathConfig({ apiKey: e.target.value })}
                        placeholder="کلید API را وارد کنید"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* HTTPS Toggle */}
                  <div className="mt-4">
                    <label className="flex items-center gap-3 p-4 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={storagePathConfig.useHttps}
                        onChange={(e) => updateStoragePathConfig({ useHttps: e.target.checked })}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-gray-900">استفاده از HTTPS</div>
                          <div className="text-sm text-gray-500">اتصال امن به سرور</div>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Test Connection Button */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Activity className="h-4 w-4" />
                      تست اتصال
                    </button>
                    <span className="text-sm text-gray-500">
                      قبل از شروع ذخیره‌سازی، اتصال سرور را بررسی کنید
                    </span>
                  </div>
                </div>
              )}
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
                  {logFiles.slice(0, 10).map((file, index) => (
                    <div key={index} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.path}</p>
                            <p className="text-xs text-gray-500">
                              {file.entryCount} ورودی • آخرین تغییر: {formatPersianDate(file.lastModified)}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
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

          {/* Log Storage Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('logStorage')}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200 flex items-center justify-between hover:bg-green-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-gray-900">ذخیره‌سازی لاگ‌ها</span>
              </div>
              {expandedSections.includes('logStorage') ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </button>
            
            {expandedSections.includes('logStorage') && (
              <div className="p-6 space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings.logging?.logToFile !== false}
                        onChange={(e) => updateLoggingSettings({ logToFile: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settings.logging?.logToFile !== false ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Database className={`h-5 w-5 ${settings.logging?.logToFile !== false ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">فعال‌سازی ذخیره‌سازی لاگ‌ها</div>
                        <div className="text-sm text-gray-500">
                          با فعال کردن این گزینه، لاگ‌های انتخاب شده در مسیر تعیین شده ذخیره می‌شوند
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <strong>راهنما:</strong> با فعال کردن این گزینه، تمام لاگ‌های صفحات انتخاب شده در قسمت «دسته‌بندی‌های فعال» در مسیری که در تب «مسیر ذخیره‌سازی» تعیین شده (لوکال یا سرور) ذخیره می‌شوند. با غیرفعال کردن این گزینه، برنامه لاگ‌ها را ذخیره نخواهد کرد.
                </p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.logging.logToDatabase}
                      onChange={(e) => updateLoggingSettings({ logToDatabase: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <Database className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">ذخیره در پایگاه داده</div>
                      <div className="text-sm text-gray-600">ذخیره لاگ‌ها در پایگاه داده</div>
                    </div>
                  </label>
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
                <div className="relative">
                  <select
                    value={settings.logging.exportFormat || 'json'}
                    onChange={(e) => {
                      const format = e.target.value as 'json' | 'csv' | 'xml' | 'txt';
                      exportLogs(format);
                    }}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer appearance-none pr-10"
                  >
                    <option value="json" className="bg-white text-gray-900">JSON</option>
                    <option value="csv" className="bg-white text-gray-900">CSV</option>
                    <option value="xml" className="bg-white text-gray-900">XML</option>
                    <option value="txt" className="bg-white text-gray-900">متن</option>
                  </select>
                  <Download className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">از تاریخ</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تا تاریخ</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getLevelColor(log.level)}`}>
                                {log.level.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">{log.category}</span>
                              {log.userName && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {log.userName}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mb-1">{log.message}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatPersianDate(new Date(log.timestamp))} {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                              </span>
                              {log.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {log.ipAddress}
                                </span>
                              )}
                            </div>
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

      {/* Activity Logs Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Real-time indicator */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                realTimeMode 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {realTimeMode ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">حالت زنده فعال</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span className="text-sm font-medium">حالت زنده غیرفعال</span>
                  </>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {userActivityLogs.length} فعالیت ثبت شده
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Refresh activities from storage
                  const storedActivities = storage.loadData('userActivities') as any[] | null;
                  if (storedActivities) {
                    // Trigger update
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                بروزرسانی
              </button>
            </div>
          </div>

          {/* Activity Logs List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                تاریخچه فعالیت‌های کاربران
              </h4>
              {realTimeMode && (
                <div className="flex items-center gap-2 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs">در حال دریافت...</span>
                </div>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {userActivityLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>فعالیتی ثبت نشده است</p>
                  <p className="text-sm mt-1">
                    {realTimeMode 
                      ? 'در انتظار ثبت فعالیت‌های کاربران...' 
                      : 'فعایت‌های کاربران در اینجا نمایش داده می‌شوند'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {userActivityLogs.map((log: any) => (
                    <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            log.status === 'success' ? 'bg-green-50 text-green-600' :
                            log.status === 'failed' ? 'bg-red-50 text-red-600' :
                            'bg-yellow-50 text-yellow-600'
                          }`}>
                            {log.status === 'success' ? <CheckCircle className="h-4 w-4" /> :
                             log.status === 'failed' ? <XCircle className="h-4 w-4" /> :
                             <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{log.userName}</span>
                              <span className="text-sm text-gray-500">-</span>
                              <span className="text-sm text-gray-700">{log.action}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatPersianDate(new Date(log.timestamp))}
                              </span>
                              {log.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {log.ipAddress}
                                </span>
                              )}
                              <span className="capitalize">{log.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`px-2 py-1 text-xs rounded ${
                          log.status === 'success' ? 'bg-green-100 text-green-700' :
                          log.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {log.status === 'success' ? 'موفق' : 
                           log.status === 'failed' ? 'ناموفق' : 'هشدار'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
