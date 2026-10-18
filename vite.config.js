import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// StockTwits' public API does not send CORS headers, so browser calls must go
// through a proxy. In development Vite proxies /api/stocktwits -> api.stocktwits.com.
// For production, mirror this rule in your host (see README "Deploying").
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/stocktwits': {
        target: 'https://api.stocktwits.com/api/2',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/stocktwits/, ''),
      },
    },
  },
})
