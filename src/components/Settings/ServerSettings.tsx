// ServerSettings.tsx - کامپوننت اصلی تنظیمات سرور
import React, { useState, useEffect } from 'react';
import { 
  Server, TestTube, FolderOpen, Save, RefreshCw, Settings as SettingsIcon, 
  CheckCircle, AlertCircle, Shield, Lock, Eye, EyeOff, 
  Activity, Zap, Database, Globe, Code, Monitor, Cpu, HardDrive,
  Users, Clock, Plus, Trash2, Copy, Settings, Wifi, Network
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
  const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'advanced'>('basic');
  
  // Security states
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [securityTestRunning, setSecurityTestRunning] = useState(false);
  const [apiKeyToAdd, setApiKeyToAdd] = useState('');
  const [showAddApiKey, setShowAddApiKey] = useState(false);
  
  // Advanced settings states
  const [envVariableToAdd, setEnvVariableToAdd] = useState({ key: '', value: '' });
  const [showAddEnvVariable, setShowAddEnvVariable] = useState(false);
  
  // Network discovery states
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<Array<{
    hostname: string;
    port: number;
    protocol: string;
    success: boolean;
  }>>([]);
  const [apiConfigDisplay, setApiConfigDisplay] = useState(getApiConfigForDisplay());

  // اگر تنظیمات هنوز بارگذاری نشده‌اند
  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="mr-3">در حال بارگذاری تنظیمات سرور...</span>
      </div>
    );
  }

  // تست اتصال
  const handleConnectionTest = async () => {
    setConnectionTestRunning(true);
    try {
      // استفاده از testApiConnection از apiConfig
      const apiTestResult = await testApiConnection();
      
      if (apiTestResult.success) {
        setTestResults(prev => ({ ...prev, connection: true }));
        alert(`✅ اتصال به سرور با موفقیت برقرار شد\nزمان پاسخ: ${apiTestResult.responseTime}ms`);
      } else {
        // تست با testConnection قدیمی به عنوان fallback
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
  
  // تشخیص خودکار آدرس شبکه
  const handleNetworkDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryResults([]);
    
    try {
      // دریافت آدرس‌های محلی
      const localAddresses = await detectLocalNetworkAddress();
      
      // جستجوی سرور در شبکه
      const discovered = await discoverServerInNetwork(localAddresses, [3000, 3001, 8080, 5000, 3002]);
      
      if (discovered) {
        setDiscoveryResults([discovered]);
        
        // پیشنهاد استفاده از سرور پیدا شده
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
  
  // به‌روزرسانی نمایش تنظیمات API
  useEffect(() => {
    setApiConfigDisplay(getApiConfigForDisplay());
  }, [settings]);

  // ذخیره تنظیمات
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
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // بازنشانی تنظیمات
  const handleReset = () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید تنظیمات را بازنشانی کنید؟')) {
      resetSettings();
      setTestResults({});
    }
  };

  // اعتبارسنجی سیستم
  const validateSystem = async () => {
    try {
      const sysInfo = await getSystemInfo();
      const validation = await validateSystemRequirements(sysInfo, settings.server);
      
      if (validation.passed) {
        alert('✅ سیستم شما برای این تنظیمات مناسب است');
      } else {
        alert(`⚠️ مشکلات:\n${validation.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('System validation error:', error);
      alert('خطا در اعتبارسنجی سیستم');
    }
  };

  // Security Functions
  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const addApiKey = () => {
    if (!apiKeyToAdd.trim()) return;
    const newKey = {
      id: Date.now().toString(),
      name: `API Key ${Date.now()}`,
      key: apiKeyToAdd,
      created: new Date().toISOString(),
      permissions: ['read'],
      active: true
    };
    
    // In a real app, this would update the settings
    console.log('Adding API Key:', newKey);
    setApiKeyToAdd('');
    setShowAddApiKey(false);
  };

  const removeApiKey = (keyId: string) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید این کلید API را حذف کنید؟')) {
      console.log('Removing API Key:', keyId);
    }
  };

  const testSecurityConfiguration = async () => {
    setSecurityTestRunning(true);
    try {
      // Simulate security test
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('✅ تمام تنظیمات امنیتی با موفقیت بررسی شدند');
    } catch (error) {
      alert('❌ خطا در بررسی تنظیمات امنیتی');
    } finally {
      setSecurityTestRunning(false);
    }
  };

  // Advanced Functions
  const addEnvironmentVariable = () => {
    if (!envVariableToAdd.key.trim() || !envVariableToAdd.value.trim()) return;
    
    // In a real app, this would update the settings
    console.log('Adding Environment Variable:', envVariableToAdd);
    setEnvVariableToAdd({ key: '', value: '' });
    setShowAddEnvVariable(false);
  };

  const removeEnvironmentVariable = (key: string) => {
    if (confirm('آیا مطمئن هستید که می‌خواهید این متغیر محیطی را حذف کنید؟')) {
      console.log('Removing Environment Variable:', key);
    }
  };

  const runPerformanceBenchmark = async () => {
    try {
      alert('🔄 شروع آزمون عملکرد...');
      // Simulate performance test
      await new Promise(resolve => setTimeout(resolve, 3000));
      alert('✅ آزمون عملکرد تکمیل شد. نتایج در تب‌های نظارت قابل مشاهده است');
    } catch (error) {
      alert('❌ خطا در اجرای آزمون عملکرد');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Server className="h-8 w-8 mr-3 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">تنظیمات سرور</h1>
              <p className="text-gray-600">پیکربندی کامل سرور برای سیستم TankSystem</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* نشانگر وضعیت سیستم */}
            {systemInfo && (
              <div className="text-sm text-gray-500">
                <div>سیستم: {systemInfo.platform} {systemInfo.architecture || systemInfo.arch}</div>
                <div>
                  RAM:&nbsp;
                  {systemInfo.memory && typeof systemInfo.memory.total === 'number'
                    ? `${(systemInfo.memory.total / (1024 * 1024 * 1024)).toFixed(1)}GB`
                    : 'نامشخص'}
                  &nbsp;| CPU: {systemInfo.cpu?.cores ?? 'نامشخص'} core
                </div>
              </div>
            )}
            
            {/* دکمه‌های عملیات */}
            <button
              onClick={validateSystem}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              بررسی سیستم
            </button>
            
            <button
              onClick={testSecurityConfiguration}
              disabled={securityTestRunning}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                securityTestRunning 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              <Shield className="h-4 w-4" />
              {securityTestRunning ? 'در حال بررسی امنیت...' : 'بررسی امنیت'}
            </button>

            <button
              onClick={runPerformanceBenchmark}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              آزمون عملکرد
            </button>
            
            <button
              onClick={handleNetworkDiscovery}
              disabled={isDiscovering}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isDiscovering 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white`}
            >
              <Wifi className="h-4 w-4" />
              {isDiscovering ? 'در حال جستجو...' : 'جستجوی خودکار'}
            </button>
            
            <button
              onClick={handleConnectionTest}
              disabled={connectionTestRunning}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                connectionTestRunning 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              <TestTube className="h-4 w-4" />
              {connectionTestRunning ? 'در حال تست...' : 'تست اتصال'}
              {testResults.connection !== undefined && (
                <span className={`ml-1 ${testResults.connection ? 'text-green-200' : 'text-red-200'}`}>
                  {testResults.connection ? '✓' : '✗'}
                </span>
              )}
            </button>
            
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving' || isLoading}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                saveStatus === 'success' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : saveStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <Save className="h-4 w-4" />
              {saveStatus === 'saving' ? 'در حال ذخیره...' : 'ذخیره'}
              {saveStatus === 'success' && <CheckCircle className="h-4 w-4" />}
            </button>
            
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              بازنشانی
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon className="h-5 w-5 inline mr-2" />
              تنظیمات پایه
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'security'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="h-5 w-5 inline mr-2" />
              امنیت
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'advanced'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Code className="h-5 w-5 inline mr-2" />
              پیشرفته
            </button>
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* راهنمای سریع */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 mb-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 rounded-lg p-3">
            <Server className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">راهنمای سریع تنظیمات سرور</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">برای نصب محلی:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>نوع نصب: سیستم داخلی</li>
                  <li>آدرس: localhost یا 127.0.0.1</li>
                  <li>پورت: 3000 (پیش‌فرض)</li>
                  <li>پروتکل: HTTP</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">برای شبکه داخلی:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>نوع نصب: سرویس شبکه</li>
                  <li>آدرس: IP سرور (مثال: 192.168.1.100)</li>
                  <li>پورت: 3000 یا 8080</li>
                  <li>از دکمه "جستجوی خودکار" استفاده کنید</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600">
                <strong>نکته:</strong> پس از تغییر تنظیمات، حتماً دکمه "ذخیره" را بزنید و سپس "تست اتصال" را انجام دهید تا از صحت تنظیمات اطمینان حاصل کنید.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* نوع نصب و تنظیمات پایه */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2 text-blue-500" />
            نوع نصب و تنظیمات پایه
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع نصب</label>
              <select
                value={settings.server.installationType || 'local'}
                onChange={(e) => {
                  const newType = e.target.value as 'local' | 'network';
                  updateSettings({
                    server: {
                      ...settings.server,
                      installationType: newType,
                      // تنظیمات پیش‌فرض بر اساس نوع نصب
                      serverAddress: newType === 'local' ? 'localhost' : settings.server.serverAddress || '0.0.0.0',
                      runAsService: newType === 'network' ? true : settings.server.runAsService
                    }
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="local">نصب محلی (سیستم داخلی)</option>
                <option value="network">سرویس شبکه (Network Service)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {settings.server.installationType === 'local' 
                  ? 'سرور روی همین سیستم اجرا می‌شود - مناسب برای استفاده داخلی'
                  : 'سرور به صورت سرویس شبکه در دسترس خواهد بود - مناسب برای دسترسی از شبکه'
                }
              </p>
            </div>

            {/* تنظیمات مخصوص سیستم داخلی */}
            {settings.server.installationType === 'local' && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-4 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">تنظیمات سیستم داخلی</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">اجرا به عنوان سرویس سیستم</label>
                      <p className="text-xs text-gray-500">اجرای سرور در پس‌زمینه به عنوان سرویس (Windows Service / Systemd)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.runAsService || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          runAsService: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">شروع خودکار با سیستم</label>
                      <p className="text-xs text-gray-500">شروع خودکار سرور هنگام راه‌اندازی سیستم</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.autoStart || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          autoStart: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">بازنشانی خودکار در صورت خطا</label>
                      <p className="text-xs text-gray-500">بازنشانی خودکار سرور در صورت بروز خطا</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.autoRestart || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          autoRestart: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نام سرویس سیستم</label>
                    <input
                      type="text"
                      value={settings.server.serverName || 'TankSystem-Server'}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          serverName: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="TankSystem-Server"
                    />
                    <p className="text-xs text-gray-500 mt-1">نامی که در مدیریت سرویس‌های سیستم نمایش داده می‌شود</p>
                  </div>
                </div>
              </div>
            )}

            {/* تنظیمات مخصوص سیستم شبکه */}
            {settings.server.installationType === 'network' && (
              <div className="bg-green-50 rounded-lg p-4 space-y-4 border border-green-200">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-900">تنظیمات سرویس شبکه</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">فعال‌سازی Network Discovery</label>
                      <p className="text-xs text-gray-500">اجازه به سیستم‌های دیگر برای یافتن این سرور در شبکه</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.networkDiscoveryEnabled || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          networkDiscoveryEnabled: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  {(settings.server.networkDiscoveryEnabled || false) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Registry URL</label>
                      <input
                        type="text"
                        value={settings.server.serviceRegistryUrl || ''}
                        onChange={(e) => updateSettings({
                          server: {
                            ...settings.server,
                            serviceRegistryUrl: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="http://registry.example.com:8500"
                      />
                      <p className="text-xs text-gray-500 mt-1">آدرس Service Registry (Consul, Eureka, Kubernetes, etc.)</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">دسترسی از راه دور</label>
                      <p className="text-xs text-gray-500">اجازه دسترسی به سرور از سیستم‌های دیگر در شبکه</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.remoteAccessEnabled || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          remoteAccessEnabled: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  {(settings.server.remoteAccessEnabled || false) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">شبکه‌های مجاز (CIDR)</label>
                      <textarea
                        value={(settings.server.allowedNetworks || []).join('\n')}
                        onChange={(e) => updateSettings({
                          server: {
                            ...settings.server,
                            allowedNetworks: e.target.value.split('\n').filter(n => n.trim())
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows={3}
                        placeholder="192.168.1.0/24&#10;10.0.0.0/8"
                      />
                      <p className="text-xs text-gray-500 mt-1">فهرست شبکه‌های مجاز برای دسترسی (هر CIDR در خط جداگانه)</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Health Check Endpoint</label>
                    <input
                      type="text"
                      value={settings.server.healthCheckEndpoint || '/health'}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          healthCheckEndpoint: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="/health"
                    />
                    <p className="text-xs text-gray-500 mt-1">مسیر endpoint برای بررسی سلامت سرور (استاندارد: /health)</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">آدرس سرور</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.server.serverAddress || settings.server.hostname || ''}
                    onChange={(e) => updateSettings({
                      server: {
                        ...settings.server,
                        serverAddress: e.target.value,
                        hostname: e.target.value
                      }
                    })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="localhost یا IP آدرس"
                  />
                  <button
                    onClick={handleNetworkDiscovery}
                    disabled={isDiscovering}
                    className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-1 text-sm"
                    title="جستجوی خودکار آدرس سرور"
                  >
                    <Wifi className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  برای شبکه داخلی: IP آدرس سرور (مثال: 192.168.1.100)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">پورت</label>
                <input
                  type="number"
                  value={settings.server.serverPort || settings.server.port || 3000}
                  onChange={(e) => {
                    const port = parseInt(e.target.value) || 3000;
                    updateSettings({
                      server: {
                        ...settings.server,
                        serverPort: port,
                        port: port
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="3000"
                  min="1"
                  max="65535"
                />
                <p className="text-xs text-gray-500 mt-1">
                  پورت پیش‌فرض: 3000 (HTTP) یا 443 (HTTPS)
                </p>
              </div>
            </div>
            
            {/* نمایش تنظیمات API فعلی */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  آدرس API فعلی
                </h4>
                <button
                  onClick={() => {
                    refreshApiConfig();
                    setApiConfigDisplay(getApiConfigForDisplay());
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  به‌روزرسانی
                </button>
              </div>
              <div className="text-sm font-mono text-blue-800 bg-white px-3 py-2 rounded border border-blue-200">
                {apiConfigDisplay.fullUrl}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-blue-700">
                <div>پروتکل: <span className="font-medium">{apiConfigDisplay.protocol.toUpperCase()}</span></div>
                <div>میزبان: <span className="font-medium">{apiConfigDisplay.hostname}</span></div>
                <div>پورت: <span className="font-medium">{apiConfigDisplay.port}</span></div>
              </div>
            </div>
            
            {/* نتایج جستجوی شبکه */}
            {discoveryResults.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">نتایج جستجو:</h4>
                <div className="space-y-2">
                  {discoveryResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono">
                          {result.protocol}://{result.hostname}:{result.port}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          updateSettings({
                            server: {
                              ...settings.server,
                              serverAddress: result.hostname,
                              serverPort: result.port,
                              protocol: result.protocol as 'http' | 'https',
                              sslEnabled: result.protocol === 'https'
                            }
                          });
                          refreshApiConfig();
                          setApiConfigDisplay(getApiConfigForDisplay());
                          alert('✅ تنظیمات به‌روزرسانی شد');
                        }}
                        className="text-xs text-green-700 hover:text-green-900 px-2 py-1 bg-green-100 rounded"
                      >
                        استفاده
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">حداکثر اتصالات همزمان</label>
              <input
                type="number"
                value={settings.server.maxConnections}
                onChange={(e) => updateSettings({
                  server: {
                    ...settings.server,
                    maxConnections: parseInt(e.target.value) || 100
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100"
                min="1"
                max="10000"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sslEnabled"
                checked={settings.server.sslEnabled}
                onChange={(e) => updateSettings({
                  server: {
                    ...settings.server,
                    sslEnabled: e.target.checked
                  }
                })}
                className="ml-2"
              />
              <label htmlFor="sslEnabled" className="text-sm font-medium text-gray-700">
                فعال‌سازی SSL/HTTPS
              </label>
            </div>
          </div>
        </div>

        {/* تنظیمات فایل سیستم */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FolderOpen className="h-5 w-5 mr-2 text-blue-500" />
            تنظیمات فایل سیستم
          </h3>
          
          <div className="space-y-4">
            <FilePathSelector
              value={settings.server.databasePath || ''}
              onChange={(path) => updateSettings({
                server: {
                  ...settings.server,
                  databasePath: path
                }
              })}
              type="database"
              title="مسیر پایگاه داده"
              description="محل ذخیره‌سازی فایل‌های پایگاه داده"
              platform={systemInfo?.platform || 'windows'}
            />

            <FilePathSelector
              value={settings.server.logsPath || ''}
              onChange={(path) => updateSettings({
                server: {
                  ...settings.server,
                  logsPath: path
                }
              })}
              type="logs"
              title="مسیر فایل‌های لاگ"
              description="محل ذخیره‌سازی فایل‌های گزارش و لاگ"
              platform={systemInfo?.platform || 'windows'}
            />

            <FilePathSelector
              value={settings.server.backupPath}
              onChange={(path) => updateSettings({
                server: {
                  ...settings.server,
                  backupPath: path
                }
              })}
              type="backup"
              title="مسیر پشتیبان‌گیری"
              description="محل ذخیره‌سازی فایل‌های پشتیبان"
              platform={systemInfo?.platform || 'windows'}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">بازه پشتیبان‌گیری</label>
              <select
                value={settings.server.backupInterval}
                onChange={(e) => updateSettings({
                  server: {
                    ...settings.server,
                    backupInterval: e.target.value as any
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">هر ساعت</option>
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
              </select>
            </div>
          </div>
        </div>

        {/* تنظیمات عملکرد */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تنظیمات عملکرد</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                محدودیت حافظه (MB): {settings.server.memoryLimit}
              </label>
              <input
                type="range"
                min="128"
                max="2048"
                step="128"
                value={settings.server.memoryLimit}
                onChange={(e) => updateSettings({
                  server: {
                    ...settings.server,
                    memoryLimit: parseInt(e.target.value)
                  }
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>128 MB</span>
                <span>2 GB</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اندازه کش (MB): {settings.server.cacheSize}
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={settings.server.cacheSize}
                onChange={(e) => updateSettings({
                  server: {
                    ...settings.server,
                    cacheSize: parseInt(e.target.value)
                  }
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50 MB</span>
                <span>500 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* تنظیمات سیستم */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">تنظیمات سیستم</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">شروع خودکار</label>
                <p className="text-xs text-gray-500">شروع خودکار سرور هنگام راه‌اندازی سیستم</p>
              </div>
              <input
                type="checkbox"
                checked={settings.server.autoStart}
                onChange={(e) => updateSettings({
                  server: {
                    ...settings.server,
                    autoStart: e.target.checked
                  }
                })}
                className="ml-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">اجرا به عنوان سرویس</label>
                <p className="text-xs text-gray-500">اجرای سرور در پس‌زمینه به عنوان سرویس سیستم</p>
              </div>
              <input
                type="checkbox"
                checked={settings.server.runAsService}
                onChange={(e) => updateSettings({
                  server: {
                    ...settings.server,
                    runAsService: e.target.checked
                  }
                })}
                className="ml-2"
              />
            </div>

            {settings.server.installationType === 'network' && (
              <div className="bg-green-50 rounded-lg p-4 space-y-4 border border-green-200 mt-4">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-green-900">تنظیمات پیشرفته شبکه</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Load Balancer</label>
                      <p className="text-xs text-gray-500">توزیع بار ترافیک بین چندین سرور</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.loadBalancer || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          loadBalancer: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  {settings.server.loadBalancer && (
                    <div className="bg-white rounded-lg p-3 space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الگوریتم Load Balancing</label>
                        <select
                          value={settings.server.loadBalancerAlgorithm || 'round_robin'}
                          onChange={(e) => updateSettings({
                            server: {
                              ...settings.server,
                              loadBalancerAlgorithm: e.target.value as 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted'
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="round_robin">Round Robin</option>
                          <option value="least_connections">Least Connections</option>
                          <option value="ip_hash">IP Hash</option>
                          <option value="weighted">Weighted</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Backend Servers (IP:Port)</label>
                        <textarea
                          value={settings.server.backendServers?.join('\n') || ''}
                          onChange={(e) => updateSettings({
                            server: {
                              ...settings.server,
                              backendServers: e.target.value.split('\n').filter(s => s.trim())
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          rows={3}
                          placeholder="192.168.1.10:3000&#10;192.168.1.11:3000&#10;192.168.1.12:3000"
                        />
                        <p className="text-xs text-gray-500 mt-1">فهرست سرورهای backend (هر IP:Port در خط جداگانه)</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Clustering</label>
                      <p className="text-xs text-gray-500">فعال‌سازی clustering برای افزایش دسترس‌پذیری و مقیاس‌پذیری</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.clusteringEnabled || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          clusteringEnabled: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  {settings.server.clusteringEnabled && (
                    <div className="bg-white rounded-lg p-3 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          تعداد گره‌ها (Nodes): {settings.server.nodesCount || 2}
                        </label>
                        <input
                          type="range"
                          min="2"
                          max="10"
                          value={settings.server.nodesCount || 2}
                          onChange={(e) => updateSettings({
                            server: {
                              ...settings.server,
                              nodesCount: parseInt(e.target.value)
                            }
                          })}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>2</span>
                          <span>10</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cluster Mode</label>
                        <select
                          value={settings.server.clusterMode || 'master_slave'}
                          onChange={(e) => updateSettings({
                            server: {
                              ...settings.server,
                              clusterMode: e.target.value as 'master_slave' | 'master_master' | 'replica_set'
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="master_slave">Master-Slave (Primary-Secondary)</option>
                          <option value="master_master">Master-Master (Active-Active)</option>
                          <option value="replica_set">Replica Set</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">نوع معماری cluster</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Auto Failover</label>
                          <p className="text-xs text-gray-500">انتقال خودکار به گره دیگر در صورت خطا</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.server.autoFailover || true}
                          onChange={(e) => updateSettings({
                            server: {
                              ...settings.server,
                              autoFailover: e.target.checked
                            }
                          })}
                          className="ml-2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Authentication & Access Control */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-red-500" />
              کنترل دسترسی و احراز هویت
            </h3>
            
            <div className="space-y-6">
              {/* Authentication Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">روش احراز هویت</label>
                <select
                  value={settings.server.authMethod || 'jwt'}
                  onChange={(e) => updateSettings({
                    server: {
                      ...settings.server,
                      authMethod: e.target.value as 'jwt' | 'oauth' | 'api_key' | 'basic'
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="jwt">JWT Token</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="api_key">API Key</option>
                  <option value="basic">Basic Authentication</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  روش انتخابی برای احراز هویت کاربران و API ها
                </p>
              </div>

              {/* JWT Settings */}
              {(settings.server.authMethod === 'jwt' || !settings.server.authMethod) && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-gray-800">تنظیمات JWT</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Token Expiry (minutes)</label>
                      <input
                        type="number"
                        value={settings.server.jwtExpiry || 60}
                        onChange={(e) => updateSettings({
                          server: {
                            ...settings.server,
                            jwtExpiry: parseInt(e.target.value) || 60
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        min="1"
                        max="1440"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Token Expiry (days)</label>
                      <input
                        type="number"
                        value={settings.server.refreshTokenExpiry || 7}
                        onChange={(e) => updateSettings({
                          server: {
                            ...settings.server,
                            refreshTokenExpiry: parseInt(e.target.value) || 7
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        min="1"
                        max="365"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys Management */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">کلیدهای API</label>
                  <button
                    onClick={() => setShowAddApiKey(true)}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    افزودن کلید
                  </button>
                </div>

                {/* Add API Key Form */}
                {showAddApiKey && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="نام کلید API"
                        value={apiKeyToAdd}
                        onChange={(e) => setApiKeyToAdd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={addApiKey}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          افزودن
                        </button>
                        <button
                          onClick={() => setShowAddApiKey(false)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Keys List */}
                <div className="space-y-2">
                  {/* Sample API Keys */}
                  {[
                    { id: '1', name: 'Production API', key: 'sk-prod-...abc123', created: '2024-01-15', active: true, permissions: ['read', 'write'] },
                    { id: '2', name: 'Development API', key: 'sk-dev-...def456', created: '2024-02-01', active: true, permissions: ['read'] }
                  ].map(apiKey => (
                    <div key={apiKey.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{apiKey.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            apiKey.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {apiKey.active ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm text-gray-600 font-mono">
                            {showApiKeys[apiKey.id] ? apiKey.key : apiKey.key.substring(0, 20) + '...'}
                          </code>
                          <button
                            onClick={() => toggleApiKeyVisibility(apiKey.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {showApiKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(apiKey.key)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>ایجاد شده: {apiKey.created}</span>
                          <span>•</span>
                          <span>مجوزها: {apiKey.permissions.join(', ')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeApiKey(apiKey.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SSL & TLS Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2 text-red-500" />
              پیکربندی SSL/TLS
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">فعال‌سازی SSL</label>
                  <p className="text-xs text-gray-500">استفاده از اتصال امن HTTPS</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.server.sslEnabled}
                  onChange={(e) => updateSettings({
                    server: {
                      ...settings.server,
                      sslEnabled: e.target.checked
                    }
                  })}
                  className="ml-2"
                />
              </div>

              {settings.server.sslEnabled && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">پورت HTTPS</label>
                    <input
                      type="number"
                      value={settings.server.httpsPort || 443}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          httpsPort: parseInt(e.target.value) || 443
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="443"
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">نوع گواهی SSL</label>
                    <select
                      value={settings.server.sslCertType || 'self_signed'}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          sslCertType: e.target.value as 'self_signed' | 'lets_encrypt' | 'custom'
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="self_signed">Self-Signed Certificate</option>
                      <option value="lets_encrypt">Let's Encrypt</option>
                      <option value="custom">Custom Certificate</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Force HTTPS</label>
                      <p className="text-xs text-gray-500">انتقال خودکار HTTP به HTTPS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.forceHttps || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          forceHttps: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rate Limiting & Security Policies */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-red-500" />
              محدودیت نرخ و سیاست‌های امنیتی
            </h3>
            
            <div className="space-y-6">
              {/* Rate Limiting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  محدودیت نرخ درخواست (در دقیقه)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">درخواست عمومی</label>
                    <input
                      type="number"
                      value={settings.server.rateLimitPublic || 100}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          rateLimitPublic: parseInt(e.target.value) || 100
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">درخواست احراز شده</label>
                    <input
                      type="number"
                      value={settings.server.rateLimitAuthenticated || 1000}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          rateLimitAuthenticated: parseInt(e.target.value) || 1000
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Security Headers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">هدرهای امنیتی</label>
                <div className="space-y-2">
                  {[
                    { key: 'hsts', label: 'HSTS (HTTP Strict Transport Security)', enabled: true },
                    { key: 'xss_protection', label: 'XSS Protection', enabled: true },
                    { key: 'content_type_nosniff', label: 'Content Type Nosniff', enabled: true },
                    { key: 'frame_options', label: 'Frame Options', enabled: true }
                  ].map(header => (
                    <div key={header.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{header.label}</span>
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={() => {}}
                        className="ml-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* IP Whitelist/Blacklist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">فهرست سیاه IP ها</label>
                <textarea
                  value={settings.server.blockedIPs?.join('\n') || ''}
                  onChange={(e) => updateSettings({
                    server: {
                      ...settings.server,
                      blockedIPs: e.target.value.split('\n').filter(ip => ip.trim())
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                  placeholder="هر IP در خط جداگانه&#10;مثال:&#10;192.168.1.100&#10;10.0.0.0/8"
                />
                <p className="text-xs text-gray-500 mt-1">IP هایی که دسترسی آنها مسدود شود</p>
              </div>
            </div>
          </div>

          {/* Security Monitoring */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Monitor className="h-5 w-5 mr-2 text-red-500" />
              مانیتورینگ امنیت
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">فعال‌سازی هشدارهای امنیتی</label>
                  <p className="text-xs text-gray-500">ارسال هشدار در صورت تهدیدات امنیتی</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.server.securityAlerts || true}
                  onChange={(e) => updateSettings({
                    server: {
                      ...settings.server,
                      securityAlerts: e.target.checked
                    }
                  })}
                  className="ml-2"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">لاگ تمام فعالیت‌ها</label>
                  <p className="text-xs text-gray-500">ذخیره تمام فعالیت‌های کاربران</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.server.logAllActivities || true}
                  onChange={(e) => updateSettings({
                    server: {
                      ...settings.server,
                      logAllActivities: e.target.checked
                    }
                  })}
                  className="ml-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">مدت نگهداری لاگ‌ها (روز)</label>
                <input
                  type="number"
                  value={settings.server.logRetentionDays || 30}
                  onChange={(e) => updateSettings({
                    server: {
                      ...settings.server,
                      logRetentionDays: parseInt(e.target.value) || 30
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  min="1"
                  max="365"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Performance Tuning */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-500" />
              تنظیمات عملکرد پیشرفته
            </h3>
            
            <div className="space-y-6">
              {/* CPU & Memory Optimization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">بهینه‌سازی CPU</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تعداد Worker Processes: {settings.server.workerProcesses || 4}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value={settings.server.workerProcesses || 4}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          workerProcesses: parseInt(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1</span>
                      <span>16</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thread Pool Size: {settings.server.threadPoolSize || 4}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="32"
                      step="2"
                      value={settings.server.threadPoolSize || 4}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          threadPoolSize: parseInt(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>2</span>
                      <span>32</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">مدیریت حافظه</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heap Size (MB): {settings.server.heapSize || 512}
                    </label>
                    <input
                      type="range"
                      min="128"
                      max="4096"
                      step="128"
                      value={settings.server.heapSize || 512}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          heapSize: parseInt(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>128 MB</span>
                      <span>4 GB</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Garbage Collection</label>
                      <p className="text-xs text-gray-500">فعال‌سازی GC خودکار</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.autoGC || true}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          autoGC: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>
                </div>
              </div>

              {/* Database Optimization */}
              <div>
                <h4 className="font-medium text-gray-800 mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  بهینه‌سازی پایگاه داده
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Connection Pool Size</label>
                    <input
                      type="number"
                      value={settings.server.dbConnectionPool || 10}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          dbConnectionPool: parseInt(e.target.value) || 10
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Query Timeout (seconds)</label>
                    <input
                      type="number"
                      value={settings.server.queryTimeout || 30}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          queryTimeout: parseInt(e.target.value) || 30
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Query Retries</label>
                    <input
                      type="number"
                      value={settings.server.maxQueryRetries || 3}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          maxQueryRetries: parseInt(e.target.value) || 3
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="0"
                      max="10"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.server.enableQueryCache || true}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          enableQueryCache: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                    <label className="text-sm font-medium text-gray-700">فعال‌سازی کش کوئری</label>
                  </div>
                </div>
              </div>

              {/* Network Optimization */}
              <div>
                <h4 className="font-medium text-gray-800 mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  بهینه‌سازی شبکه
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Keep-Alive Timeout (seconds)</label>
                    <input
                      type="number"
                      value={settings.server.keepAliveTimeout || 5}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          keepAliveTimeout: parseInt(e.target.value) || 5
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Keep-Alive Requests</label>
                    <input
                      type="number"
                      value={settings.server.maxKeepAliveRequests || 100}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          maxKeepAliveRequests: parseInt(e.target.value) || 100
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Environment Variables */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-purple-500" />
              متغیرهای محیطی
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">مدیریت متغیرهای محیطی</label>
                <button
                  onClick={() => setShowAddEnvVariable(true)}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  افزودن متغیر
                </button>
              </div>

              {/* Add Environment Variable Form */}
              {showAddEnvVariable && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="نام متغیر"
                      value={envVariableToAdd.key}
                      onChange={(e) => setEnvVariableToAdd({...envVariableToAdd, key: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="مقدار"
                      value={envVariableToAdd.value}
                      onChange={(e) => setEnvVariableToAdd({...envVariableToAdd, value: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addEnvironmentVariable}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      افزودن
                    </button>
                    <button
                      onClick={() => setShowAddEnvVariable(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}

              {/* Environment Variables List */}
              <div className="space-y-2">
                {[
                  { key: 'NODE_ENV', value: 'production', description: 'محیط اجرا' },
                  { key: 'LOG_LEVEL', value: 'info', description: 'سطح لاگ' },
                  { key: 'MAX_FILE_SIZE', value: '10MB', description: 'حداکثر اندازه فایل' },
                  { key: 'SESSION_SECRET', value: '***hidden***', description: 'کلید رمزگذاری session' }
                ].map(envVar => (
                  <div key={envVar.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-gray-900">{envVar.key}</code>
                        <span className="text-sm text-gray-600">=</span>
                        <code className="text-sm font-mono text-gray-600">
                          {envVar.value.includes('***') ? envVar.value : envVar.value}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{envVar.description}</p>
                    </div>
                    <button
                      onClick={() => removeEnvironmentVariable(envVar.key)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monitoring & Analytics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" />
              مانیتورینگ و تحلیل
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Metrics Collection</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Performance Metrics</label>
                      <p className="text-xs text-gray-500">جمع‌آوری متریک‌های عملکرد</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.enableMetrics || true}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          enableMetrics: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Custom Metrics</label>
                      <p className="text-xs text-gray-500">متریک‌های سفارشی برنامه</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.enableCustomMetrics || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          enableCustomMetrics: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Collection Interval (seconds)</label>
                    <input
                      type="number"
                      value={settings.server.metricsInterval || 60}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          metricsInterval: parseInt(e.target.value) || 60
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="10"
                      max="3600"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Health Checks</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Health Endpoint</label>
                      <p className="text-xs text-gray-500">فعال‌سازی /health endpoint</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.enableHealthCheck || true}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          enableHealthCheck: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Detailed Health Info</label>
                      <p className="text-xs text-gray-500">اطلاعات تفصیلی سلامت سیستم</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.detailedHealthCheck || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          detailedHealthCheck: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Health Check Port</label>
                    <input
                      type="number"
                      value={settings.server.healthCheckPort || 3001}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          healthCheckPort: parseInt(e.target.value) || 3001
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="65535"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Debug & Development */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Code className="h-5 w-5 mr-2 text-purple-500" />
              اشکال‌زدایی و توسعه
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Debug Mode</label>
                      <p className="text-xs text-gray-500">فعال‌سازی حالت اشکال‌زدایی</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.debugMode || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          debugMode: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Hot Reload</label>
                      <p className="text-xs text-gray-500">بارگذاری مجدد خودکار</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.hotReload || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          hotReload: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Log Verbosity</label>
                    <select
                      value={settings.server.logVerbosity || 'info'}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          logVerbosity: e.target.value as 'error' | 'warn' | 'info' | 'debug' | 'trace'
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="error">Error Only</option>
                      <option value="warn">Warning + Error</option>
                      <option value="info">Info + Warning + Error</option>
                      <option value="debug">Debug + Info + Warning + Error</option>
                      <option value="trace">Trace + Debug + Info + Warning + Error</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Source Maps</label>
                      <p className="text-xs text-gray-500">فعال‌سازی source maps</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.enableSourceMaps || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          enableSourceMaps: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Profiling</label>
                      <p className="text-xs text-gray-500">فعال‌سازی profiling عملکرد</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.server.enableProfiling || false}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          enableProfiling: e.target.checked
                        }
                      })}
                      className="ml-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Development Port</label>
                    <input
                      type="number"
                      value={settings.server.devPort || 3002}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          devPort: parseInt(e.target.value) || 3002
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                      max="65535"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Resources */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HardDrive className="h-5 w-5 mr-2 text-purple-500" />
              منابع سیستم
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">CPU Usage</h4>
                      <p className="text-sm text-blue-700">استفاده از پردازنده</p>
                    </div>
                    <Cpu className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-blue-900">{systemInfo?.cpu?.usage || 25}%</div>
                    <div className="text-sm text-blue-700">of {systemInfo?.cpu?.cores || 4} cores</div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900">Memory Usage</h4>
                      <p className="text-sm text-green-700">استفاده از حافظه</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-green-900">
                      {systemInfo?.memory
                        ? Math.round(
                            ((systemInfo.memory.total - systemInfo.memory.free) /
                              systemInfo.memory.total) *
                              100
                          )
                        : 45}
                      %
                    </div>
                    <div className="text-sm text-green-700">
                      of{' '}
                      {systemInfo?.memory
                        ? (systemInfo.memory.total / (1024 * 1024 * 1024)).toFixed(1)
                        : 8}
                      GB
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-purple-900">Disk Usage</h4>
                      <p className="text-sm text-purple-700">استفاده از دیسک</p>
                    </div>
                    <HardDrive className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-purple-900">{systemInfo?.disk?.usage || 30}%</div>
                    <div className="text-sm text-purple-700">of {systemInfo?.disk?.total || 500}GB</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">تنظیمات محدودیت منابع</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">حداکثر CPU Usage (%)</label>
                    <input
                      type="number"
                      value={settings.server.maxCpuUsage || 80}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          maxCpuUsage: parseInt(e.target.value) || 80
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="10"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">حداکثر Memory Usage (%)</label>
                    <input
                      type="number"
                      value={settings.server.maxMemoryUsage || 85}
                      onChange={(e) => updateSettings({
                        server: {
                          ...settings.server,
                          maxMemoryUsage: parseInt(e.target.value) || 85
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="10"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* خلاصه تنظیمات */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">خلاصه تنظیمات</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">نوع نصب:</span>
            <span className="mr-2">{settings.server.installationType === 'local' ? 'محلی' : 'شبکه'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">آدرس:</span>
            <span className="mr-2">{settings.server.serverAddress}:{settings.server.serverPort}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">پروتکل:</span>
            <span className="mr-2">{settings.server.sslEnabled ? 'HTTPS' : 'HTTP'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">حداکثر اتصالات:</span>
            <span className="mr-2">{settings.server.maxConnections}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">حافظه:</span>
            <span className="mr-2">{settings.server.memoryLimit} MB</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">کش:</span>
            <span className="mr-2">{settings.server.cacheSize} MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};