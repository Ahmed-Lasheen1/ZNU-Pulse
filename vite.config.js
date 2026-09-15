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
        // PERF: isolates rarely-changing vendor code into its own
        // chunks so a normal app-code deploy doesn't force visitors to
        // re-download React/Framer Motion/Supabase every time — pure
        // build-output/caching change, doesn't affect what loads on
        // which route (routes are already split via React.lazy).
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
