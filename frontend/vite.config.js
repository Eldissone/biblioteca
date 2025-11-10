import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,  // permite acessar pelo IP da rede
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
