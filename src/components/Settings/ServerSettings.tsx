// ServerSettings.tsx - کامپوننت اصلی تنظیمات سرور
import React, { useState, useEffect } from 'react';
import { 
  Server, TestTube, FolderOpen, Save, RefreshCw, Settings as SettingsIcon, 
  CheckCircle, AlertCircle, Shield, Globe, Monitor, Cpu, HardDrive,
  Wifi, Network, Terminal, Info, Activity
} from 'lucide-react';
import { useSettings } from '../Contracts/SettingsContext';
import { FilePathSelector } from './FilePathSelector';
import { getSystemInfo, validateSystemRequirements } from '../../utils/SystemInfo';
import { 
  getApiConfigForDisplay, 
  testApiConnection, 
  detectLocalNetworkAddress, 
  discoverServerInNetwork,
  refreshApiConfig 
} from '../../utils/apiConfig';

export const ServerSettings: React.FC = () => {
  const {
    settings,
    systemInfo,
    updateSettings,
    saveSettings,
    resetSettings,
    testConnection,
    isLoading,
    error
  } = useSettings();

  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [connectionTestRunning, setConnectionTestRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // Network discovery states
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<Array<{
    hostname: string;
    port: number;
    protocol: string;
    success: boolean;
  }>>([]);
  const [apiConfigDisplay, setApiConfigDisplay] = useState(getApiConfigForDisplay());

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3 text-gray-600 font-medium">در حال بارگذاری تنظیمات سرور...</span>
      </div>
    );
  }

  const handleConnectionTest = async () => {
    setConnectionTestRunning(true);
    try {
      const apiTestResult = await testApiConnection();
      if (apiTestResult.success) {
        setTestResults(prev => ({ ...prev, connection: true }));
        alert(`✅ اتصال به سرور با موفقیت برقرار شد\nزمان پاسخ: ${apiTestResult.responseTime}ms`);
      } else {
        const result = await testConnection();
        setTestResults(prev => ({ ...prev, connection: result.success }));
        if (result.success) {
          alert('✅ اتصال به سرور با موفقیت برقرار شد');
        } else {
          alert(`❌ اتصال به سرور برقرار نشد\n${apiTestResult.error || result.error || 'لطفا تنظیمات را بررسی کنید'}`);
        }
      }
    } catch (error) {
      console.error('Connection test error:', error);
      alert('⚠️ خطا در تست اتصال به سرور');
    } finally {
      setConnectionTestRunning(false);
    }
  };
  
  const handleNetworkDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryResults([]);
    try {
      const localAddresses = await detectLocalNetworkAddress();
      const discovered = await discoverServerInNetwork(localAddresses, [3000, 3001, 8080, 5000, 3002]);
      if (discovered) {
        setDiscoveryResults([discovered]);
        if (confirm(`سرور در ${discovered.hostname}:${discovered.port} پیدا شد. آیا می‌خواهید از این تنظیمات استفاده کنید؟`)) {
          updateSettings({
            server: {
              ...settings.server,
              serverAddress: discovered.hostname,
              serverPort: discovered.port,
              protocol: discovered.protocol as 'http' | 'https',
              sslEnabled: discovered.protocol === 'https'
            }
          });
          refreshApiConfig();
          setApiConfigDisplay(getApiConfigForDisplay());
          alert('✅ تنظیمات سرور به‌روزرسانی شد');
        }
      } else {
        alert('⚠️ هیچ سروری در شبکه پیدا نشد. لطفا تنظیمات را به صورت دستی وارد کنید.');
      }
    } catch (error) {
      console.error('Network discovery error:', error);
      alert('❌ خطا در جستجوی سرور در شبکه');
    } finally {
      setIsDiscovering(false);
    }
  };
  
  useEffect(() => {
    setApiConfigDisplay(getApiConfigForDisplay());
  }, [settings]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const success = await saveSettings();
      if (success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleReset = () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید تنظیمات را بازنشانی کنید؟')) {
      resetSettings();
      setTestResults({});
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 rtl">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <Server className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">تنظیمات سرور</h1>
              <p className="text-gray-600">پیکربندی نصب برنامه روی سیستم داخلی و سرور شبکه</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleConnectionTest}
              disabled={connectionTestRunning}
              className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 font-medium ${
                connectionTestRunning 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              <TestTube className="h-4 w-4" />
              {connectionTestRunning ? 'در حال تست...' : 'تست اتصال'}
            </button>
            
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving' || isLoading}
              className={`px-6 py-2 text-sm rounded-lg transition-all flex items-center gap-2 font-bold shadow-sm ${
                saveStatus === 'success' 
                  ? 'bg-green-600 text-white' 
                  : saveStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200/50'
              }`}
            >
              <Save className="h-4 w-4" />
              {saveStatus === 'saving' ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
            </button>
            
            <button
              onClick={handleReset}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="بازنشانی به تنظیمات اولیه"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Installation Type Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-blue-600" />
                نوع نصب و پیکربندی اصلی
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => updateSettings({
                    server: { ...settings.server, installationType: 'local', serverAddress: 'localhost' }
                  })}
                  className={`p-4 rounded-xl border-2 transition-all text-right group ${
                    settings.server.installationType === 'local' 
                    ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-100' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg transition-colors ${
                      settings.server.installationType === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                    }`}>
                      <Monitor className="h-5 w-5" />
                    </div>
                    <span className={`font-bold ${settings.server.installationType === 'local' ? 'text-blue-900' : 'text-gray-700'}`}>
                      سیستم داخلی (Local)
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 pr-10">نصب برنامه روی همین سیستم و استفاده محلی</p>
                </button>

                <button
                  onClick={() => updateSettings({
                    server: { ...settings.server, installationType: 'network' }
                  })}
                  className={`p-4 rounded-xl border-2 transition-all text-right group ${
                    settings.server.installationType === 'network' 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg transition-colors ${
                      settings.server.installationType === 'network' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                    }`}>
                      <Network className="h-5 w-5" />
                    </div>
                    <span className={`font-bold ${settings.server.installationType === 'network' ? 'text-indigo-900' : 'text-gray-700'}`}>
                      سرور شبکه (Network)
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 pr-10">نصب برنامه روی سرور و دسترسی از طریق شبکه</p>
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">آدرس سرور / IP</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Globe className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        value={settings.server.serverAddress || ''}
                        onChange={(e) => updateSettings({
                          server: { ...settings.server, serverAddress: e.target.value }
                        })}
                        className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-mono"
                        placeholder="مثال: 192.168.1.100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">پورت اتصال</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Terminal className="h-5 w-5" />
                      </div>
                      <input
                        type="number"
                        value={settings.server.serverPort || 3000}
                        onChange={(e) => updateSettings({
                          server: { ...settings.server, serverPort: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-mono"
                        placeholder="3000"
                      />
                    </div>
                  </div>
                </div>

                {/* Raw Application Path Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">آدرس یا مسیر برنامه خام</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      value={settings.server.rawAppPath || ''}
                      onChange={(e) => updateSettings({
                        server: { ...settings.server, rawAppPath: e.target.value }
                      })}
                      className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      placeholder="مسیر فایل یا آدرس شبکه برنامه اصلی را وارد کنید"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    این آدرس برای دسترسی به فایل‌های اجرایی خام برنامه استفاده می‌شود.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Server Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">تنظیمات سیستمی سرور</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="block font-bold text-gray-800 text-sm">اجرا به عنوان سرویس</span>
                  <p className="text-xs text-gray-500">اجرای همیشگی در پس‌زمینه</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.server.runAsService || false}
                    onChange={(e) => updateSettings({
                      server: { ...settings.server, runAsService: e.target.checked }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="block font-bold text-gray-800 text-sm">شروع خودکار</span>
                  <p className="text-xs text-gray-500">شروع همزمان با سیستم عامل</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.server.autoStart || false}
                    onChange={(e) => updateSettings({
                      server: { ...settings.server, autoStart: e.target.checked }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="block font-bold text-gray-800 text-sm">استفاده از SSL</span>
                  <p className="text-xs text-gray-500">اتصال امن (HTTPS)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.server.sslEnabled || false}
                    onChange={(e) => updateSettings({
                      server: { ...settings.server, sslEnabled: e.target.checked }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <span className="block font-bold text-gray-800 text-sm">Network Discovery</span>
                  <p className="text-xs text-gray-500">قابلیت شناسایی در شبکه</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings.server.networkDiscoveryEnabled || false}
                    onChange={(e) => updateSettings({
                      server: { ...settings.server, networkDiscoveryEnabled: e.target.checked }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Paths */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              وضعیت فعلی سرور
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm bg-white/10 p-3 rounded-lg">
                <span>نوع نصب:</span>
                <span className="font-bold">{settings.server.installationType === 'local' ? 'داخلی' : 'شبکه'}</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-white/10 p-3 rounded-lg font-mono">
                <span>URL:</span>
                <span className="font-bold">{apiConfigDisplay.fullUrl}</span>
              </div>
              {systemInfo && (
                <div className="pt-4 border-t border-white/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <Cpu className="h-4 w-4" />
                    {systemInfo.platform} {systemInfo.architecture}
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <HardDrive className="h-4 w-4" />
                    حافظه اختصاصی: {settings.server.memoryLimit || 512} MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Paths Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              مسیرهای ذخیره‌سازی
            </h3>
            
            <FilePathSelector
              value={settings.server.databasePath || ''}
              onChange={(path) => updateSettings({
                server: { ...settings.server, databasePath: path }
              })}
              type="database"
              title="مسیر پایگاه داده"
              platform={systemInfo?.platform || 'windows'}
            />

            <FilePathSelector
              value={settings.server.logsPath || ''}
              onChange={(path) => updateSettings({
                server: { ...settings.server, logsPath: path }
              })}
              type="logs"
              title="مسیر فایل‌های لاگ"
              platform={systemInfo?.platform || 'windows'}
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              عملیات سریع شبکه
            </h4>
            <div className="space-y-3">
              <button
                onClick={handleNetworkDiscovery}
                disabled={isDiscovering}
                className="w-full py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Wifi className="h-4 w-4" />
                {isDiscovering ? 'در حال جستجو...' : 'جستجوی خودکار در شبکه'}
              </button>
              <p className="text-[10px] text-blue-600 text-center leading-relaxed">
                استفاده از این قابلیت به شما کمک می‌کند تا سرورهای فعال در شبکه محلی را به صورت خودکار پیدا کنید.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};
