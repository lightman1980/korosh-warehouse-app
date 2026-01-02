import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite Configuration - GitHub Pages + dev
export default defineConfig({
  // برای GitHub Pages، چون سایت در زیرمسیر /korosh-warehouse-app/ سرو می‌شود
  base: '/korosh-warehouse-app/',

  plugins: [react()],

  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['pdfjs-dist', 'tesseract.js'],
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
    // فقط در dev استفاده می‌شود و روی GitHub Pages اثری ندارد
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
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(
      new Date().getTime().toString(),
    ),
  },

  build: {
    minify: 'esbuild',
    sourcemap: false,
    copyPublicDir: true,
  },

  publicDir: 'public',
});
