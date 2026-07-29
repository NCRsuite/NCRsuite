import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3200,
    rolldownOptions: {
      output: {
        codeSplitting: false,
        entryFileNames: 'ncr-suite-app-v286.js'
      }
    }
  },
  server: { port: 5173 },
  preview: { port: 4173 }
});
