import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Admin panel runs on different port
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    hmr: {
      port: 5174,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
