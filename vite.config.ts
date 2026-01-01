import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 1. 添加这一行，确保打包后的资源路径是相对路径，解决 GitHub Pages 空白页问题
      base: './', 

      server: {
        port: 3000,
        host: '0.0.0.0',
      },

      // 2. 添加这个 build 配置，强制让打包结果输出到 docs 文件夹
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