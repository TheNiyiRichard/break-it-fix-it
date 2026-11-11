/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy forwards /api calls to the .NET API, so the browser sees one origin.
// That keeps the session cookie simple and avoids CORS setup.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // a simulated browser for the front-end tests
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5080',
    },
  },
})
