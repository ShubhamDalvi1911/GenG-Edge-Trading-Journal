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
        if (pathname === '/' || (!pathname.includes('.') && !pathname.startsWith('/api/'))) {
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
  test: {
    environment: 'jsdom',
    globals: true,
  },
} as any);
