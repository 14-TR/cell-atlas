import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { host: '127.0.0.1', port: 4175 }, build: { chunkSizeWarningLimit: 700, rollupOptions: { input: { cells: 'index.html', atoms: 'atoms.html' } } } });
