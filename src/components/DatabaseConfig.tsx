import React, { useState } from 'react';
import { Database, Server, Key, Wifi, TestTube, Save } from 'lucide-react';

interface DatabaseConfig {
  type: string;
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionLimit: number;
}

interface DatabaseConfigProps {
  platform: string;
  onConfigChange: (config: DatabaseConfig) => void;
  onTestConnection: (config: DatabaseConfig) => Promise<boolean>;
  isTesting: boolean;
}

const databaseTypes = {
  postgresql: {
    name: 'PostgreSQL',
    icon: '🐘',
    defaultPort: 5432,
    description: 'پایگاه داده قدرتمند و قابل اعتماد'
  },
  mysql: {
    name: 'MySQL/MariaDB',
    icon: '🐬',
    defaultPort: 3306,
    description: 'پایگاه داده محبوب و سریع'
  },
  mongodb: {
    name: 'MongoDB',
    icon: '🍃',
    defaultPort: 27017,
    description: 'پایگاه داده NoSQL انعطاف‌پذیر'
  },
  sqlite: {
    name: 'SQLite',
    icon: '📄',
    defaultPort: 0,
    description: 'پایگاه داده فایلی ساده'
  },
  redis: {
    name: 'Redis',
    icon: '❤️',
    defaultPort: 6379,
    description: 'پایگاه داده در حافظه سریع'
  },
  firestore: {
    name: 'Firestore',
    icon: '🔥',
    defaultPort: 443,
    description: 'پایگاه داده ابری Google'
  },
  cosmosdb: {
    name: 'Cosmos DB',
    icon: '🌌',
    defaultPort: 443,
    description: 'پایگاه داده چندمدل Azure'
  }
};

export const DatabaseConfig: React.FC<DatabaseConfigProps> = ({
  platform,
  onConfigChange,
  onTestConnection,
  isTesting
}) => {
  const [config, setConfig] = useState<DatabaseConfig>({
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    name: 'app_database',
    username: 'postgres',
    password: '',
    ssl: false,
    connectionLimit: 100
  });

  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const updateConfig = (updates: Partial<DatabaseConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
    setIsSaved(false);
  };

  const handleTypeChange = (type: string) => {
    const dbType = databaseTypes[type as keyof typeof databaseTypes];
    updateConfig({
      type,
      port: dbType.defaultPort,
      host: type === 'sqlite' ? '' : 'localhost',
      username: type === 'sqlite' ? '' : 'postgres',
      password: type === 'sqlite' ? '' : ''
    });
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    const result = await onTestConnection(config);
    setTestResult(result);
  };

  const handleSave = () => {
    // Save configuration logic here
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const getSupportedDatabases = () => {
    const platformSupport: Record<string, string[]> = {
      mobile: ['sqlite', 'realm', 'firestore'],
      server: ['postgresql', 'mysql', 'mongodb', 'redis'],
      desktop: ['sqlite', 'postgresql', 'mysql'],
      cloud: ['firestore', 'cosmosdb', 'postgresql', 'mysql', 'mongodb']
    };
    
    return platformSupport[platform] || Object.keys(databaseTypes);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <Database className="h-6 w-6 mr-3 text-blue-500" />
        <h2 className="text-xl font-semibold text-gray-900">
          تنظیمات پایگاه داده
        </h2>
      </div>

      <div className="space-y-6">
        {/* Database Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            نوع پایگاه داده
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {getSupportedDatabases().map((type) => {
              const dbInfo = databaseTypes[type as keyof typeof databaseTypes];
              if (!dbInfo) return null;
              
              return (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    config.type === type
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    <span className="text-lg mr-2">{dbInfo.icon}</span>
                    <span className="font-medium">{dbInfo.name}</span>
                  </div>
                  <p className="text-xs text-gray-600">{dbInfo.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Connection Configuration */}
        {config.type !== 'sqlite' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Server className="h-4 w-4 inline mr-1" />
                آدرس سرور
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => updateConfig({ host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="localhost"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Wifi className="h-4 w-4 inline mr-1" />
                پورت
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => updateConfig({ port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={databaseTypes[config.type as keyof typeof databaseTypes]?.defaultPort.toString()}
              />
            </div>
          </div>
        )}

        {/* Database Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نام پایگاه داده
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => updateConfig({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="app_database"
          />
        </div>

        {/* Authentication */}
        {config.type !== 'sqlite' && config.type !== 'firestore' && config.type !== 'cosmosdb' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="h-4 w-4 inline mr-1" />
                نام کاربری
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => updateConfig({ username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="postgres"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رمز عبور
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => updateConfig({ password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        {/* SSL Configuration */}
        {config.type !== 'sqlite' && (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="ssl"
              checked={config.ssl}
              onChange={(e) => updateConfig({ ssl: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ssl" className="text-sm font-medium text-gray-700">
              استفاده از SSL/TLS
            </label>
          </div>
        )}

        {/* Connection Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            حداکثر تعداد اتصالات همزمان
          </label>
          <input
            type="number"
            value={config.connectionLimit}
            onChange={(e) => updateConfig({ connectionLimit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="100"
          />
        </div>

        {/* Test and Save Buttons */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <TestTube className="h-4 w-4" />
            تست اتصال
            {testResult !== null && (
              <span className={`ml-2 ${testResult ? 'text-green-200' : 'text-red-200'}`}>
                {testResult ? '✓' : '✗'}
              </span>
            )}
          </button>
          
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            ذخیره تنظیمات
            {isSaved && <span className="text-green-200">✓</span>}
          </button>
        </div>

        {/* Platform-specific Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            پلتفرم انتخابی: {platform}
          </h3>
          <p className="text-sm text-blue-700">
            بر اساس پلتفرم انتخابی، بهترین تنظیمات پیشنهادی:
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            {platform === 'mobile' && (
              <>
                <li>• SQLite برای ذخیره‌سازی محلی سریع</li>
                <li>• Firebase برای همگام‌سازی آنلاین</li>
              </>
            )}
            {platform === 'server' && (
              <>
                <li>• PostgreSQL برای قابلیت اطمینان بالا</li>
                <li>• Redis برای کش کردن</li>
              </>
            )}
            {platform === 'desktop' && (
              <>
                <li>• SQLite برای عملکرد بهینه</li>
                <li>• PostgreSQL برای استفاده گروهی</li>
              </>
            )}
            {platform === 'cloud' && (
              <>
                <li>• Cloud SQL برای مقیاس‌پذیری خودکار</li>
                <li>• Firestore برای Real-time</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};