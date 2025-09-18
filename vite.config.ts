import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: []
    }
  },
  optimizeDeps: {
    include: ['socket.io-client']
  }
})