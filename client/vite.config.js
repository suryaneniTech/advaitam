import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY || 'http://localhost:3035';
  const hostelApiTarget = env.VITE_HOSTEL_API_PROXY || apiTarget;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@hostel': path.resolve(__dirname, './src/hostel'),
      },
    },
    server: {
      port: 5173,
      allowedHosts: ['.ngrok-free.dev', '.ngrok.io'],
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/hostel-api': {
          target: hostelApiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
