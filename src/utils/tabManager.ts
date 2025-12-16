/**
 * Tab Manager - مدیریت ارتباط بین تب‌های مرورگر
 * برای جلوگیری از باز شدن تب‌های تکراری
 */

const CHANNEL_NAME = 'warehouse-app-tabs';
const TAB_ID_KEY = 'warehouse-tab-id';
const OPEN_TABS_KEY = 'warehouse-open-tabs'; // برای ذخیره لیست تب‌های باز

// Mapping نام منوها برای نمایش در notification
const moduleNames: Record<string, string> = {
  'dashboard': 'داشبورد',
  'base-data': 'اطلاعات پایه',
  'contracts': 'قرار داد ها',
  'warehouse-receipt': 'رسید انبار',
  'warehouse-delivery': 'حواله انبار',
  'Deduction-Addition': 'کسر/اضافه انبار',
  'product-conversion': 'تبدیل کالا',
  'invoice-generation': 'صدور فاکتور',
  'reports': 'گزارشات',
  'inventory-ledger': 'کاردکس موجودی',
  'analytics': 'تحلیل و بررسی',
  'messaging': 'مکاتبات',
  'users': 'مدیریت کاربران',
  'settings': 'تنظیمات'
};

// ایجاد یک ID منحصر به فرد برای این تب
// استفاده از window.name برای ذخیره ID تب (اگر وجود نداشته باشد، یک ID جدید ایجاد می‌کنیم)
const getTabId = (): string => {
  // ابتدا بررسی می‌کنیم که آیا window.name دارای ID است یا نه
  if (window.name && window.name.startsWith('warehouse-tab-')) {
    console.log(`📌 استفاده از ID موجود: ${window.name}`);
    return window.name;
  }
  
  // اگر window.name وجود نداشت یا ID معتبر نبود، یک ID جدید ایجاد می‌کنیم
  const tabId = `warehouse-tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(performance.now() * 1000)}`;
  window.name = tabId;
  
  console.log(`🆕 ایجاد ID جدید برای تب: ${tabId}`);
  
  // همچنین در sessionStorage هم ذخیره می‌کنیم (برای پشتیبانی)
  try {
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  } catch (e) {
    // اگر sessionStorage در دسترس نبود، مشکلی نیست
  }
  
  return tabId;
};

let broadcastChannel: BroadcastChannel | null = null;
let currentModule: string | null = null;
let tabId: string = getTabId();

/**
 * ذخیره اطلاعات تب در localStorage
 */
const saveTabInfo = (module: string) => {
  try {
    const openTabs = JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || '{}');
    openTabs[tabId] = {
      module: module,
      timestamp: Date.now()
    };
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabs));
  } catch (e) {
    console.warn('خطا در ذخیره اطلاعات تب:', e);
  }
};

/**
 * حذف اطلاعات تب از localStorage
 */
const removeTabInfo = () => {
  try {
    const openTabs = JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || '{}');
    delete openTabs[tabId];
    localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabs));
  } catch (e) {
    console.warn('خطا در حذف اطلاعات تب:', e);
  }
};

/**
 * دریافت لیست تب‌های باز با ماژول خاص
 */
const getTabsWithModule = (module: string): string[] => {
  try {
    const openTabs = JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || '{}');
    const tabs: string[] = [];
    
    // پاک کردن تب‌های قدیمی (بیش از 5 دقیقه)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    for (const [id, info] of Object.entries(openTabs)) {
      const tabInfo = info as { module: string; timestamp: number };
      if (id !== tabId && tabInfo.module === module) {
        // اگر تب قدیمی است، حذف کن
        if (now - tabInfo.timestamp > fiveMinutes) {
          delete openTabs[id];
        } else {
          tabs.push(id);
        }
      }
    }
    
    if (Object.keys(openTabs).length !== Object.keys(JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || '{}')).length) {
      localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabs));
    }
    
    return tabs;
  } catch (e) {
    console.warn('خطا در دریافت لیست تب‌ها:', e);
    return [];
  }
};

/**
 * مقداردهی اولیه Tab Manager
 */
