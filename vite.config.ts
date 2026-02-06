import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/food-tracker/' : '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5001,
        proxy: {
            '/api/off': {
                target: 'https://world.openfoodfacts.org',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/off/, '/api/v2'),
            },
        },
    },
}));
