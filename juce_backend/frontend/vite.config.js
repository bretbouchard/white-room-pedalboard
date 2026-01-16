var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
var backendOrigin = process.env.VITE_BACKEND_ORIGIN || 'http://localhost:8350';
var backendWsOrigin = backendOrigin.replace(/^http(s?):/, 'ws$1:');
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    define: {
        'process.env': {},
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        global: 'globalThis',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/stores': path.resolve(__dirname, './src/stores'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            'shared': path.resolve(__dirname, '../sdk/packages/shared/src'),
            'core': path.resolve(__dirname, '../sdk/packages/core/src'),
            'gateway': path.resolve(__dirname, '../sdk/packages/gateway/src'),
            'analysis': path.resolve(__dirname, '../sdk/packages/analysis/src'),
            'audio': path.resolve(__dirname, '../sdk/packages/audio/src'),
            'admin': path.resolve(__dirname, '../sdk/packages/admin/src'),
            'generation': path.resolve(__dirname, '../sdk/packages/generation/src'),
        },
    },
    server: __assign(__assign({ port: 3000, host: true, 
        // Ensure file changes inside Docker trigger rebuilds
        watch: {
            usePolling: true,
            interval: 100,
        } }, (process.env.VITE_HMR_CLIENT_PORT
        ? {
            hmr: {
                clientPort: Number(process.env.VITE_HMR_CLIENT_PORT),
                host: process.env.VITE_HMR_CLIENT_HOST || 'localhost',
            },
        }
        : {})), { proxy: {
            '/api': {
                target: backendOrigin,
                changeOrigin: true,
                secure: false,
            },
            '/admin': {
                target: backendOrigin,
                changeOrigin: true,
                secure: false,
            },
            '/ws': {
                target: backendWsOrigin,
                ws: true,
                changeOrigin: true,
            },
        } }),
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    query: ['@tanstack/react-query'],
                    state: ['zustand'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand'],
    },
});
