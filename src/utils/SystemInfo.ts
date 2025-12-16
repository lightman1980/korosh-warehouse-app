// SystemInfo.ts - اطلاعات سیستم و بررسی سازگاری
// در محیط مرورگر ممکن است process وجود نداشته باشد، برای TypeScript آن را تعریف می‌کنیم
// (در زمان اجرا فقط در صورت وجود استفاده می‌شود)
declare const process: any;
export interface SystemInfo {
  platform: 'windows' | 'linux' | 'mac' | string;
  architecture: string;
  nodeVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    cores: number;
    model: string;
    usage: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
  };
  network: {
    interfaces: string[];
    latency: number;
  };
}

export interface SystemRequirement {
  name: string;
  required: boolean;
  status: 'met' | 'not_met' | 'warning';
  message: string;
  current?: string;
  minimum?: string;
}

export interface ValidationResult {
  passed: boolean;
  requirements: SystemRequirement[];
  warnings: string[];
  errors: string[];
}

export interface DefaultPaths {
  database: string;
  logs: string;
  backup: string;
  config: string;
  temp: string;
  cache: string;
}

// دریافت اطلاعات سیستم
export const getSystemInfo = async (): Promise<SystemInfo> => {
  try {
    // شبیه‌سازی دریافت اطلاعات سیستم
    // در عملیات واقعی، این اطلاعات از API سیستم عامل دریافت می‌شوند
    
    const platform = getPlatform();
    const memory = await getMemoryInfo();
    const cpu = await getCpuInfo();
    const disk = await getDiskInfo();
    const network = await getNetworkInfo();
    
    return {
      platform,
      architecture: getArchitecture(),
      nodeVersion:
        typeof process !== 'undefined' && typeof process.version === 'string'
          ? process.version
          : '18.0.0',
      memory,
      cpu,
      disk,
      network
    };
  } catch (error) {
    console.error('خطا در دریافت اطلاعات سیستم:', error);
    
    // بازگردانی اطلاعات پیش‌فرض در صورت خطا
    return {
      platform: 'windows',
      architecture: 'x64',
      nodeVersion: '18.0.0',
      memory: { total: 0, free: 0, used: 0 },
      cpu: { cores: 4, model: 'Unknown CPU', usage: 0 },
      disk: { total: 0, free: 0, used: 0 },
      network: { interfaces: [], latency: 0 }
    };
  }
};

// دریافت مسیرهای پیش‌فرض
export const getDefaultPaths = (platform?: string): DefaultPaths => {
  const currentPlatform = platform || getPlatform();
  
  const paths: Record<string, DefaultPaths> = {
    windows: {
      database: 'C:\\ProgramData\\Makhazen\\Database',
      logs: 'C:\\ProgramData\\Makhazen\\Logs',
      backup: 'C:\\ProgramData\\Makhazen\\Backup',
      config: 'C:\\ProgramData\\Makhazen\\Config',
      temp: 'C:\\ProgramData\\Makhazen\\Temp',
      cache: 'C:\\ProgramData\\Makhazen\\Cache'
    },
    linux: {
      database: '/var/lib/makhazen/database',
      logs: '/var/log/makhazen',
      backup: '/var/backups/makhazen',
      config: '/etc/makhazen',
      temp: '/tmp/makhazen',
      cache: '/var/cache/makhazen'
    },
    mac: {
      database: '/Users/Shared/Makhazen/Database',
      logs: '/Users/Shared/Makhazen/Logs',
      backup: '/Users/Shared/Makhazen/Backup',
      config: '/Users/Shared/Makhazen/Config',
      temp: '/Users/Shared/Makhazen/Temp',
      cache: '/Users/Shared/Makhazen/Cache'
    }
  };

  return paths[currentPlatform] || paths.windows;
};

