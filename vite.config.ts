import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
        // 1. 设置基础路径：替换为你的新 GitHub 仓库名，例如 '/livetrack-jp/'
        base: '/LiveTrack-JP/', 

        server: {
            port: 3000,
            host: '0.0.0.0',
        },

        // 2. 设置打包输出目录为 docs
        build: {
            outDir: 'docs',
            emptyOutDir: true, // 确保每次打包都会清空旧文件
        },

        plugins: [react()],

        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },

        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});