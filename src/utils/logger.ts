import { DataStorage } from './dataStorage';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: string;
  message: string;
  userName?: string;
  userId?: string;
  ipAddress?: string;
  page?: string;
  field?: string;
  selection?: string;
  oldValue?: any;
  newValue?: any;
  amount?: string | number;
  product?: string;
  receiptDate?: string;
  documentType?: string;
  counterparty?: string;
  logType?: string;
  logNature?: string;
  details?: any;
}


export interface LogFileInfo {
  path: string;
  size: number;
  lastModified: Date;
  entryCount: number;
}

export interface LogFieldConfig {
  userName: boolean;
  timestamp: boolean;
  page: boolean;
  field: boolean;
  selection: boolean;
  oldValue: boolean;
  newValue: boolean;
  logType: boolean;
  logNature: boolean;
  ipAddress: boolean;
  otherDetails: boolean;
}

export interface LogPathConfig {
  path: string;
  createDailyFiles: boolean;
  maxFilesPerCategory: number;
  compressOldLogs: boolean;
  backupCount: number;
  exportFormat: 'xlsx' | 'txt' | 'log';
  maxLogSizeMB: number;
  logRetentionDays: number;
  minLogLevel: 'all' | 'error' | 'warn' | 'info' | 'debug';
}

export interface StoragePathConfig {
  type: 'local' | 'server';
  localPath: string;
  serverUrl: string;
  serverHost: string;
}

export interface UserActivityEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  category: string;
  page: string;
  status: 'success' | 'failed' | 'warning';
  ipAddress?: string;
  details?: any;
  field?: string;
  selection?: string;
  amount?: string | number;
  product?: string;
  receiptDate?: string;
  documentType?: string;
  counterparty?: string;
  logType?: string;
  logNature?: string;
  oldValue?: any;
  newValue?: any;
}

// ============================================================================
// Logger Service
// ============================================================================

export class LoggerService {
  private static instance: LoggerService;
  private storage = DataStorage.getInstance();
  private config: LogPathConfig = {
    path: 'C:\\Logs\\Makhazen',
    createDailyFiles: true,
    maxFilesPerCategory: 10,
    compressOldLogs: true,
    backupCount: 5,
    exportFormat: 'xlsx',
    maxLogSizeMB: 100,
    logRetentionDays: 90,
    minLogLevel: 'all'
  };
  private storageConfig: StoragePathConfig = {
    type: 'local',
    localPath: 'C:\\Logs\\Makhazen',
    serverUrl: '',
    serverHost: ''
  };

  private constructor() {
    const savedConfig = this.storage.loadData<LogPathConfig>('logPathConfig');
    if (savedConfig) this.config = savedConfig;
    
    const savedStorageConfig = this.storage.loadData<StoragePathConfig>('storagePathConfig');
    if (savedStorageConfig) this.storageConfig = savedStorageConfig;
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  setConfig(config: LogPathConfig) {
    this.config = config;
  }

  setStorageConfig(config: StoragePathConfig) {
    this.storageConfig = config;
  }

  private getFileCounter(date: string): number {
    // Count existing files for this date
    const allKeys = Object.keys(localStorage);
    const datePrefix = `log_${date}_`;
    let maxCounter = 0;
    
    allKeys.forEach(key => {
      if (key.startsWith('logfile_')) {
        const fileKey = key.replace('logfile_', '');
        if (fileKey.startsWith(datePrefix.replace(/[^a-zA-Z0-9]/g, '_'))) {
          // Extract counter from filename
          const match = fileKey.match(/_(\d+)\./);
          if (match) {
            const counter = parseInt(match[1]);
            if (counter > maxCounter) {
              maxCounter = counter;
            }
          }
        }
      }
    });
    
    return maxCounter + 1;
  }

  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    // Check log level filter
    if (this.config.minLogLevel !== 'all') {
      const levelOrder = { error: 0, warn: 1, info: 2, debug: 3 };
      const minLevel = levelOrder[this.config.minLogLevel];
      const entryLevel = levelOrder[entry.level] ?? 3;
      if (entryLevel > minLevel) {
        return null; // Skip this log entry
      }
    }

    // Check retention period
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.logRetentionDays);
    
