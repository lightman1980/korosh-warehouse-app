import React from 'react';
import { HardDrive, Upload, Download, Clock, Shield, Cloud, RefreshCw } from 'lucide-react';
import { Tooltip } from '../Common/Tooltip';

interface BackupSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  isLoading: boolean;
  createBackup: () => void;
  restoreBackup: () => void;
}

export const BackupSettings: React.FC<BackupSettingsProps> = ({
  settings,
  setSettings,
  isLoading,
  createBackup,
  restoreBackup
}) => {
  // Ensure settings object exists
  if (!settings) {
    console.warn('BackupSettings: settings is undefined');
    return <div className="p-4 text-red-600">خطا: تنظیمات بارگذاری نشده است</div>;
  }

  // Ensure backup settings exist
  const backup = settings?.backup || {
    autoBackup: false,
    backupSchedule: 'daily' as const,
    backupRetention: 30,
    compressionEnabled: true,
    encryptionEnabled: false,
    backupLocation: 'local',
    cloudProvider: null,
    lastBackup: null,
    nextBackup: null
  };

  // Helper function to safely update settings
  const updateSettings = (updates: any) => {
    if (!setSettings) {
      console.warn('BackupSettings: setSettings is undefined');
      return;
    }
    setSettings({
      ...settings,
      backup: {
        ...backup,
        ...updates
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <HardDrive className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات پشتیبان‌گیری
          <Tooltip 
            title="تنظیمات پشتیبان‌گیری"
            text="در این بخش می‌توانید تنظیمات مربوط به پشتیبان‌گیری و بازیابی اطلاعات سیستم را پیکربندی کنید."
          />
        </h2>
        
        <div className="space-y-6">
          {/* تنظیمات کلی پشتیبان */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoBackup"
                checked={backup.autoBackup || false}
                onChange={(e) => updateSettings({ autoBackup: e.target.checked })}
                className="ml-2"
              />
              <label htmlFor="autoBackup" className="text-sm font-medium text-gray-700 flex items-center">
                پشتیبان‌گیری خودکار
                <Tooltip 
                  title="پشتیبان‌گیری خودکار"
                  text="با فعال کردن این گزینه، سیستم به صورت خودکار از داده‌ها پشتیبان تهیه می‌کند."
                />
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="compressionEnabled"
                checked={backup.compressionEnabled || false}
                onChange={(e) => updateSettings({ compressionEnabled: e.target.checked })}
                className="ml-2"
              />
              <label htmlFor="compressionEnabled" className="text-sm font-medium text-gray-700 flex items-center">
                فشرده‌سازی فایل‌ها
                <Tooltip 
                  title="فشرده‌سازی فایل‌ها"
                  text="با فعال کردن این گزینه، فایل‌های پشتیبان فشرده می‌شوند تا فضای کمتری اشغال کنند."
                />
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="encryptionEnabled"
                checked={backup.encryptionEnabled || false}
                onChange={(e) => updateSettings({ encryptionEnabled: e.target.checked })}
                className="ml-2"
              />
              <label htmlFor="encryptionEnabled" className="text-sm font-medium text-gray-700 flex items-center">
                رمزنگاری فایل‌ها
                <Tooltip 
                  title="رمزنگاری فایل‌ها"
                  text="با فعال کردن این گزینه، فایل‌های پشتیبان رمزنگاری می‌شوند تا امنیت داده‌ها تأمین شود."
                />
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cloudBackup"
                checked={backup.cloudBackup || false}
                onChange={(e) => updateSettings({ cloudBackup: e.target.checked })}
                className="ml-2"
              />
              <label htmlFor="cloudBackup" className="text-sm font-medium text-gray-700 flex items-center">
                پشتیبان‌گیری ابری
                <Tooltip 
                  title="پشتیبان‌گیری ابری"
                  text="با فعال کردن این گزینه، فایل‌های پشتیبان در سرویس‌های ابری ذخیره می‌شوند."
                />
              </label>
            </div>
          </div>
          
          {/* زمان‌بندی پشتیبان‌گیری */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                زمان‌بندی پشتیبان‌گیری
                <Tooltip 
                  title="زمان‌بندی پشتیبان‌گیری"
                  text="تعداد دفعاتی که پشتیبان‌گیری خودکار انجام شود را انتخاب کنید."
                />
              </label>
              <select
                value={backup.backupSchedule || 'daily'}
                onChange={(e) => updateSettings({ backupSchedule: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                مدت نگهداری پشتیبان‌ها (روز)
                <Tooltip 
                  title="مدت نگهداری پشتیبان‌ها"
                  text="تعداد روزهایی که فایل‌های پشتیبان نگهداری می‌شوند را مشخص کنید."
                />
              </label>
              <input
                type="number"
                value={backup.backupRetention || 30}
                onChange={(e) => updateSettings({ backupRetention: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="365"
              />
            </div>
          </div>
          
          {/* تنظیمات سرویس ابری */}
          {backup.cloudBackup && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Cloud className="h-4 w-4 mr-2 text-blue-500" />
                تنظیمات سرویس ابری
                <Tooltip 
                  title="تنظیمات سرویس ابری"
                  text="اطلاعات اتصال به سرویس‌های ابری را در این بخش وارد کنید."
                />
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    ارائه‌دهنده سرویس
                    <Tooltip 
                      title="ارائه‌دهنده سرویس"
                      text="سرویس ابری که می‌خواهید از آن استفاده کنید را انتخاب کنید."
                    />
                  </label>
                  <select
                    value={backup.cloudProvider || 'none'}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...backup, cloudProvider: e.target.value as 'none' | 'google' | 'azure' | 'aws' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="none">انتخاب کنید</option>
                    <option value="google">Google Cloud Storage</option>
                    <option value="azure">Microsoft Azure</option>
                    <option value="aws">Amazon AWS S3</option>
                  </select>
                </div>
                
                {(backup.cloudProvider === 'google' || backup.cloudProvider === 'azure' || backup.cloudProvider === 'aws') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        کلید دسترسی
                        <Tooltip 
                          title="کلید دسترسی"
                          text="کلید دسترسی برای اتصال به سرویس ابری را وارد کنید."
                        />
                      </label>
                      <input
                        type="password"
                        value={backup.cloudCredentials?.accessKey || ''}
                        onChange={(e) => updateSettings({
                          cloudCredentials: { ...(backup.cloudCredentials || {}), accessKey: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="access-key"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        کلید محرمانه
                        <Tooltip 
                          title="کلید محرمانه"
                          text="کلید محرمانه برای احراز هویت در سرویس ابری را وارد کنید."
                        />
                      </label>
                      <input
                        type="password"
                        value={backup.cloudCredentials?.secretKey || ''}
                        onChange={(e) => updateSettings({
                          cloudCredentials: { ...(backup.cloudCredentials || {}), secretKey: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="secret-key"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        منطقه
                        <Tooltip 
                          title="منطقه"
                          text="منطقه جغرافیایی سرویس ابری را انتخاب کنید."
                        />
                      </label>
                      <input
                        type="text"
                        value={backup.cloudCredentials?.region || ''}
                        onChange={(e) => updateSettings({
                          cloudCredentials: { ...(backup.cloudCredentials || {}), region: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="us-east-1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        نام باکت
                        <Tooltip 
                          title="نام باکت"
                          text="نام باکت یا مخزن ذخیره‌سازی در سرویس ابری را وارد کنید."
                        />
                      </label>
                      <input
                        type="text"
                        value={backup.cloudCredentials?.bucket || ''}
                        onChange={(e) => updateSettings({
                          cloudCredentials: { ...(backup.cloudCredentials || {}), bucket: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="backup-bucket"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* عملیات پشتیبان */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <RefreshCw className="h-5 w-5 mr-2 text-blue-500" />
          عملیات پشتیبان
          <Tooltip 
            title="عملیات پشتیبان"
            text="در این بخش می‌توانید فایل پشتیبان ایجاد کرده یا از پشتیبان موجود بازیابی کنید."
          />
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="text-center">
              <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Download className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">ایجاد پشتیبان</h4>
              <p className="text-sm text-gray-600 mb-4">
                یک فایل پشتیبان جدید از تمام اطلاعات سیستم ایجاد کنید.
              </p>
              <button
                onClick={createBackup}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {isLoading ? 'در حال ایجاد...' : 'ایجاد پشتیبان جدید'}
              </button>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">بازیابی از پشتیبان</h4>
              <p className="text-sm text-gray-600 mb-4">
                اطلاعات را از فایل پشتیبان موجود بازیابی کنید.
              </p>
              <button
                onClick={restoreBackup}
                disabled={isLoading}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                بازیابی از پشتیبان
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <Shield className="h-5 w-5 text-yellow-600 mt-0.5 ml-2" />
            <div>
              <h5 className="font-medium text-yellow-800">توجه مهم</h5>
              <p className="text-sm text-yellow-700 mt-1">
                بازیابی از پشتیبان تمام اطلاعات جاری را جایگزین می‌کند. قبل از انجام این عمل، از اطلاعات فعلی خود پشتیبان بگیرید.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* تاریخچه پشتیبان‌ها */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-blue-500" />
          تاریخچه پشتیبان‌ها
          <Tooltip 
            title="تاریخچه پشتیبان‌ها"
            text="لیست فایل‌های پشتیبان ایجاد شده و جزئیات آنها را مشاهده کنید."
          />
        </h3>
        
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">هیچ فایل پشتیبانی یافت نشد</p>
          <p className="text-sm text-gray-500 mt-2">
            اولین پشتیبان خود را با کلیک روی دکمه "ایجاد پشتیبان جدید" ایجاد کنید
          </p>
        </div>
      </div>
    </div>
  );
};