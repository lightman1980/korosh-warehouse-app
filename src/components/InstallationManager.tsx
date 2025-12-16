import React, { useState, useEffect } from 'react';
import { Play, Download, Settings, Database, Server, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface InstallationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
  logs?: string[];
}

interface InstallationManagerProps {
  platform: string;
  databaseConfig: any;
  onComplete: () => void;
  onError: (error: string) => void;
}

export const InstallationManager: React.FC<InstallationManagerProps> = ({
  platform,
  databaseConfig,
  onComplete,
  onError
}) => {
  const [installationSteps, setInstallationSteps] = useState<InstallationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationLog, setInstallationLog] = useState<string[]>([]);

  // Platform-specific installation steps
  const getInstallationSteps = (platform: string): InstallationStep[] => {
    const commonSteps: InstallationStep[] = [
      {
        id: 'environment-check',
        name: 'بررسی محیط نصب',
        description: 'بررسی سیستم و پیش‌نیازها',
        status: 'pending'
      },
      {
        id: 'dependencies',
        name: 'دانلود وابستگی‌ها',
        description: 'دانلود و نصب پکیج‌های مورد نیاز',
        status: 'pending'
      },
      {
        id: 'database-setup',
        name: 'تنظیم پایگاه داده',
        description: 'ایجاد و پیکربندی پایگاه داده',
        status: 'pending'
      },
      {
        id: 'application-install',
        name: 'نصب اپلیکیشن',
        description: 'نصب برنامه اصلی',
        status: 'pending'
      },
      {
        id: 'configuration',
        name: 'تنظیم نهایی',
        description: 'پیکربندی و تست',
        status: 'pending'
      }
    ];

    switch (platform) {
      case 'mobile':
        return [
          ...commonSteps,
          { id: 'build-mobile', name: 'ساخت APK/IPA', description: 'ساخت فایل نصب موبایل', status: 'pending' },
          { id: 'app-distribution', name: 'توزیع اپلیکیشن', description: 'آماده‌سازی برای نصب', status: 'pending' }
        ];
      case 'server':
        return [
          ...commonSteps,
          { id: 'docker-setup', name: 'تنظیم Docker', description: 'راه‌اندازی Docker containers', status: 'pending' },
          { id: 'ssl-certificate', name: 'تنظیم SSL', description: 'فعال‌سازی HTTPS', status: 'pending' },
          { id: 'process-manager', name: 'مدیریت پروسه‌ها', description: 'راه‌اندازی PM2/Systemd', status: 'pending' }
        ];
      case 'desktop':
        return [
          ...commonSteps,
          { id: 'electron-build', name: 'ساخت Desktop App', description: 'ایجاد فایل اجرایی', status: 'pending' },
          { id: 'shortcuts', name: 'ایجاد میانبرها', description: 'تنظیم shortcuts و registry', status: 'pending' }
        ];
      case 'cloud':
        return [
          ...commonSteps,
          { id: 'cloud-deployment', name: 'دیپلوی ابری', description: 'توزیع روی Cloud Platform', status: 'pending' },
          { id: 'load-balancer', name: 'تنظیم Load Balancer', description: 'پیکربندی توزیع بار', status: 'pending' },
          { id: 'monitoring', name: 'تنظیم مانیتورینگ', description: 'راه‌اندازی Health Check', status: 'pending' }
        ];
      default:
        return commonSteps;
    }
  };

  useEffect(() => {
    setInstallationSteps(getInstallationSteps(platform));
  }, [platform]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('fa-IR');
    setInstallationLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateStepStatus = (stepId: string, status: InstallationStep['status'], logs?: string[]) => {
    setInstallationSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, logs: logs || step.logs }
        : step
    ));
  };

  const simulateStep = async (step: InstallationStep): Promise<void> => {
    return new Promise((resolve) => {
      const stepDuration = Math.random() * 3000 + 2000; // 2-5 seconds
      
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        updateStepStatus(step.id, success ? 'completed' : 'error');
        addLog(`${step.name}: ${success ? 'تکمیل شد' : 'خطا رخ داد'}`);
        resolve();
      }, stepDuration);
    });
  };

  const startInstallation = async () => {
    setIsInstalling(true);
    setInstallationLog([]);
    addLog('🚀 شروع فرآیند نصب...');
    addLog(`📱 پلتفرم: ${platform}`);
    addLog(`🗄️ پایگاه داده: ${databaseConfig.type}`);

    try {
      for (let i = 0; i < installationSteps.length; i++) {
        const step = installationSteps[i];
        setCurrentStep(i);
        updateStepStatus(step.id, 'running');
        addLog(`🔄 شروع: ${step.name}`);

        await simulateStep(step);
        
        const stepStatus = installationSteps.find(s => s.id === step.id)?.status;
        if (stepStatus === 'error') {
          addLog(`❌ نصب متوقف شد در مرحله: ${step.name}`);
          onError(`خطا در مرحله ${step.name}`);
          setIsInstalling(false);
          return;
        }
      }

      addLog('✅ نصب با موفقیت تکمیل شد!');
      setIsInstalling(false);
      onComplete();
    } catch (error) {
      addLog(`❌ خطای غیرمنتظره: ${error}`);
      onError('خطای غیرمنتظره در نصب');
      setIsInstalling(false);
    }
  };

  const getStepIcon = (status: InstallationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getProgressPercentage = () => {
    const completed = installationSteps.filter(step => step.status === 'completed').length;
    return (completed / installationSteps.length) * 100;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Play className="h-6 w-6 mr-3 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900">
            نصب خودکار نرم‌افزار
          </h2>
        </div>

        {/* Installation Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              پیشرفت نصب
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Installation Steps */}
        <div className="space-y-4 mb-6">
          {installationSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center p-4 rounded-lg border transition-colors ${
                step.status === 'running' ? 'bg-blue-50 border-blue-200' :
                step.status === 'completed' ? 'bg-green-50 border-green-200' :
                step.status === 'error' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="mr-4">
                {getStepIcon(step.status)}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {index + 1}. {step.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {step.description}
                </p>
                {step.logs && step.logs.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {step.logs[step.logs.length - 1]}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {step.status === 'running' && 'در حال اجرا...'}
                {step.status === 'completed' && '✓'}
                {step.status === 'error' && '✗'}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {!isInstalling && installationSteps.every(step => step.status === 'pending') && (
            <button
              onClick={startInstallation}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              شروع نصب خودکار
            </button>
          )}
          
          {isInstalling && (
            <button
              disabled
              className="bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed flex items-center gap-2"
            >
              <Loader className="h-5 w-5 animate-spin" />
              در حال نصب...
            </button>
          )}
        </div>

        {/* Installation Log */}
        {installationLog.length > 0 && (
          <div className="mt-6 p-4 bg-gray-900 rounded-lg">
            <h3 className="text-green-400 font-medium mb-2">📋 گزارش نصب:</h3>
            <div className="text-green-300 font-mono text-sm max-h-40 overflow-y-auto">
              {installationLog.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Installation Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Settings className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-sm font-medium text-blue-900">پلتفرم</div>
            <div className="text-xs text-blue-700">{platform}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <Database className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-sm font-medium text-green-900">پایگاه داده</div>
            <div className="text-xs text-green-700">{databaseConfig.type}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <Server className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-sm font-medium text-purple-900">وضعیت</div>
            <div className="text-xs text-purple-700">
              {installationSteps.every(step => step.status === 'completed') ? 'آماده' : 'در حال نصب'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};