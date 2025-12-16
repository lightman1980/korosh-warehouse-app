import React, { useState, useEffect } from 'react';
import { Monitor, HardDrive, Cpu, MemoryStick, Activity, RefreshCw, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { DataStorage } from '../../utils/dataStorage';
import { formatPersianNumber, formatPersianDate } from '../../utils/persian';

interface SystemInfo {
  version: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  storage: {
    used: number;
    total: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  network: {
    upload: number;
    download: number;
  };
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  module: string;
}

export const SystemManager: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    version: '1.0.0',
    uptime: 86400, // seconds
    memory: { used: 2.1, total: 8.0 },
    storage: { used: 45.2, total: 500.0 },
    cpu: { usage: 15, cores: 4 },
    network: { upload: 1.2, download: 5.8 }
  });

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date(),
      level: 'info',
      message: 'سیستم با موفقیت راه‌اندازی شد',
      module: 'System'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 300000),
      level: 'warning',
      message: 'استفاده از حافظه بالا است',
      module: 'Memory'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 600000),
      level: 'error',
      message: 'خطا در اتصال به پایگاه داده',
      module: 'Database'
    }
  ]);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemInfo(prev => ({
        ...prev,
        uptime: prev.uptime + 1,
        memory: {
          ...prev.memory,
          used: Math.max(1, Math.min(7.5, prev.memory.used + (Math.random() - 0.5) * 0.1))
        },
        cpu: {
          ...prev.cpu,
          usage: Math.max(5, Math.min(95, prev.cpu.usage + (Math.random() - 0.5) * 10))
        },
        network: {
          upload: Math.max(0, prev.network.upload + (Math.random() - 0.5) * 0.5),
          download: Math.max(0, prev.network.download + (Math.random() - 0.5) * 1)
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days} روز، ${hours} ساعت، ${minutes} دقیقه`;
  };

  const createBackup = () => {
    const allData = storage.getAllData();
    const backupData = {
      timestamp: new Date().toISOString(),
      version: systemInfo.version,
      data: allData
    };
    
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `system_backup_${formatPersianDate(new Date())}.json`;
    link.click();
    
    alert('فایل پشتیبان با موفقیت ایجاد شد');
  };

  const restoreBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const backupData = JSON.parse(e.target?.result as string);
            if (backupData.data) {
              Object.entries(backupData.data).forEach(([key, value]) => {
                storage.saveData(key, value);
              });
              alert('بازیابی با موفقیت انجام شد. لطفاً صفحه را بازخوانی کنید.');
            }
          } catch (error) {
            alert('خطا در بازیابی فایل پشتیبان');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const clearLogs = () => {
    if (confirm('آیا از پاک کردن تمام لاگ‌ها اطمینان دارید؟')) {
      setLogs([]);
    }
  };

  const restartSystem = () => {
    if (confirm('آیا از راه‌اندازی مجدد سیستم اطمینان دارید؟')) {
      alert('سیستم در حال راه‌اندازی مجدد است...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تنظیمات سیستم</h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>مانیتورینگ و مدیریت سیستم</p>
          </div>
          <div className="flex items-center">
            <img 
              src="/لوگو صنعت غذایی کورش copy.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>استفاده از CPU</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {formatPersianNumber(systemInfo.cpu.usage)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Cpu className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${systemInfo.cpu.usage}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>حافظه</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {formatPersianNumber(systemInfo.memory.used)} GB
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <MemoryStick className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(systemInfo.memory.used / systemInfo.memory.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>فضای ذخیره</p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {formatPersianNumber(systemInfo.storage.used)} GB
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <HardDrive className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(systemInfo.storage.used / systemInfo.storage.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>مدت فعالیت</p>
                <p className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {formatUptime(systemInfo.uptime)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Operations */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-5 w-5 text-blue-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>عملیات سیستم</h3>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>اطلاعات سیستم</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>نسخه:</span>
                    <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{systemInfo.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>هسته‌های CPU:</span>
                    <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatPersianNumber(systemInfo.cpu.cores)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>کل حافظه:</span>
                    <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatPersianNumber(systemInfo.memory.total)} GB</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={createBackup}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 justify-center"
                >
                  <Download className="h-4 w-4" />
                  پشتیبان‌گیری
                </button>
                
                <button
                  onClick={restoreBackup}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center"
                >
                  <Upload className="h-4 w-4" />
                  بازیابی
                </button>
              </div>
              
              <button
                onClick={restartSystem}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 justify-center"
              >
                <RefreshCw className="h-4 w-4" />
                راه‌اندازی مجدد
              </button>
            </div>
          </div>

          {/* System Logs */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>لاگ سیستم</h3>
              </div>
              <button
                onClick={clearLogs}
                className="text-red-600 hover:text-red-800 p-1"
                title="پاک کردن لاگ‌ها"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(log.level)}`}>
                          {log.level === 'info' ? 'اطلاع' : log.level === 'warning' ? 'هشدار' : 'خطا'}
                        </span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {log.module}
                        </span>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{log.message}</p>
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatPersianDate(log.timestamp)} - {log.timestamp.toLocaleTimeString('fa-IR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};