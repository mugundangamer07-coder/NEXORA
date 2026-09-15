import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // So `npm run preview` (a local production-build smoke test) can reach the
  // API too — `vite preview` doesn't inherit server.proxy.
  preview: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
