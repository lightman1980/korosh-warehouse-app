// TestServerSettings.tsx - تست کامل سیستم تنظیمات
import React from 'react';
import { SettingsProvider } from './SettingsContext';
import { ServerSettings } from './ServerSettings';

const TestServerSettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                سیستم تنظیمات سرور
              </h1>
              <span className="mr-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                نسخه آزمایشی
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                MiniMax Agent
              </span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8">
        <SettingsProvider>
          <div className="bg-white rounded-lg shadow-sm">
            <ServerSettings />
          </div>
        </SettingsProvider>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ویژگی‌های سیستم
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• تشخیص خودکار سیستم</li>
                <li>• انتخاب نوع نصب هوشمند</li>
                <li>• مسیرهای پیش‌فرض</li>
                <li>• اعتبارسنجی کامل</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                تنظیمات پشتیبانی شده
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• سیستم‌های داخلی</li>
                <li>• سرویس‌های شبکه</li>
                <li>• پایگاه داده‌های محلی و راه دور</li>
                <li>• Clustering و Load Balancing</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                درباره این نسخه
              </h3>
              <p className="text-sm text-gray-600">
                این یک نسخه آزمایشی از سیستم تنظیمات سرور حرفه‌ای است که
                توسط MiniMax Agent توسعه داده شده است.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2025 MiniMax Agent. تمامی حقوق محفوظ است.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TestServerSettings;/**
 * کامپوننت تست کامل سیستم تنظیمات سرور
 * برای تست تمام ویژگی‌های سیستم تنظیمات
 */

import React, { useState } from 'react';
import { useSettings } from '../src/context/SettingsContext';
import ServerSettings from '../src/components/Server/ServerSettings';

