import path from 'path';
import { defineConfig, loadEnv } from 'vite'; // 👈 报错就是因为缺了这里的 defineConfig
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 使用相对路径，这样无论你的 GitHub 仓库叫什么名字都能跑通
      base: './', 

      server: {
        port: 3000,
        host: '0.0.0.0',
      },

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