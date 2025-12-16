/**
 * سیستم مدیریت مرکزی API Endpoints
 * این ماژول مسئول مدیریت و ساخت URL های API بر اساس تنظیمات سرور است
 */

import { AppSettings } from '../components/Contracts/SettingsContext';

// کش برای تنظیمات API
let cachedApiConfig: {
  baseUrl: string;
  protocol: string;
  hostname: string;
  port: number;
  apiPath: string;
} | null = null;

/**
 * دریافت تنظیمات API از localStorage یا تنظیمات پیش‌فرض
 */
const getApiConfigFromSettings = (): {
  baseUrl: string;
  protocol: string;
  hostname: string;
  port: number;
  apiPath: string;
} => {
  try {
    const settingsJson = localStorage.getItem('tanksystem_settings');
    if (settingsJson) {
      const settings: AppSettings = JSON.parse(settingsJson);
      
      if (settings?.server) {
        const server = settings.server;
        const protocol = server.sslEnabled ? 'https' : (server.protocol || 'http');
        const hostname = server.serverAddress || server.hostname || 'localhost';
        const port = server.serverPort || server.port || (protocol === 'https' ? 443 : 3000);
        const apiPath = '/api'; // مسیر پیش‌فرض API
        
        // ساخت URL کامل
        let baseUrl = `${protocol}://${hostname}`;
        if ((protocol === 'http' && port !== 80) || (protocol === 'https' && port !== 443)) {
          baseUrl += `:${port}`;
        }
        baseUrl += apiPath;
        
        return {
          baseUrl,
          protocol,
          hostname,
          port,
          apiPath
        };
      }
    }
  } catch (error) {
    console.warn('خطا در خواندن تنظیمات API:', error);
  }
  
  // تنظیمات پیش‌فرض
  const defaultProtocol = 'http';
  const defaultHostname = 'localhost';
  const defaultPort = 3000;
  const defaultApiPath = '/api';
  
  return {
    baseUrl: `${defaultProtocol}://${defaultHostname}:${defaultPort}${defaultApiPath}`,
    protocol: defaultProtocol,
    hostname: defaultHostname,
    port: defaultPort,
    apiPath: defaultApiPath
  };
};

/**
 * دریافت URL پایه API
 * این تابع از تنظیمات سرور استفاده می‌کند یا از environment variables
 */
export const getApiBaseUrl = (): string => {
  // اولویت 1: تنظیمات ذخیره شده در localStorage
  const settingsConfig = getApiConfigFromSettings();
  
  // اولویت 2: Environment variables (برای development)
  const envApiUrl = 
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      ((import.meta as any).env.VITE_API_URL || 
       (import.meta as any).env.VITE_SETTINGS_API_URL)) ||
    null;
  
  if (envApiUrl) {
    return envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl}/api`;
  }
  
  // اولویت 3: تنظیمات از localStorage
  return settingsConfig.baseUrl;
};

/**
 * ساخت URL کامل برای endpoint خاص
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * دریافت تنظیمات کامل API
 */
export const getApiConfig = () => {
  if (cachedApiConfig) {
    return cachedApiConfig;
  }
  
  cachedApiConfig = getApiConfigFromSettings();
  return cachedApiConfig;
};

/**
 * به‌روزرسانی کش تنظیمات API
 */
export const refreshApiConfig = () => {
  cachedApiConfig = null;
  getApiConfig();
};

/**
 * تست اتصال به API
 */
export const testApiConnection = async (customUrl?: string): Promise<{
  success: boolean;
  responseTime?: number;
  error?: string;
  details?: any;
}> => {
  const testUrl = customUrl || buildApiUrl('/health');
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: true,
        responseTime,
        details: {
          status: response.status,
          statusText: response.statusText,
          data
        }
      };
    } else {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText
        }
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      error: error.name === 'AbortError' 
        ? 'Timeout: سرور پاسخ نداد' 
        : error.message || 'خطای ناشناخته در اتصال',
      details: {
        error: error.toString()
      }
    };
  }
};

/**
 * تشخیص خودکار آدرس سرور در شبکه محلی
 * این تابع سعی می‌کند آدرس IP محلی را پیدا کند
 */
export const detectLocalNetworkAddress = async (): Promise<string[]> => {
  const addresses: string[] = [];
  
  try {
    // در مرورگر، نمی‌توانیم مستقیماً IP را بگیریم
    // اما می‌توانیم از WebRTC استفاده کنیم
    // برای حال حاضر، از hostname استفاده می‌کنیم
    
    // اگر در محیط Node.js هستیم (Electron)
    if (typeof window !== 'undefined' && (window as any).require) {
      try {
        const os = (window as any).require('os');
        const networkInterfaces = os.networkInterfaces();
        
        for (const interfaceName in networkInterfaces) {
          const interfaces = networkInterfaces[interfaceName];
          if (interfaces) {
            for (const iface of interfaces) {
              if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
              }
            }
          }
        }
      } catch (e) {
        console.warn('خطا در تشخیص آدرس شبکه:', e);
      }
    }
    
    // اضافه کردن localhost
    addresses.push('localhost', '127.0.0.1');
    
    // اضافه کردن hostname
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname && !addresses.includes(hostname)) {
        addresses.push(hostname);
      }
    }
  } catch (error) {
    console.warn('خطا در تشخیص آدرس شبکه:', error);
    addresses.push('localhost', '127.0.0.1');
  }
  
  return addresses.length > 0 ? addresses : ['localhost', '127.0.0.1'];
};

/**
 * جستجوی خودکار سرور در شبکه
 * این تابع سعی می‌کند سرور را در پورت‌های مختلف پیدا کند
 */
export const discoverServerInNetwork = async (
  hostnames: string[] = ['localhost'],
  ports: number[] = [3000, 3001, 8080, 5000]
): Promise<{
  hostname: string;
  port: number;
  protocol: string;
  success: boolean;
} | null> => {
  for (const hostname of hostnames) {
    for (const port of ports) {
      // تست HTTP
      const httpUrl = `http://${hostname}:${port}/api/health`;
      const httpTest = await testApiConnection(httpUrl);
      
      if (httpTest.success) {
        return {
          hostname,
          port,
          protocol: 'http',
          success: true
        };
      }
      
      // تست HTTPS
      const httpsUrl = `https://${hostname}:${port}/api/health`;
      const httpsTest = await testApiConnection(httpsUrl);
      
      if (httpsTest.success) {
        return {
          hostname,
          port,
          protocol: 'https',
          success: true
        };
      }
    }
  }
  
  return null;
};

/**
 * ساخت درخواست fetch با تنظیمات پیش‌فرض
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  return fetch(url, defaultOptions);
};

/**
 * دریافت تنظیمات API به صورت کامل برای نمایش
 */
export const getApiConfigForDisplay = () => {
  const config = getApiConfig();
  return {
    baseUrl: config.baseUrl,
    protocol: config.protocol,
    hostname: config.hostname,
    port: config.port,
    apiPath: config.apiPath,
    fullUrl: config.baseUrl
  };
};

// گوش دادن به تغییرات تنظیمات
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'tanksystem_settings') {
      refreshApiConfig();
    }
  });
  
  window.addEventListener('settingsUpdated', () => {
    refreshApiConfig();
  });
}

