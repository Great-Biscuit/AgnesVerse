import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function fixUToolsHtml() {
  return {
    name: 'fix-utools-html',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script\s+type="module"\s+crossorigin\s+src=/g, '<script defer src=')
        .replace(/<link\s+rel="stylesheet"\s+crossorigin\s+href=/g, '<link rel="stylesheet" href=')
    }
  }
}

export default defineConfig({
  plugins: [vue(), fixUToolsHtml()],
  base: './',
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  server: {
    proxy: {
      '/agnes-api': {
        target: 'https://apihub.agnes-ai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/agnes-api/, '')
      }
    }
  }
})
