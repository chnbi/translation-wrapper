import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    // Allow GEMINI_API_KEY to be accessed in browser (alongside VITE_ prefixed vars)
    envPrefix: ['VITE_', 'GEMINI_'],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/proxy/ilmuchat': {
                target: 'https://api.ytlailabs.tech',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/proxy\/ilmuchat/, '')
            }
        }
    }
})
