import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()],
    server: {
      proxy: {
        "/api/video": {
          target: "http://localhost:5000", // Backend server URL
          changeOrigin: true,
          secure: false,
        },
      },
    },
})
