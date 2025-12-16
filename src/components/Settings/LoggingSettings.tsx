import React, { useState, useEffect, useMemo } from 'react';
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
  Monitor
} from 'lucide-react';
import { formatPersianDate } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';

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

interface FilterState {
  search: string;
  level: ('error' | 'warn' | 'info' | 'debug')[];
  category: string[];
  dateFrom: string;
  dateTo: string;
  userId: string;
}

export const LoggingSettings: React.FC<LoggingSettingsProps> = ({
  settings,
  setSettings,
  userActivityLogs,
  showLogViewer,
  setShowLogViewer,
  downloadLogs: originalDownloadLogs
}) => {
  const storage = DataStorage.getInstance();
  
  // State management
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'viewer' | 'activity'>(showLogViewer ? 'viewer' : 'settings');
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(50);
  const [expandedSections, setExpandedSections] = useState<string[]>(['general']);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    level: ['error', 'warn', 'info', 'debug'],
    category: [],
    dateFrom: '',
    dateTo: '',
    userId: ''
  });

  // Load logs from storage
  useEffect(() => {
    loadLogs();
    const interval = setInterval(() => {
      if (realTimeMode) {
        loadLogs();
      }
    }, 5000); // Update every 5 seconds in real-time mode
    
    return () => clearInterval(interval);
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

  const loadLogs = () => {
    try {
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
      'گزارش جدید تولید شد'
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
        details: level === 'error' ? 'جزئیات خطا: ' + message : undefined,
        userId: Math.random() > 0.5 ? `user-${Math.floor(Math.random() * 5) + 1}` : undefined,
        userName: Math.random() > 0.5 ? ['علی احمدی', 'فاطمه رضایی', 'محمد کریمی', 'زهرا محمدی', 'حسین رضایی'][Math.floor(Math.random() * 5)] : undefined,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
    setSettings({
      ...settings,
      logging: {
        ...settings.logging,
        ...updates
      }
    });
    storage.saveData('settings', {
      ...settings,
      logging: {
        ...settings.logging,
        ...updates
      }
    });
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

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            مدیریت لاگ‌های سیستم
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRealTimeMode(!realTimeMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                realTimeMode 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {realTimeMode ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              <span>حالت زنده</span>
              {realTimeMode && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            </button>
            <button
              onClick={loadLogs}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              بروزرسانی
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
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
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
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
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
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

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
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
                      checked={settings.logging.logToFile}
                      onChange={(e) => updateLoggingSettings({ logToFile: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <HardDrive className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">ذخیره در فایل</div>
                      <div className="text-sm text-gray-600">ذخیره لاگ‌ها در فایل‌های سیستم</div>
                    </div>
                  </label>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    دسته‌بندی‌های فعال
                    <span className="text-xs text-gray-500 block mt-1">
                      انتخاب دسته‌بندی‌هایی که باید لاگ شوند
                    </span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['system', 'security', 'database', 'user', 'inventory', 'reporting', 'settings', 'integration'].map(category => (
                      <label key={category} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.logging.logCategories.includes(category)}
                          onChange={(e) => {
                            const newCategories = e.target.checked
                              ? [...settings.logging.logCategories, category]
                              : settings.logging.logCategories.filter((c: string) => c !== category);
                            updateLoggingSettings({ logCategories: newCategories });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {category === 'system' && 'سیستم'}
                          {category === 'security' && 'امنیت'}
                          {category === 'database' && 'پایگاه داده'}
                          {category === 'user' && 'کاربر'}
                          {category === 'inventory' && 'انبار'}
                          {category === 'reporting' && 'گزارش'}
                          {category === 'settings' && 'تنظیمات'}
                          {category === 'integration' && 'یکپارچه‌سازی'}
                        </span>
                      </label>
                    ))}
                  </div>
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
                  onClick={clearLogs}
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">فعالیت‌های کاربران</h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {userActivityLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>فعالیتی ثبت نشده است</p>
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
                              <span>{formatPersianDate(new Date(log.timestamp))}</span>
                              <span>{log.ipAddress}</span>
                              <span className="capitalize">{log.category}</span>
                            </div>
                          </div>
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
