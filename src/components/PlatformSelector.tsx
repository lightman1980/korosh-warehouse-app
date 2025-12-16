import React, { useState } from 'react';
import { Smartphone, Server, Monitor, Settings, Database, Cloud, Wifi } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  requirements: string[];
  setupTime: string;
  database: string[];
}

const platforms: Platform[] = [
  {
    id: 'mobile',
    name: 'گوشی موبایل',
    icon: <Smartphone className="h-8 w-8" />,
    description: 'نصب روی گوشی Android/iOS',
    requirements: ['React Native', 'SQLite/Realm', 'Firebase'],
    setupTime: '15-30 دقیقه',
    database: ['SQLite', 'Realm DB', 'Firebase']
  },
  {
    id: 'server',
    name: 'سرور شرکت',
    icon: <Server className="h-8 w-8" />,
    description: 'سرور Linux/Windows با مقیاس بزرگ',
    requirements: ['Node.js/Python', 'PostgreSQL/MongoDB', 'Docker'],
    setupTime: '30-60 دقیقه',
    database: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis']
  },
  {
    id: 'desktop',
    name: 'کامپیوتر شخصی',
    icon: <Monitor className="h-8 w-8" />,
    description: 'نصب روی Windows/Mac/Linux',
    requirements: ['Electron', 'SQLite', 'SQL.js'],
    setupTime: '20-45 دقیقه',
    database: ['SQLite', 'IndexedDB', 'PostgreSQL']
  },
  {
    id: 'cloud',
    name: 'سرویس ابری',
    icon: <Cloud className="h-8 w-8" />,
    description: 'AWS/Azure/Google Cloud',
    requirements: ['Docker', 'Kubernetes', 'Cloud SQL'],
    setupTime: '45-90 دقیقه',
    database: ['Cloud SQL', 'DynamoDB', 'Firestore', 'CosmosDB']
  }
];

interface PlatformSelectorProps {
  onPlatformSelected: (platform: Platform) => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({ onPlatformSelected }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [showDetails, setShowDetails] = useState<string>('');

  const handleSelection = (platform: Platform) => {
    setSelectedPlatform(platform.id);
  };

  const handleProceed = () => {
    const platform = platforms.find(p => p.id === selectedPlatform);
    if (platform) {
      onPlatformSelected(platform);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          انتخاب پلتفرم نصب
        </h1>
        <p className="text-lg text-gray-600">
          لطفاً پلتفرم مورد نظر خود را برای نصب نرم‌افزار انتخاب کنید
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedPlatform === platform.id
                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSelection(platform)}
          >
            <div className="text-center mb-4">
              <div className={`inline-flex p-3 rounded-full mb-3 ${
                selectedPlatform === platform.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {platform.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {platform.name}
              </h3>
              <p className="text-sm text-gray-600">
                {platform.description}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Settings className="h-4 w-4 mr-2" />
                <span>زمان نصب: {platform.setupTime}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Database className="h-4 w-4 mr-2" />
                <span>{platform.database.length} پایگاه داده</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(showDetails === platform.id ? '' : platform.id);
                }}
                className="w-full text-blue-600 text-sm hover:text-blue-800 underline"
              >
                {showDetails === platform.id ? 'مخفی کردن جزئیات' : 'نمایش جزئیات'}
              </button>

              {showDetails === platform.id && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">پیش‌نیازها:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {platform.requirements.map((req, index) => (
                      <li key={index} className="flex items-center">
                        <Wifi className="h-3 w-3 mr-2 text-green-500" />
                        {req}
                      </li>
                    ))}
                  </ul>
                  
                  <h4 className="font-medium text-gray-900 mb-2 mt-3">پایگاه‌های داده پشتیبانی شده:</h4>
                  <div className="flex flex-wrap gap-2">
                    {platform.database.map((db, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {db}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={handleProceed}
          disabled={!selectedPlatform}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            selectedPlatform
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          ادامه نصب خودکار
        </button>
        
        {selectedPlatform && (
          <p className="mt-4 text-sm text-gray-600">
            پلتفرم انتخاب شده: <span className="font-medium">{platforms.find(p => p.id === selectedPlatform)?.name}</span>
          </p>
        )}
      </div>
    </div>
  );
};