import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true, // 👈 permite acessar pelo IP da tua rede
    port: 5173, // opcional, mas bom deixar explícito
    proxy: {
      '/api': 'http://localhost:3000' // 👈 redireciona chamadas pro back-end
    }
  }
})
