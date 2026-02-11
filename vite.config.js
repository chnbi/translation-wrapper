import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
    base: '/wordflow/',
    plugins: [
        react(),
        nodePolyfills({
            // Whether to polyfill `node:` protocol imports.
            protocolImports: true,
        }),
    ],
    // Environment variable prefix
    envPrefix: ['VITE_'],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    // Strip all console.* and debugger statements in production builds
    esbuild: {
        drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
    optimizeDeps: {
        include: ['pdfjs-dist'],
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'],
                    'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-avatar', 'lucide-react', 'sonner', 'class-variance-authority', 'clsx', 'tailwind-merge'],
                    'vendor-office': ['xlsx', 'pptxgenjs', 'docx', 'mammoth'],
                    'vendor-pdf': ['pdfjs-dist'],
                    'vendor-ai': ['@google/genai'],
                }
            }
        }
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