export const initTabManager = (module: string, onFocusRequest?: () => void) => {
  currentModule = module;
  saveTabInfo(module);
  
  // ایجاد BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    
    // گوش دادن به پیام‌های دیگر تب‌ها
    broadcastChannel.onmessage = (event) => {
      const { type, data } = event.data;
      
      if (type === 'check-module') {
        // تب دیگری می‌خواهد بداند آیا این تب با ماژول خاصی باز است
        if (currentModule === data.module && tabId !== data.requestingTabId) {
          console.log(`📤 پاسخ به درخواست: تب ${tabId} با ماژول ${currentModule} پیدا شد (درخواست از: ${data.requestingTabId})`);
          // پاسخ بده که این تب با این ماژول باز است
          broadcastChannel?.postMessage({
            type: 'module-found',
            data: {
              module: currentModule,
              tabId: tabId
            },
            requestingTabId: data.requestingTabId
          });
        } else {
          console.log(`🔍 بررسی: تب ${tabId} با ماژول ${currentModule} (درخواست برای: ${data.module}, درخواست از: ${data.requestingTabId})`);
        }
      } else if (type === 'focus-request' && data.tabId === tabId) {
        // درخواست focus به این تب
        console.log(`🎯 درخواست focus به تب ${tabId} دریافت شد`);
        if (onFocusRequest) {
          onFocusRequest();
        }
        
        // استفاده از چند روش برای focus کردن تب
        const focusTab = () => {
          try {
            // روش 1: استفاده از window.focus()
            if (window.focus) {
              window.focus();
            }
            // روش 2: استفاده از document.hasFocus() برای بررسی
            if (!document.hasFocus()) {
              // اگر تب focus نیست، سعی کن focus کنی
              window.focus();
            }
            // روش 3: استفاده از blur و سپس focus
            window.blur();
            window.focus();
          } catch (e) {
            console.warn('خطا در focus کردن تب:', e);
          }
        };
        
        // نمایش زنگوله بزرگ در title
        const originalTitle = document.title;
        document.title = '🔔🔔 ' + originalTitle;
        
        // توقف نمایش زنگوله بعد از 30 ثانیه
        setTimeout(() => {
          document.title = originalTitle;
        }, 30000);
        
        // اجرای فوری
        focusTab();
        
        // اجرای مجدد بعد از delay کوتاه
        setTimeout(focusTab, 50);
        setTimeout(focusTab, 200);
        setTimeout(focusTab, 500);
        setTimeout(focusTab, 1000);
      } else if (type === 'module-registered') {
        // تب دیگری ماژول خود را ثبت کرده است
        console.log(`📋 تب ${data.tabId} با ماژول ${data.module} ثبت شد (تب فعلی: ${tabId})`);
        // به‌روزرسانی localStorage
        try {
          const openTabs = JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || '{}');
          openTabs[data.tabId] = {
            module: data.module,
            timestamp: Date.now()
          };
          localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabs));
        } catch (e) {
          // ignore
        }
      }
    };
    
    // ثبت ماژول این تب - ارسال چند باره برای اطمینان از دریافت توسط تب‌های دیگر
    const registerModule = () => {
      broadcastChannel?.postMessage({
        type: 'module-registered',
        data: {
          tabId: tabId,
          module: currentModule
        }
      });
    };
    
    // ثبت فوری
    registerModule();
    
    // ثبت مجدد بعد از یک delay کوتاه برای اطمینان
    setTimeout(registerModule, 500);
    
    // گوش دادن به storage events برای focus requests
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'warehouse-focus-request' && e.newValue) {
        try {
          const focusEvent = JSON.parse(e.newValue);
          if (focusEvent.tabId === tabId && focusEvent.type === 'focus-tab') {
            console.log(`🎯 درخواست focus از طریق storage event دریافت شد برای تب ${tabId}`);
            setTimeout(() => {
              window.focus();
              window.blur();
              window.focus();
            }, 100);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    // همچنین یک polling mechanism برای بررسی focus requests
    let focusCheckInterval: NodeJS.Timeout | null = null;
    const checkFocusRequest = () => {
      try {
        // بررسی warehouse-focus-request
        const focusRequest = localStorage.getItem('warehouse-focus-request');
        if (focusRequest) {
          const focusEvent = JSON.parse(focusRequest);
          if (focusEvent.tabId === tabId && focusEvent.type === 'focus-tab') {
            // اگر درخواست برای این تب است و کمتر از 2 ثانیه پیش ارسال شده
            if (Date.now() - focusEvent.timestamp < 2000) {
              console.log(`🎯 درخواست focus از طریق polling دریافت شد برای تب ${tabId}`);
              window.focus();
              window.blur();
              window.focus();
              // حذف درخواست
              localStorage.removeItem('warehouse-focus-request');
            }
          }
        }
        
        // بررسی flag focus مخصوص این تب
        const focusFlagKey = `warehouse-focus-${tabId}`;
        const focusFlag = localStorage.getItem(focusFlagKey);
        if (focusFlag) {
          try {
            const flag = JSON.parse(focusFlag);
            const timeDiff = Date.now() - flag.timestamp;
            console.log(`🔍 بررسی flag برای تب ${tabId}: timeDiff=${timeDiff}ms, flag=${JSON.stringify(flag)}`);
            // اگر flag کمتر از 5 ثانیه پیش تنظیم شده (افزایش زمان)
            if (timeDiff < 5000) {
              console.log(`🚩 Flag focus برای تب ${tabId} پیدا شد (${timeDiff}ms پیش)، focus می‌کنیم...`);
              
        // نمایش زنگوله بزرگ در title
        const originalTitle = document.title;
        let flashInterval: NodeJS.Timeout | null = null;
        
        // نمایش زنگوله بزرگ (🔔🔔) به صورت ثابت
        document.title = '🔔🔔 ' + originalTitle;
        
        // ذخیره interval برای تمیز کردن بعداً
        (window as any).__warehouseBellInterval = flashInterval;
        
        // توقف نمایش زنگوله بعد از 30 ثانیه
        setTimeout(() => {
          if (flashInterval) {
            clearInterval(flashInterval);
            flashInterval = null;
          }
          document.title = originalTitle;
        }, 30000);
              
              // فقط زنگوله در title نمایش داده می‌شود، بدون notification
              
              // چند بار سعی می‌کنیم focus کنیم
              const attemptFocus = () => {
                try {
                  window.focus();
                  // استفاده از document.hasFocus() برای بررسی
                  if (!document.hasFocus()) {
                    window.blur();
                    window.focus();
                  }
                } catch (e) {
                  console.warn('خطا در focus کردن تب:', e);
                }
              };
              
              attemptFocus();
              setTimeout(attemptFocus, 10);
              setTimeout(attemptFocus, 50);
              setTimeout(attemptFocus, 100);
              setTimeout(attemptFocus, 200);
              
              // حذف flag
              localStorage.removeItem(`warehouse-focus-${tabId}`);
            } else {
              // اگر flag قدیمی است، حذف کن
              localStorage.removeItem(`warehouse-focus-${tabId}`);
            }
          } catch (e) {
            console.warn('خطا در پردازش flag focus:', e);
          }
        }
      } catch (e) {
        console.warn('خطا در بررسی focus request:', e);
      }
    };
    
    // بررسی هر 20ms برای پاسخ سریع‌تر (کاهش از 50ms به 20ms)
    focusCheckInterval = setInterval(checkFocusRequest, 20);
    
    // همچنین یک بار فوری بررسی کن (کاهش از 100ms به 10ms)
    setTimeout(checkFocusRequest, 10);
    
    // بررسی flag عمومی
    const checkGlobalFocusFlag = () => {
      try {
        const globalFlag = localStorage.getItem('warehouse-focus-active');
        if (globalFlag) {
          const flag = JSON.parse(globalFlag);
          if (flag.targetTabId === tabId) {
            console.log(`🌐 Flag عمومی focus برای تب ${tabId} پیدا شد`);
            // trigger کردن checkFocusRequest
            checkFocusRequest();
          }
        }
      } catch (e) {
        // ignore
      }
    };
    
    // بررسی flag عمومی هر 30ms (کاهش از 100ms به 30ms)
    const globalFlagInterval = setInterval(checkGlobalFocusFlag, 30);
    
    // تمیز کردن interval هنگام بسته شدن تب
    const originalBeforeUnload = window.onbeforeunload;
    window.addEventListener('beforeunload', () => {
      if (globalFlagInterval) {
        clearInterval(globalFlagInterval);
      }
      if (originalBeforeUnload) {
        originalBeforeUnload();
      }
    });
    
    // تمیز کردن هنگام بسته شدن تب
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (focusCheckInterval) {
        clearInterval(focusCheckInterval);
      }
      removeTabInfo();
      broadcastChannel?.close();
    });
  } else {
    // اگر BroadcastChannel در دسترس نبود، فقط storage event را اضافه کن
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'warehouse-focus-request' && e.newValue) {
        try {
          const focusEvent = JSON.parse(e.newValue);
          if (focusEvent.tabId === tabId && focusEvent.type === 'focus-tab') {
            console.log(`🎯 درخواست focus از طریق storage event دریافت شد برای تب ${tabId}`);
            setTimeout(() => {
              window.focus();
              window.blur();
              window.focus();
            }, 100);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    // تمیز کردن هنگام بسته شدن تب
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('storage', handleStorageEvent);
      removeTabInfo();
    });
  }
};

