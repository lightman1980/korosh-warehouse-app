// settingsRemote.ts - ارتباط با سرور تنظیمات (SQLite API)
// این ماژول مسئول ذخیره و بارگذاری تنظیمات در سرور است.

import { getApiBaseUrl, buildApiUrl } from './apiConfig';

// دریافت شناسه کاربر فعلی (در صورت نبود، از default_user استفاده می‌کنیم)
const getCurrentUserId = (): string => {
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const parsed = JSON.parse(currentUser);
      return parsed.username || 'default_user';
    }
  } catch (error) {
    console.warn('خطا در دریافت ID کاربر برای تنظیمات:', error);
  }
  return 'default_user';
};

// تست دسترسی به API
export const isSettingsApiAvailable = async (): Promise<boolean> => {
  try {
    const healthUrl = buildApiUrl('/health');
    const response = await fetch(healthUrl);
    return response.ok;
  } catch (error) {
    console.warn('Settings API در دسترس نیست:', error);
    return false;
  }
};

// ذخیره کل تنظیمات برنامه در سرور
// توجه: برای جلوگیری از وابستگی به تایپ داخلی AppSettings، از any استفاده می‌کنیم
export const saveAppSettingsToServer = async (settings: any): Promise<boolean> => {
  if (!settings) return false;

  const apiAvailable = await isSettingsApiAvailable();
  if (!apiAvailable) return false;

  try {
    const userId = getCurrentUserId();

    // ساختار ذخیره‌سازی در دیتابیس:
    // category = "app" , key = "settings" , value = کل آبجکت تنظیمات
    const payload = {
      settings: {
        app: {
          settings,
        },
      },
    };

    const settingsUrl = buildApiUrl(`/settings/${userId}`);
    const response = await fetch(settingsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('خطا در ذخیره تنظیمات در سرور:', await response.text());
      return false;
    }

    const result = await response.json();
    if (!result.success) {
      console.warn('ذخیره تنظیمات در سرور موفق نبود:', result);
      return false;
    }

    console.log(
      `✅ تنظیمات در سرور ذخیره شد (app.settings) - ${result.savedCount ?? 'n/a'}/${
        result.totalCount ?? 'n/a'
      } مورد`
    );
    return true;
  } catch (error) {
    console.error('خطای ذخیره تنظیمات در سرور:', error);
    return false;
  }
};

// بارگذاری تنظیمات از سرور (اگر وجود داشته باشد)
export const loadAppSettingsFromServer = async (): Promise<any | null> => {
  const apiAvailable = await isSettingsApiAvailable();
  if (!apiAvailable) return null;

  try {
    const userId = getCurrentUserId();
    const settingsUrl = buildApiUrl(`/settings/${userId}`);
    const response = await fetch(settingsUrl);

    if (!response.ok) {
      console.warn('خطا در دریافت تنظیمات از سرور:', await response.text());
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      return null;
    }

    // انتظار داریم ساختار به صورت data.app.settings باشد
    const remoteSettings = result.data?.app?.settings;
    if (!remoteSettings || typeof remoteSettings !== 'object') {
      return null;
    }

    console.log('📥 تنظیمات از سرور بارگذاری شد (app.settings)');
    return remoteSettings;
  } catch (error) {
    console.error('خطای بارگذاری تنظیمات از سرور:', error);
    return null;
  }
};


