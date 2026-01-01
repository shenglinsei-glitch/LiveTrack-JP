import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './', // 确保使用相对路径
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // 👇 关键：强制让 Vite 把结果吐到 docs 文件夹
      build: {
        outDir: 'docs',
        emptyOutDir: true, // 打包前清空旧的 docs
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