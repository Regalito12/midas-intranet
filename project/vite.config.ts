import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    allowedHosts: true,
    host: true,
    hmr: {
      protocol: 'wss',
      host: '172.16.45.2',
    },
    proxy: {
      '/api': {
        target: 'http://172.16.45.2:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
