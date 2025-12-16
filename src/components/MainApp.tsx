import React, { useState } from 'react';
import { PlatformSelector } from '../platform-selector/PlatformSelector';
import { DatabaseConfig } from '../database/DatabaseConfig';
import { InstallationManager } from '../installation/InstallationManager';
import { ServerSettings } from '../ServerSettings';

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  requirements: string[];
  setupTime: string;
  database: string[];
}

interface DatabaseConfigType {
  type: string;
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionLimit: number;
}

type AppStep = 'platform-selection' | 'database-config' | 'server-settings' | 'installation' | 'complete';

export const MainApp: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('platform-selection');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfigType>({
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    name: 'app_database',
    username: 'postgres',
    password: '',
    ssl: false,
    connectionLimit: 100
  });
  const [serverSettings, setServerSettings] = useState({
    serverAddress: 'localhost',
    serverPort: 3000,
    maxConnections: 1000,
    sslEnabled: false
  });
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePlatformSelected = (platform: Platform) => {
    setSelectedPlatform(platform);
    setCurrentStep('database-config');
  };

  const handleDatabaseConfigChange = (config: DatabaseConfigType) => {
    setDatabaseConfig(config);
  };

  const handleDatabaseTest = async (config: DatabaseConfigType): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate database connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isConnected = Math.random() > 0.2; // 80% success rate
    
    setIsLoading(false);
    return isConnected;
  };

  const handleInstallationComplete = () => {
    setCurrentStep('complete');
  };

  const handleInstallationError = (error: string) => {
    console.error('Installation error:', error);
    // Handle installation error
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'platform-selection':
        setCurrentStep('database-config');
        break;
      case 'database-config':
        setCurrentStep('server-settings');
        break;
      case 'server-settings':
        setCurrentStep('installation');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'database-config':
        setCurrentStep('platform-selection');
        break;
      case 'server-settings':
        setCurrentStep('database-config');
        break;
      case 'installation':
        setCurrentStep('server-settings');
        break;
    }
  };

  const getStepNumber = (step: AppStep): number => {
    const steps: AppStep[] = ['platform-selection', 'database-config', 'server-settings', 'installation', 'complete'];
    return steps.indexOf(step) + 1;
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'platform-selection':
        return (
          <PlatformSelector 
            onPlatformSelected={handlePlatformSelected}
          />
        );
      
      case 'database-config':
        return (
          <DatabaseConfig
            platform={selectedPlatform?.id || 'server'}
            onConfigChange={handleDatabaseConfigChange}
            onTestConnection={handleDatabaseTest}
            isTesting={isLoading}
          />
        );
      
      case 'server-settings':
        return (
          <div className="max-w-4xl mx-auto">
            <ServerSettings
              settings={serverSettings}
              setSettings={setServerSettings}
              isLoading={isLoading}
              testResults={testResults}
              setTestResults={setTestResults}
            />
          </div>
        );
      
      case 'installation':
        return (
          <InstallationManager
            platform={selectedPlatform?.id || 'server'}
            databaseConfig={databaseConfig}
            onComplete={handleInstallationComplete}
            onError={handleInstallationError}
          />
        );
      
      case 'complete':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                نصب با موفقیت تکمیل شد!
              </h2>
              <p className="text-gray-600 mb-6">
                نرم‌افزار شما با موفقیت روی پلتفرم {selectedPlatform?.name} نصب شده است.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">اطلاعات نصب:</h3>
                <div className="text-left space-y-2 text-sm text-blue-800">
                  <div><strong>پلتفرم:</strong> {selectedPlatform?.name}</div>
                  <div><strong>پایگاه داده:</strong> {databaseConfig.type}</div>
                  <div><strong>آدرس سرور:</strong> {serverSettings.serverAddress}:{serverSettings.serverPort}</div>
                  <div><strong>SSL/HTTPS:</strong> {serverSettings.sslEnabled ? 'فعال' : 'غیرفعال'}</div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => window.location.href = `http://${serverSettings.serverAddress}:${serverSettings.serverPort}`}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  باز کردن نرم‌افزار
                </button>
                
                <div className="text-sm text-gray-500">
                  <p>در صورت نیاز به راهنمایی بیشتر، به مستندات مراجعه کنید.</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                نصاب خودکار نرم‌افزار
              </h1>
              <p className="text-sm text-gray-600">
                نسخه 2025 - نصب روی چندین پلتفرم
              </p>
            </div>
            
            {/* Progress Indicator */}
            {currentStep !== 'complete' && currentStep !== 'platform-selection' && (
              <div className="flex items-center space-x-2">
                {['platform-selection', 'database-config', 'server-settings', 'installation'].map((step, index) => (
                  <React.Fragment key={step}>
                    <div className={`w-3 h-3 rounded-full ${
                      getStepNumber(currentStep as AppStep) > index + 1 ? 'bg-green-500' :
                      getStepNumber(currentStep as AppStep) === index + 1 ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`} />
                    {index < 3 && (
                      <div className={`w-8 h-0.5 ${
                        getStepNumber(currentStep as AppStep) > index + 1 ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {renderCurrentStep()}
      </main>

      {/* Navigation Footer */}
      {currentStep !== 'complete' && currentStep !== 'platform-selection' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← بازگشت
            </button>
            
            <div className="text-sm text-gray-500">
              مرحله {getStepNumber(currentStep)} از 4
            </div>
            
            {currentStep !== 'installation' && (
              <button
                onClick={handleNext}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                ادامه →
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};