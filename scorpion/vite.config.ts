import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@vladmandic')) return 'face-api';
            if (id.includes('@tanstack')) return 'query';
            if (id.includes('@radix-ui')) return 'ui';
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'forms';
            if (id.includes('react-dom') || id.includes('react-router')) return 'react';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
