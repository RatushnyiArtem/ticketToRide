import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
        rewriteWsOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
        // Handle WebSocket errors gracefully
        onError: (err, req, res) => {
          console.error('Proxy error:', err);
          res.writeHead(503);
          res.end('Service Unavailable');
        },
      },
    },
  },
})