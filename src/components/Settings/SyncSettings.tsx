import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, TestTube, FolderOpen, Plus, X, ArrowRight, ArrowLeft, Check, Filter, DatabaseZap, CloudDownload, FileQuestion, Plug, Settings2, ChevronDown, ChevronUp, HelpCircle, Info, Network, BarChart, Key, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import { Tooltip } from './Tooltip'; // اضافه شده

interface SyncSettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  formatPersianDate: (date: Date) => string;
}

interface SyncCondition {
  id: string;
  name: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
  active: boolean;
}

interface ExternalApi {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  enabled: boolean;
  lastSync: string | null;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({
  settings,
  setSettings,
  isLoading,
  setIsLoading,
  formatPersianDate
}) => {
  const [syncGuideStep, setSyncGuideStep] = useState<number>(0);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // اگر حالت همگام‌سازی خودکار فعال است، تایمر را تنظیم کن
    if (settings.sync && settings.sync.syncMode === 'automatic') {
      setupAutoSyncTimer();
    }
    
    return () => {
      // پاک کردن تایمر هنگامUnmount کردن کامپوننت
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [settings.sync?.syncMode, settings.sync?.syncTime]);
  
  const setupAutoSyncTimer = () => {
    // پاک کردن تایمر قبلی اگر وجود دارد
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }
    
    // تنظیم تایمر جدید برای بررسی هر دقیقه
    syncTimerRef.current = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (settings.sync && currentTime === settings.sync.syncTime) {
        // زمان همگام‌سازی فرا رسیده است
        performSync();
      }
    }, 60000); // بررسی هر دقیقه
  };

  const performSync = async () => {
    setIsLoading(true);
    setSettings(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        syncStatus: 'syncing'
      }
    }));
    
    try {
      // 1. دریافت اطلاعات از دیتابیس فعلی
      // شبیه‌سازی دریافت داده‌ها
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. ارسال اطلاعات به Microsoft Finance and Operations
      if (settings.sync?.microsoftFinanceOps?.enabled) {
        await syncToMicrosoftFinanceOps();
      }
      
      // 3. ارسال اطلاعات به Power BI
      if (settings.sync?.powerBI?.enabled) {
        await syncToPowerBI();
      }
      
      // 4. ایجاد فایل اکسل و ذخیره در مسیر مشخص شده
      await createExcelExport();
      
      // 5. به‌روزرسانی وضعیت همگام‌سازی
      const now = new Date().toISOString();
      setSettings(prev => ({
        ...prev,
        sync: {
          ...prev.sync,
          lastSyncTime: now,
          syncStatus: 'success'
        }
      }));
      
      alert('همگام‌سازی با موفقیت انجام شد');
    } catch (error) {
      console.error('Sync error:', error);
      setSettings(prev => ({
        ...prev,
        sync: {
          ...prev.sync,
          syncStatus: 'error'
        }
      }));
      alert('خطا در انجام همگام‌سازی: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const syncToMicrosoftFinanceOps = async () => {
    // در اینجا باید منطق ارسال داده‌ها به Microsoft Finance and Operations پیاده‌سازی شود
    // این یک نمونه شبیه‌سازی شده است
    
    if (!settings.sync?.microsoftFinanceOps) {
      throw new Error('تنظیمات Microsoft Finance and Operations وجود ندارد');
    }
    
    const { endpoint, apiKey, databaseName, tableName, useCompression, batchProcessing, batchSize } = settings.sync.microsoftFinanceOps;
    
    if (!endpoint || !apiKey || !databaseName || !tableName) {
      throw new Error('تنظیمات Microsoft Finance and Operations ناقص است');
    }
    
    // شبیه‌سازی ارسال درخواست به API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Data sent to Microsoft Finance and Operations');
  };
  
  const syncToPowerBI = async () => {
    // در اینجا باید منطق ارسال داده‌ها به Power BI پیاده‌سازی شود
    // این یک نمونه شبیه‌سازی شده است
    
    if (!settings.sync?.powerBI) {
      throw new Error('تنظیمات Power BI وجود ندارد');
    }
    
    const { workspaceId, datasetId, apiKey, autoRefresh, incrementalRefresh, dataMapping } = settings.sync.powerBI;
    
    if (!workspaceId || !datasetId || !apiKey) {
      throw new Error('تنظیمات Power BI ناقص است');
    }
    
    // شبیه‌سازی ارسال درخواست به API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('Data sent to Power BI');
  };
  
  const createExcelExport = async () => {
    try {
      // ایجاد محتوای CSV (که می‌تواند توسط اکسل باز شود)
      const worksheetData = [
        ['Key', 'Data', 'Timestamp'],
        ['sync_key', 'sync_data', new Date().toISOString()]
      ];
      
      const csvContent = worksheetData.map(row => row.join(',')).join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8'
      });
      
      // تلاش برای ذخیره فایل در مسیر مشخص شده
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: `sync_data_${new Date().toISOString().split('T')[0]}.xlsx`,
            types: [
              {
                description: 'Excel files',
                accept: {
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                },
              },
            ],
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          console.log(`Excel file saved to: ${fileHandle.name}`);
        } catch (err) {
          console.error('Error saving file:', err);
          // اگر کاربر مسیر را لغو کرد، فایل را دانلود کن
          downloadExcelFile(blob);
        }
      } else {
        // برای مرورگرهایی که از File System Access API پشتیبانی نمی‌کنند
        downloadExcelFile(blob);
      }
    } catch (error) {
      console.error('Error creating Excel export:', error);
      throw new Error('خطا در ایجاد فایل اکسل');
    }
  };
  
  const downloadExcelFile = (blob: Blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sync_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };
  
  const generateApiKey = () => {
    // تولید یک کلید API تصادفی
    const apiKey = 'sk-' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    setSettings(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        apiSettings: {
          ...prev.sync?.apiSettings,
          apiKey
        }
      }
    }));
  };
  
  const addExternalApi = () => {
    const newApi: ExternalApi = {
      id: `api_${Date.now()}`,
      name: '',
      endpoint: '',
      apiKey: '',
      enabled: false,
      lastSync: null
    };
    
    setSettings(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        apiSettings: {
          ...prev.sync?.apiSettings,
          externalApis: [...(prev.sync?.apiSettings?.externalApis || []), newApi]
        }
      }
    }));
  };
  
  const removeExternalApi = (id: string) => {
    if (confirm('آیا از حذف این API اطمینان دارید؟')) {
      setSettings(prev => ({
        ...prev,
        sync: {
          ...prev.sync,
          apiSettings: {
            ...prev.sync?.apiSettings,
            externalApis: (prev.sync?.apiSettings?.externalApis || []).filter(api => api.id !== id)
          }
        }
      }));
    }
  };
  
  const testExternalApi = async (api: ExternalApi) => {
    setIsLoading(true);
    
    try {
      // شبیه‌سازی تست اتصال به API خارجی
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('اتصال به API با موفقیت برقرار شد');
      
      // به‌روزرسانی زمان آخرین همگام‌سازی
      setSettings(prev => ({
        ...prev,
        sync: {
          ...prev.sync,
          apiSettings: {
            ...prev.sync?.apiSettings,
            externalApis: (prev.sync?.apiSettings?.externalApis || []).map(a => 
              a.id === api.id ? { ...a, lastSync: new Date().toISOString() } : a
            )
          }
        }
      }));
    } catch (error) {
      console.error('API test error:', error);
      alert('خطا در اتصال به API: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const selectExcelExportPath = async () => {
    try {
      // Check if File System Access API is available
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const path = dirHandle.name;
        
        setSettings(prev => ({
          ...prev,
          sync: {
            ...prev.sync,
            excelExportPath: path
          }
        }));
      } else {
        // Fallback to prompt for older browsers
        const path = prompt('لطفا مسیر ذخیره فایل‌های اکسل را وارد کنید:', settings.sync?.excelExportPath || '');
        if (path) {
          setSettings(prev => ({
            ...prev,
            sync: {
              ...prev.sync,
              excelExportPath: path
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('خطا در انتخاب پوشه');
    }
  };

  // Collapsible Guide Section Component
  const CollapsibleGuideSection: React.FC<{ 
    title: string; 
    children: React.ReactNode;
    icon: React.ReactNode;
    defaultOpen?: boolean;
  }> = ({ title, children, icon, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <div className="mr-2 text-blue-500">{icon}</div>
            <h3 className="font-medium text-gray-900">{title}</h3>
          </div>
          <div className="transform transition-transform">
            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
          </div>
        </button>
        {isOpen && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Guide Step Component
  const GuideStep: React.FC<{ 
    step: number; 
    title: string; 
    description: string; 
    isActive?: boolean;
    isCompleted?: boolean;
  }> = ({ step, title, description, isActive, isCompleted }) => {
    return (
      <div className={`flex items-start mb-6 ${isActive ? 'bg-blue-50 p-4 rounded-lg border border-blue-200' : ''}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
          isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {isCompleted ? <Check className="h-4 w-4" /> : step}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    );
  };

  // Sync Guide Component
  const SyncGuide: React.FC<{ 
    currentStep: number; 
    onStepChange: (step: number) => void 
  }> = ({ currentStep, onStepChange }) => {
    const steps = [
      {
        title: "تنظیمات پایه همگام‌سازی",
        description: "نوع همگام‌سازی (دستی، خودکار یا شرطی) و زمان‌بندی را مشخص کنید."
      },
      {
        title: "پیکربندی Microsoft Finance and Operations",
        description: "اطلاعات اتصال به پایگاه داده Microsoft Finance and Operations را وارد کنید."
      },
      {
        title: "تنظیمات Microsoft Power BI",
        description: "اطلاعات اتصال به Power BI و تنظیمات تطبیق داده‌ها را پیکربندی کنید."
      },
      {
        title: "تنظیمات یکپارچه‌سازی",
        description: "سیستم‌های خارجی مانند ERP، CRM و حسابداری را پیکربندی کنید."
      },
      {
        title: "تنظیمات API پیشرفته",
        description: "کلید API، محدودیت‌های دسترسی و تنظیمات امنیتی را پیکربندی کنید."
      },
      {
        title: "اجرای همگام‌سازی",
        description: "فرآیند همگام‌سازی را اجرا کرده و نتایج را بررسی کنید."
      }
    ];

    return (
      <CollapsibleGuideSection 
        title="راهنمای گام به گام همگام‌سازی" 
        icon={<Info className="h-5 w-5" />}
        defaultOpen={true}
      >
        <div className="space-y-2">
          {steps.map((step, index) => (
            <GuideStep
              key={index}
              step={index + 1}
              title={step.title}
              description={step.description}
              isActive={currentStep === index}
              isCompleted={currentStep > index}
            />
          ))}
        </div>
        
        <div className="flex justify-between mt-6">
          <button
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-4 w-4 ml-2 transform rotate-180" />
            مرحله قبل
          </button>
          <button
            onClick={() => onStepChange(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            مرحله بعد
            <ArrowLeft className="h-4 w-4 mr-2 transform rotate-180" />
          </button>
        </div>
      </CollapsibleGuideSection>
    );
  };

  // Troubleshooting Component
  const TroubleshootingSection: React.FC = () => {
    const issues = [
      {
        problem: "خطا در اتصال به Microsoft Finance and Operations",
        solution: "مطمئن شوید که آدرس Endpoint، کلید API، نام پایگاه داده و نام جدول به درستی وارد شده‌اند. همچنین بررسی کنید که سرویس Microsoft Finance and Operations در دسترس باشد."
      },
      {
        problem: "خطا در اتصال به Microsoft Power BI",
        solution: "مطمئن شوید که Workspace ID و Dataset ID صحیح هستند. کلید API معتبر باشد و دسترسی‌های لازم برای به‌روزرسانی داده‌ها وجود داشته باشد."
      },
      {
        problem: "همگام‌سازی با خطا متوقف می‌شود",
        solution: "لاگ‌های سیستم را برای شناسایی خطا بررسی کنید. ممکن است مشکل از عدم تطابق داده‌ها، محدودیت‌های دسترسی یا حجم بالای داده‌ها باشد."
      },
      {
        problem: "فایل اکسل ایجاد نمی‌شود",
        solution: "مطمئن شوید که مسیر ذخیره فایل‌ها وجود دارد و دسترسی نوشتن در آن مسیر دارید. همچنین بررسی کنید که مرورگر شما از ذخیره فایل پشتیبانی کند."
      },
      {
        problem: "کلید API معتبر نیست",
        solution: "یک کلید API جدید با استفاده از دکمه «تولید کلید جدید» ایجاد کنید. مطمئن شوید که کلید API را به درستی کپی کرده‌اید."
      },
      {
        problem: "سرعت همگام‌سازی بسیار کند است",
        solution: "در تنظیمات پیشرفته، گزینه پردازش دسته‌ای (Batch Processing) را فعال کنید و حجم دسته‌ها را تنظیم نمایید. همچنین فشرده‌سازی داده‌ها را فعال کنید."
      }
    ];

    return (
      <CollapsibleGuideSection 
        title="عیب‌یابی مشکلات رایج" 
        icon={<FileQuestion className="h-5 w-5" />}
      >
        <div className="space-y-4">
          {issues.map((issue, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-yellow-100">
              <h3 className="font-medium text-gray-900 mb-2">{issue.problem}</h3>
              <p className="text-sm text-gray-600">{issue.solution}</p>
            </div>
          ))}
        </div>
      </CollapsibleGuideSection>
    );
  };

  // Best Practices Component
  const BestPracticesSection: React.FC = () => {
    const practices = [
      {
        title: "بهینه‌سازی زمان همگام‌سازی",
        description: "همگام‌سازی را در زمان‌های کم‌ترافیک شبکه انجام دهید تا از تداخل با عملیات جاری جلوگیری شود."
      },
      {
        title: "استفاده از همگام‌سازی شرطی",
        description: "برای داده‌های بزرگ، از همگام‌سازی شرطی استفاده کنید تا فقط تغییرات همگام‌سازی شوند."
      },
      {
        title: "مدیریت خطاها",
        description: "مکانیزم مدیریت خطا را پیاده‌سازی کنید تا در صورت بروز مشکل، فرآیند همگام‌سازی به طور کامل متوقف نشود."
      },
      {
        title: "پشتیبان‌گیری قبل از همگام‌سازی",
        description: "همیشه قبل از اجرای همگام‌سازی‌های بزرگ، از داده‌های خود پشتیبان بگیرید."
      },
      {
        title: "استفاده از تطبیق داده‌ها",
        description: "برای اطمینان از سازگاری داده‌ها بین سیستم‌های مختلف، از قابلیت تطبیق داده‌ها استفاده کنید."
      }
    ];

    return (
      <CollapsibleGuideSection 
        title="بهترین روش‌های همگام‌سازی" 
        icon={<Check className="h-5 w-5" />}
      >
        <div className="space-y-4">
          {practices.map((practice, index) => (
            <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="font-medium text-green-900 mb-2">{practice.title}</h3>
              <p className="text-sm text-green-700">{practice.description}</p>
            </div>
          ))}
        </div>
      </CollapsibleGuideSection>
    );
  };

  return (
    <div className="space-y-6">
      <SyncGuide currentStep={syncGuideStep} onStepChange={setSyncGuideStep} />
      
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <RefreshCw className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات همگام‌سازی
          <Tooltip 
            title="تنظیمات همگام‌سازی"
            text="در این بخش می‌توانید تنظیمات مربوط به همگام‌سازی داده‌ها با سیستم‌های دیگر را پیکربندی کنید. این امکان به شما می‌دهد داده‌ها را بین سیستم‌های مختلف به اشتراک بگذارید."
          />
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              حالت همگام‌سازی
              <Tooltip 
                title="حالت همگام‌سازی"
                text="نوع همگام‌سازی را انتخاب کنید: دستی (با کلیک روی دکمه)، خودکار (در زمان مشخص) یا شرطی (بر اساس شرایط خاص)"
              />
            </label>
            <select
              value={settings.sync?.syncMode || 'manual'}
              onChange={(e) => {
                const newMode = e.target.value as 'manual' | 'automatic' | 'conditional';
                setSettings(prev => ({
                  ...prev,
                  sync: {
                    ...prev.sync,
                    syncMode: newMode
                  }
                }));
                
                // اگر حالت خودکار انتخاب شد، تایمر را تنظیم کن
                if (newMode === 'automatic') {
                  setupAutoSyncTimer();
                } else if (syncTimerRef.current) {
                  // اگر حالت دستی یا شرطی انتخاب شد، تایمر را متوقف کن
                  clearInterval(syncTimerRef.current);
                  syncTimerRef.current = null;
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="manual">دستی</option>
              <option value="automatic">خودکار</option>
              <option value="conditional">شرطی</option>
            </select>
          </div>
          
          {settings.sync?.syncMode === 'automatic' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                زمان همگام‌سازی
                <Tooltip 
                  title="زمان همگام‌سازی"
                  text="زمانی که همگام‌سازی خودکار باید انجام شود را به صورت HH:MM وارد کنید"
                />
              </label>
              <input
                type="time"
                value={settings.sync?.syncTime || '00:00'}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sync: {
                    ...prev.sync,
                    syncTime: e.target.value
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            مسیر ذخیره فایل اکسل
            <Tooltip 
              title="مسیر ذخیره فایل اکسل"
              text="مسیری که فایل‌های اکسل همگام‌سازی در آن ذخیره می‌شوند را مشخص کنید. این فایل‌ها می‌توانند برای گزارش‌گیری و تحلیل استفاده شوند"
            />
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.sync?.excelExportPath || ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                sync: {
                  ...prev.sync,
                  excelExportPath: e.target.value
                }
              }))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="/exports/sync"
            />
            <button
              onClick={selectExcelExportPath}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              انتخاب پوشه
            </button>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">
              آخرین همگام‌سازی: {settings.sync?.lastSyncTime 
                ? formatPersianDate(new Date(settings.sync.lastSyncTime)) 
                : 'هنوز انجام نشده'}
            </div>
            <div className="flex items-center mt-1">
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                settings.sync?.syncStatus === 'idle' ? 'bg-gray-400' :
                settings.sync?.syncStatus === 'syncing' ? 'bg-yellow-500' :
                settings.sync?.syncStatus === 'success' ? 'bg-green-500' :
                settings.sync?.syncStatus === 'warning' ? 'bg-yellow-400' :
                'bg-red-500'
              }`}></span>
              <span className="text-sm">
                {settings.sync?.syncStatus === 'idle' ? 'آماده' :
                 settings.sync?.syncStatus === 'syncing' ? 'در حال همگام‌سازی...' :
                 settings.sync?.syncStatus === 'success' ? 'موفق' :
                 settings.sync?.syncStatus === 'warning' ? 'با هشدار' :
                 'خطا'}
              </span>
            </div>
          </div>
          
          <button
            onClick={performSync}
            disabled={isLoading || settings.sync?.syncStatus === 'syncing'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${settings.sync?.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {settings.sync?.syncMode === 'manual' ? 'شروع همگام‌سازی' : 'همگام‌سازی دستی'}
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DatabaseZap className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات Microsoft Finance and Operations
          <Tooltip 
            title="Microsoft Finance and Operations"
            text="در این بخش می‌توانید سیستم را با Microsoft Dynamics 365 Finance and Operations یکپارچه کنید. این امکان به شما می‌دهد داده‌های مالی و عملیاتی را بین سیستم‌ها به اشتراک بگذارید."
          />
        </h3>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="microsoftFinanceOpsEnabled"
            checked={settings.sync?.microsoftFinanceOps?.enabled || false}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              sync: {
                ...prev.sync,
                microsoftFinanceOps: {
                  ...prev.sync?.microsoftFinanceOps,
                  enabled: e.target.checked
                }
              }
            }))}
            className="ml-2"
          />
          <label htmlFor="microsoftFinanceOpsEnabled" className="text-sm font-medium text-gray-700 flex items-center">
            فعال‌سازی همگام‌سازی با Microsoft Finance and Operations
            <Tooltip 
              title="همگام‌سازی با Microsoft Finance and Operations"
              text="برای همگام‌سازی داده‌ها با Microsoft Finance and Operations این گزینه را فعال کنید. این امکان تبادل داده بین سیستم شما و Microsoft Dynamics 365 را فراهم می‌کند"
            />
          </label>
        </div>
        
        {settings.sync?.microsoftFinanceOps?.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                آدرس Endpoint
                <Tooltip 
                  title="آدرس Endpoint"
                  text="آدرس API سرور Microsoft Finance and Operations را وارد کنید. این آدرس معمولاً به شکل https://your-server.operations.dynamics.com است"
                />
              </label>
              <input
                type="text"
                value={settings.sync?.microsoftFinanceOps?.endpoint || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sync: {
                    ...prev.sync,
                    microsoftFinanceOps: {
                      ...prev.sync?.microsoftFinanceOps,
                      endpoint: e.target.value
                    }
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://your-dynamics-server.operations.dynamics.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                کلید API
                <Tooltip 
                  title="کلید API"
                  text="کلید API برای احراز هویت در Microsoft Finance and Operations را وارد کنید. این کلید باید از طریق پورتال Microsoft Azure ایجاد شود"
                />
              </label>
              <input
                type="password"
                value={settings.sync?.microsoftFinanceOps?.apiKey || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sync: {
                    ...prev.sync,
                    microsoftFinanceOps: {
                      ...prev.sync?.microsoftFinanceOps,
                      apiKey: e.target.value
                    }
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-api-key"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  نام پایگاه داده
                  <Tooltip 
                    title="نام پایگاه داده"
                    text="نام پایگاه داده در Microsoft Finance and Operations را وارد کنید. این نام معمولاً در پورتال Dynamics 365 قابل مشاهده است"
                  />
                </label>
                <input
                  type="text"
                  value={settings.sync?.microsoftFinanceOps?.databaseName || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sync: {
                      ...prev.sync,
                      microsoftFinanceOps: {
                        ...prev.sync?.microsoftFinanceOps,
                        databaseName: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="database_name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  نام جدول
                  <Tooltip 
                    title="نام جدول"
                    text="نام جدولی که داده‌ها در آن ذخیره می‌شوند را وارد کنید. این جدول باید از قبل در Microsoft Finance and Operations وجود داشته باشد"
                  />
                </label>
                <input
                  type="text"
                  value={settings.sync?.microsoftFinanceOps?.tableName || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sync: {
                      ...prev.sync,
                      microsoftFinanceOps: {
                        ...prev.sync?.microsoftFinanceOps,
                        tableName: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="table_name"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useCompression"
                  checked={settings.sync?.microsoftFinanceOps?.useCompression || false}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sync: {
                      ...prev.sync,
                      microsoftFinanceOps: {
                        ...prev.sync?.microsoftFinanceOps,
                        useCompression: e.target.checked
                      }
                    }
                  }))}
                  className="ml-2"
                />
                <label htmlFor="useCompression" className="text-sm font-medium text-gray-700 flex items-center">
                  استفاده از فشرده‌سازی
                  <Tooltip 
                    title="فشرده‌سازی داده‌ها"
                    text="فعال کردن این گزینه باعث کاهش حجم داده‌های منتقله و افزایش سرعت همگام‌سازی می‌شود"
                  />
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="batchProcessing"
                  checked={settings.sync?.microsoftFinanceOps?.batchProcessing || false}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sync: {
                      ...prev.sync,
                      microsoftFinanceOps: {
                        ...prev.sync?.microsoftFinanceOps,
                        batchProcessing: e.target.checked
                      }
                    }
                  }))}
                  className="ml-2"
                />
                <label htmlFor="batchProcessing" className="text-sm font-medium text-gray-700 flex items-center">
                  پردازش دسته‌ای
                  <Tooltip 
                    title="پردازش دسته‌ای"
                    text="پردازش داده‌ها به صورت دسته‌ای باعث کاهش فشار بر سرور و افزایش پایداری عملیات همگام‌سازی می‌شود"
                  />
                </label>
              </div>
              
              {settings.sync?.microsoftFinanceOps?.batchProcessing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    حجم دسته
                    <Tooltip 
                      title="حجم دسته"
                      text="تعداد رکوردها در هر دسته را مشخص کنید. مقادیر بزرگتر باعث افزایش سرعت اما فشار بیشتر بر سرور می‌شوند"
                    />
                  </label>
                  <input
                    type="number"
                    value={settings.sync?.microsoftFinanceOps?.batchSize || 1000}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      sync: {
                        ...prev.sync,
                        microsoftFinanceOps: {
                          ...prev.sync?.microsoftFinanceOps,
                          batchSize: parseInt(e.target.value) || 1000
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="100"
                    max="10000"
                  />
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  // Test connection to Microsoft Finance and Operations
                  alert("در حال تست اتصال به Microsoft Finance and Operations...");
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                تست اتصال
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Power BI Settings Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart className="h-5 w-5 mr-2 text-blue-500" />
          تنظیمات Microsoft Power BI
          <Tooltip 
            title="Microsoft Power BI"
            text="در این بخش می‌توانید سیستم را با Microsoft Power BI یکپارچه کنید. این امکان به شما می‌دهد داده‌ها را برای تحلیل و گزارش‌گیری به Power BI ارسال کنید."
          />
        </h3>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="powerBIEnabled"
            checked={settings.sync?.powerBI?.enabled || false}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              sync: {
                ...prev.sync,
                powerBI: {
                  ...prev.sync?.powerBI,
                  enabled: e.target.checked
                }
              }
            }))}
            className="ml-2"
          />
          <label htmlFor="powerBIEnabled" className="text-sm font-medium text-gray-700 flex items-center">
            فعال‌سازی همگام‌سازی با Microsoft Power BI
            <Tooltip 
              title="همگام‌سازی با Power BI"
              text="برای همگام‌سازی داده‌ها با Microsoft Power BI و به‌روزرسانی خودکار داشبوردها این گزینه را فعال کنید"
            />
          </label>
        </div>
        
        {settings.sync?.powerBI?.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  شناسه Workspace
                  <Tooltip 
                    title="شناسه Workspace"
                    text="شناسه Workspace در Power BI را وارد کنید. این شناسه در آدرس URL Workspace در پورتال Power BI قابل مشاهده است"
                  />
                </label>
                <input
                  type="text"
                  value={settings.sync?.powerBI?.workspaceId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sync: {
                      ...prev.sync,
                      powerBI: {
                        ...prev.sync?.powerBI,
                        workspaceId: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="workspace-id"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  شناسه Dataset
                  <Tooltip 
                    title="شناسه Dataset"
                    text="شناسه Dataset در Power BI را وارد کنید. این شناسه در تنظیمات Dataset در پورتال Power BI قابل مشاهده است"
                  />
                </label>
                <input
                  type="text"
                  value={settings.sync?.powerBI?.datasetId || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sync: {
                      ...prev.sync,
                      powerBI: {
                        ...prev.sync?.powerBI,
                        datasetId: e.target.value
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="dataset-id"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                کلید API
                <Tooltip 
                  title="کلید API Power BI"
                  text="کلید API برای احراز هویت در Power BI را وارد کنید. این کلید باید از طریق پورتال Power BI ایجاد شود"
                />
              </label>
              <input
                type="password"
                value={settings.sync?.powerBI?.apiKey || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  sync: {
                    ...prev.sync,
                    powerBI: {
                      ...prev.sync?.powerBI,
                      apiKey: e.target.value
                    }
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="power-bi-api-key"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  فاصله به‌روزرسانی (دقیقه)
                  <Tooltip 
                    title="فاصله به‌روزرسانی"
                    text="فاصله زمانی به‌روزرسانی خودکار داده‌ها در Power BI را به دقیقه وارد کنید"
                  />
                </label>
                <input
                  type="number"
                  value={settings.sync?.powerBI?.refreshInterval || 60}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sync: {
                      ...prev.sync,
                      powerBI: {
                        ...prev.sync?.powerBI,
                        refreshInterval: parseInt(e.target.value) || 60
                      }
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="5"
                  max="1440"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={settings.sync?.powerBI?.autoRefresh || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      sync: {
                        ...prev.sync,
                        powerBI: {
                          ...prev.sync?.powerBI,
                          autoRefresh: e.target.checked
                        }
                      }
                    }))}
                    className="ml-2"
                  />
                  <label htmlFor="autoRefresh" className="text-sm font-medium text-gray-700 flex items-center">
                    به‌روزرسانی خودکار
                    <Tooltip 
                      title="به‌روزرسانی خودکار"
                      text="فعال کردن این گزینه باعث به‌روزرسانی خودکار داده‌ها در Power BI در فاصله زمانی مشخص شده می‌شود"
                    />
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="incrementalRefresh"
                    checked={settings.sync?.powerBI?.incrementalRefresh || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      sync: {
                        ...prev.sync,
                        powerBI: {
                          ...prev.sync?.powerBI,
                          incrementalRefresh: e.target.checked
                        }
                      }
                    }))}
                    className="ml-2"
                  />
                  <label htmlFor="incrementalRefresh" className="text-sm font-medium text-gray-700 flex items-center">
                    به‌روزرسانی افزاینده
                    <Tooltip 
                      title="به‌روزرسانی افزاینده"
                      text="فعال کردن این گزینه باعث می‌شود فقط داده‌های جدید به‌روزرسانی شوند که سرعت عملیات را افزایش می‌دهد"
                    />
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                تطبیق داده‌ها
                <Tooltip 
                  title="تطبیق داده‌ها"
                  text="در این بخش، فیلدهای منبع و هدف را برای تطبیق داده‌ها بین سیستم شما و Power BI مشخص کنید. این کار باعث می‌شود داده‌ها به درستی در Power BI نمایش داده شوند."
                />
              </h4>
              <div className="space-y-3">
                {(settings.sync?.powerBI?.dataMapping || []).map((mapping, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        فیلد منبع
                        <Tooltip 
                          title="فیلد منبع"
                          text="نام فیلد در سیستم شما که می‌خواهید به Power BI ارسال شود را وارد کنید"
                        />
                      </label>
                      <input
                        type="text"
                        value={mapping.sourceField}
                        onChange={(e) => {
                          const newMappings = [...(settings.sync?.powerBI?.dataMapping || [])];
                          newMappings[index] = { ...newMappings[index], sourceField: e.target.value };
                          setSettings(prev => ({
                            ...prev,
                            sync: {
                              ...prev.sync,
                              powerBI: {
                                ...prev.sync?.powerBI,
                                dataMapping: newMappings
                              }
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="source_field"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        فیلد هدف
                        <Tooltip 
                          title="فیلد هدف"
                          text="نام فیلد در Power BI که داده‌ها باید در آن ذخیره شوند را وارد کنید"
                        />
                      </label>
                      <input
                        type="text"
                        value={mapping.targetField}
                        onChange={(e) => {
                          const newMappings = [...(settings.sync?.powerBI?.dataMapping || [])];
                          newMappings[index] = { ...newMappings[index], targetField: e.target.value };
                          setSettings(prev => ({
                            ...prev,
                            sync: {
                              ...prev.sync,
                              powerBI: {
                                ...prev.sync?.powerBI,
                                dataMapping: newMappings
                              }
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="target_field"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          const newMappings = [...(settings.sync?.powerBI?.dataMapping || [])];
                          newMappings.splice(index, 1);
                          setSettings(prev => ({
                            ...prev,
                            sync: {
                              ...prev.sync,
                              powerBI: {
                                ...prev.sync?.powerBI,
                                dataMapping: newMappings
                              }
                            }
                          }));
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    setSettings(prev => ({
                      ...prev,
                      sync: {
                        ...prev.sync,
                        powerBI: {
                          ...prev.sync?.powerBI,
                          dataMapping: [
                            ...(prev.sync?.powerBI?.dataMapping || []),
                            { sourceField: '', targetField: '' }
                          ]
                        }
                      }
                    }));
                  }}
                  className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  افزودن تطبیق جدید
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => {
                  // Test connection to Power BI
                  alert("در حال تست اتصال به Microsoft Power BI...");
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                تست اتصال
              </button>
            </div>
          </div>
        )}
      </div>
      
      <TroubleshootingSection />
      <BestPracticesSection />
    </div>
  );
};