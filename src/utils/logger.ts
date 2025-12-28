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
  logType: boolean;
  logNature: boolean;
  ipAddress: boolean;
}

export interface LogPathConfig {
  path: string;
  createDailyFiles: boolean;
  maxFilesPerCategory: number;
  compressOldLogs: boolean;
  backupCount: number;
  exportFormat: 'xlsx' | 'txt' | 'log';
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
    exportFormat: 'xlsx'
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

  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const fullEntry: LogEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      ...entry
    };

    // Check if live view is enabled
    const settings = this.storage.loadData<any>('appSettings');
    if (settings?.logging?.enableLiveView === false) {
      console.log('📝 Log suppressed (Live View disabled):', fullEntry.message);
    } else {
      console.log(`📝 [${fullEntry.level.toUpperCase()}] [${fullEntry.category}] ${fullEntry.message}`, fullEntry);
    }

    // Store in LocalStorage for persistence (as a file simulation)
    const fileName = this.config.createDailyFiles 
      ? `log_${new Date().toISOString().split('T')[0]}.log`
      : 'system.log';
    
    const fileKey = `logfile_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const existingContent = localStorage.getItem(fileKey) || '';
    const newContent = existingContent + JSON.stringify(fullEntry) + '\n';
    
    try {
      localStorage.setItem(fileKey, newContent);
      
      // Update metadata
      const metaKey = fileKey.replace('logfile_', 'logmeta_');
      const meta: LogFileInfo = {
        path: fileName,
        size: newContent.length,
        lastModified: new Date(),
        entryCount: (existingContent.split('\n').length - 1) + 1
      };
      localStorage.setItem(metaKey, JSON.stringify(meta));
    } catch (e) {
      console.warn('LocalStorage limit reached for logs, clearing old logs...');
      // In a real app, we would rotate or prune here
    }

    return fullEntry;
  }

  async getLogFiles(): Promise<LogFileInfo[]> {
    const files: LogFileInfo[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('logmeta_')) {
        try {
          const meta = JSON.parse(localStorage.getItem(key) || '{}');
          files.push(meta);
        } catch (e) {}
      }
    }
    return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  async readLogFile(path: string): Promise<string> {
    const fileKey = `logfile_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return localStorage.getItem(fileKey) || '';
  }

  async parseLogEntries(content: string): Promise<LogEntry[]> {
    if (!content) return [];
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
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
      const finalReceiptDate = action.receiptDate || '';
      const finalDocumentType = action.documentType || '';
      const finalCounterparty = action.counterparty || '';
      finalLogType = action.logType || 'user';
      finalLogNature = action.logNature || '';
      finalOldValue = action.oldValue || oldValue;
      finalNewValue = action.newValue || newValue;

      const activity: UserActivityEntry = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        userId: userId,
        userName: userName,
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
        ipAddress: '127.0.0.1' // In a browser app, IP is usually handled by server
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

  // Save to userActivities for immediate UI update in LoggingSettings
  const activities = storage.loadData<any[]>('userActivities') || [];
  activities.unshift(activity);
  storage.saveData('userActivities', activities.slice(0, 1000)); // Keep last 1000

  return activity;
};

// Initialize global helper
if (typeof window !== 'undefined') {
  (window as any).logUserActivity = logUserActivity;
}
