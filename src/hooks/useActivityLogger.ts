import { useEffect, useRef } from 'react';
import { logUserActivity } from '../utils/logger';

export const useModuleChangeLogger = (activeModule: string, moduleName: string) => {
  const lastModule = useRef<string | null>(null);

  useEffect(() => {
    if (activeModule && activeModule !== lastModule.current) {
      logUserActivity({
        action: `ورود به ماژول ${moduleName}`,
        category: 'سیستم',
        page: moduleName,
        status: 'success',
        logNature: 'تغییر ماژول'
      });
      lastModule.current = activeModule;
    }
  }, [activeModule, moduleName]);
};

export const logLoginAction = (username: string, success: boolean) => {
  logUserActivity({
    action: success ? `ورود موفق کاربر: ${username}` : `تلاش ناموفق برای ورود: ${username}`,
    category: 'امنیت',
    status: success ? 'success' : 'failed',
    logNature: 'ورود',
    details: { username }
  });
};

export const logLogoutAction = (username: string) => {
  logUserActivity({
    action: `خروج کاربر: ${username}`,
    category: 'امنیت',
    status: 'success',
    logNature: 'خروج',
    details: { username }
  });
};

export const logSaveAction = (moduleName: string, identifier: string, details?: any, oldValue?: any, newValue?: any) => {
  logUserActivity({
    action: `ویرایش ${moduleName}: ${identifier}`,
    category: moduleName,
    page: moduleName,
    status: 'success',
    logNature: 'ویرایش',
    details,
    oldValue,
    newValue
  });
};

export const logCreateAction = (moduleName: string, identifier: string, details?: any) => {
  logUserActivity({
    action: `ایجاد ${moduleName} جدید: ${identifier}`,
    category: moduleName,
    page: moduleName,
    status: 'success',
    logNature: 'ایجاد',
    details
  });
};

export const logDeleteAction = (moduleName: string, identifier: string, details?: any) => {
  logUserActivity({
    action: `حذف ${moduleName}: ${identifier}`,
    category: moduleName,
    page: moduleName,
    status: 'warning',
    logNature: 'حذف',
    details
  });
};
