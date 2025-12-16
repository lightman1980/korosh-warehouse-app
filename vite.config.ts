import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfjs-dist', 'tesseract.js']
  },
    server: {
      host: '0.0.0.0', // گوش دادن به همه آدرس‌ها (IPv4 و IPv6)
      port: 5174,
      strictPort: false, // پورت را ثابت نگه دار؛ اگر مشغول بود خطا بده
    // فعال‌سازی HMR overlay و بهبود پایش فایل‌ها برای ویندوز/فایل‌سیستم‌های خاص
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 200,
    },
    // هدرهای ضد کش برای توسعه تا مرورگر محتوا را نگه ندارد
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  define: {
    // اضافه کردن build time برای version checking
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().getTime().toString()),
  },
  build: {
    // غیرفعال کردن minification برای development (اختیاری)
    minify: 'esbuild',
    // اضافه کردن sourcemap برای debugging
    sourcemap: false,
  },
});
