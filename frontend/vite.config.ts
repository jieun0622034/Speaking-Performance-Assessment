import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Root .env.local is shared with the backend; only VITE_* values enter client code.
  const root = fileURLToPath(new URL('..', import.meta.url));
  const env = loadEnv(mode, root, '');
  return {
    envDir: root,
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
    server: {
      host: '127.0.0.1',
      port: Number(env.FRONTEND_PORT || 5173),
      strictPort: true,
      proxy: {
        '/api': env.BACKEND_URL || 'http://127.0.0.1:8080',
        '/v3/api-docs': env.BACKEND_URL || 'http://127.0.0.1:8080',
        '/swagger-ui': env.BACKEND_URL || 'http://127.0.0.1:8080',
      },
    },
  };
});
