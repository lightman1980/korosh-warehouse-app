import React from 'react';
import { Zap, BarChart } from 'lucide-react';
import { Tooltip } from '../Common/Tooltip';

interface PerformanceAndReportingSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
}

export const PerformanceAndReportingSettings: React.FC<PerformanceAndReportingSettingsProps> = ({
  settings,
  setSettings
}) => {
  // Ensure settings object exists
  if (!settings) {
    console.warn('PerformanceAndReportingSettings: settings is undefined');
    return <div className="p-4 text-red-600">خطا: تنظیمات بارگذاری نشده است</div>;
  }

  // Ensure performance settings exist
  const performance = settings?.performance || {
    cacheEnabled: true,
    cacheSize: 512,
    autoOptimize: true,
    dataCompression: true,
    lazyLoading: true,
    maxUploadSize: 10,
    connectionTimeout: 30,
    requireReceiptExtraInfo: {
      consignment: false,
      owned: false
    },
    requireDeliveryExtraInfo: {
      consignment: false,
      owned: false
    },
    requireConsignmentDeliveryExtraInfo: false,
    requireOwnedDeliveryExtraInfo: false,
    openInNewTab: false
  };

  // Ensure reporting settings exist (مدرن و کامل)
  const reporting = settings?.reporting || {
    autoGenerateReports: false,
    customReportsEnabled: false,
    reportSchedule: 'daily',
    dashboardRefreshInterval: 5,
    reportFormats: ['pdf', 'excel']
  };

  // Helper: update performance block
  const updatePerformanceSettings = (updates: any) => {
    if (!setSettings) {
      console.warn('PerformanceAndReportingSettings: setSettings is undefined');
      return;
    }
    setSettings({
      ...settings,
      performance: {
        ...performance,
        ...updates
      }
    });
  };

  // Helper: update reporting block
  const updateReportingSettings = (updates: any) => {
    if (!setSettings) {
      console.warn('PerformanceAndReportingSettings: setSettings is undefined (reporting)');
      return;
    }
    setSettings({
      ...settings,
      reporting: {
        ...reporting,
        ...updates
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Performance Settings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات عملکرد
          <Tooltip 
            title="تنظیمات عملکرد"
            text="در این بخش می‌توانید تنظیمات مربوط به عملکرد و بهینه‌سازی سیستم را پیکربندی کنید."
          />
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireReceiptConsignment"
              checked={performance.requireReceiptExtraInfo?.consignment || false}
              onChange={(e) => updatePerformanceSettings({
                requireReceiptExtraInfo: {
                  ...performance.requireReceiptExtraInfo,
                  consignment: e.target.checked
                }
              })}
              className="ml-2"
            />
            <label htmlFor="requireReceiptConsignment" className="text-sm font-medium text-gray-700 flex items-center">
              اجباری شدن اطلاعات تکمیلی رسید امانی
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireReceiptOwned"
              checked={performance.requireReceiptExtraInfo?.owned || false}
              onChange={(e) => updatePerformanceSettings({
                requireReceiptExtraInfo: {
                  ...performance.requireReceiptExtraInfo,
                  owned: e.target.checked
                }
              })}
              className="ml-2"
            />
            <label htmlFor="requireReceiptOwned" className="text-sm font-medium text-gray-700 flex items-center">
              اجباری شدن اطلاعات تکمیلی رسید تملیکی
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireDeliveryConsignment"
              checked={performance.requireDeliveryExtraInfo?.consignment || false}
              onChange={(e) => updatePerformanceSettings({
                requireDeliveryExtraInfo: {
                  ...performance.requireDeliveryExtraInfo,
                  consignment: e.target.checked
                },
                requireConsignmentDeliveryExtraInfo: e.target.checked
              })}
              className="ml-2"
            />
            <label htmlFor="requireDeliveryConsignment" className="text-sm font-medium text-gray-700 flex items-center">
              اجباری شدن اطلاعات تکمیلی حواله امانی
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireDeliveryOwned"
              checked={performance.requireDeliveryExtraInfo?.owned || false}
              onChange={(e) => updatePerformanceSettings({
                requireDeliveryExtraInfo: {
                  ...performance.requireDeliveryExtraInfo,
                  owned: e.target.checked
                },
                requireOwnedDeliveryExtraInfo: e.target.checked
              })}
              className="ml-2"
            />
            <label htmlFor="requireDeliveryOwned" className="text-sm font-medium text-gray-700 flex items-center">
              اجباری شدن اطلاعات تکمیلی حواله تملیکی
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="cacheEnabled"
              checked={performance.cacheEnabled || false}
              onChange={(e) => updatePerformanceSettings({ cacheEnabled: e.target.checked })}
              className="ml-2"
            />
            <label htmlFor="cacheEnabled" className="text-sm font-medium text-gray-700 flex items-center">
              فعال سازي کش
              <Tooltip 
                title="فعال‌سازی کش"
                text="با فعال کردن این گزینه، داده‌های پرکاربرد در حافظه کش ذخیره می‌شوند تا دسترسی به آن‌ها سریع‌تر باشد."
              />
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoOptimize"
              checked={performance.autoOptimize || false}
              onChange={(e) => updatePerformanceSettings({ autoOptimize: e.target.checked })}
              className="ml-2"
            />
            <label htmlFor="autoOptimize" className="text-sm font-medium text-gray-700 flex items-center">
              بهينه سازي خودکار
              <Tooltip 
                title="بهینه‌سازی خودکار"
                text="با فعال کردن این گزینه، سیستم به صورت خودکار عملکرد خود را بهینه می‌کند."
              />
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="dataCompression"
              checked={performance.dataCompression || false}
              onChange={(e) => updatePerformanceSettings({ dataCompression: e.target.checked })}
              className="ml-2"
            />
            <label htmlFor="dataCompression" className="text-sm font-medium text-gray-700 flex items-center">
              فشرده سازي داده‌ها
              <Tooltip 
                title="فشرده‌سازی داده‌ها"
                text="با فعال کردن این گزینه، داده‌ها قبل از انتقال فشرده می‌شوند تا حجم ترافیک شبکه کاهش یابد."
              />
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="lazyLoading"
              checked={performance.lazyLoading || false}
              onChange={(e) => updatePerformanceSettings({ lazyLoading: e.target.checked })}
              className="ml-2"
            />
            <label htmlFor="lazyLoading" className="text-sm font-medium text-gray-700 flex items-center">
              بارگذاري تنبل
              <Tooltip 
                title="بارگذاری تنبل"
                text="با فعال کردن این گزینه، داده‌ها فقط در زمان نیاز بارگذاری می‌شوند که باعث افزایش سرعت اولیه صفحه می‌شود."
              />
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="openInNewTab"
              checked={performance.openInNewTab || false}
              onChange={(e) => updatePerformanceSettings({ openInNewTab: e.target.checked })}
              className="ml-2"
            />
            <label htmlFor="openInNewTab" className="text-sm font-medium text-gray-700 flex items-center">
              صفحه در صفحه
              <Tooltip 
                title="صفحه در صفحه"
                text="با فعال کردن این گزینه، با کلیک روی منوهای اصلی، هر صفحه در یک تب جدید مرورگر باز می‌شود و از صفحه فعلی خارج نمی‌شوید."
              />
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              حجم کش (مگابايت)
              <Tooltip 
                title="حجم کش"
                text="حجم حافظه کش را به مگابایت مشخص کنید. مقدار بیشتر باعث افزایش سرعت اما مصرف بیشتر حافظه می‌شود."
              />
            </label>
            <input
              type="number"
              value={performance.cacheSize || 512}
              onChange={(e) => updatePerformanceSettings({ cacheSize: parseInt(e.target.value) || 512 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="2048"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              حداکثر حجم آپلود (مگابايت)
              <Tooltip 
                title="حداکثر حجم آپلود"
                text="حداکثر حجم فایل‌هایی که می‌توانید آپلود کنید را به مگابایت مشخص کنید."
              />
            </label>
            <input
              type="number"
              value={performance.maxUploadSize || 10}
              onChange={(e) => updatePerformanceSettings({ maxUploadSize: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              زمان قطع اتصال (ثانيه)
              <Tooltip 
                title="زمان قطع اتصال"
                text="حداکثر زمانی که سیستم برای پاسخ به درخواست‌ها منتظر می‌ماند را به ثانیه مشخص کنید."
              />
            </label>
            <input
              type="number"
              value={performance.connectionTimeout || 30}
              onChange={(e) => updatePerformanceSettings({ connectionTimeout: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="5"
              max="300"
            />
          </div>
        </div>
      </div>
      
      {/* Reporting Settings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات گزارش‌گيري
          <Tooltip 
            title="تنظیمات گزارش‌گیری"
            text="در این بخش می‌توانید تنظیمات مربوط به گزارش‌گیری سیستم را پیکربندی کنید."
          />
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoGenerateReports"
              checked={reporting.autoGenerateReports || false}
              onChange={(e) => {
                updateReportingSettings({ autoGenerateReports: e.target.checked });
              }}
              className="ml-2"
            />
            <label htmlFor="autoGenerateReports" className="text-sm font-medium text-gray-700 flex items-center">
              توليد خودکار گزارش‌ها
              <Tooltip 
                title="تولید خودکار گزارش‌ها"
                text="با فعال کردن این گزینه، گزارش‌ها به صورت خودکار و بر اساس زمان‌بندی مشخص شده تولید می‌شوند."
              />
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="customReportsEnabled"
              checked={reporting.customReportsEnabled || false}
              onChange={(e) => {
                updateReportingSettings({ customReportsEnabled: e.target.checked });
              }}
              className="ml-2"
            />
            <label htmlFor="customReportsEnabled" className="text-sm font-medium text-gray-700 flex items-center">
              گزارش‌هاي سفارشي
              <Tooltip 
                title="گزارش‌های سفارشی"
                text="با فعال کردن این گزینه، کاربران می‌توانند گزارش‌های سفارشی خود را ایجاد کنند."
              />
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              زمانبندي گزارش‌ها
              <Tooltip 
                title="زمان‌بندی گزارش‌ها"
                text="زمان‌بندی تولید خودکار گزارش‌ها را انتخاب کنید: روزانه، هفتگی، ماهانه یا فصلی."
              />
            </label>
            <select
              value={reporting.reportSchedule || 'daily'}
              onChange={(e) => {
                updateReportingSettings({
                  reportSchedule: e.target.value as 'daily' | 'weekly' | 'monthly' | 'quarterly'
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگي</option>
              <option value="monthly">ماهانه</option>
              <option value="quarterly">فصلي</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              فاصله به‌روزرساني داشبورد (دقيقه)
              <Tooltip 
                title="فاصله به‌روزرسانی داشبورد"
                text="فاصله زمانی به‌روزرسانی خودکار داده‌های داشبورد را به دقیقه مشخص کنید."
              />
            </label>
            <input
              type="number"
              value={reporting.dashboardRefreshInterval || 5}
              onChange={(e) => {
                updateReportingSettings({
                  dashboardRefreshInterval: parseInt(e.target.value) || 5
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="60"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            فرمت‌هاي خروجي گزارش
            <Tooltip 
              title="فرمت‌های خروجی گزارش"
              text="فرمت‌های خروجی گزارش‌ها را انتخاب کنید: PDF، Excel، CSV یا HTML."
            />
          </label>
          <div className="flex flex-wrap gap-3">
            {['pdf', 'excel', 'csv', 'html'].map(format => (
              <label key={format} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(reporting.reportFormats || []).includes(format as any)}
                  onChange={(e) => {
                    const currentFormats = reporting.reportFormats || [];
                    const newFormats = e.target.checked
                      ? [...currentFormats, format as any]
                      : currentFormats.filter((f: string) => f !== format);
                    updateReportingSettings({ reportFormats: newFormats });
                  }}
                  className="ml-1"
                />
                <span className="text-sm">{format.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};