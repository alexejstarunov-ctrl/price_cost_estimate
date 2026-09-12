import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/price_cost_estimate/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Смета на укладку плитки',
        short_name: 'Смета плитки',
        description: 'Быстрый расчёт стоимости работ и материалов по укладке плитки',
        theme_color: '#1b1f24',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/price_cost_estimate/',
        scope: '/price_cost_estimate/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
      },
    }),
  ],
})
