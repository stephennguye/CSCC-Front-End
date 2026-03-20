import { defineConfig, transformWithEsbuild, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Serves *.worklet.ts files as self-contained IIFE scripts in dev mode,
 * bypassing Vite's module pipeline (HMR, import.meta plumbing, etc.)
 * that would break AudioWorkletGlobalScope execution.
 *
 * In production build mode, Vite's native `new URL(…, import.meta.url)`
 * asset handling takes over and bundles the worklet as a separate chunk.
 */
function workletPlugin(): Plugin {
  return {
    name: 'vite-plugin-worklet',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        // Strip Vite query params (e.g. ?t=123) to get the bare path
        const pathname = url.split('?')[0]
        if (!pathname.endsWith('.worklet.ts')) {
          return next()
        }

        try {
          const filePath = resolve(__dirname, pathname.replace(/^\//, ''))
          const source = await readFile(filePath, 'utf-8')
          const result = await transformWithEsbuild(source, filePath, {
            loader: 'ts',
            format: 'iife',
            target: 'es2022',
          })
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(result.code)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [workletPlugin(), react()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.worklet.ts')) {
            return 'assets/[name]-[hash].js'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  server: {
    proxy: {
      // Proxy REST API calls to the FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy WebSocket connections to the FastAPI backend
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
