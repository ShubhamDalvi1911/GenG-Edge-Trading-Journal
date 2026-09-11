/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  appType: 'spa',
  plugins: [react(), {
    name: 'serve-root-index',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const rootRequest = request as typeof request & { url?: string };
        const pathname = rootRequest.url?.split('?')[0] ?? '/';
        const isViteInternalRequest = pathname.startsWith('/@vite/') || pathname.startsWith('/@react-refresh');
        if (!isViteInternalRequest && (pathname === '/' || (!pathname.includes('.') && !pathname.startsWith('/api/')))) {
          rootRequest.url = '/index.html';
        }
        next();
      });
    },
  }],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
} as any);
