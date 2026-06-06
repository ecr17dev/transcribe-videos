import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const SERVER_PORT = process.env.SERVER_PORT || '6969'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
    },
  },
})