/**
 * به‌روزرسانی ماژول فعلی تب
 */
export const updateTabModule = (module: string) => {
  currentModule = module;
  saveTabInfo(module);
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'module-registered',
      data: {
        tabId: tabId,
        module: currentModule
      }
    });
  }
};

/**
 * بررسی اینکه آیا تب با ماژول خاصی از قبل باز است
 * و در صورت وجود، focus کردن به آن
 */
export const checkAndFocusTab = (module: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // ابتدا بررسی localStorage برای پیدا کردن سریع تب‌های باز
    const tabsWithModule = getTabsWithModule(module);
    if (tabsWithModule.length > 0) {
      console.log(`📋 تب‌های باز با ماژول ${module} در localStorage:`, tabsWithModule);
    }
    
    if (!broadcastChannel) {
      // اگر broadcastChannel وجود ندارد، از localStorage استفاده کن
      if (tabsWithModule.length > 0) {
        // سعی کن از BroadcastChannel استفاده کنی (اگر ممکن باشد)
        setTimeout(() => {
          resolve(false); // اگر broadcastChannel وجود ندارد، نمی‌توانیم focus کنیم
        }, 100);
        return;
      }
      resolve(false);
      return;
    }
    
    let found = false;
    const messageHandler = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      if (type === 'module-found' && data.module === module && data.tabId !== tabId) {
        found = true;
        clearTimeout(timeout);
        if (broadcastChannel) {
          broadcastChannel.removeEventListener('message', messageHandler);
        }
        
        console.log(`✅ تب با ماژول ${module} پیدا شد: ${data.tabId} (تب فعلی: ${tabId})`);
        
        // درخواست focus به تب پیدا شده - استفاده از چند روش
        // روش 1: BroadcastChannel
        broadcastChannel?.postMessage({
          type: 'focus-request',
          data: {
            tabId: data.tabId
          }
        });
        
        // روش 2: استفاده از localStorage event برای اطمینان
        try {
          const focusEvent = {
            type: 'focus-tab',
            tabId: data.tabId,
            timestamp: Date.now()
          };
          localStorage.setItem('warehouse-focus-request', JSON.stringify(focusEvent));
          // حذف فوری برای trigger کردن storage event
          setTimeout(() => {
            localStorage.removeItem('warehouse-focus-request');
          }, 100);
        } catch (e) {
          console.warn('خطا در ارسال focus request از طریق localStorage:', e);
        }
        
        // روش 3: استفاده از window.postMessage برای ارتباط مستقیم
        // این روش نیاز به window reference دارد که نداریم، پس از BroadcastChannel استفاده می‌کنیم
        
        // روش 4: استفاده از یک flag در localStorage که تب مقصد آن را بررسی می‌کند
        try {
          const focusFlag = {
            targetTabId: data.tabId,
            timestamp: Date.now(),
            sourceTabId: tabId,
            module: module
          };
          const flagKey = `warehouse-focus-${data.tabId}`;
          localStorage.setItem(flagKey, JSON.stringify(focusFlag));
          console.log(`🚩 Flag focus برای تب ${data.tabId} تنظیم شد:`, focusFlag);
          
          // همچنین یک flag عمومی برای همه تب‌ها
          localStorage.setItem('warehouse-focus-active', JSON.stringify({
            targetTabId: data.tabId,
            timestamp: Date.now()
          }));
          
          // حذف flag عمومی بعد از 5 ثانیه
          setTimeout(() => {
            localStorage.removeItem('warehouse-focus-active');
          }, 5000);
        } catch (e) {
          console.warn('خطا در تنظیم flag focus:', e);
        }
        
        resolve(true);
      }
    };
    
    const timeout = setTimeout(() => {
      if (!found) {
        console.log(`⏱️ Timeout: تب با ماژول ${module} پیدا نشد (تب فعلی: ${tabId})`);
        if (broadcastChannel) {
          broadcastChannel.removeEventListener('message', messageHandler);
        }
        // اگر در localStorage تب پیدا شد اما پاسخ نگرفتیم، باز هم false برمی‌گردانیم
        // چون نمی‌توانیم focus کنیم
        resolve(false);
      }
    }, 3000); // 3000ms timeout - زمان کافی برای initialize شدن تب‌های جدید و پاسخ دادن تب‌های موجود
    
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', messageHandler);
    }
    
    // یک delay کوتاه برای اطمینان از اینکه تب‌های دیگر آماده دریافت پیام هستند
    setTimeout(() => {
      // ارسال پیام برای بررسی وجود تب با این ماژول
      if (broadcastChannel) {
        console.log(`📨 ارسال درخواست بررسی ماژول ${module} از تب ${tabId}`);
        broadcastChannel.postMessage({
          type: 'check-module',
          data: {
            module: module,
            requestingTabId: tabId
          }
        });
      }
    }, 200); // 200ms delay برای اطمینان از initialize شدن تب‌های دیگر
  });
};

/**
 * دریافت ماژول فعلی تب
 */
export const getCurrentModule = (): string | null => {
  return currentModule;
};

/**
 * تمیز کردن منابع
 */
export const cleanupTabManager = () => {
  removeTabInfo();
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
};