// بررسی سیستم برای سازگاری
export const validateSystemRequirements = async (systemInfoParam?: SystemInfo, serverConfig?: any): Promise<ValidationResult> => {
  const requirements: SystemRequirement[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  try {
    const systemInfo = systemInfoParam || await getSystemInfo();
    
    // بررسی نسخه Node.js
    const nodeVersion = systemInfo.nodeVersion;
    const requiredNodeVersion = '16.0.0';
    const nodeVersionValid = compareVersions(nodeVersion, requiredNodeVersion) >= 0;
    
    requirements.push({
      name: 'Node.js Version',
      required: true,
      status: nodeVersionValid ? 'met' : 'not_met',
      message: nodeVersionValid ? 'نسخه Node.js مناسب است' : 'نسخه Node.js قدیمی است',
      current: nodeVersion,
      minimum: requiredNodeVersion
    });
    
    // بررسی حافظه رم
    const memoryGB = systemInfo.memory.total / (1024 * 1024 * 1024);
    const requiredMemory = 2; // 2GB minimum
    
    requirements.push({
      name: 'System Memory',
      required: true,
      status: memoryGB >= requiredMemory ? 'met' : 'not_met',
      message: memoryGB >= requiredMemory ? 'حافظه رم کافی است' : 'حافظه رم کافی نیست',
      current: `${memoryGB.toFixed(1)} GB`,
      minimum: `${requiredMemory} GB`
    });
    
    if (memoryGB < 4) {
      warnings.push('برای عملکرد بهتر، حداقل 4 گیگابایت رم توصیه می‌شود');
    }
    
    // بررسی فضای دیسک
    const diskGB = systemInfo.disk.free / (1024 * 1024 * 1024);
    const requiredDiskSpace = 5; // 5GB minimum
    
    requirements.push({
      name: 'Available Disk Space',
      required: true,
      status: diskGB >= requiredDiskSpace ? 'met' : 'not_met',
      message: diskGB >= requiredDiskSpace ? 'فضای دیسک کافی است' : 'فضای دیسک کافی نیست',
      current: `${diskGB.toFixed(1)} GB free`,
      minimum: `${requiredDiskSpace} GB`
    });
    
    // بررسی هسته‌های CPU
    const cpuCores = systemInfo.cpu.cores;
    const requiredCores = 2;
    
    requirements.push({
      name: 'CPU Cores',
      required: false,
      status: cpuCores >= requiredCores ? 'met' : 'warning',
      message: cpuCores >= requiredCores ? 'تعداد هسته‌های CPU مناسب است' : 'تعداد هسته‌های CPU کم است',
      current: `${cpuCores} cores`,
      minimum: `${requiredCores} cores`
    });
    
    // بررسی پلتفرم
    const supportedPlatforms = ['windows', 'linux', 'mac'];
    const platformSupported = supportedPlatforms.includes(systemInfo.platform);
    
    requirements.push({
      name: 'Platform Support',
      required: true,
      status: platformSupported ? 'met' : 'not_met',
      message: platformSupported ? 'پلتفرم پشتیبانی می‌شود' : 'پلتفرم پشتیبانی نمی‌شود',
      current: systemInfo.platform
    });
    
    // محاسبه نتیجه کلی
    const hasErrors = requirements.some(req => req.status === 'not_met');
    const hasWarnings = requirements.some(req => req.status === 'warning') || warnings.length > 0;
    
    return {
      passed: !hasErrors,
      requirements,
      warnings,
      errors: hasErrors ? requirements.filter(req => req.status === 'not_met').map(req => req.message) : []
    };
    
  } catch (error) {
    console.error('خطا در بررسی نیازمندی‌های سیستم:', error);
    
    return {
      passed: false,
      requirements: [],
      warnings: ['خطا در بررسی نیازمندی‌های سیستم'],
      errors: ['بررسی نیازمندی‌ها ناموفق بود']
    };
  }
};

// توابع کمکی

const getPlatform = (): string => {
  if (typeof window !== 'undefined') {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Win') !== -1) return 'windows';
    if (userAgent.indexOf('Mac') !== -1) return 'mac';
    if (userAgent.indexOf('Linux') !== -1) return 'linux';
  }
  // در محیط مرورگر ممکن است process وجود نداشته باشد
  if (typeof process !== 'undefined' && typeof process.platform === 'string') {
    return process.platform;
  }
  return 'windows';
};

const getArchitecture = (): string => {
  if (typeof process !== 'undefined' && typeof process.arch === 'string') {
    return process.arch;
  }
  return 'x64';
};

const getMemoryInfo = async () => {
  // شبیه‌سازی اطلاعات حافظه
  const total = 8 * 1024 * 1024 * 1024; // 8GB
  const used = 4 * 1024 * 1024 * 1024; // 4GB
  const free = total - used;
  
  return { total, used, free };
};

const getCpuInfo = async () => {
  // شبیه‌سازی اطلاعات CPU
  return {
    cores: navigator.hardwareConcurrency || 4,
    model: 'Intel Core i7',
    usage: Math.random() * 100 // تصادفی برای دمو
  };
};

const getDiskInfo = async () => {
  // شبیه‌سازی اطلاعات دیسک
  const total = 500 * 1024 * 1024 * 1024; // 500GB
  const used = 200 * 1024 * 1024 * 1024; // 200GB
  const free = total - used;
  
  return { total, used, free };
};

const getNetworkInfo = async () => {
  // شبیه‌سازی اطلاعات شبکه
  return {
    interfaces: ['Ethernet', 'Wi-Fi'],
    latency: Math.random() * 50 // تصادفی برای دمو
  };
};

const compareVersions = (version1: string, version2: string): number => {
  const parts1 = version1.replace(/[^\d.]/g, '').split('.').map(Number);
  const parts2 = version2.replace(/[^\d.]/g, '').split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
};

// تابع تست اتصال شبکه
export const testNetworkConnection = async (host: string = '8.8.8.8', port: number = 53): Promise<boolean> => {
  try {
    // در عملیات واقعی، این بخش باید از WebRTC یا fetch استفاده کند
    // برای دمو، یک پاسخ تصادفی برمی‌گردانیم
    await new Promise(resolve => setTimeout(resolve, 1000));
    return Math.random() > 0.1; // 90% احتمال موفقیت
  } catch (error) {
    console.error('خطا در تست اتصال شبکه:', error);
    return false;
  }
};

// تابع تست عملکرد سیستم
export const testSystemPerformance = async (): Promise<{
  cpuScore: number;
  memoryScore: number;
  diskScore: number;
  overallScore: number;
}> => {
  try {
    // تست CPU
    const startTime = performance.now();
    // محاسبات ساده برای تست CPU
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }
    const cpuTime = performance.now() - startTime;
    const cpuScore = Math.max(0, Math.min(100, 100 - (cpuTime / 100)));
    
    // شبیه‌سازی نمرات حافظه و دیسک
    const memoryScore = 85 + Math.random() * 10; // 85-95
    const diskScore = 75 + Math.random() * 20; // 75-95
    const overallScore = (cpuScore + memoryScore + diskScore) / 3;
    
    return {
      cpuScore: Math.round(cpuScore),
      memoryScore: Math.round(memoryScore),
      diskScore: Math.round(diskScore),
      overallScore: Math.round(overallScore)
    };
    
  } catch (error) {
    console.error('خطا در تست عملکرد سیستم:', error);
    return {
      cpuScore: 0,
      memoryScore: 0,
      diskScore: 0,
      overallScore: 0
    };
  }
};