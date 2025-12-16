import { useEffect } from 'react';
import { 
  checkAndUpdate, 
  startVersionChecker, 
  setupAutoReload,
  saveCurrentVersion 
} from '../utils/versionManager';

/**
 * Hook برای چک کردن نسخه و به‌روزرسانی خودکار
 */
export function useVersionChecker(options: {
  enabled?: boolean;
  checkInterval?: number;
  autoReload?: boolean;
} = {}) {
  const {
    enabled = true,
    checkInterval = import.meta.env.DEV ? 300000 : 60000, // 5 دقیقه در dev، 60 ثانیه در prod
    autoReload = true
  } = options;

  useEffect(() => {
    if (!enabled) return;

    // ذخیره نسخه فعلی در اولین بار
    saveCurrentVersion();

    // در حالت development، Vite HMR خودش به‌روزرسانی می‌کند
    // اما برای اطمینان، چک اولیه را انجام می‌دهیم
    if (!import.meta.env.DEV) {
      // چک اولیه فقط در production
      checkAndUpdate().catch(console.error);
      
      // راه‌اندازی چک دوره‌ای فقط در production
      const stopChecker = startVersionChecker(checkInterval);
      
      return () => {
        stopChecker();
      };
    } else {
      // در development، فقط auto-reload را راه‌اندازی می‌کنیم
      if (autoReload) {
        setupAutoReload();
      }
    }
  }, [enabled, checkInterval, autoReload]);
}
