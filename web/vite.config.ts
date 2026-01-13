import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // NOTE: Ensure this matches your GitHub repo name (e.g., '/planning/' or '/planning-app/')
    base: '/planning/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@shared': path.resolve(__dirname, '../shared'),
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      fs: {
        allow: ['..']
      }
    }
  };
});