import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1' },
  build: {
    sourcemap: false,
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 20 },
            { name: 'supabase-vendor', test: /[\\/]node_modules[\\/]@supabase[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
});
