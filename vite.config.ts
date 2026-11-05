import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import { readFileSync } from 'fs'

// Un seul numéro de version : celui de package.json (installeur et application).
const VERSION = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')).version

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    electron({
      entry: './electron/main.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  base: './',
  build: {
    outDir: 'dist',
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
  server: {
    port: 5173,
    strictPort: true,
  },
})