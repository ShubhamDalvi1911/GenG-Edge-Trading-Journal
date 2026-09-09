/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    appType: 'spa',
    plugins: [react(), {
            name: 'serve-root-index',
            configureServer: function (server) {
                server.middlewares.use(function (request, response, next) {
                    var _a, _b;
                    var rootRequest = request;
                    var pathname = (_b = (_a = rootRequest.url) === null || _a === void 0 ? void 0 : _a.split('?')[0]) !== null && _b !== void 0 ? _b : '/';
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
});
