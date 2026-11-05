import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const VERSION = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')).version

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tailwindcss(), react()],
    define: {
      __APP_VERSION__: JSON.stringify(VERSION),
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL || ''),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
      'import.meta.env.VITE_SOCKET_SECRET': JSON.stringify(env.VITE_SOCKET_SECRET || ''),
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || ''),
    },
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    base: '/',
    build: {
      outDir: 'dist-web',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router'],
            ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          },
        },
      },
    },
    server: { port: 5173, strictPort: true, host: '0.0.0.0' },
  }
})