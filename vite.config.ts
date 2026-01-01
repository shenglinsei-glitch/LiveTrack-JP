import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 1. 确保相对路径，防止 GitHub Pages 路径错误
      base: './', 

      server: {
        port: 3000,
        host: '0.0.0.0',
      },

      // 2. 关键：强制输出到 docs 文件夹
      build: {
        outDir: 'docs',
        emptyOutDir: true,
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