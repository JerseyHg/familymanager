import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/familymanager/',
  server: {
    proxy: {
      '/familymanager/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/familymanager/, ''),
      },
    },
  },
})
