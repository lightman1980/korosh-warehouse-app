import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { saveCurrentVersion, checkAndUpdate } from './utils/versionManager';

// چک کردن نسخه در شروع برنامه
(async () => {
  // ذخیره نسخه فعلی در اولین بار
  saveCurrentVersion();
  
  // در حالت development، Vite HMR خودش کار می‌کند
  // در production، چک می‌کنیم که آیا نسخه تغییر کرده یا نه
  if (!import.meta.env.DEV) {
    // چک کردن نسخه و به‌روزرسانی در صورت نیاز (فقط در production)
    const shouldReload = await checkAndUpdate();
    
    if (shouldReload) {
      // اگر باید reload شود، صفحه رفرش می‌شود و این کد دوباره اجرا می‌شود
      return;
    }
  }
  
  // اجرای برنامه
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
})();
