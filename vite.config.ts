import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Creates a global process.env object to prevent AI library crashes
      'process.env': {
        ...env,
        NODE_ENV: JSON.stringify(mode),
      },
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        // Correctly maps @ to your src directory
        '@': path.resolve(process.cwd(), './src'),
      }
    }
  };
});
