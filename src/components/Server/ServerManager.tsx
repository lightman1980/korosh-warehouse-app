import React, { useState, useEffect } from 'react';
import { Server, Database, Shield, Globe, CheckCircle, AlertCircle, Settings, Wifi, HardDrive } from 'lucide-react';
import { DataStorage } from '../../utils/dataStorage';

interface ServerSettings {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  database: {
    type: 'mysql' | 'postgresql' | 'sqlite';
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
  };
  ssl: {
    enabled: boolean;
    certificate: string;
    privateKey: string;
  };
  backup: {
    enabled: boolean;
    interval: number; // hours
    retention: number; // days
    path: string;
  };
  security: {
    maxConnections: number;
    timeout: number; // seconds
    rateLimiting: boolean;
    corsEnabled: boolean;
    allowedOrigins: string[];
  };
}

export const ServerManager: React.FC = () => {
  const [settings, setSettings] = useState<ServerSettings>({
    host: 'localhost',
    port: 3000,
    protocol: 'http',
    database: {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      name: 'warehouse_db',
      username: 'root',
      password: ''
    },
    ssl: {
      enabled: false,
      certificate: '',
      privateKey: ''
    },
    backup: {
      enabled: true,
      interval: 24,
      retention: 30,
      path: '/backup'
    },
    security: {
      maxConnections: 1000,
      timeout: 30,
      rateLimiting: true,
      corsEnabled: true,
      allowedOrigins: ['http://localhost:3000']
    }
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    const savedSettings = storage.loadData('serverSettings');
    if (savedSettings) {
      setSettings(savedSettings);
    }
    
    // Check dark mode
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    storage.saveData('serverSettings', settings);
  }, [settings]);

  const testConnection = async () => {
    setConnectionStatus('testing');
    
    // Simulate connection test
    setTimeout(() => {
      const isValid = settings.host && settings.port > 0;
      setConnectionStatus(isValid ? 'connected' : 'disconnected');
    }, 2000);
  };

  const handleSave = () => {
    storage.saveData('serverSettings', settings);
    alert('تنظیمات سرور ذخیره شد');
  };

  return (
    <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تنظیمات سرور</h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>پیکربندی سرور و پایگاه داده</p>
          </div>
          <div className="flex items-center">
            <img 
              src="/لوگو صنعت غذایی کورش copy.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server Configuration */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-5 w-5 text-blue-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تنظیمات سرور وب</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  آدرس سرور
                </label>
                <input
                  type="text"
                  value={settings.host}
                  onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="localhost"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  پورت
                </label>
                <input
                  type="number"
                  value={settings.port}
                  onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="3000"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  پروتکل
                </label>
                <select
                  value={settings.protocol}
                  onChange={(e) => setSettings({ ...settings, protocol: e.target.value as 'http' | 'https' })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <button
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Wifi className="h-4 w-4" />
                  {connectionStatus === 'testing' ? 'در حال تست...' : 'تست اتصال'}
                </button>
                
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connected' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {connectionStatus === 'disconnected' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {connectionStatus === 'testing' && <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                  <span className={`text-sm ${
                    connectionStatus === 'connected' ? 'text-green-600' : 
                    connectionStatus === 'disconnected' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {connectionStatus === 'connected' ? 'متصل' : 
                     connectionStatus === 'disconnected' ? 'قطع' : 'در حال تست'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Database Configuration */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-green-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تنظیمات پایگاه داده</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  نوع پایگاه داده
                </label>
                <select
                  value={settings.database.type}
                  onChange={(e) => setSettings({
                    ...settings,
                    database: { ...settings.database, type: e.target.value as any }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    آدرس
                  </label>
                  <input
                    type="text"
                    value={settings.database.host}
                    onChange={(e) => setSettings({
                      ...settings,
                      database: { ...settings.database, host: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    پورت
                  </label>
                  <input
                    type="number"
                    value={settings.database.port}
                    onChange={(e) => setSettings({
                      ...settings,
                      database: { ...settings.database, port: parseInt(e.target.value) }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  نام پایگاه داده
                </label>
                <input
                  type="text"
                  value={settings.database.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    database: { ...settings.database, name: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    نام کاربری
                  </label>
                  <input
                    type="text"
                    value={settings.database.username}
                    onChange={(e) => setSettings({
                      ...settings,
                      database: { ...settings.database, username: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    رمز عبور
                  </label>
                  <input
                    type="password"
                    value={settings.database.password}
                    onChange={(e) => setSettings({
                      ...settings,
                      database: { ...settings.database, password: e.target.value }
                    })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-100' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-red-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تنظیمات امنیتی</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  حداکثر اتصالات همزمان
                </label>
                <input
                  type="number"
                  value={settings.security.maxConnections}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, maxConnections: parseInt(e.target.value) }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  مهلت اتصال (ثانیه)
                </label>
                <input
                  type="number"
                  value={settings.security.timeout}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, timeout: parseInt(e.target.value) }
                  })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>محدودیت نرخ درخواست</span>
                  <input
                    type="checkbox"
                    checked={settings.security.rateLimiting}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, rateLimiting: e.target.checked }
                    })}
                    className="toggle"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>فعال سازی CORS</span>
                  <input
                    type="checkbox"
                    checked={settings.security.corsEnabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, corsEnabled: e.target.checked }
                    })}
                    className="toggle"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className={`rounded-xl border p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="h-5 w-5 text-purple-600" />
              <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>تنظیمات پشتیبان‌گیری</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>پشتیبان‌گیری خودکار</span>
                <input
                  type="checkbox"
                  checked={settings.backup.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    backup: { ...settings.backup, enabled: e.target.checked }
                  })}
                  className="toggle"
                />
              </label>
              
              {settings.backup.enabled && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      فاصله زمانی (ساعت)
                    </label>
                    <input
                      type="number"
                      value={settings.backup.interval}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, interval: parseInt(e.target.value) }
                      })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      مدت نگهداری (روز)
                    </label>
                    <input
                      type="number"
                      value={settings.backup.retention}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, retention: parseInt(e.target.value) }
                      })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      مسیر ذخیره
                    </label>
                    <input
                      type="text"
                      value={settings.backup.path}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, path: e.target.value }
                      })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-100' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            ذخیره تنظیمات
          </button>
        </div>
      </div>
    </div>
  );
};