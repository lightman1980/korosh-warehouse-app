import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite Configuration - Updated to force reload
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfjs-dist', 'tesseract.js']
  },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
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
    // کپی کردن فایل‌های public به dist (شامل .htaccess)
    copyPublicDir: true,
  },
  // Vite به صورت خودکار فایل‌های public را کپی می‌کند
  publicDir: 'public',
});