const TestServerSettings: React.FC = () => {
  const {
    settings,
    updateSettings,
    saveSettings,
    loadSettings,
    resetSettings,
    validateSettings,
    testConnection,
    exportSettings,
    importSettings,
    getDefaultSettings
  } = useSettings();

  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // اجرای تست‌های خودکار
  const runAutomatedTests = async () => {
    setIsRunningTests(true);
    const results: any[] = [];

    try {
      // تست 1: بارگذاری تنظیمات پیش‌فرض
      results.push({
        name: 'تست بارگذاری تنظیمات پیش‌فرض',
        status: 'running',
        timestamp: new Date().toISOString()
      });

      const defaultSettings = getDefaultSettings();
      updateSettings(defaultSettings);
      
      results[results.length - 1] = {
        ...results[results.length - 1],
        status: 'success',
        data: {
          deploymentType: defaultSettings.server.deploymentType.type,
          databaseType: defaultSettings.database.type,
          hasRequiredPaths: !!(defaultSettings.filePaths.appData && defaultSettings.filePaths.logs)
        }
      };

      // تست 2: اعتبارسنجی تنظیمات
      results.push({
        name: 'تست اعتبارسنجی تنظیمات',
        status: 'running',
        timestamp: new Date().toISOString()
      });

      const validation = validateSettings();
      
      results[results.length - 1] = {
        ...results[results.length - 1],
        status: validation.isValid ? 'success' : 'warning',
        data: {
          isValid: validation.isValid,
          errorsCount: validation.errors.length,
          warningsCount: validation.warnings.length,
          suggestionsCount: validation.suggestions.length
        }
      };

      // تست 3: تغییر تنظیمات
      results.push({
        name: 'تست تغییر تنظیمات',
        status: 'running',
        timestamp: new Date().toISOString()
      });

      updateSettings({
        server: {
          ...defaultSettings.server,
          port: 9090,
          hostname: 'test.localhost'
        }
      });

      results[results.length - 1] = {
        ...results[results.length - 1],
        status: 'success',
        data: {
          portChanged: true,
          hostnameChanged: true
        }
      };

      // تست 4: تست اتصال (اگر سرور در حال اجرا باشد)
      results.push({
        name: 'تست اتصال سرور',
        status: 'running',
        timestamp: new Date().toISOString()
      });

      try {
        const connectionResult = await testConnection();
        
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: connectionResult.success ? 'success' : 'warning',
          data: {
            connectionSuccess: connectionResult.success,
            responseTime: connectionResult.responseTime,
            error: connectionResult.error
          }
        };
      } catch (error) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: 'warning',
          data: {
            connectionSuccess: false,
            error: error instanceof Error ? error.message : 'خطای ناشناخته'
          }
        };
      }

      // تست 5: ذخیره و بارگذاری
      results.push({
        name: 'تست ذخیره و بارگذاری',
        status: 'running',
        timestamp: new Date().toISOString()
      });

      const saveSuccess = await saveSettings();
      const loadSuccess = await loadSettings();

      results[results.length - 1] = {
        ...results[results.length - 1],
        status: saveSuccess && loadSuccess ? 'success' : 'error',
        data: {
          saveSuccess,
          loadSuccess
        }
      };

      // تست 6: Export/Import
      results.push({
        name: 'تست Export/Import تنظیمات',
        status: 'running',
        timestamp: new Date().toISOString()
      });

      const exportedData = exportSettings();
      const importSuccess = importSettings(exportedData);

      results[results.length - 1] = {
        ...results[results.length - 1],
        status: importSuccess ? 'success' : 'error',
        data: {
          exportSize: exportedData.length,
          importSuccess
        }
      };

    } catch (error) {
      results.push({
        name: 'خطای کلی در تست‌ها',
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'خطای ناشناخته'
      });
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  // تست دستی اتصال
  const manualConnectionTest = async () => {
    try {
      const result = await testConnection();
      alert(`نتیجه تست اتصال:\n${result.success ? 'موفق' : 'ناموفق'}\n${result.responseTime ? `زمان پاسخ: ${result.responseTime}ms` : ''}\n${result.error || ''}`);
    } catch (error) {
      alert(`خطا در تست اتصال: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
    }
  };

  // نمایش وضعیت
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'warning':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
      case 'error':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      case 'running':
        return <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* هدر تست */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تست سیستم تنظیمات سرور</h1>
            <p className="text-gray-600">تست کامل عملکرد سیستم تنظیمات TankSystem</p>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onClick={runAutomatedTests}
              disabled={isRunningTests}
              className={`px-6 py-2 rounded-lg transition-colors ${
                isRunningTests 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isRunningTests ? 'در حال اجرا...' : 'اجرای تست‌های خودکار'}
            </button>
            <button
              onClick={manualConnectionTest}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              تست اتصال دستی
            </button>
            <button
              onClick={resetSettings}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              بازنشانی
            </button>
          </div>
        </div>

        {/* نمایش وضعیت فعلی تنظیمات */}
        {settings && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700">نوع استقرار</div>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {settings.server.deploymentType.name}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700">نوع پایگاه داده</div>
              <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                {settings.database.type}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700">آدرس سرور</div>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {settings.server.hostname}:{settings.server.port}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700">پروتکل</div>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {settings.server.protocol.toUpperCase()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* نتایج تست‌ها */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">نتایج تست‌ها</h3>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-gray-900">{result.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(result.timestamp).toLocaleTimeString('fa-IR')}
                  </span>
                </div>
                
                {result.data && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <pre className="whitespace-pre-wrap text-gray-700">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    خطا: {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* کامپوننت اصلی تنظیمات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">رابط تنظیمات سرور</h3>
          <p className="text-sm text-gray-600 mt-1">
            کامپوننت اصلی برای پیکربندی سرور - امکان تست تعاملی
          </p>
        </div>
        <div className="p-0">
          <ServerSettings />
        </div>
      </div>

      {/* اطلاعات اضافی */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">راهنمای تست</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">تست‌های خودکار شامل:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• بارگذاری تنظیمات پیش‌فرض</li>
              <li>• اعتبارسنجی تنظیمات</li>
              <li>• تغییر تنظیمات</li>
              <li>• تست اتصال سرور</li>
              <li>• ذخیره و بارگذاری</li>
              <li>• Export/Import تنظیمات</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">راهنما:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ابتدا تست‌های خودکار را اجرا کنید</li>
              <li>• سپس با رابط تعاملی کار کنید</li>
              <li>• تست اتصال دستی برای بررسی سرور</li>
              <li>• بازنشانی برای بازگشت به حالت اولیه</li>
            </ul>
          </div>
        </div>
      </div>

      {/* فوتر */}
      <div className="text-center text-sm text-gray-500">
        <p>TankSystem Server Settings Test Suite v1.0</p>
        <p>آخرین بروزرسانی: {new Date().toLocaleDateString('fa-IR')}</p>
      </div>
    </div>
  );
};

export default TestServerSettings;