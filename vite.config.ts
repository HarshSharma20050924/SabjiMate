import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url';

// Helper to get __dirname equivalent in an ES Module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Monorepo package aliases
      '@common': path.resolve(__dirname, 'packages/common'),
      '@client': path.resolve(__dirname, 'packages/client'),
      '@driver': path.resolve(__dirname, 'packages/driver'),
      '@admin': path.resolve(__dirname, 'packages/admin'),
    },
    // This is the idiomatic way to solve duplicate dependency issues in monorepos.
    // It ensures that only one instance of these packages is ever used.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    proxy: {
      // This tells Vite to forward any request starting with /api
      // to your backend server running on port 3001.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,      
      },
      // Proxy WebSocket connections on the /socket path to the backend server
      '/socket': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    }
  },
  build: {
    rollupOptions: {
      // We are now resolving the paths relative to the directory of this
      // vite.config.ts file (__dirname), which is much more reliable
      // than process.cwd() in monorepo or CI/CD environments.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        driver: path.resolve(__dirname, 'driver.html'), 
      },
      output: {
        manualChunks: {
            // Split vendor code into separate chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-maps': ['leaflet'],
            'vendor-charts': ['recharts'],
            'vendor-utils': ['lodash', 'date-fns'], // If you use these
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
  },
})