import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy': 'http://localhost:3001',
      '/get-token': 'http://localhost:3001',
    }
  }
})
