/**
 * سیستم مدیریت نسخه و به‌روزرسانی خودکار
 * این سیستم به صورت خودکار تغییرات در کدها را تشخیص می‌دهد و کش را پاک می‌کند
 */

const VERSION_KEY = 'app_version';
const BUILD_TIME_KEY = 'app_build_time';
const VERSION_CHECK_INTERVAL = 60000; // چک هر 60 ثانیه

// دریافت نسخه فعلی از package.json یا timestamp
export function getCurrentVersion(): string {
  // در حالت development از timestamp استفاده می‌کنیم
  // در production می‌توانید از build time استفاده کنید
  
  // تلاش برای خواندن از meta tag
  let buildTime = import.meta.env.VITE_BUILD_TIME;
  
  if (!buildTime) {
    try {
      // در حالت browser، از meta tag یا document می‌خوانیم
      if (typeof document !== 'undefined') {
        const buildTimeMeta = document.querySelector('meta[name="build-time"]');
        if (buildTimeMeta) {
          buildTime = buildTimeMeta.getAttribute('content');
        }
      }
      
      // اگر هنوز buildTime نداریم، از timestamp استفاده می‌کنیم
      if (!buildTime) {
        buildTime = new Date().getTime().toString();
      }
    } catch (e) {
      buildTime = new Date().getTime().toString();
    }
  }
  
  // در development، از یک مقدار ثابت استفاده می‌کنیم تا جلوی لوپ رفرش گرفته شود
  const versionHash = import.meta.env.DEV 
    ? `dev-stable`
    : `${buildTime || new Date().getTime()}-prod`;
  
  // در development، می‌توانیم از hash فایل main استفاده کنیم
  // اما برای سادگی، از buildTime استفاده می‌کنیم که در هر dev server restart تغییر می‌کند
  return `v1.0.0-${versionHash}`;
}

// دریافت نسخه ذخیره شده
export function getStoredVersion(): string | null {
  return localStorage.getItem(VERSION_KEY);
}

// ذخیره نسخه فعلی
export function saveCurrentVersion(): void {
  const version = getCurrentVersion();
  localStorage.setItem(VERSION_KEY, version);
  localStorage.setItem(BUILD_TIME_KEY, new Date().toISOString());
  console.log('📌 نسخه فعلی برنامه ذخیره شد:', version);
}

// بررسی آیا نسخه تغییر کرده است
export function hasVersionChanged(): boolean {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();
  
  if (!storedVersion) {
    // اولین بار که برنامه اجرا می‌شود
    saveCurrentVersion();
    return false;
  }
  
  return currentVersion !== storedVersion;
}

// پاک کردن تمام کش‌ها
export async function clearAllCache(): Promise<void> {
  try {
    console.log('🧹 در حال پاک کردن کش...');
    
    // پاک کردن localStorage (فقط داده‌های کش، نه داده‌های کاربر)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('cache_') ||
        key.startsWith('temp_') ||
        key.startsWith('session_') ||
        key.includes('_cache')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // پاک کردن service worker cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('🗑️ پاک کردن کش:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }
    
    // پاک کردن IndexedDB cache (نه همه دیتابیس‌ها)
    if ('indexedDB' in window) {
      try {
        const databases = await indexedDB.databases();
        databases.forEach(db => {
          if (db.name && (
            db.name.includes('cache') ||
            db.name.includes('temp') ||
            db.name.startsWith('vite-')
          )) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (error) {
        console.warn('خطا در پاک کردن IndexedDB:', error);
      }
    }
    
    console.log('✅ کش با موفقیت پاک شد');
  } catch (error) {
    console.error('❌ خطا در پاک کردن کش:', error);
  }
}

// رفرش صفحه با پاک کردن کش
export async function reloadWithCacheClear(): Promise<void> {
  await clearAllCache();
  
  // ذخیره نسخه جدید
  saveCurrentVersion();
  
  // رفرش صفحه
  console.log('🔄 در حال رفرش صفحه...');
  window.location.reload();
}

// چک کردن نسخه و به‌روزرسانی خودکار
export async function checkAndUpdate(): Promise<boolean> {
  if (hasVersionChanged()) {
    console.log('🆕 نسخه جدید برنامه شناسایی شد!');
    
    // نمایش پیام به کاربر
    const shouldUpdate = confirm(
      'نسخه جدید برنامه شناسایی شد. آیا می‌خواهید برنامه به‌روزرسانی شود؟\n\n' +
      'نکته: داده‌های شما حفظ خواهد شد.'
    );
    
    if (shouldUpdate) {
      await reloadWithCacheClear();
      return true;
    } else {
      // اگر کاربر cancel کرد، نسخه را به‌روز کن تا دوباره سوال نکند
      saveCurrentVersion();
      return false;
    }
  }
  
  return false;
}

// شروع چک دوره‌ای نسخه
export function startVersionChecker(interval: number = VERSION_CHECK_INTERVAL): () => void {
  console.log('🔍 شروع چک دوره‌ای نسخه...');
  
  // چک اولیه
  checkAndUpdate().catch(console.error);
  
  // چک دوره‌ای
  const intervalId = setInterval(() => {
    checkAndUpdate().catch(console.error);
  }, interval);
  
  // برگرداندن تابع برای توقف
  return () => {
    clearInterval(intervalId);
    console.log('⏹️ چک دوره‌ای نسخه متوقف شد');
  };
}

// رفرش خودکار صفحه هنگام تغییر فایل‌ها (فقط در development)
export function setupAutoReload(): void {
  if (import.meta.env.DEV && import.meta.hot) {
    // استفاده از Vite HMR برای به‌روزرسانی خودکار
    import.meta.hot.on('vite:beforeUpdate', () => {
      console.log('🔄 به‌روزرسانی کد شناسایی شد، در حال به‌روزرسانی...');
      // HMR خودکار به‌روزرسانی می‌کند، نیازی به reload نیست
    });
    
    // چک کردن تغییرات در main.tsx یا index.html
    // که باعث reload کامل شود نه HMR
    import.meta.hot.on('vite:beforeFullReload', () => {
      console.log('🔄 نیاز به reload کامل صفحه...');
      // اینجا می‌توانیم کش را پاک کنیم
      clearAllCache().catch(console.error);
    });
    
    // در حالت development، هر 30 ثانیه یک بار version را چک می‌کنیم
    // که اگر فایل‌های مهم تغییر کردند، کش را پاک کنیم
    let lastVersionCheck = Date.now();
    const checkInterval = setInterval(() => {
      const currentTime = Date.now();
      // اگر بیش از 5 دقیقه از آخرین check گذشته باشد، version را به‌روز کنیم
      if (currentTime - lastVersionCheck > 300000) {
        // به‌روز کردن version برای force reload در صورت نیاز
        const newVersion = getCurrentVersion();
        const storedVersion = getStoredVersion();
        
        // اگر version در localStorage وجود ندارد یا تغییر کرده، آن را به‌روز کن
        if (!storedVersion || storedVersion !== newVersion) {
          console.log('🔄 نسخه تغییر کرده، کش را پاک می‌کنیم...');
          clearAllCache().then(() => {
            saveCurrentVersion();
          }).catch(console.error);
        }
        
        lastVersionCheck = currentTime;
      }
    }, 30000); // چک هر 30 ثانیه
    
    // Cleanup
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(checkInterval);
      });
    }
  }
}
