import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/database'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
  },
  server: {
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proxy.on('error', (_err) => {
            // Proxy error handling (intentionally silent)
          });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proxy.on('proxyReq', (_proxyReq, _req) => {
            // Proxy request logging (intentionally silent)
          });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          proxy.on('proxyRes', (_proxyRes) => {
            // Proxy response logging (intentionally silent)
          });
        },
      },
    },
  },
});