    const fullEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      ...entry
    };

    // Check if live view is enabled (only affects console display, not file storage)
    const settings = this.storage.loadData<any>('appSettings');
    const enableLiveView = settings?.logging?.enableLiveView !== false;
    
    // Always log to console if live view is enabled, but always save to file
    if (!enableLiveView) {
      // Don't show in console, but still save to file
      console.log('📝 Log saved to file (Live View disabled):', fullEntry.message);
    } else {
      console.log(`📝 [${fullEntry.level.toUpperCase()}] [${fullEntry.category}] ${fullEntry.message}`, fullEntry);
    }
    
    // IMPORTANT: Always save logs to file regardless of live view setting

    // Store in LocalStorage for persistence (as a file simulation)
    const today = new Date().toISOString().split('T')[0];
    const fileName = this.config.createDailyFiles 
      ? `log_${today}.log`
      : 'system.log';
    
    const fileKey = `logfile_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const existingContent = localStorage.getItem(fileKey) || '';
    const entryString = JSON.stringify(fullEntry) + '\n';
    const newContent = existingContent + entryString;
    const newSizeMB = (new Blob([newContent]).size) / (1024 * 1024);
    
    // Check if file size exceeds maximum
    if (newSizeMB >= this.config.maxLogSizeMB) {
      // Move old file to backup folder
      const backupFolderKey = 'backup_logs_folder';
      const backupKey = `backup_log_${today}_${Date.now()}.log`;
      const backupPath = `${this.storageConfig.localPath || this.config.path}/Backup لاگ/${backupKey}`;
      
      // Store backup file
      localStorage.setItem(backupKey, existingContent);
      
      // Store backup metadata
      const backupMetaKey = backupKey.replace('backup_log_', 'backup_meta_');
      const backupMeta: LogFileInfo = {
        path: backupPath,
        size: existingContent.length,
        lastModified: new Date(),
        entryCount: existingContent.split('\n').filter(l => l.trim()).length
      };
      localStorage.setItem(backupMetaKey, JSON.stringify(backupMeta));
      
      // Create new file
      const fileCounter = this.getFileCounter(today);
      const newFileName = this.config.createDailyFiles
        ? `log_${today}_${fileCounter}.${this.config.exportFormat === 'xlsx' ? 'xlsx' : this.config.exportFormat === 'txt' ? 'txt' : 'log'}`
        : `system_${Date.now()}.${this.config.exportFormat === 'xlsx' ? 'xlsx' : this.config.exportFormat === 'txt' ? 'txt' : 'log'}`;
      const newFileKey = `logfile_${newFileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.setItem(newFileKey, entryString);
      
      // Update metadata for new file
      const newMetaKey = newFileKey.replace('logfile_', 'logmeta_');
      const actualPath = this.storageConfig.type === 'local' 
        ? `${this.storageConfig.localPath || this.config.path}/${newFileName}`
        : this.storageConfig.type === 'server'
          ? `${this.storageConfig.serverUrl || this.storageConfig.serverHost || this.config.path}/${newFileName}`
          : `${this.config.path}/${newFileName}`;
      const newMeta: LogFileInfo = {
        path: actualPath, // Full path based on storage type
        size: entryString.length,
        lastModified: new Date(),
        entryCount: 1
      };
      localStorage.setItem(newMetaKey, JSON.stringify(newMeta));
      
      // Show warning to user
      if (enableLiveView) {
        console.warn(`⚠️ اندازه فایل لاگ از ${this.config.maxLogSizeMB}MB تجاوز کرد. فایل جدید ایجاد شد: ${newFileName}`);
        // Show browser alert if possible
        if (typeof window !== 'undefined' && window.alert) {
          setTimeout(() => {
            alert(`هشدار: اندازه فایل لاگ از ${this.config.maxLogSizeMB}MB تجاوز کرد.\nفایل قبلی به پوشه Backup لاگ منتقل شد.\nفایل جدید: ${newFileName}`);
          }, 100);
        }
      }
    } else {
      try {
        localStorage.setItem(fileKey, newContent);
        
        // Update metadata
        const metaKey = fileKey.replace('logfile_', 'logmeta_');
        const actualPath = this.storageConfig.type === 'local' 
          ? `${this.storageConfig.localPath || this.config.path}/${fileName}`
          : this.storageConfig.type === 'server'
            ? `${this.storageConfig.serverUrl || this.storageConfig.serverHost || this.config.path}/${fileName}`
            : `${this.config.path}/${fileName}`;
        const meta: LogFileInfo = {
          path: actualPath, // Full path based on storage type
          size: newContent.length,
          lastModified: new Date(),
          entryCount: (existingContent.split('\n').filter(l => l.trim()).length) + 1
        };
        localStorage.setItem(metaKey, JSON.stringify(meta));
      } catch (e) {
        console.warn('LocalStorage limit reached for logs, clearing old logs...');
        // In a real app, we would rotate or prune here
      }
    }

    // Clean up old logs based on retention period
    this.cleanupOldLogs(retentionDate);

    return fullEntry;
  }

  private cleanupOldLogs(beforeDate: Date) {
    // Clean up logs older than retention period
    const allKeys = Object.keys(localStorage);
    const filesToDelete: string[] = [];
    
    allKeys.forEach(key => {
      if (key.startsWith('logfile_') || key.startsWith('logmeta_') || key.startsWith('backup_log_') || key.startsWith('backup_meta_')) {
        try {
          if (key.startsWith('logmeta_') || key.startsWith('backup_meta_')) {
            const meta = JSON.parse(localStorage.getItem(key) || '{}');
            if (meta.lastModified && new Date(meta.lastModified) < beforeDate) {
              const fileKey = key.replace('logmeta_', 'logfile_').replace('backup_meta_', 'backup_log_');
              filesToDelete.push(key);
              filesToDelete.push(fileKey);
            }
          }
        } catch (e) {
          // Ignore errors
        }
      }
    });
    
    // Delete old files
    filesToDelete.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Also manage max files per category if createDailyFiles is enabled
    if (this.config.createDailyFiles && this.config.maxFilesPerCategory > 0) {
      this.manageFilesPerCategory();
    }
  }

  private manageFilesPerCategory() {
    // Group files by date and category, keep only maxFilesPerCategory per category
    const allKeys = Object.keys(localStorage);
    const filesByCategory = new Map<string, Array<{ key: string; meta: LogFileInfo; date: Date }>>();
    
    allKeys.forEach(key => {
      if (key.startsWith('logmeta_')) {
        try {
          const meta = JSON.parse(localStorage.getItem(key) || '{}') as LogFileInfo;
          if (meta.path && meta.lastModified) {
            // Extract category from path or use 'general'
            const category = this.extractCategoryFromPath(meta.path) || 'general';
            
            if (!filesByCategory.has(category)) {
              filesByCategory.set(category, []);
            }
            
            filesByCategory.get(category)!.push({
              key,
              meta,
              date: new Date(meta.lastModified)
            });
          }
        } catch (e) {
          // Ignore errors
        }
      }
    });
    
    // For each category, keep only the most recent maxFilesPerCategory files
    filesByCategory.forEach((files, category) => {
      if (files.length > this.config.maxFilesPerCategory) {
        // Sort by date, newest first
        files.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        // Delete older files
        const filesToDelete = files.slice(this.config.maxFilesPerCategory);
        filesToDelete.forEach(({ key }) => {
          const fileKey = key.replace('logmeta_', 'logfile_');
          localStorage.removeItem(key);
          localStorage.removeItem(fileKey);
        });
      }
    });
  }

  private extractCategoryFromPath(path: string): string | null {
    // Try to extract category from path
    // For now, return null to use 'general' category
    // This can be enhanced to parse actual category from path
    return null;
  }

  async getLogFiles(): Promise<LogFileInfo[]> {
    const files: LogFileInfo[] = [];
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.logRetentionDays);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('logmeta_')) {
        try {
          const meta = JSON.parse(localStorage.getItem(key) || '{}');
          // Only include files within retention period
          if (meta.lastModified) {
            // تبدیل lastModified به Date object اگر string است
            const lastModifiedDate = meta.lastModified instanceof Date 
              ? meta.lastModified 
              : new Date(meta.lastModified);
            
            if (lastModifiedDate >= retentionDate) {
              // اطمینان از اینکه lastModified یک Date object است
              files.push({
                ...meta,
                lastModified: lastModifiedDate
              });
            }
          }
        } catch (e) {
          console.warn('خطا در بارگذاری metadata فایل لاگ:', e);
        }
      }
    }
    // مرتب‌سازی با اطمینان از اینکه lastModified یک Date object است
    return files.sort((a, b) => {
      const dateA = a.lastModified instanceof Date ? a.lastModified : new Date(a.lastModified);
      const dateB = b.lastModified instanceof Date ? b.lastModified : new Date(b.lastModified);
      return dateB.getTime() - dateA.getTime();
    });
  }

  async readLogFile(path: string): Promise<string> {
    const fileKey = `logfile_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return localStorage.getItem(fileKey) || '';
  }

  async parseLogEntries(content: string): Promise<LogEntry[]> {
    if (!content) return [];
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.logRetentionDays);
    
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          const entry = JSON.parse(line);
          // Filter by retention period
          if (entry.timestamp && new Date(entry.timestamp) >= retentionDate) {
            return entry;
          }
          return null;
        } catch (e) {
          return null;
        }
      })
      .filter(entry => entry !== null);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

export const logUserActivity = async (
  action: string | any,
  category: string = 'general',
  page: string = '',
  status: 'success' | 'failed' | 'warning' = 'success',
  details: any = null,
  oldValue: any = null,
  newValue: any = null
) => {
  const logger = LoggerService.getInstance();
  const storage = DataStorage.getInstance();
  
  // Support both (message, category, ...) and ({ action, category, ... })
  let finalAction = action;
  let finalCategory = category;
  let finalPage = page;
  let finalStatus = status;
  let finalDetails = details;
  let finalField = '';
  let finalSelection = '';
  let finalAmount = '';
  let finalProduct = '';
  let finalLogType = 'user';
  let finalLogNature = '';
  let finalReceiptDate = '';
  let finalDocumentType = '';
  let finalCounterparty = '';
  let finalOldValue = oldValue;
  let finalNewValue = newValue;

  if (typeof action === 'object' && action !== null) {
    finalAction = action.action || '';
    finalCategory = action.category || category;
    finalPage = action.page || page;
    finalStatus = action.status || status;
    finalDetails = action.details || details;
    finalField = action.field || '';
    finalSelection = action.selection || '';
    finalAmount = action.amount || '';
    finalProduct = action.product || '';
    finalReceiptDate = action.receiptDate || '';
    finalDocumentType = action.documentType || '';
    finalCounterparty = action.counterparty || '';
    finalLogType = action.logType || 'user';
    finalLogNature = action.logNature || '';
    finalOldValue = action.oldValue || oldValue;
    finalNewValue = action.newValue || newValue;
  }

  const currentUser = storage.loadData<any>('currentUser');
  const userId = currentUser?.id || 'guest';
  const userName = currentUser?.fullName || currentUser?.username || 'کاربر مهمان';

  // Automatically detect log nature if not provided
  let detectedLogNature = finalLogNature;
  if (!detectedLogNature) {
    if (finalAction.includes('ایجاد') || finalAction.includes('ثبت')) detectedLogNature = 'ایجاد';
    else if (finalAction.includes('ویرایش') || finalAction.includes('آپدیت')) detectedLogNature = 'ویرایش';
    else if (finalAction.includes('حذف')) detectedLogNature = 'حذف';
    else if (finalAction.includes('ورود')) detectedLogNature = 'ورود';
    else if (finalAction.includes('خروج')) detectedLogNature = 'خروج';
    else detectedLogNature = 'عملیات';
  }

  const activity: UserActivityEntry = {
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action: finalAction,
    category: finalCategory,
    page: finalPage,
    status: finalStatus,
    details: finalDetails,
    field: finalField,
    selection: finalSelection,
    amount: finalAmount,
    product: finalProduct,
    receiptDate: finalReceiptDate,
    documentType: finalDocumentType,
    counterparty: finalCounterparty,
    logType: finalLogType,
    logNature: detectedLogNature,
    oldValue: finalOldValue,
    newValue: finalNewValue,
    ipAddress: '127.0.0.1'
  };

  // Log via LoggerService
  await logger.log({
    level: finalStatus === 'failed' ? 'error' : finalStatus === 'warning' ? 'warn' : 'info',
    category: finalCategory,
    message: finalAction,
    userName: userName,
    userId: userId,
    page: finalPage,
    field: finalField,
    selection: finalSelection,
    oldValue: finalOldValue,
    newValue: finalNewValue,
    amount: finalAmount,
    product: finalProduct,
    receiptDate: finalReceiptDate,
    documentType: finalDocumentType,
    counterparty: finalCounterparty,
    logType: finalLogType,
    logNature: detectedLogNature,
    details: finalDetails,
    ipAddress: activity.ipAddress
  });

  // Save to userActivities
  const activities = storage.loadData<any[]>('userActivities') || [];
  activities.unshift(activity);
  storage.saveData('userActivities', activities.slice(0, 1000));

  return activity;
};

// Initialize global helper
if (typeof window !== 'undefined') {
  (window as any).logUserActivity = logUserActivity;
}
